/* PEPMOSA FINAL GIRLY STOREFRONT + CHECKOUT
   Visual redesign only, while preserving the existing Supabase/order flow. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const S=()=>window.sb||window.__sb;
  let installed=false;

  function css(){
    if($('pepFinalGirlyStyles'))return;
    const s=document.createElement('style');s.id='pepFinalGirlyStyles';s.textContent=`
      :root{--pink:#d72887;--pink2:#ef67ad;--ink:#30242c;--muted:#8d7783;--line:#efd8e6;--soft:#fff4f9;--lav:#f7f0ff}
      body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
      /* PRODUCT SHOP */
      #products{max-width:1160px!important;margin:0 auto!important;padding:4px 22px 70px!important}
      #products .sectionHead{align-items:center!important;margin:40px 0 22px!important}
      #products .sectionHead h2{font-size:34px!important;letter-spacing:-1.2px!important;margin:5px 0 0!important}
      #products .sectionHead .eyebrow{font-size:9px!important;letter-spacing:.2em!important}
      #products .search{max-width:320px!important;height:46px!important;border-radius:999px!important;padding:0 18px!important;background:#fff!important;border:1px solid #ebd3e0!important;box-shadow:0 7px 20px rgba(180,78,135,.07)!important}
      #productGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:20px!important;align-items:stretch!important}
      #productGrid>.card,#productGrid>.pepProductCard{position:relative!important;display:flex!important;flex-direction:column!important;min-width:0!important;overflow:hidden!important;padding:0!important;border:1px solid var(--line)!important;border-radius:24px!important;background:linear-gradient(180deg,#fff 0%,#fffafd 100%)!important;box-shadow:0 14px 34px rgba(115,48,91,.075)!important;transition:transform .2s ease,box-shadow .2s ease!important}
      #productGrid>.card:hover,#productGrid>.pepProductCard:hover{transform:translateY(-4px)!important;box-shadow:0 22px 45px rgba(115,48,91,.12)!important}
      #productGrid .productImg,#productGrid .pepProductImage{position:relative!important;height:230px!important;min-height:230px!important;margin:0!important;border:0!important;border-bottom:1px solid #f3e1e9!important;border-radius:24px 24px 0 0!important;background:radial-gradient(circle at 30% 20%,#fff 0,#fff4fa 55%,#f8efff 100%)!important;padding:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
      #productGrid .productImg:before,#productGrid .pepProductImage:before{content:'PEPMOSA';position:absolute;left:14px;top:13px;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.86);border:1px solid #f0d6e4;color:#bd4c81;font-size:8px;font-weight:950;letter-spacing:.12em;z-index:2}
      #productGrid .productImg img,#productGrid .pepProductImage img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;padding:0!important;display:block!important;filter:drop-shadow(0 8px 12px rgba(103,52,86,.08))}
      #productGrid .card h3,#productGrid .card>.productName,#productGrid .pepProductName{font-size:18px!important;line-height:1.12!important;font-weight:950!important;margin:16px 18px 5px!important;color:#2d232a!important;letter-spacing:-.2px!important}
      #productGrid .card>.muted,#productGrid .card>p,#productGrid .pepProductDesc{font-size:10.5px!important;line-height:1.5!important;color:#927f89!important;margin:0 18px 12px!important;min-height:31px!important}
      #productGrid .variantList,#productGrid .variants,#productGrid .productVariants,#productGrid .pepVariants{display:grid!important;gap:8px!important;max-height:none!important;overflow:visible!important;padding:0 15px 17px!important;margin:0!important}
      #productGrid .variant,#productGrid .variantRow,#productGrid .pepVariantRow{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;align-items:center!important;gap:7px!important;margin:0!important;padding:9px!important;border:1px solid #f0dce7!important;border-radius:14px!important;background:#fff!important}
      #productGrid .variantStrength,#productGrid .pepVariantStrength{font-size:12px!important;font-weight:950!important;color:#3a2b33!important}
      #productGrid .variantPrice,#productGrid .pepVariantPrice{font-size:10px!important;color:#b04d7f!important;font-weight:850!important;white-space:nowrap!important}
      #productGrid .qty,#productGrid .pepVariantQty{width:58px!important;height:36px!important;border:1px solid #e8d3df!important;border-radius:10px!important;text-align:center!important;background:#fff!important;padding:0 5px!important}
      #productGrid .variantRow .btn,#productGrid .variant button,#productGrid .pepVariantAdd{height:36px!important;min-width:54px!important;padding:0 11px!important;border:0!important;border-radius:10px!important;background:linear-gradient(135deg,#e73591,#c94f9d)!important;color:#fff!important;font-size:10px!important;font-weight:950!important;cursor:pointer!important;box-shadow:0 6px 14px rgba(215,40,135,.16)!important}
      #productGrid .minBadge,#productGrid .pepMin{font-size:8.5px!important;color:#a75b80!important;font-weight:800!important;margin:3px 3px 0!important}
      /* ALL POPUPS */
      .modal,#pepSiteNoticeModal{background:rgba(43,22,38,.58)!important;backdrop-filter:blur(9px)!important;-webkit-backdrop-filter:blur(9px)!important}
      .modalbox,.pepSiteNoticeCard,.pepFeeBox{border:1px solid rgba(230,174,204,.7)!important;border-radius:28px!important;background:linear-gradient(145deg,#fff 0%,#fff7fb 62%,#f8f0ff 100%)!important;box-shadow:0 30px 100px rgba(53,20,45,.28)!important}
      .modalbox:before,.pepSiteNoticeCard:before,.pepFeeBox:before{content:'♡';position:absolute;right:22px;top:13px;font:52px/1 Georgia,serif;color:rgba(215,40,135,.08);pointer-events:none}
      .modalbox h2,.pepSiteNoticeCard h2,.pepFeeBox h2{color:#2d2229!important}
      .modalbox .sectionHead{background:linear-gradient(135deg,#fff0f8,#fff 62%,#f6efff)!important;border-bottom:1px solid #f0dce8!important}
      .modalbox .btn.primary,.pepSiteNoticeActions .primary,.pepFeeBtn{background:linear-gradient(135deg,#e73591,#c64e9c)!important;border:0!important;color:#fff!important;box-shadow:0 9px 20px rgba(215,40,135,.18)!important}
      .modalbox .btn.secondary,.pepSiteNoticeActions button,.pepSiteNoticeActions a,.pepFeeBtn.secondary{background:#fff7fb!important;border:1px solid #ead3df!important;color:#4a3541!important}
      /* CHECKOUT */
      #checkoutModal .modalbox{width:min(790px,calc(100vw - 24px))!important;max-height:92vh!important;padding:0!important;overflow:auto!important}
      #checkoutModal .girlyCheckoutHead{padding:30px 31px 23px!important;background:linear-gradient(135deg,#ffe9f4 0%,#fff7fb 58%,#f5edff 100%)!important;border-bottom:1px solid #f0dce7!important;position:relative!important;overflow:hidden!important}
      #checkoutModal .girlyCheckoutHead:after{content:'✦  ♡  ✦';position:absolute;right:28px;bottom:17px;color:rgba(211,40,133,.13);font-size:23px;letter-spacing:6px}
      #checkoutModal .girlyKicker{font-size:9px!important;letter-spacing:.2em!important;font-weight:950!important;color:#c72b80!important;text-transform:uppercase!important}
      #checkoutModal .girlyCheckoutHead h2{font-size:33px!important;line-height:1!important;margin:8px 0 6px!important;letter-spacing:-1.2px!important}
      #checkoutModal .girlyCheckoutHead p{font-size:11px!important;line-height:1.55!important;color:#806f79!important;margin:0!important;max-width:590px!important}
      #checkoutModal .girlyCheckoutBody{padding:22px 31px 29px!important}
      .girlySection{margin-bottom:18px!important;padding:17px!important;border:1px solid #efd9e6!important;border-radius:20px!important;background:rgba(255,250,253,.88)!important}
      .girlySectionTitle{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px!important;color:#9e4a76!important;font-size:9px!important;letter-spacing:.15em!important;font-weight:950!important;text-transform:uppercase!important}
      .girlyOrderLine{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid #f1e0e8;border-radius:13px;background:#fff;margin-top:7px}
      .girlyOrderLine b{font-size:11px!important}.girlyOrderLine small{display:block;color:#9a818d;font-size:9px;margin-top:3px}.girlyOrderAmt{font-weight:950;font-size:11px;white-space:nowrap;color:#3b2933}
      .girlyTotals{display:grid;gap:7px}.girlyTotal{display:flex;justify-content:space-between;font-size:11px;color:#786771}.girlyTotal.grand{border-top:1px solid #ead8e3;margin-top:5px;padding-top:12px;font-size:18px;font-weight:950;color:#2f2229}
      .girlyPaid{font-size:7px;background:#e8f8ef;color:#167142;border-radius:999px;padding:4px 6px;font-weight:950;margin-left:4px}
      .girlyFields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.girlyField{display:flex;flex-direction:column;gap:6px}.girlyField.full{grid-column:1/-1}.girlyField label{font-size:9px;font-weight:950;color:#493640}.girlyField label span{color:#d72887}.girlyField input,.girlyField textarea,.girlyField select{width:100%;box-sizing:border-box;min-height:44px;border:1px solid #e8d5e0!important;border-radius:13px!important;background:#fff!important;padding:10px 12px!important;color:#382a32!important;outline:none!important}.girlyField textarea{min-height:80px;resize:vertical}.girlyField input:focus,.girlyField textarea:focus,.girlyField select:focus{border-color:#d95a9c!important;box-shadow:0 0 0 3px rgba(217,90,156,.08)!important}
      .girlyUpload{padding:13px;border:1.5px dashed #d99bbb;border-radius:15px;background:#fff5fa}.girlyUpload input{width:100%;font-size:10px}.girlyUploadNote{margin-top:7px;font-size:9px;line-height:1.5;color:#8a7480}.girlyFile{display:none;margin-top:8px;padding:8px 10px;border-radius:10px;background:#fceaf4;color:#9d4b77;font-size:9px;font-weight:900}.girlyFile.show{display:block}
      .girlyShipHint{font-size:9px;color:#917c87;margin-top:7px;line-height:1.45}.girlyLala{display:none;margin-top:8px;padding:9px 10px;border-radius:11px;background:#fff0f8;color:#8e4b71;font-size:9px;line-height:1.5}
      .girlyActions{display:flex;gap:9px;margin-top:5px}.girlyActions button{min-height:48px;border-radius:14px;font-weight:950;cursor:pointer;padding:10px 17px}.girlySubmit{flex:1;border:0;background:linear-gradient(135deg,#e73591,#c64e9c);color:#fff;box-shadow:0 10px 23px rgba(215,40,135,.18)}.girlyCancel{border:1px solid #ead3df;background:#fff7fb;color:#4a3541;min-width:110px}
      .girlyError{padding:11px 13px;border-radius:12px;background:#fff0f3;border:1px solid #efccd7;color:#a02543;font-size:10px;line-height:1.5;margin-bottom:12px}.girlySuccess{padding:11px 13px;border-radius:12px;background:#e8f8ef;color:#176e42;font-size:10px}
      @media(max-width:850px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:650px){#products{padding:4px 12px 50px!important}#products .sectionHead{display:block!important;margin-top:30px!important}#products .search{max-width:none!important;width:100%!important;margin-top:13px!important}#productGrid{grid-template-columns:1fr!important;gap:15px!important}#productGrid .productImg,#productGrid .pepProductImage{height:240px!important;min-height:240px!important}.girlyFields{grid-template-columns:1fr}.girlyField.full{grid-column:auto}#checkoutModal .girlyCheckoutHead{padding:23px 20px 19px!important}#checkoutModal .girlyCheckoutBody{padding:17px 20px 23px!important}.girlyActions{flex-direction:column}.girlyCancel{order:2}.modal{padding:10px!important}}
    `;document.head.appendChild(s);
  }

  function cartData(){try{return Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]')}catch(e){return[]}}
  function cartItemName(i){return i.product_name||i.productName||i.name||'Product'}
  function cartStrength(i){return i.strength||i.variant_strength||i.variant||''}
  function cartQty(i){return Number(i.qty??i.quantity??1)}
  function cartPrice(i){return Number(i.unit_price??i.price??0)}
  function subtotal(){return cartData().reduce((s,i)=>s+cartPrice(i)*cartQty(i),0)}
  function gb(){return window.currentGB||window.pepmosaCurrentGB||null}
  function close(){const m=$('checkoutModal');if(m){m.classList.remove('open','show');m.style.removeProperty('display')}}

  function buildCheckout(){
    const m=$('checkoutModal'),box=m?.querySelector('.modalbox'),cart=cartData(),sub=subtotal(),g=gb();if(!m||!box||!cart.length)return;
    const qr=g?.final_payment_qr_url||'';const adminFee=Number(g?.admin_fee||0);const email=(localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'').trim().toLowerCase();
    const lines=cart.map(i=>`<div class="girlyOrderLine"><div><b>${esc(cartItemName(i))}</b><small>${esc(cartStrength(i))}${cartStrength(i)?' • ':''}Qty ${cartQty(i)} × ${peso(cartPrice(i))}</small></div><div class="girlyOrderAmt">${peso(cartPrice(i)*cartQty(i))}</div></div>`).join('');
    const qrHtml=qr?`<div class="girlySection"><div class="girlySectionTitle"><span>PAYMENT QR</span><span>SCAN TO PAY</span></div><div style="display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center"><img src="${esc(qr)}" alt="Payment QR" style="width:180px;height:180px;object-fit:contain;border:7px solid #fff;border-radius:18px;box-shadow:0 7px 24px rgba(90,40,75,.10)"><div><h3 style="margin:0 0 6px;font-size:16px;color:#30222b">Pay your order ♡</h3><p style="margin:0;color:#806f79;font-size:10px;line-height:1.6">Complete your payment using the displayed QR, then upload your payment receipt below.</p><div style="margin-top:9px;padding:9px 10px;border-radius:11px;background:#fff0f8;color:#96486f;font-size:9px;font-weight:850">Please make sure the amount paid matches your order total.</div></div></div></div>`:'';
    box.innerHTML=`<div class="girlyCheckoutHead"><div class="girlyKicker">PEPMOSA GROUP BUY</div><h2>Checkout ♡</h2><p>Review your order, choose your delivery option, and submit your payment proof. Simple, clean, and ready to go.</p></div><div class="girlyCheckoutBody"><div id="pepCheckoutMsg"></div><div class="girlySection"><div class="girlySectionTitle">YOUR ORDER</div>${lines}</div><div class="girlySection"><div class="girlySectionTitle">ORDER TOTAL</div><div class="girlyTotals"><div class="girlyTotal"><span>Products</span><b>${peso(sub)}</b></div><div class="girlyTotal"><span>Admin fee <span class="girlyPaid">ALREADY PAID</span></span><b>${peso(adminFee)}</b></div><div class="girlyTotal"><span>Shipping</span><b id="pepShippingFee">₱80.00</b></div><div class="girlyTotal grand"><span>TOTAL</span><span id="pepGrandTotal">${peso(sub+80)}</span></div></div></div>${qrHtml}<div class="girlySection"><div class="girlySectionTitle">CUSTOMER & DELIVERY DETAILS</div><div class="girlyFields"><div class="girlyField"><label>Email <span>*</span></label><input id="pepEmail" type="email" value="${esc(email)}" autocomplete="email"></div><div class="girlyField"><label>Full Name <span>*</span></label><input id="pepCustomerName" value="${esc(localStorage.getItem('pepmosa_customer_name')||'')}" autocomplete="name"></div><div class="girlyField"><label>Contact Number <span>*</span></label><input id="pepContact" value="${esc(localStorage.getItem('pepmosa_phone')||'')}" autocomplete="tel"></div><div class="girlyField"><label>Shipping Method <span>*</span></label><select id="pepShippingMethod"><option value="0">J&T Express — Luzon • ₱80</option><option value="1">J&T Express — Visayas • ₱90</option><option value="2">J&T Express — Mindanao • ₱100</option><option value="3">Lalamove — APP RATE</option></select><div class="girlyShipHint">Choose the delivery option for your order.</div><div id="girlyLala" class="girlyLala"><b>Lalamove:</b> delivery fee follows the actual app rate and is paid by the customer upon delivery.</div></div><div class="girlyField full"><label>Complete Delivery Address <span>*</span></label><textarea id="pepAddress" placeholder="House / Unit, Street, Barangay, City / Municipality, Province, ZIP Code"></textarea></div></div></div><div class="girlySection"><div class="girlySectionTitle"><span>PAYMENT PROOF</span><span>REQUIRED</span></div><div class="girlyUpload"><input id="pepOrderProof" type="file" accept="image/*,.pdf"><div id="girlyFile" class="girlyFile"></div><div class="girlyUploadNote">Upload your payment receipt or screenshot • JPG, PNG, or PDF • Maximum 5MB</div></div></div><div class="girlyActions"><button type="button" id="pepPlaceOrder" class="girlySubmit">SUBMIT MY ORDER</button><button type="button" id="pepCancelOrder" class="girlyCancel">CANCEL</button></div></div>`;
    $('pepShippingMethod').addEventListener('change',()=>{updateShip();});
    $('pepOrderProof').addEventListener('change',function(){const f=this.files?.[0],n=$('girlyFile');if(f){n.textContent='✓ '+f.name;n.classList.add('show')}else n.classList.remove('show')});
    $('pepPlaceOrder').onclick=()=>{if(typeof window.__pepOriginalPlaceOrder==='function')window.__pepOriginalPlaceOrder();else if(typeof window.placeOrder==='function'&&window.placeOrder!==placeOrder)window.placeOrder()};
    $('pepCancelOrder').onclick=close;updateShip();
    /* No payment method UI by design. The existing order flow gets a neutral payment reference. */
    window.pepmosaSelectedPayment='ONLINE PAYMENT';
  }
  function updateShip(){const i=Number($('pepShippingMethod')?.value||0),fees=[80,90,100,0],fee=fees[i]??80,sub=subtotal();if($('pepShippingFee'))$('pepShippingFee').textContent=fee?peso(fee):'APP RATE';if($('pepGrandTotal'))$('pepGrandTotal').textContent=fee?peso(sub+fee):peso(sub);if($('girlyLala'))$('girlyLala').style.display=i===3?'block':'none'}

  function intercept(){
    const original=window.__pepOriginalCheckout||window.checkout;
    if(typeof original!=='function')return;
    if(!window.__pepGirlyCheckout){window.__pepGirlyCheckout=async function(){const c=cartData();if(!c.length){if(typeof window.openCart==='function')window.openCart();return}if(!gb()){alert('No open Group Buy is available. Please refresh and try again.');return}buildCheckout();$('checkoutModal')?.classList.add('open','show')};window.checkout=window.__pepGirlyCheckout}
    /* Always keep the original submit function available. */
    if(typeof window.__pepOriginalPlaceOrder==='function')window.__pepOriginalPlaceOrder=window.__pepOriginalPlaceOrder;
  }
  function boot(){css();intercept();setInterval(intercept,500);const grid=$('productGrid');if(grid)new MutationObserver(()=>{}).observe(grid,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
