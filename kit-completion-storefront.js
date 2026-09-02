/* PEPMOSA KIT COMPLETION — single live source of truth per variant. */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

  let inventory=new Map();
  let booted=false;
  let checkoutPatched=false;

  const getGB=()=>window.currentGB||null;
  const getProducts=()=>Array.isArray(window.products)?window.products:[];

  function isKitMode(){
    const gb=getGB();
    return !!gb && String(gb.status||'').toUpperCase()==='KIT_COMPLETION';
  }

  function availableFor(variantId){
    return Math.max(0,Number(inventory.get(String(variantId))||0));
  }

  async function refreshInventory(){
    const gb=getGB();
    if(!window.sb || !gb || !isKitMode()) return false;

    let q=await window.sb.from('kit_inventory')
      .select('variant_id,remaining_qty')
      .eq('gb_number',gb.gb_number)
      .gt('remaining_qty',0);

    if(q.error){
      console.error('Kit Completion inventory error:',q.error);
      return false;
    }

    /* Initialize only when the table has no rows yet. */
    if(!(q.data||[]).length){
      const init=await window.sb.rpc('initialize_kit_completion_inventory',{p_gb_number:gb.gb_number});
      if(init.error) console.warn('Kit Completion initialize:',init.error);
      q=await window.sb.from('kit_inventory')
        .select('variant_id,remaining_qty')
        .eq('gb_number',gb.gb_number)
        .gt('remaining_qty',0);
      if(q.error) return false;
    }

    inventory=new Map((q.data||[]).map(row=>[
      String(row.variant_id),
      Math.max(0,Number(row.remaining_qty||0))
    ]));

    window.pepKitInventory=inventory;
    renderSummary();
    filterStorefront();
    return true;
  }

  function renderSummary(){
    const status=$('gbStatus');
    if(!status || !isKitMode()) return;

    status.innerHTML=
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px">'+
        '<span class="status open">KIT COMPLETION</span>'+
        '<b>Complete the remaining vials</b>'+
      '</div>'+
      '<div class="muted" style="line-height:1.55">'+
        'Each <b>mg/variant is tracked separately</b>. Only variants with remaining vials are available, and you may order from <b>1 vial up to the exact live remaining quantity</b>.'+
      '</div>';
  }

  function filterStorefront(){
    if(!isKitMode()) return;
    const grid=$('productGrid');
    if(!grid) return;

    for(const card of grid.querySelectorAll('[data-product-id]')){
      const product=getProducts().find(p=>String(p.product_id)===String(card.dataset.productId));
      const hasAvailable=!!product && (product.product_variants||[]).some(v=>v.active!==false && availableFor(v.variant_id)>0);
      card.style.display=hasAvailable?'':'none';
    }
  }

  async function openPicker(productId){
    const product=getProducts().find(p=>String(p.product_id)===String(productId));
    if(!product) return alert('Product not found.');

    /* Always refresh here. This prevents stale or mismatched counts from causing a false SOLD OUT alert. */
    await refreshInventory();

    const variants=(product.product_variants||[])
      .filter(v=>v.active!==false && availableFor(v.variant_id)>0);

    if(!variants.length){
      filterStorefront();
      return alert('This product has no remaining vials available.');
    }

    let selected=variants[0];
    let qty=1;

    let modal=$('pepProductPicker');
    if(!modal){
      modal=document.createElement('div');
      modal.id='pepProductPicker';
      modal.className='pepProductPicker';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('show'); });
    }

    const cartFor=id=>JSON.parse(localStorage.pepmosaCart||'[]')
      .find(x=>String(x.variant_id)===String(id));

    const render=()=>{
      const inCart=Number(cartFor(selected.variant_id)?.qty||0);
      const live=Math.max(0,availableFor(selected.variant_id)-inCart);
      qty=Math.max(1,Math.min(live||1,Number(qty)||1));

      modal.innerHTML=
        '<div class="pepPickerBox">'+
          '<button class="pepPickerClose" type="button">×</button>'+
          '<div class="pepPickerHead">'+
            '<div class="pepPickerImage">'+(product.image_url?'<img src="'+esc(product.image_url)+'" alt="">':'')+'</div>'+
            '<div><div class="eyebrow">PEPMOSA GROUP BUY</div><h2>'+esc(product.product_name)+'</h2><p class="muted">'+esc(product.description||'Choose your variant.')+'</p></div>'+
          '</div>'+
          '<div class="pepPickerLabel">CHOOSE VARIANT</div>'+
          '<div class="pepVariantChoices">'+variants.map(v=>{
            const left=Math.max(0,availableFor(v.variant_id)-Number(cartFor(v.variant_id)?.qty||0));
            return '<button type="button" class="pepVariantChoice '+(String(v.variant_id)===String(selected.variant_id)?'selected':'')+'" data-vid="'+esc(v.variant_id)+'">'+
              '<span><b>'+esc(v.strength||'Variant')+'</b><small>'+left+' vial(s) remaining • minimum 1 vial</small></span>'+
              '<strong>'+money(v.price)+'</strong>'+
            '</button>';
          }).join('')+'</div>'+
          '<div class="pepQuantityRow">'+
            '<div><div class="pepPickerLabel small">QUANTITY</div><div class="muted"><b>'+live+' vial(s) available</b> for '+esc(selected.strength||'this variant')+'</div></div>'+
            '<div class="pepStepper"><button id="pepMinus" type="button">−</button><input id="pepPickerQty" type="number" min="1" max="'+Math.max(1,live)+'" value="'+qty+'"><button id="pepPlus" type="button">+</button></div>'+
          '</div>'+
          '<div class="pepPickerTotal"><span>SUBTOTAL</span><b>'+money(Number(selected.price||0)*qty)+'</b></div>'+
          '<button class="btn primary pepPickerAdd" type="button" '+(live<1?'disabled':'')+'>'+ (live<1?'SOLD OUT':'ADD TO CART') +'</button>'+
        '</div>';

      modal.querySelector('.pepPickerClose').onclick=()=>modal.classList.remove('show');

      modal.querySelectorAll('[data-vid]').forEach(button=>button.onclick=()=>{
        selected=variants.find(v=>String(v.variant_id)===String(button.dataset.vid))||selected;
        qty=1;
        render();
      });

      $('pepMinus').onclick=()=>{ qty=Math.max(1,qty-1); render(); };
      $('pepPlus').onclick=()=>{ qty=Math.min(Math.max(1,live),qty+1); render(); };
      $('pepPickerQty').onchange=e=>{ qty=Math.max(1,Math.min(Math.max(1,live),Number(e.target.value)||1)); render(); };

      modal.querySelector('.pepPickerAdd').onclick=async()=>{
        /* One last live check before adding to cart. */
        await refreshInventory();
        const fresh=Math.max(0,availableFor(selected.variant_id)-Number(cartFor(selected.variant_id)?.qty||0));
        if(fresh<1) return render();

        qty=Math.min(qty,fresh);
        const cart=JSON.parse(localStorage.pepmosaCart||'[]');
        const existing=cart.find(x=>String(x.variant_id)===String(selected.variant_id));

        if(existing) existing.qty=Math.min(fresh+Number(existing.qty||0),Number(existing.qty||0)+qty);
        else cart.push({
          gb_number:getGB()?.gb_number||'',
          product_id:product.product_id,
          variant_id:selected.variant_id,
          product_name:product.product_name,
          strength:selected.strength,
          unit_price:Number(selected.price||0),
          price:Number(selected.price||0),
          qty
        });

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

  function patchCheckout(){
    if(checkoutPatched || typeof window.placeOrder!=='function' || !isKitMode()) return;
    checkoutPatched=true;

    const original=window.placeOrder;
    window.placeOrder=async function(){
      const cart=JSON.parse(localStorage.pepmosaCart||'[]');
      if(!cart.length) return original();

      await refreshInventory();

      for(const item of cart){
        const live=availableFor(item.variant_id);
        if(Number(item.qty)>live){
          const msg=$('checkoutMsg');
          if(msg){
            msg.className='notice error';
            msg.textContent='Only '+live+' vial(s) remain for '+(item.strength||'this variant')+'. Please update your cart.';
          }
          return;
        }
      }

      /* The existing checkout flow remains in charge of creating the order.
         This guard only prevents quantities above the live remaining stock. */
      return original();
    };
  }

  async function boot(){
    if(booted) return;

    for(let i=0;i<150;i++){
      if(window.sb && getGB()) break;
      await new Promise(r=>setTimeout(r,100));
    }

    if(!window.sb || !getGB() || !isKitMode()) return;

    booted=true;
    await refreshInventory();

    /* This is the ONLY picker used by the storefront in Kit Completion mode. */
    window.openProductPicker=openPicker;
    window.pepOpenProductPicker=openPicker;

    patchCheckout();

    const grid=$('productGrid');
    if(grid && !grid.dataset.pepKitObserver){
      const observer=new MutationObserver(()=>filterStorefront());
      observer.observe(grid,{childList:true,subtree:true});
      grid.dataset.pepKitObserver='1';
    }

    /* Product loading can finish after this script. Keep the live filter in sync. */
    setInterval(()=>{
      if(isKitMode()) filterStorefront();
    },700);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();