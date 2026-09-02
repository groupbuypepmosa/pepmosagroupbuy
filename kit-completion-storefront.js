/* PEPMOSA Kit Completion storefront guard — isolated from normal Group Buy logic. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let inventory=new Map(), active=false, ready=false;

  function isKitMode(){
    return !!window.currentGB && (String(window.currentGB.status||'').toUpperCase()==='KIT_COMPLETION' || String(window.currentGB.kit_completion_status||'').toUpperCase()==='OPEN');
  }

  async function loadInventory(){
    if(!window.sb||!window.currentGB) return false;
    active=isKitMode();
    if(!active) return false;
    const {data,error}=await window.sb.from('kit_inventory')
      .select('variant_id,remaining_qty,kit_size')
      .eq('gb_number',window.currentGB.gb_number);
    if(error){ console.error('Kit inventory load',error); return false; }
    inventory=new Map((data||[]).map(x=>[String(x.variant_id),{remaining:Math.max(0,Number(x.remaining_qty||0)),kitSize:Number(x.kit_size||10)}]));
    for(const p of (window.products||[])){
      p.product_variants=(p.product_variants||[]).map(v=>({...v,__remaining:inventory.get(String(v.variant_id))?.remaining||0}))
        .filter(v=>v.active!==false && Number(v.__remaining)>0);
    }
    window.products=(window.products||[]).filter(p=>(p.product_variants||[]).length);
    const st=$('gbStatus');
    if(st) st.innerHTML='<span class="status open">KIT COMPLETION</span> <span class="muted">Only remaining vials are available. Each variant (e.g. 15mg, 30mg) has its own remaining count, and checkout is locked to prevent double-selling.</span>';
    return true;
  }

  function picker(pid,override){
    const product=override||(window.products||[]).find(p=>String(p.product_id)===String(pid));
    if(!product) return alert('Product not found.');
    const variants=(product.product_variants||[]).filter(v=>v.active!==false && (!active || Number(v.__remaining)>0));
    if(!variants.length) return alert('This product has no remaining vials available.');
    let selected=variants[0], qty=1;
    let modal=$('pepProductPicker');
    if(!modal){
      modal=document.createElement('div'); modal.id='pepProductPicker'; modal.className='pepProductPicker';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    }
    const render=()=>{
      const max=active?Number(selected.__remaining||0):999999;
      qty=Math.max(1,Math.min(max,Number(qty)||1));
      modal.innerHTML='<div class="pepPickerBox">'+
        '<button class="pepPickerClose" type="button">×</button>'+
        '<div class="pepPickerHead"><div class="pepPickerImage">'+(product.image_url?'<img src="'+esc(product.image_url)+'">':'')+'</div><div><div class="eyebrow">PEPMOSA GROUP BUY</div><h2>'+esc(product.product_name)+'</h2><p class="muted">'+esc(product.description||'Choose your variant.')+'</p></div></div>'+
        '<div class="pepPickerLabel">CHOOSE VARIANT</div><div class="pepVariantChoices">'+
        variants.map(v=>'<button type="button" class="pepVariantChoice '+(String(v.variant_id)===String(selected.variant_id)?'selected':'')+'" data-vid="'+esc(v.variant_id)+'"><span><b>'+esc(v.strength)+'</b><small>'+(active?esc(String(v.__remaining))+' vial(s) remaining':'Minimum '+Math.max(1,Number(v.minimum_qty||1))+' pc')+'</small></span><strong>'+money(v.price)+'</strong></button>').join('')+
        '</div><div class="pepQuantityRow"><div><div class="pepPickerLabel small">QUANTITY</div><div class="muted">'+(active?'Maximum '+max+' vial(s) available':'Minimum '+Math.max(1,Number(selected.minimum_qty||1))+' pc')+'</div></div>'+
        '<div class="pepStepper"><button id="pepMinus" type="button">−</button><input id="pepPickerQty" type="number" min="1" max="'+max+'" value="'+qty+'"><button id="pepPlus" type="button">+</button></div></div>'+
        '<div class="pepPickerTotal"><span>SUBTOTAL</span><b>'+money(Number(selected.price||0)*qty)+'</b></div><button class="btn primary pepPickerAdd" type="button">ADD TO CART</button></div>';
      modal.querySelector('.pepPickerClose').onclick=()=>modal.classList.remove('show');
      modal.querySelectorAll('[data-vid]').forEach(b=>b.onclick=()=>{selected=variants.find(v=>String(v.variant_id)===String(b.dataset.vid))||selected;qty=1;render()});
      const input=$('pepPickerQty');
      const sync=()=>{qty=Math.max(1,Math.min(max,Number(input.value)||1));render()};
      $('pepMinus').onclick=()=>{qty=Math.max(1,qty-1);render()};
      $('pepPlus').onclick=()=>{qty=Math.min(max,qty+1);render()};
      input.onchange=sync;
      modal.querySelector('.pepPickerAdd').onclick=()=>{
        const cart=JSON.parse(localStorage.pepmosaCart||'[]');
        const existing=cart.find(x=>String(x.variant_id)===String(selected.variant_id));
        const already=Number(existing?.qty||0);
        if(active && already+qty>max){alert('Only '+max+' vial(s) remaining for '+selected.strength+'.');return;}
        const item={product_id:product.product_id,variant_id:selected.variant_id,product_name:product.product_name,strength:selected.strength,price:Number(selected.price||0),qty};
        if(existing) existing.qty+=qty; else cart.push(item);
        localStorage.pepmosaCart=JSON.stringify(cart);
        window.cart=cart;
        if(typeof window.updateCart==='function')window.updateCart();
        modal.classList.remove('show');
        if(typeof window.openCart==='function')window.openCart();
      };
    };
    render(); modal.classList.add('show');
  }

  function patch(){
    if(ready||!window.currentGB||!Array.isArray(window.products)||!window.products.length)return;
    ready=true;
    if(active){
      window.openProductPicker=picker;
      window.pepOpenProductPicker=picker;
      const oldPlace=window.placeOrder;
      if(typeof oldPlace==='function'){
        window.placeOrder=async function(){
          const cart=JSON.parse(localStorage.pepmosaCart||'[]');
          if(!cart.length) return oldPlace();
          const email=String($('email')?.value||'').trim().toLowerCase();
          if(!email) return alert('Enter your email.');
          const customerPayload={email,customer_name:String($('customerName')?.value||'').trim(),contact:String($('contact')?.value||'').trim(),address:String($('address')?.value||'').trim()};
          const {data:customer,error}=await window.sb.from('customers').upsert(customerPayload,{onConflict:'email'}).select().single();
          if(error){$('checkoutMsg').className='notice error';$('checkoutMsg').textContent=error.message;return;}
          try{
            for(const item of cart){
              const max=inventory.get(String(item.variant_id))?.remaining;
              if(max==null) throw new Error('Kit Completion inventory is not configured for '+item.strength+'.');
              if(Number(item.qty)>Number(max)) throw new Error('Only '+max+' vial(s) remaining for '+item.strength+'.');
              await window.sb.rpc('reserve_kit_units',{p_gb_number:window.currentGB.gb_number,p_variant_id:item.variant_id,p_quantity:Number(item.qty),p_customer_id:customer.customer_id}).then(r=>{if(r.error)throw r.error; const left=Number(r.data?.remaining_qty??max-Number(item.qty)); inventory.set(String(item.variant_id),{remaining:left});});
            }
          }catch(e){
            await loadInventory();
            if(typeof window.renderProducts==='function')window.renderProducts();
            $('checkoutMsg').className='notice error';$('checkoutMsg').textContent=e.message||'This remaining stock was just purchased by another customer.';
            return;
          }
          return oldPlace();
        };
      }
    }
  }

  async function boot(){
    for(let i=0;i<80;i++){
      if(window.sb&&window.currentGB&&Array.isArray(window.products)){
        try{await loadInventory();}catch(e){console.error(e)}
        if(active&&typeof window.renderProducts==='function')window.renderProducts();
        patch(); return;
      }
      await new Promise(r=>setTimeout(r,150));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();