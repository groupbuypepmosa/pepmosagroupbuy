/* PEPMOSA Kit Completion storefront guard — isolated from normal Group Buy logic. */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

  let inventory=new Map();
  let active=false;
  let patched=false;

  function isKitMode(){
    const gb=window.currentGB;
    return !!gb && String(gb.status||'').toUpperCase()==='KIT_COMPLETION';
  }

  function ensureKitNotice(){
    if(!active) return;

    let box=$('pepKitRemainingSummary');
    if(!box){
      box=document.createElement('section');
      box.id='pepKitRemainingSummary';
      box.className='notice';
      box.style.cssText='margin:14px 0 18px;padding:16px 18px;border-radius:18px';
      const grid=$('productGrid');
      if(grid?.parentNode) grid.parentNode.insertBefore(box,grid);
      else $('gbStatus')?.parentNode?.insertBefore(box,$('gbStatus').nextSibling);
    }

    const rows=[...inventory.entries()]
      .filter(([,x])=>Number(x.remaining)>0)
      .map(([vid,x])=>{
        let label='';
        for(const p of (window.products||[])){
          const v=(p.product_variants||[]).find(z=>String(z.variant_id)===String(vid));
          if(v){label=(p.product_name||'')+' '+(v.strength||'');break;}
        }
        return '<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 10px;margin:5px 5px 0 0;border-radius:999px;background:#fff;border:1px solid #ead8e3;font-size:12px"><b>'+esc(label||vid)+'</b> <span style="color:#c52e7d;font-weight:900">'+Number(x.remaining)+' remaining</span></span>';
      }).join('');

    box.innerHTML=
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px">'+
        '<span class="status open">KIT COMPLETION</span>'+
        '<b>Only the remaining vials needed to complete each 10-vial kit are available.</b>'+
      '</div>'+
      '<div class="muted" style="line-height:1.6">'+
        'Each variant is tracked separately — for example, <b>15mg</b> and <b>30mg</b> have different counts. '+
        'You may order from <b>1 vial up to the exact remaining quantity</b> for that variant. '+
        'Once another buyer secures stock, the available count is reduced to prevent double-selling.'+
      '</div>'+
      '<div id="pepKitRemainingRows" style="margin-top:8px">'+(rows||'<span class="muted">No remaining vials are currently available.</span>')+'</div>';
  }

  async function loadInventory(){
    if(!window.sb||!window.currentGB) return false;
    active=isKitMode();
    if(!active) return false;

    const gbNumber=window.currentGB.gb_number;

    let r=await window.sb.from('kit_inventory')
      .select('variant_id,remaining_qty,kit_size')
      .eq('gb_number',gbNumber)
      .gt('remaining_qty',0);

    if(r.error){
      console.error('Kit inventory load',r.error);
      return false;
    }

    /* First time KIT COMPLETION is opened, automatically build the per-variant
       remaining counts from existing orders. Existing reserved inventory is never reset. */
    if(!(r.data||[]).length){
      const init=await window.sb.rpc('initialize_kit_completion_inventory',{p_gb_number:gbNumber});
      if(init.error) console.error('Kit inventory initialize',init.error);
      r=await window.sb.from('kit_inventory')
        .select('variant_id,remaining_qty,kit_size')
        .eq('gb_number',gbNumber)
        .gt('remaining_qty',0);
      if(r.error){ console.error('Kit inventory reload',r.error); return false; }
    }

    inventory=new Map((r.data||[]).map(x=>[
      String(x.variant_id),
      {remaining:Math.max(0,Number(x.remaining_qty||0)),kitSize:Number(x.kit_size||10)}
    ]));

    for(const p of (window.products||[])){
      p.product_variants=(p.product_variants||[])
        .map(v=>{
          const rec=inventory.get(String(v.variant_id));
          return {...v,__remaining:rec?rec.remaining:0,minimum_qty:1};
        })
        .filter(v=>v.active!==false && Number(v.__remaining)>0);
    }

    window.products=(window.products||[]).filter(p=>(p.product_variants||[]).length);

    const st=$('gbStatus');
    if(st){
      st.innerHTML='<span class="status open">KIT COMPLETION</span> <span class="muted">Only remaining vials are available. Each mg/variant has its own separate 10-vial kit and remaining count.</span>';
    }

    ensureKitNotice();
    return true;
  }

  function picker(pid,override){
    const product=override||(window.products||[]).find(p=>String(p.product_id)===String(pid));
    if(!product) return alert('Product not found.');

    const variants=(product.product_variants||[])
      .filter(v=>v.active!==false && (!active || Number(v.__remaining)>0));

    if(!variants.length) return alert('This product has no remaining vials available.');

    let selected=variants[0];
    let qty=1;

    let modal=$('pepProductPicker');
    if(!modal){
      modal=document.createElement('div');
      modal.id='pepProductPicker';
      modal.className='pepProductPicker';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show');});
    }

    const render=()=>{
      const max=active?Math.max(1,Number(selected.__remaining||0)):999999;
      qty=Math.max(1,Math.min(max,Number(qty)||1));

      modal.innerHTML=
        '<div class="pepPickerBox">'+
          '<button class="pepPickerClose" type="button">×</button>'+
          '<div class="pepPickerHead">'+
            '<div class="pepPickerImage">'+(product.image_url?'<img src="'+esc(product.image_url)+'" alt="">':'')+'</div>'+
            '<div><div class="eyebrow">PEPMOSA GROUP BUY</div><h2>'+esc(product.product_name)+'</h2><p class="muted">'+esc(product.description||'Choose your variant.')+'</p></div>'+
          '</div>'+
          '<div class="pepPickerLabel">CHOOSE VARIANT</div>'+
          '<div class="pepVariantChoices">'+
            variants.map(v=>
              '<button type="button" class="pepVariantChoice '+(String(v.variant_id)===String(selected.variant_id)?'selected':'')+'" data-vid="'+esc(v.variant_id)+'">'+
                '<span><b>'+esc(v.strength)+'</b><small>'+esc(String(v.__remaining))+' vial(s) remaining • minimum 1 vial</small></span>'+
                '<strong>'+money(v.price)+'</strong>'+
              '</button>'
            ).join('')+
          '</div>'+
          '<div class="pepQuantityRow">'+
            '<div><div class="pepPickerLabel small">QUANTITY</div><div class="muted"><b>'+max+' vial(s) remaining</b> for '+esc(selected.strength)+'</div></div>'+
            '<div class="pepStepper"><button id="pepMinus" type="button">−</button><input id="pepPickerQty" type="number" min="1" max="'+max+'" value="'+qty+'"><button id="pepPlus" type="button">+</button></div>'+
          '</div>'+
          '<div class="pepPickerTotal"><span>SUBTOTAL</span><b>'+money(Number(selected.price||0)*qty)+'</b></div>'+
          '<button class="btn primary pepPickerAdd" type="button">ADD TO CART</button>'+
        '</div>';

      modal.querySelector('.pepPickerClose').onclick=()=>modal.classList.remove('show');

      modal.querySelectorAll('[data-vid]').forEach(b=>b.onclick=()=>{
        selected=variants.find(v=>String(v.variant_id)===String(b.dataset.vid))||selected;
        qty=1;
        render();
      });

      const input=$('pepPickerQty');
      const sync=()=>{qty=Math.max(1,Math.min(max,Number(input.value)||1));render();};
      $('pepMinus').onclick=()=>{qty=Math.max(1,qty-1);render();};
      $('pepPlus').onclick=()=>{qty=Math.min(max,qty+1);render();};
      input.onchange=sync;

      modal.querySelector('.pepPickerAdd').onclick=()=>{
        const cart=JSON.parse(localStorage.pepmosaCart||'[]');
        const existing=cart.find(x=>String(x.variant_id)===String(selected.variant_id));
        const already=Number(existing?.qty||0);

        if(active && already+qty>max){
          alert('Only '+Math.max(0,max-already)+' additional vial(s) can be added for '+selected.strength+'.');
          return;
        }

        const item={
          gb_number:window.currentGB?.gb_number||'',
          product_id:product.product_id,
          variant_id:selected.variant_id,
          product_name:product.product_name,
          strength:selected.strength,
          unit_price:Number(selected.price||0),
          price:Number(selected.price||0),
          qty
        };

        if(existing) existing.qty+=qty;
        else cart.push(item);

        localStorage.pepmosaCart=JSON.stringify(cart);
        window.cart=cart;

        if(typeof window.updateCart==='function') window.updateCart();
        modal.classList.remove('show');
        if(typeof window.openCart==='function') window.openCart();
      };
    };

    render();
    modal.classList.add('show');
  }

  function patch(){
    if(!active || patched) return;
    patched=true;

    /* Always use the KIT picker while this GB is in KIT_COMPLETION. */
    window.openProductPicker=picker;
    window.pepOpenProductPicker=picker;

    const oldPlace=window.placeOrder;
    if(typeof oldPlace==='function'){
      window.placeOrder=async function(){
        const cart=JSON.parse(localStorage.pepmosaCart||'[]');
        if(!cart.length) return oldPlace();

        const email=String($('email')?.value||'').trim().toLowerCase();
        if(!email) return alert('Enter your email.');

        const customerPayload={
          email,
          customer_name:String($('customerName')?.value||'').trim(),
          contact:String($('contact')?.value||'').trim(),
          address:String($('address')?.value||'').trim()
        };

        const {data:customer,error}=await window.sb
          .from('customers')
          .upsert(customerPayload,{onConflict:'email'})
          .select()
          .single();

        if(error){
          $('checkoutMsg').className='notice error';
          $('checkoutMsg').textContent=error.message;
          return;
        }

        const reserved=[];
        try{
          for(const item of cart){
            const rec=inventory.get(String(item.variant_id));
            const max=Number(rec?.remaining||0);

            if(!rec) throw new Error('This variant is no longer available for Kit Completion.');
            if(Number(item.qty)>max) throw new Error('Only '+max+' vial(s) remaining for '+item.strength+'.');

            const rr=await window.sb.rpc('reserve_kit_units',{
              p_gb_number:window.currentGB.gb_number,
              p_variant_id:item.variant_id,
              p_quantity:Number(item.qty),
              p_customer_id:customer.customer_id
            });

            if(rr.error) throw rr.error;

            const left=Number(rr.data?.remaining_qty ?? max-Number(item.qty));
            inventory.set(String(item.variant_id),{remaining:left,kitSize:rec.kitSize});
            reserved.push({variant_id:item.variant_id,qty:Number(item.qty)});
          }
        }catch(e){
          await loadInventory();
          if(typeof window.renderProducts==='function') window.renderProducts();
          ensureKitNotice();

          $('checkoutMsg').className='notice error';
          $('checkoutMsg').textContent=e.message||'This remaining stock was just secured by another buyer. Please review the updated availability.';
          return;
        }

        return oldPlace();
      };
    }
  }

  async function boot(){
    for(let i=0;i<100;i++){
      if(window.sb && window.currentGB && Array.isArray(window.products)){
        const ok=await loadInventory();
        if(ok){
          if(typeof window.renderProducts==='function') window.renderProducts();
          ensureKitNotice();
          patch();
        }
        return;
      }
      await new Promise(r=>setTimeout(r,120));
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();