/* PEPMOSA checkout - final clean pink girly design + payment-method fix */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const S=()=>window.sb||window.__sb;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let products=[];
  let checkoutCustomer=null;
  async function loadCheckoutCustomer(){
    const s=S();
    if(!s)return null;
    try{
      const {data:{user},error:userError}=await s.auth.getUser();
      if(userError||!user)return null;
      const {data:p,error:pError}=await s.from('profiles')
        .select('email,full_name,address,contact_number,whatsapp_name,account_status,email_verified_at')
        .eq('id',user.id).maybeSingle();
      if(pError)throw pError;
      if(!p || p.account_status!=='APPROVED' || !p.email_verified_at)return null;
      return {
        user_id:user.id,
        email:(p.email||user.email||'').trim().toLowerCase(),
        customer_name:(p.full_name||user.user_metadata?.full_name||'').trim(),
        contact:(p.contact_number||'').trim(),
        address:(p.address||'').trim(),
        whatsapp_name:(p.whatsapp_name||'').trim()
      };
    }catch(e){console.warn('PEPMOSA logged-in customer lookup',e);return null}
  }
  const CART_KEY='pepmosaCart', CART_GB_KEY='pepmosaCartGB';
  function getGB(){return window.currentGB||window.pepmosaCurrentGB||null}
  function getCartRaw(){
    try{
      // localStorage is the source of truth. window.cart can be stale after a GB
      // changes or after another storefront script updates the cart.
      const stored=localStorage.getItem(CART_KEY);
      if(stored!==null)return JSON.parse(stored||'[]');
      return Array.isArray(window.cart)?window.cart:[];
    }catch(e){return[]}
  }
  function clearPersistedCart(){
    window.cart=[];
    try{localStorage.removeItem(CART_KEY);localStorage.removeItem(CART_GB_KEY)}catch(e){}
    if(typeof window.clearCart==='function'){try{window.clearCart()}catch(e){}}
    ['cartCount','cart-count'].forEach(id=>{const el=$(id);if(el)el.textContent='0'});
    document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent='0');
    if(typeof window.updateCart==='function'){try{window.updateCart()}catch(e){}}
  }
  function getCart(){
    const raw=getCartRaw(),gb=getGB(),gbn=String(gb?.gb_number||'');
    if(!gbn)return raw;
    const scoped=String(localStorage.getItem(CART_GB_KEY)||'');
    const valid=raw.filter(i=>String(i.gb_number||'')===gbn);

    /*
      Do NOT clear a fresh cart just because the separate CART_GB_KEY has not
      been written yet. On the first Add → Checkout, scripts can race:
      the item already has the correct gb_number, but the marker can still be
      empty/stale. The old code treated that as an old cart and deleted it.

      The item-level gb_number is the authoritative scope.
    */
    if(valid.length){
      if(scoped!==gbn){
        try{localStorage.setItem(CART_GB_KEY,gbn)}catch(e){}
      }
      if(valid.length!==raw.length){
        window.cart=valid;
        try{localStorage.setItem(CART_KEY,JSON.stringify(valid))}catch(e){}
      }
      return valid;
    }

    // Only discard truly legacy/unscoped items that do not belong to this GB.
    if(raw.length && scoped!==gbn){
      window.cart=[];
      try{
        localStorage.removeItem(CART_KEY);
        localStorage.setItem(CART_GB_KEY,gbn);
      }catch(e){}
      return [];
    }

    return valid;
  }
  async function sanitizeKitCart(cart,gb){
    if(!gb||String(gb.status||'').toUpperCase()!=='KIT_COMPLETION')return{cart,changed:false,removed:[]};
    const s=S();
    if(!s)return{cart,changed:false,removed:[]};
    const r=await s.rpc('get_kit_completion_inventory',{p_gb_number:gb.gb_number});
    if(r.error)throw new Error('Unable to verify live remaining vials. Please refresh and try again.');
    const live=new Map((r.data||[]).map(x=>[String(x.variant_id),Math.max(0,Number(x.remaining_qty||0))]));
    const kept=[],removed=[];
    for(const item of cart){
      const id=String(item.variant_id||item.variantId||'');
      const left=live.get(id)||0;
      const qty=Math.max(0,Number(item.qty??item.quantity??0));
      if(!id||left<1){
        removed.push(item);
        continue;
      }
      if(qty>left){
        removed.push(item);
        // Keep only the exact live remaining quantity instead of sending an
        // impossible quantity to checkout.
        kept.push({...item,qty:left,quantity:left});
      }else kept.push(item);
    }
    const changed=removed.length>0||kept.length!==cart.length;
    if(changed){
      window.cart=kept;
      try{
        localStorage.setItem(CART_KEY,JSON.stringify(kept));
        localStorage.setItem(CART_GB_KEY,String(gb.gb_number||''));
      }catch(e){}
      if(typeof window.updateCart==='function')try{window.updateCart()}catch(e){}
    }
    return{cart:kept,changed,removed};
  }
  function getVerifiedEmail(){return(localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'').trim().toLowerCase()}
  function itemName(i){return i.product_name||i.productName||i.name||'Product'}
  function itemStrength(i){return i.strength||i.variant_strength||i.variant||''}
  function itemQty(i){return Number(i.qty??i.quantity??1)}
  function itemPrice(i){return Number(i.unit_price??i.price??0)}
  function itemProductId(i){return i.product_id||i.productId||null}
  function itemVariantId(i){return i.variant_id||i.variantId||null}
  function totals(){const cart=getCart();return{cart,subtotal:cart.reduce((s,i)=>s+itemPrice(i)*itemQty(i),0)}}
  function orderId(){const gb=getGB();const n=(gb?.gb_number||'GB').replace(/[^A-Za-z0-9-]/g,'');return`${n}-ORD-${Date.now().toString(36).toUpperCase()}`}
  function uuid(){try{return crypto.randomUUID()}catch(e){return'OI-'+Date.now()+'-'+Math.random().toString(36).slice(2)}}
  function injectStyles(){if($('pepCheckoutFinalStyles'))return;const s=document.createElement('style');s.id='pepCheckoutFinalStyles';s.textContent=`
#checkoutModal{z-index:100001!important;padding:12px!important;background:rgba(48,20,39,.58)!important;backdrop-filter:blur(8px)!important}#checkoutModal .modalbox{width:min(820px,100%)!important;max-height:94vh!important;overflow:auto!important;padding:0!important;border:1px solid #efcfe0!important;border-radius:30px!important;background:#fff!important;box-shadow:0 30px 100px rgba(55,19,43,.30)!important}.pepFinalHead{position:relative;overflow:hidden;padding:28px 30px 24px;background:linear-gradient(135deg,#ffeaf5 0%,#fff7fb 58%,#f5ecff 100%);border-bottom:1px solid #f1d9e6}.pepFinalHead:after{content:'♡';position:absolute;right:28px;bottom:-19px;font:100px/1 Georgia,serif;color:rgba(216,55,143,.10)}.pepFinalKicker{font-size:9px;letter-spacing:.20em;font-weight:950;color:#d52887;text-transform:uppercase}.pepFinalHead h2{position:relative;margin:7px 0 5px;font-size:34px;line-height:1.02;letter-spacing:-1.2px;color:#30212b}.pepFinalHead p{position:relative;margin:0;max-width:590px;color:#816f79;font-size:12px;line-height:1.55}.pepFinalBody{padding:20px 30px 30px}.pepStep{display:flex;align-items:center;gap:10px;margin:0 0 17px;color:#a17d8f;font-size:10px;font-weight:900}.pepStep span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#d92a8b;color:#fff;font-size:10px}.pepStep:after{content:'';height:1px;background:#efd9e5;flex:1}.pepFinalCard{background:#fffafd;border:1px solid #efdce7;border-radius:20px;padding:17px;margin-bottom:14px}.pepFinalTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;font-size:10px;letter-spacing:.14em;font-weight:950;color:#9e4c78;text-transform:uppercase}.pepFinalTitle .optional{font-size:8px;letter-spacing:.04em;color:#b59ba8}.pepOrderLine{display:flex;justify-content:space-between;gap:15px;padding:10px 11px;background:#fff;border:1px solid #f1e1e9;border-radius:13px;margin-top:7px;font-size:12px}.pepOrderLine b{display:block;color:#33242d}.pepOrderLine small{display:block;margin-top:2px;color:#917d87}.pepOrderAmount{font-weight:950;color:#3c2933;white-space:nowrap}.pepTotalRows{display:grid;gap:7px}.pepTotalRow{display:flex;justify-content:space-between;gap:12px;color:#74636c;font-size:12px}.pepTotalRow.grand{margin-top:6px;padding-top:12px;border-top:1px solid #ead8e3;color:#2f2229;font-size:18px;font-weight:950}.pepPaid{font-size:8px;font-weight:950;color:#177143;background:#e8f8ef;border-radius:999px;padding:4px 6px;margin-left:4px}.pepPaymentGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.pepPayChoice{position:relative;min-height:88px;text-align:left;border:1px solid #ead8e4;border-radius:16px;background:#fff;padding:13px 10px;cursor:pointer;color:#35252e;transition:.16s}.pepPayChoice:hover{transform:translateY(-1px);border-color:#df76ac}.pepPayChoice.selected{border:2px solid #d92a8b;background:linear-gradient(145deg,#fff0f8,#fff9fc);box-shadow:0 8px 20px rgba(217,42,139,.11)}.pepPayChoice.selected:after{content:'✓';position:absolute;right:8px;top:8px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#d92a8b;color:#fff;font-size:11px;font-weight:950}.pepPayIcon{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#fce3f1;color:#c12678;font-weight:950;font-size:13px;margin-bottom:8px}.pepPayName{display:block;font-size:12px;font-weight:950}.pepPaySub{display:block;font-size:8px;color:#9a7b8a;margin-top:2px}.pepPaymentHint{margin-top:9px;font-size:10px;line-height:1.5;color:#826e79}.pepSelectedPayment{margin-top:8px;padding:8px 10px;border-radius:11px;background:#fcecf5;color:#9d4c77;font-size:10px;font-weight:850}.pepQRWrap{display:grid;grid-template-columns:185px 1fr;gap:18px;align-items:center}.pepQRWrap img{width:185px;height:185px;object-fit:contain;background:#fff;border:7px solid #fff;border-radius:18px;box-shadow:0 7px 24px rgba(95,38,76,.10)}.pepQRText h3{margin:0 0 5px;color:#30222b;font-size:16px}.pepQRText p{margin:0;color:#7f7078;font-size:11px;line-height:1.6}.pepQRNote{margin-top:9px;padding:9px 10px;border-radius:11px;background:#fff1f8;color:#9c4b76;font-size:10px;font-weight:800}.pepFields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pepField{display:flex;flex-direction:column;gap:6px}.pepField.full{grid-column:1/-1}.pepField label{font-size:9px;font-weight:950;letter-spacing:.05em;color:#4b3842}.pepField label em{font-style:normal;color:#d52887}.pepField input,.pepField textarea,.pepField select{width:100%;box-sizing:border-box;border:1px solid #e9d7e2;border-radius:13px;background:#fff;min-height:44px;padding:10px 12px;color:#34262e;outline:none;font:inherit}.pepField textarea{min-height:78px;resize:vertical}.pepField input:focus,.pepField textarea:focus,.pepField select:focus{border-color:#db5c9e;box-shadow:0 0 0 3px rgba(219,92,158,.08)}.pepUpload{border:1.5px dashed #d89abb;border-radius:16px;background:#fff5fa;padding:14px}.pepUpload input{width:100%;font-size:11px}.pepUploadHint{margin-top:7px;font-size:10px;color:#84727b;line-height:1.5}.pepFileName{display:none;margin-top:8px;padding:8px 10px;border-radius:10px;background:#fceaf4;color:#9e4b77;font-size:10px;font-weight:850}.pepFileName.show{display:block}.pepReturningNote{margin-top:12px;padding:12px 13px;border-radius:13px;background:linear-gradient(135deg,#fff0f7,#faf1ff);border:1px solid #efd4e5;color:#914b73;font-size:11px;line-height:1.55;font-weight:750}#pepCheckoutMsg{margin-bottom:12px}.pepFinalError{padding:12px 14px;border-radius:13px;background:#fff0f3;border:1px solid #f0cbd5;color:#a3253f;font-size:11px;line-height:1.55}.pepFinalActions{display:flex;gap:9px;margin-top:17px}.pepFinalActions button{min-height:49px;border-radius:14px;padding:10px 18px;font-weight:950;cursor:pointer}.pepSubmit{flex:1;border:0;color:#fff;background:linear-gradient(135deg,#e82f91,#c55ed0);box-shadow:0 11px 25px rgba(210,43,139,.20)}.pepCancel{border:1px solid #e7d2df;background:#fff7fb;color:#4b3842;min-width:120px}
/* Clean payment-submitted dialog */
#pepInfoModal{z-index:999998!important;background:rgba(55,28,48,.28)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
#pepInfoModal.open{display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important}
#pepInfoModal>div{
 width:min(470px,calc(100vw - 36px))!important;
 border:1px solid rgba(224,70,151,.16)!important;border-radius:30px!important;
 background:linear-gradient(145deg,#fff 0%,#fff8fc 68%,#faf2ff 100%)!important;
 box-shadow:0 22px 55px rgba(67,28,54,.18)!important;
 padding:34px 30px 30px!important;text-align:center!important;
}
#pepInfoModal #pepInfoTitle{
 font-size:29px!important;line-height:1.15!important;letter-spacing:-.6px!important;
 margin:0 0 9px!important;color:#3d2936!important;
}
#pepInfoModal #pepInfoText{
 font-size:13px!important;line-height:1.65!important;color:#786773!important;
 max-width:370px!important;margin:0 auto 25px!important;
}
#pepInfoModal #pepInfoOk{
 min-width:155px!important;min-height:48px!important;padding:12px 30px!important;
 border:0!important;border-radius:15px!important;
 background:linear-gradient(135deg,#e72b8b,#bf42bd)!important;color:#fff!important;
 font-weight:900!important;letter-spacing:.2px!important;
 box-shadow:0 9px 22px rgba(207,44,133,.18)!important;
 transition:transform .15s ease,box-shadow .15s ease!important;
}
#pepInfoModal #pepInfoOk:hover{transform:translateY(-1px)!important;box-shadow:0 12px 25px rgba(207,44,133,.22)!important}
@media(max-width:520px){
 #pepInfoModal{padding:14px!important}
 #pepInfoModal>div{width:100%!important;padding:29px 20px 23px!important;border-radius:25px!important}
 #pepInfoModal #pepInfoTitle{font-size:26px!important}
}
#pepInfoModal #pepInfoTitle{font-size:26px!important}}@media(max-width:700px){.pepFinalBody{padding:17px 18px 23px}.pepFinalHead{padding:24px 20px 20px}.pepFinalHead h2{font-size:29px}.pepPaymentGrid{grid-template-columns:1fr 1fr}.pepQRWrap{grid-template-columns:1fr;text-align:center}.pepQRWrap img{margin:auto;width:210px;height:210px}.pepQRText{text-align:left}.pepFields{grid-template-columns:1fr}.pepField.full{grid-column:auto}.pepFinalActions{flex-direction:column}.pepCancel{order:2}}`;document.head.appendChild(s)}
  if(!document.getElementById('pep-success-popup-v2')){
  const s=document.createElement('style');
  s.id='pep-success-popup-v2';
  s.textContent=`
#pepInfoModal{position:fixed!important;inset:0!important;z-index:999998!important;display:none!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(48,26,42,.22)!important}
#pepInfoModal.open{display:flex!important}
#pepInfoModal>.pepSuccessCard,.pepSuccessCard{
 box-sizing:border-box!important;width:min(440px,calc(100vw - 34px))!important;
 padding:34px 34px 28px!important;border-radius:30px!important;
 border:1px solid rgba(218,91,161,.18)!important;
 background:linear-gradient(145deg,#fff 0%,#fff8fc 62%,#faf3ff 100%)!important;
 box-shadow:0 24px 70px rgba(70,34,56,.20)!important;
 text-align:center!important;position:relative!important;overflow:hidden!important;
}
.pepSuccessCard:before{content:"";position:absolute;inset:-80px -60px auto auto;width:190px;height:190px;border-radius:50%;background:rgba(242,143,195,.12);filter:blur(2px);pointer-events:none}
.pepSuccessIcon{width:76px!important;height:76px!important;margin:0 auto 12px!important;border-radius:50%!important;background:linear-gradient(145deg,#e52b91,#c341bd)!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 12px 28px rgba(211,43,143,.22)!important}
.pepSuccessIcon span{color:#fff!important;font-size:43px!important;font-weight:500!important;line-height:1!important}
.pepSuccessBrand{font-size:10px!important;letter-spacing:3px!important;font-weight:950!important;color:#c92d88!important;margin-bottom:8px!important}
.pepSuccessTitle{font-size:30px!important;line-height:1.12!important;letter-spacing:-.7px!important;color:#382934!important;margin:0 0 9px!important;font-weight:950!important}
.pepSuccessOrder{display:inline-block!important;padding:7px 12px!important;border-radius:999px!important;background:#fcebf5!important;color:#8d5977!important;font-size:11px!important;letter-spacing:.2px!important;margin-bottom:17px!important}
.pepSuccessOrder b{color:#572f48!important}
.pepSuccessText{max-width:350px!important;margin:0 auto 17px!important;color:#756672!important;font-size:13px!important;line-height:1.65!important}
.pepSuccessNote{display:flex!important;gap:9px!important;align-items:flex-start!important;text-align:left!important;max-width:350px!important;margin:0 auto 24px!important;padding:12px 13px!important;border-radius:15px!important;background:rgba(249,237,247,.72)!important;border:1px solid #f0dce9!important;color:#74566a!important;font-size:11px!important;line-height:1.5!important}
.pepSuccessNote>span:first-child{flex:0 0 auto;width:19px;height:19px;border-radius:50%;background:#e83b95;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
.pepSuccessDone{width:100%!important;min-height:50px!important;border:0!important;border-radius:15px!important;background:linear-gradient(135deg,#e72b8b,#bd3fba)!important;color:#fff!important;font-size:14px!important;font-weight:950!important;letter-spacing:.3px!important;cursor:pointer!important;box-shadow:0 10px 24px rgba(205,44,139,.20)!important}
.pepSuccessDone:hover{transform:translateY(-1px)!important}
@media(max-width:520px){#pepInfoModal{padding:14px!important}.pepSuccessCard{padding:29px 20px 22px!important;border-radius:25px!important}.pepSuccessIcon{width:68px!important;height:68px!important}.pepSuccessTitle{font-size:26px!important}}
`;
  document.head.appendChild(s);
}

  function buildCheckout(){
    const modal=$('checkoutModal'),box=modal?.querySelector('.modalbox'),{cart,subtotal}=totals();
    if(!modal||!box||!cart.length)return;
    const gb=getGB(),qr=gb?.final_payment_qr_url||'',adminFee=Number(gb?.admin_fee||0);
    const customer=checkoutCustomer||{};
    const email=customer.email||'';
    const lines=cart.map(i=>`<div class="pepOrderLine"><div><b>${esc(itemName(i))}</b><small>${esc(itemStrength(i))}${itemStrength(i)?' • ':''}Qty ${itemQty(i)} × ${peso(itemPrice(i))}</small></div><div class="pepOrderAmount">${peso(itemPrice(i)*itemQty(i))}</div></div>`).join('');
    const qrBlock=qr?`<div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT QR <span class="optional">Scan to pay</span></div><div class="pepQRWrap"><img src="${esc(qr)}" alt="PEPMOSA payment QR"><div class="pepQRText"><h3>Pay your order</h3><p>Complete the payment using the QR above, then upload your payment receipt or screenshot below.</p><div class="pepQRNote">Make sure the amount paid matches your order total.</div></div></div></div>`:`<div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT</div><div class="pepQRText"><h3>Payment QR unavailable</h3><p>Please contact PEPMOSA before submitting your order.</p></div></div>`;
    box.innerHTML=`<div class="pepFinalHead"><div class="pepFinalKicker">PEPMOSA GROUP BUY</div><h2>Checkout ♡</h2><p>Review your order, choose your shipping method, pay, and upload your payment proof. Your saved account details are already filled in.</p></div><div class="pepFinalBody"><div class="pepStep"><span>1</span> ORDER REVIEW</div><div id="pepCheckoutMsg"></div><div class="pepFinalCard"><div class="pepFinalTitle">YOUR ORDER</div>${lines}</div><div class="pepFinalCard"><div class="pepFinalTitle">ORDER TOTAL</div><div class="pepTotalRows"><div class="pepTotalRow"><span>Products</span><b>${peso(subtotal)}</b></div><div class="pepTotalRow"><span>Admin fee <span class="pepPaid">CHECKED ON SUBMIT</span></span><b>${peso(adminFee)}</b></div><div class="pepTotalRow"><span>Shipping</span><b id="pepShippingFee">₱100.00</b></div><div class="pepTotalRow grand"><span>TOTAL</span><span id="pepGrandTotal">${peso(subtotal+100)}</span></div></div></div><div class="pepStep"><span>2</span> PAYMENT</div>${qrBlock}<div class="pepStep"><span>3</span> SAVED CUSTOMER DETAILS</div><div class="pepFinalCard"><div class="pepFields"><div class="pepField"><label>Full Name</label><input value="${esc(customer.customer_name)}" readonly></div><div class="pepField"><label>Contact Number</label><input value="${esc(customer.contact)}" readonly></div><div class="pepField"><label>Email</label><input value="${esc(email)}" readonly></div><div class="pepField"><label>WhatsApp Name</label><input value="${esc(customer.whatsapp_name)}" readonly></div><div class="pepField full"><label>Complete Delivery Address</label><textarea readonly>${esc(customer.address)}</textarea></div></div><div class="pepReturningNote">♡ Your PEPMOSA account details are saved and will be used automatically. You don't need to type them again.</div></div><div class="pepFinalCard"><div class="pepFinalTitle">SHIPPING METHOD <span class="optional">Required</span></div><div class="pepFields"><div class="pepField full"><select id="pepShippingMethod"><option value="0">J&T Express — Luzon • ₱100</option><option value="1">J&T Express — Visayas • ₱150</option><option value="2">J&T Express — Mindanao • ₱180</option><option value="3">Lalamove — APP RATE</option></select></div></div></div><div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT PROOF <span class="optional">Required</span></div><div class="pepUpload"><input id="pepOrderProof" type="file" accept="image/*,.pdf"><div id="pepFileName" class="pepFileName"></div><div class="pepUploadHint">Upload your payment receipt or screenshot • JPG, PNG, or PDF • Maximum 5MB</div></div></div><div class="pepFinalActions"><button id="pepPlaceOrder" class="pepSubmit" type="button">SUBMIT MY ORDER</button><button id="pepCancelOrder" class="pepCancel" type="button">CANCEL</button></div></div>`;
    $('pepOrderProof')?.addEventListener('change',function(){const f=this.files?.[0],n=$('pepFileName');if(f){n.textContent='✓ '+f.name;n.classList.add('show')}else{n.textContent='';n.classList.remove('show')}});
    $('pepShippingMethod')?.addEventListener('change',updateTotals);
    $('pepPlaceOrder').onclick=submitOrder;$('pepCancelOrder').onclick=closeCheckout;updateTotals();
  }
  function updateTotals(){
    const {subtotal}=totals();
    const i=Number($('pepShippingMethod')?.value||0),fee=[100,150,180,0][i]??100;
    if($('pepShippingFee'))$('pepShippingFee').textContent=fee?peso(fee):'APP RATE';
    if($('pepGrandTotal'))$('pepGrandTotal').textContent=fee?peso(subtotal+fee):peso(subtotal);
  }
  function closeCheckout(){const m=$('checkoutModal');if(m){m.classList.remove('open','show');m.style.removeProperty('display')}}
  function showSoldOutAndRefresh(message){
    clearPersistedCart();
    closeCheckout();
    const cartModal=$('cartModal');if(cartModal)cartModal.classList.remove('show','open');
    const text=message||'Sorry! This variant was just completed by another customer and is now sold out. Refreshing the shop…';
    if(typeof window.pepmosaPopup==='function')window.pepmosaPopup(text);else alert(text);
    setTimeout(()=>window.location.reload(),1200);
  }
  window.checkout=async function(){
    const activeGB=getGB();
    if(!activeGB || !['OPEN','KIT_COMPLETION'].includes(String(activeGB.status||'').toUpperCase())){
      if(typeof window.pepmosaPopup==='function')window.pepmosaPopup('Ordering is currently closed. You can still browse products and keep items in your cart.');
      else alert('Ordering is currently closed.');
      return;
    }
    if(typeof window.pepRequireApprovedFee==='function'){
      const feeOk=await window.pepRequireApprovedFee();
      if(!feeOk)return;
    }
    const{cart}=totals();if(!cart.length){if(typeof window.openCart==='function')window.openCart();return}
    if(typeof window.closeModal==='function')window.closeModal('cartModal');else $('cartModal')?.classList.remove('show');
    const freshCart=cart.filter(i=>String(i.gb_number||'')===String(activeGB?.gb_number||''));
    if(freshCart.length!==cart.length){window.cart=freshCart;localStorage.setItem(CART_KEY,JSON.stringify(freshCart));localStorage.setItem(CART_GB_KEY,String(activeGB?.gb_number||''));}
    if(!freshCart.length){if(typeof window.openCart==='function')window.openCart();return}
    let cleanCart=freshCart;
    try{
      const cleaned=await sanitizeKitCart(cleanCart,activeGB);cleanCart=cleaned.cart;
      if(cleaned.changed){
        if(!cleanCart.length){showSoldOutAndRefresh('Sorry! The remaining vial was just secured by another customer. This variant is now SOLD OUT. Refreshing the shop…');return}
        alert('Your cart was updated because one of the variants is no longer available. Please review the remaining items.');
      }
    }catch(e){alert(e.message||'Unable to verify live remaining vials. Please try again.');return}
    if(!cleanCart.length){if(typeof window.openCart==='function')window.openCart();return}
    checkoutCustomer=await loadCheckoutCustomer();
    if(!checkoutCustomer?.email || !checkoutCustomer.customer_name || !checkoutCustomer.contact || !checkoutCustomer.address){
      if(typeof window.pepmosaPopup==='function')window.pepmosaPopup('Please complete your PEPMOSA account details before checkout.');else alert('Please complete your PEPMOSA account details before checkout.');
      return;
    }
    buildCheckout();$('checkoutModal')?.classList.add('open');
  };
;