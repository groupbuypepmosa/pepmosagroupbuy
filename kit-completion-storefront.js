/* PEPMOSA KIT COMPLETION — isolated live per-variant guard.
   Uses the SAME RPC inventory source as storefront-repair.js so the picker
   cannot disagree with the product cards. */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

  let inventory=new Map();
  let booted=false;
  let checkoutPatched=false;
  let cachedGB=null;

  function getGB(){
    try{ if(typeof currentGB!=='undefined' && currentGB) return currentGB; }catch(_){}
    return window.currentGB||cachedGB||null;
  }

  function getProducts(){
    try{ if(typeof products!=='undefined' && Array.isArray(products)) return products; }catch(_){}
    return Array.isArray(window.products)?window.products:[];
  }

  async function ensureGB(){
    const existing=getGB();
    if(existing) return existing;
    if(!window.sb) return null;
    const r=await window.sb.from('group_buys')
      .select('*')
      .in('status',['OPEN','KIT_COMPLETION'])
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(r.error){ console.warn('Kit Completion GB lookup:',r.error); return null; }
    cachedGB=r.data||null;
    if(cachedGB) window.currentGB=cachedGB;
    return cachedGB;
  }

  function isKitMode(gb=getGB()){
    return !!gb && String(gb.status||'').toUpperCase()==='KIT_COMPLETION';
  }

  function availableFor(variantId){
    return Math.max(0,Number(inventory.get(String(variantId))||0));
  }

  async function fallbackInventory(gb){
    if(!window.sb||!gb)return new Map();
    const or=await window.sb.from('orders').select('order_id,payment_status').eq('gb_number',gb.gb_number);
    if(or.error)throw or.error;
    const ids=(or.data||[])
      .filter(o=>!['REJECTED','CANCELLED','CANCELED'].includes(String(o.payment_status||'').toUpperCase()))
      .map(o=>o.order_id).filter(Boolean);
    if(!ids.length)return new Map();
    const ir=await window.sb.from('order_items').select('variant_id,qty,order_id').in('order_id',ids);
    if(ir.error)throw ir.error;
    const totals=new Map();
    for(const item of (ir.data||[])){
      const id=String(item.variant_id||'');
      if(id)totals.set(id,(totals.get(id)||0)+Math.max(0,Number(item.qty||0)));
    }
    const out=new Map();
    for(const [id,total] of totals){
      const mod=total%10,remaining=total>0&&mod?10-mod:0;
      if(remaining>0)out.set(id,remaining);
    }
    return out;
  }

  async function refreshInventory(){
    const gb=await ensureGB();
    if(!window.sb || !gb || !isKitMode(gb)) return false;

    /* IMPORTANT: storefront-repair.js already uses this RPC.
       Do not read kit_inventory directly here, because that was the source
       of the false "no remaining vials" mismatch. */
    const r=await window.sb.rpc('get_kit_completion_inventory',{
      p_gb_number:gb.gb_number
    });

    if(r.error || !(r.data||[]).length){
      console.warn('Kit Completion inventory RPC unavailable/empty; using current-GB fallback.',r.error||'empty');
      try{
        inventory=await fallbackInventory(gb);
      }catch(e){
        console.error('Kit Completion fallback inventory error:',e);
        return false;
      }
    }else{
      inventory=new Map((r.data||[]).map(row=>[
        String(row.variant_id),
        Math.max(0,Number(row.remaining_qty||0))
      ]));
    }

    window.pepKitInventory=inventory;
    renderSummary();
    filterStorefront();
    return true;
  }

  function renderSummary(){
    const status=$('gbStatus');
    const gb=getGB();
    if(!status || !isKitMode(gb)) return;

    status.innerHTML=
      '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:7px">'+
        '<span class="status open">KIT COMPLETION</span>'+
        '<b>Complete the remaining vials</b>'+
      '</div>'+
      '<div class="muted" style="line-height:1.55">'+
        'Each <b>mg/variant is tracked separately</b>. Every variant has its own 10-vial kit count. You can order from <b>1 vial up to the exact live remaining quantity</b> for that specific mg/variant.'+
      '</div>';
  }

  function filterStorefront(){
    const gb=getGB();
    if(!isKitMode(gb)) return;
    const grid=$('productGrid');
    if(!grid || !inventory.size) return;

    for(const card of grid.querySelectorAll('[data-product-id]')){
      const pid=String(card.dataset.productId);
      const product=getProducts().find(p=>String(p.product_id)===pid);
      /* storefront-repair.js owns the cards. Only hide a card when we can
         positively match its variants against the live RPC inventory. */
      if(product){
        const hasAvailable=(product.product_variants||[]).some(v=>availableFor(v.variant_id)>0);
        card.style.display=hasAvailable?'':'none';
      }
    }
  }

  async function fetchProduct(productId){
    if(!window.sb) return null;
    const p=await window.sb.from('products')
      .select('product_id,product_name,description,image_url,active')
      .eq('product_id',productId)
      .maybeSingle();
    if(p.error || !p.data) return null;

    const v=await window.sb.from('product_variants')
      .select('variant_id,product_id,strength,price,active')
      .eq('product_id',productId)
      .eq('active',true);

    if(v.error) return null;
    return {...p.data,product_variants:v.data||[]};
  }

  async function openPicker(productId, productOverride){
    /* storefront-repair.js passes the actual product object here.
       Keep that object first so we do not depend on another script's globals. */
    let product=productOverride ||
      getProducts().find(p=>String(p.product_id)===String(productId)) ||
      null;

    if(!product) product=await fetchProduct(productId);
    if(!product) return alert('Product not found.');

    const inventoryLoaded=await refreshInventory();

    let variants=(product.product_variants||[])
      .filter(v=>v.active!==false)
      .filter(v=>availableFor(v.variant_id)>0);

    /* If the RPC call itself failed, preserve the already-live remaining_qty
       attached by storefront-repair.js instead of showing a false sold-out alert. */
    if(!variants.length && !inventoryLoaded){
      variants=(product.product_variants||[])
        .filter(v=>v.active!==false && Number(v.remaining_qty||0)>0);
      if(variants.length){
        for(const v of variants) inventory.set(String(v.variant_id),Number(v.remaining_qty||0));
      }
    }

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
      modal.addEventListener('click',e=>{
        if(e.target===modal) modal.classList.remove('show');
      });
    }

    const currentGBNumber=()=>String(getGB()?.gb_number||'');
    const cartFor=id=>JSON.parse(localStorage.pepmosaCart||'[]')
      .find(x=>
        String(x.variant_id)===String(id) &&
        String(x.gb_number||'')===currentGBNumber()
      );

    const render=()=>{
      const inCart=Number(cartFor(selected.variant_id)?.qty||0);
      const live=Math.max(0,availableFor(selected.variant_id)-inCart);
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
          '<button class="btn primary pepPickerAdd" type="button" '+(live<1?'disabled':'')+'>'+(live<1?'SOLD OUT':'ADD TO CART')+'</button>'+
        '</div>';

      modal.querySelector('.pepPickerClose').onclick=()=>modal.classList.remove('show');

      modal.querySelectorAll('[data-vid]').forEach(button=>button.onclick=()=>{
        selected=variants.find(v=>String(v.variant_id)===String(button.dataset.vid))||selected;
        qty=1;
        render();
      });

      $('pepMinus').onclick=()=>{qty=Math.max(1,qty-1);render();};
      $('pepPlus').onclick=()=>{qty=Math.min(Math.max(1,live),qty+1);render();};
      $('pepPickerQty').onchange=e=>{
        qty=Math.max(1,Math.min(Math.max(1,live),Number(e.target.value)||1));
        render();
      };

      modal.querySelector('.pepPickerAdd').onclick=async()=>{
        /* HARD ACCESS GATE — Kit Completion has its own cart writer, so it
           must use the same approved Admin Fee check before ANY cart write. */
        if(typeof window.pepRequireApprovedFee!=='function'){
          alert('Please wait a moment and try again.');
          return;
        }
        const approved=await window.pepRequireApprovedFee();
        if(!approved) return;

        /* Final live refresh before cart write. */
        const ok=await refreshInventory();
        if(!ok) return alert('Unable to refresh remaining vials. Please try again.');

        const already=Number(cartFor(selected.variant_id)?.qty||0);
        const fresh=Math.max(0,availableFor(selected.variant_id)-already);
        if(fresh<1) return render();

        qty=Math.min(qty,fresh);
        // Keep this cart strictly scoped to the active Group Buy.
        const activeGBNumber=currentGBNumber();
        const cart=JSON.parse(localStorage.pepmosaCart||'[]')
          .filter(x=>String(x.gb_number||'')===activeGBNumber);
        const existing=cart.find(x=>
          String(x.variant_id)===String(selected.variant_id) &&
          String(x.gb_number||'')===activeGBNumber
        );

        if(existing){
          existing.qty=Math.min(availableFor(selected.variant_id),Number(existing.qty||0)+qty);
        }else{
          cart.push({
            gb_number:activeGBNumber,
            product_id:product.product_id,
            variant_id:selected.variant_id,
            product_name:product.product_name,
            strength:selected.strength,
            price:Number(selected.price||0),
            unit_price:Number(selected.price||0),
            qty
          });
        }

        localStorage.pepmosaCart=JSON.stringify(cart);
        try{ if(typeof cart!=='undefined') window.cart=cart; }catch(_){}
        if(typeof window.updateCart==='function') window.updateCart();
        modal.classList.remove('show');
        if(typeof window.openCart==='function') window.openCart();
      };
    };

    render();
    modal.classList.add('show');
  }

  function patchCheckout(){
    if(checkoutPatched || typeof window.placeOrder!=='function') return;
    const gb=getGB();
    if(!isKitMode(gb)) return;

    checkoutPatched=true;
    const original=window.placeOrder;

    window.placeOrder=async function(){
      const currentCart=JSON.parse(localStorage.pepmosaCart||'[]');
      if(!currentCart.length) return original();

      const ok=await refreshInventory();
      if(!ok){
        const msg=$('checkoutMsg');
        if(msg){msg.className='notice error';msg.textContent='Unable to verify live Kit Completion availability. Please try again.';}
        return;
      }

      for(const item of currentCart){
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

      return original();
    };

    window.placeOrder.__pepKitGuard=true;
  }

  async function boot(){
    if(booted) return;

    for(let i=0;i<150;i++){
      const gb=await ensureGB();
      if(window.sb && gb) break;
      await new Promise(r=>setTimeout(r,100));
    }

    const gb=await ensureGB();
    if(!window.sb || !gb || !isKitMode(gb)) return;

    booted=true;
    await refreshInventory();

    /* storefront-repair.js checks these names when CHOOSE VARIANT is clicked. */
    window.openProductPicker=openPicker;
    window.pepOpenProductPicker=openPicker;

    patchCheckout();

    /* Keep our picker installed even if another legacy script reassigns it. */
    setInterval(()=>{
      const liveGB=getGB();
      if(!isKitMode(liveGB)) return;
      if(window.pepOpenProductPicker!==openPicker) window.pepOpenProductPicker=openPicker;
      if(window.openProductPicker!==openPicker) window.openProductPicker=openPicker;
      patchCheckout();
    },500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();