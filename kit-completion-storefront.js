/* PEPMOSA KIT COMPLETION — isolated guard for per-variant remaining vials. */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

  let inventory=new Map();
  let active=false;
  let patched=false;

  const getGB=()=>typeof currentGB!=='undefined' ? currentGB : window.currentGB;
  const getProducts=()=>typeof products!=='undefined' && Array.isArray(products) ? products : (window.products||[]);
  const setProducts=next=>{ try{ if(typeof products!=='undefined') products=next; }catch(_){} window.products=next; };

  function isKitMode(){
    const gb=getGB();
    if(!gb) return false;
    return String(gb.status||'').toUpperCase()==='KIT_COMPLETION'
      || String(gb.kit_completion_status||'').toUpperCase()==='OPEN';
  }

  const labels=new Map();

  function variantLabel(variantId){
    const id=String(variantId);
    if(labels.has(id)) return labels.get(id);
    for(const p of getProducts()){
      const v=(p.product_variants||[]).find(x=>String(x.variant_id)===id);
      if(v){
        const label=(p.product_name||'')+(v.strength?' • '+v.strength:'');
        labels.set(id,label);
        return label;
      }
    }
    return id;
  }

  async function loadVariantLabels(ids){
    try{
      if(!window.sb || !ids.length) return;
      const r=await window.sb
        .from('product_variants')
        .select('variant_id,strength,product_id,products(product_name)')
        .in('variant_id',ids);
      if(r.error) throw r.error;
      for(const v of r.data||[]){
        const productName=v.products?.product_name||'';
        const label=(productName?productName+' • ':'')+(v.strength||String(v.variant_id));
        labels.set(String(v.variant_id),label);
      }
    }catch(e){
      console.warn('Kit Completion label lookup',e);
    }
  }

  function renderKitSummary(){
    if(!active) return;

    /* One clean Kit Completion message only — no duplicate cards. */
    const oldSummary=$('pepKitRemainingSummary');
    if(oldSummary) oldSummary.remove();

    const status=$('gbStatus');
    if(!status) return;

    const rows=[...inventory.entries()]
      .filter(([,x])=>Number(x.remaining)>0)
      .map(([id,x])=>
        '<span style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;margin:7px 6px 0 0;border-radius:999px;background:#fff;border:1px solid #ead8e3;font-size:12px">'+
          '<b>'+esc(variantLabel(id))+'</b>'+
          '<span style="color:#c52e7d;font-weight:900">'+Number(x.remaining)+' remaining</span>'+
        '</span>'
      ).join('');

    status.innerHTML=
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px">'+
        '<span class="status open">KIT COMPLETION</span>'+
        '<b>Complete the remaining vials</b>'+
      '</div>'+
      '<div class="muted" style="line-height:1.55">'+
        'Each <b>mg/variant is tracked separately</b> (for example, 15mg and 30mg). Only the exact remaining vials needed to complete that variant’s 10-vial kit are available. You may order from <b>1 vial up to the live remaining quantity</b>.'+
      '</div>'+
      (rows?'<div style="margin-top:4px">'+rows+'</div>':'<div class="muted" style="margin-top:8px">No remaining vials are currently available.</div>');
  }

  async function loadInventory(){
    if(!window.sb || !getGB()) return false;
    active=isKitMode();
    if(!active) return false;

    const gbNumber=getGB().gb_number;
    let r=await window.sb.from('kit_inventory')
      .select('variant_id,remaining_qty,kit_size')
      .eq('gb_number',gbNumber)
      .gt('remaining_qty',0);

    if(r.error){ console.error('Kit inventory load',r.error); return false; }

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

    await loadVariantLabels([...inventory.keys()]);

    // Do not replace the storefront product list here. storefront-repair.js owns product loading;
    // this guard only supplies live remaining quantities so script timing cannot erase products.

    renderKitSummary();
    return true;
  }

  function availableForVariant(v){
    const rec=inventory.get(String(v?.variant_id));
    return Math.max(0,Number(rec?.remaining ?? v?.remaining_qty ?? v?.__remaining ?? 0));
  }

  function openPicker(pid,override){
    const product=override||getProducts().find(p=>String(p.product_id)===String(pid));
    if(!product) return alert('Product not found.');

    const variants=(product.product_variants||[]).filter(v=>v.active!==false && availableForVariant(v)>0);
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
      const cart=JSON.parse(localStorage.pepmosaCart||'[]');
      const existing=cart.find(x=>String(x.variant_id)===String(selected.variant_id));
      const already=Number(existing?.qty||0);
      const live=Math.max(0,availableForVariant(selected)-already);
      qty=Math.max(1,Math.min(Math.max(1,live),Number(qty)||1));

      modal.innerHTML=
        '<div class="pepPickerBox">'+
          '<button class="pepPickerClose" type="button">×</button>'+
          '<div class="pepPickerHead">'+
            '<div class="pepPickerImage">'+(product.image_url?'<img src="'+esc(product.image_url)+'" alt="">':'')+'</div>'+
            '<div><div class="eyebrow">PEPMOSA GROUP BUY</div><h2>'+esc(product.product_name)+'</h2><p class="muted">'+esc(product.description||'Choose your variant.')+'</p></div>'+
          '</div>'+
          '<div class="pepPickerLabel">CHOOSE VARIANT</div>'+
          '<div class="pepVariantChoices">'+variants.map(v=>{
            const inCart=Number((JSON.parse(localStorage.pepmosaCart||'[]').find(x=>String(x.variant_id)===String(v.variant_id)))?.qty||0);
            const remaining=Math.max(0,availableForVariant(v)-inCart);
            return '<button type="button" class="pepVariantChoice '+(String(v.variant_id)===String(selected.variant_id)?'selected':'')+'" data-vid="'+esc(v.variant_id)+'">'+
              '<span><b>'+esc(v.strength)+'</b><small>'+remaining+' vial(s) remaining • minimum 1 vial</small></span><strong>'+money(v.price)+'</strong></button>';
          }).join('')+'</div>'+
          '<div class="pepQuantityRow">'+
            '<div><div class="pepPickerLabel small">QUANTITY</div><div class="muted"><b>'+live+' vial(s) available</b> for '+esc(selected.strength)+'</div></div>'+
            '<div class="pepStepper"><button id="pepMinus" type="button">−</button><input id="pepPickerQty" type="number" min="1" max="'+Math.max(1,live)+'" value="'+qty+'"><button id="pepPlus" type="button">+</button></div>'+
          '</div>'+
          '<div class="pepPickerTotal"><span>SUBTOTAL</span><b>'+money(Number(selected.price||0)*qty)+'</b></div>'+
          '<button class="btn primary pepPickerAdd" type="button" '+(live<1?'disabled':'')+'>'+ (live<1?'SOLD OUT':'ADD TO CART') +'</button>'+
        '</div>';

      modal.querySelector('.pepPickerClose').onclick=()=>modal.classList.remove('show');
      modal.querySelectorAll('[data-vid]').forEach(b=>b.onclick=()=>{
        selected=variants.find(v=>String(v.variant_id)===String(b.dataset.vid))||selected;
        qty=1; render();
      });

      const input=$('pepPickerQty');
      $('pepMinus').onclick=()=>{qty=Math.max(1,qty-1);render();};
      $('pepPlus').onclick=()=>{qty=Math.min(Math.max(1,live),qty+1);render();};
      input.onchange=()=>{qty=Math.max(1,Math.min(Math.max(1,live),Number(input.value)||1));render();};

      modal.querySelector('.pepPickerAdd').onclick=()=>{
        if(live<1) return alert('This remaining stock is no longer available.');
        const latestCart=JSON.parse(localStorage.pepmosaCart||'[]');
        const item=latestCart.find(x=>String(x.variant_id)===String(selected.variant_id));
        if(item) item.qty+=qty;
        else latestCart.push({
          gb_number:getGB()?.gb_number||'',
          product_id:product.product_id,
          variant_id:selected.variant_id,
          product_name:product.product_name,
          strength:selected.strength,
          unit_price:Number(selected.price||0),
          price:Number(selected.price||0),
          qty
        });
        localStorage.pepmosaCart=JSON.stringify(latestCart);
        window.cart=latestCart;
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

    window.openProductPicker=openPicker;
    window.pepOpenProductPicker=openPicker;

    const oldPlace=window.placeOrder;
    if(typeof oldPlace==='function' && !oldPlace.__pepKitGuard){
      const wrapped=async function(){
        const cart=JSON.parse(localStorage.pepmosaCart||'[]');
        if(!cart.length) return oldPlace();

        const email=String($('email')?.value||'').trim().toLowerCase();
        if(!email) return alert('Enter your email.');

        const payload={
          email,
          customer_name:String($('customerName')?.value||'').trim(),
          contact:String($('contact')?.value||'').trim(),
          address:String($('address')?.value||'').trim()
        };

        const up=await window.sb.from('customers').upsert(payload,{onConflict:'email'}).select().single();
        if(up.error){
          const msg=$('checkoutMsg'); if(msg){msg.className='notice error';msg.textContent=up.error.message;}
          return;
        }

        try{
          for(const item of cart){
            const rec=inventory.get(String(item.variant_id));
            if(!rec) throw new Error('This variant is no longer available for Kit Completion.');
            if(Number(item.qty)>Number(rec.remaining||0)) throw new Error('Only '+Number(rec.remaining||0)+' vial(s) remaining for '+(item.strength||'this variant')+'.');

            const rr=await window.sb.rpc('reserve_kit_units',{
              p_gb_number:getGB().gb_number,
              p_variant_id:item.variant_id,
              p_quantity:Number(item.qty),
              p_customer_id:up.data.customer_id
            });
            if(rr.error) throw rr.error;

            const left=Number(rr.data?.remaining_qty ?? Number(rec.remaining)-Number(item.qty));
            inventory.set(String(item.variant_id),{remaining:left,kitSize:rec.kitSize});
          }
        }catch(e){
          await loadInventory();
          if(typeof window.renderProducts==='function') window.renderProducts();
          renderKitSummary();
          const msg=$('checkoutMsg');
          if(msg){msg.className='notice error';msg.textContent=e.message||'This remaining stock was just secured by another buyer. Please review the updated availability.';}
          return;
        }

        return oldPlace();
      };
      wrapped.__pepKitGuard=true;
      window.placeOrder=wrapped;
    }
  }

  async function boot(){
    for(let i=0;i<100;i++){
      if(window.sb && getGB()){
        const ok=await loadInventory();
        if(ok){
          if(typeof window.renderProducts==='function') window.renderProducts();
          renderKitSummary();
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