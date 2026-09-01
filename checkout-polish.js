/* PEPMOSA checkout polish + final-payment flow */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const S=()=>window.sb||window.__sb;
  let installed=false;
  const shippingOptions=[
    {name:'J&T Express',fee:0},
    {name:'LBC',fee:0},
    {name:'JRS Express',fee:0},
    {name:'Grab / Lalamove',fee:0},
    {name:'Meet-up / Pick-up',fee:0}
  ];

  function getCart(){try{return Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]')}catch(e){return []}}
  function getGB(){try{if(typeof window.currentGB!=='undefined'&&window.currentGB)return window.currentGB}catch(e){} try{if(window.pepmosaCurrentGB)return window.pepmosaCurrentGB}catch(e){} return null}
  function getVerifiedEmail(){return (localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'').trim().toLowerCase()}
  function cartTotals(){const cart=getCart();const subtotal=cart.reduce((sum,i)=>sum+Number(i.line_total??i.total??(Number(i.price||0)*Number(i.qty||i.quantity||0))),0);return {cart,subtotal}}
  function itemName(i){return i.product_name||i.productName||i.name||'Product'}
  function itemStrength(i){return i.strength||i.variant_strength||i.variant||''}
  function itemQty(i){return Number(i.qty??i.quantity??1)}
  function itemPrice(i){return Number(i.unit_price??i.price??0)}
  function itemProductId(i){return i.product_id||i.productId||null}
  function itemVariantId(i){return i.variant_id||i.variantId||null}
  function orderId(){const gb=getGB();const n=(gb?.gb_number||'GB').replace(/[^A-Za-z0-9-]/g,'');return `${n}-ORD-${Date.now().toString(36).toUpperCase()}`}

  function injectStyles(){
    if($('pepCheckoutPolishStyles'))return;
    const s=document.createElement('style');s.id='pepCheckoutPolishStyles';s.textContent=`
      #checkoutModal .modalbox{width:min(760px,calc(100vw - 28px))!important;max-height:92vh!important;overflow:auto!important;padding:0!important;border-radius:28px!important;background:#fff!important;border:1px solid #efd8e7!important;box-shadow:0 35px 110px rgba(55,25,50,.28)!important}
      #pepCheckoutPolishHead{padding:28px 30px 22px;background:linear-gradient(135deg,#fff0f8,#fff 58%,#f4efff);border-bottom:1px solid #f0dce8}
      #pepCheckoutPolishHead .kicker{font-size:10px;font-weight:950;letter-spacing:.18em;color:#d7288d;text-transform:uppercase}
      #pepCheckoutPolishHead h2{margin:7px 0 6px;font-size:30px;line-height:1.05;letter-spacing:-.8px;color:#241b24}
      #pepCheckoutPolishHead p{margin:0;color:#7c7079;font-size:13px;line-height:1.5}
      #pepCheckoutPolishBody{padding:22px 30px 30px}
      .pepCOCard{border:1px solid #f0dce8;background:#fffafd;border-radius:18px;padding:16px;margin-bottom:16px}
      .pepCOCardTitle{font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:#a24f7b;margin-bottom:10px}
      .pepOrderSelect{width:100%;height:46px;border:1px solid #e8d4e1;border-radius:12px;background:#fff;padding:0 13px;font-weight:800;color:#332730;box-sizing:border-box}
      .pepOrderList{margin-top:10px;display:grid;gap:7px}.pepOrderLine{display:flex;justify-content:space-between;gap:12px;padding:10px 11px;background:#fff;border:1px solid #f0e1e9;border-radius:11px;font-size:12px}.pepOrderLine .left{min-width:0}.pepOrderLine b{display:block;color:#30242c}.pepOrderLine span{display:block;color:#877781;margin-top:2px}.pepOrderLine .amount{font-weight:900;color:#3a2a34;white-space:nowrap}
      .pepTotals{display:grid;gap:8px}.pepTotalRow{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#655861}.pepTotalRow.grand{padding-top:11px;margin-top:3px;border-top:1px solid #ead9e4;font-size:17px;font-weight:950;color:#251c23}.pepPaid{font-size:10px;font-weight:900;color:#17804b;background:#e8f8ef;border-radius:999px;padding:4px 7px}
      .pepQR{display:grid;grid-template-columns:190px 1fr;gap:17px;align-items:center}.pepQR img{width:190px;height:190px;object-fit:contain;border-radius:15px;border:7px solid #fff;background:#fff;box-shadow:0 8px 25px rgba(80,35,70,.10)}.pepQRText h3{margin:0 0 5px;font-size:16px;color:#2b2028}.pepQRText p{margin:0;color:#7a6e77;font-size:12px;line-height:1.55}.pepQRNote{margin-top:9px;font-size:11px;color:#a0527d;font-weight:800}
      .pepUpload{border:1.5px dashed #dca7c6;border-radius:15px;background:#fff6fb;padding:15px}.pepUpload input{width:100%;box-sizing:border-box}.pepUploadHint{font-size:11px;color:#7d6f78;margin-top:7px;line-height:1.5}.pepRequired{color:#d7288d}
      #checkoutModal .pepFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.pepField{display:flex;flex-direction:column;gap:6px}.pepField.full{grid-column:1/-1}.pepField label{font-size:10px;font-weight:950;letter-spacing:.04em;color:#392d35}.pepField input,.pepField select,.pepField textarea{width:100%;box-sizing:border-box;border:1px solid #ead8e4;border-radius:12px;background:#fff;min-height:45px;padding:11px 12px;font:inherit;color:#342830;outline:none}.pepField textarea{min-height:86px;resize:vertical}.pepField input:focus,.pepField select:focus,.pepField textarea:focus{border-color:#d7288d;box-shadow:0 0 0 3px rgba(215,40,141,.08)}
      #pepCheckoutMsg{margin-bottom:13px}.pepCOError{padding:12px 14px;border-radius:12px;background:#fff0f3;color:#a5253e;font-size:12px}.pepCOSuccess{padding:12px 14px;border-radius:12px;background:#e8f8ef;color:#176e42;font-size:12px}
      .pepCOActions{display:flex;gap:10px;margin-top:19px}.pepCOActions button{min-height:47px;border-radius:13px;padding:10px 18px;font-weight:950;cursor:pointer;border:1px solid #ead8e4}.pepCOActions .primary{flex:1;border:0;color:#fff;background:linear-gradient(135deg,#e12c91,#c41f7d);box-shadow:0 10px 25px rgba(215,43,145,.20)}.pepCOActions .secondary{background:#fff;color:#3e3039}

      #products{padding-bottom:20px}.sectionHead{margin-bottom:18px}.sectionHead h2{font-size:32px;letter-spacing:-.8px}.search{height:46px;border-radius:14px;background:rgba(255,255,255,.88);box-shadow:0 8px 25px rgba(150,70,130,.06)}
      #productGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}
      .pepProductCard{background:rgba(255,255,255,.94);border:1px solid #efdce7;border-radius:22px;padding:12px;box-shadow:0 12px 35px rgba(125,60,105,.08);min-width:0;transition:transform .18s ease,box-shadow .18s ease}.pepProductCard:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(125,60,105,.12)}
      .pepProductImage{height:190px;border-radius:16px;overflow:hidden;background:#fff4f9;border:1px solid #f1dce7;display:flex;align-items:center;justify-content:center}.pepProductImage img{width:100%;height:100%;object-fit:cover;display:block}.pepProductImage.noImage{font-size:22px;font-weight:950;color:#b34e82}
      .pepProductName{font-size:17px;font-weight:950;letter-spacing:-.2px;margin:13px 4px 3px;color:#281f25}.pepProductDesc{font-size:11px;line-height:1.45;color:#887881;margin:0 4px 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:32px}
      .pepVariants{display:grid;gap:8px}.pepVariantRow{display:grid;grid-template-columns:minmax(0,1fr) 64px 56px;gap:7px;align-items:center;padding:9px 9px;border:1px solid #f0dce7;background:#fffafd;border-radius:14px}.pepVariantInfo{min-width:0}.pepVariantStrength{font-size:13px;font-weight:950;color:#33262f}.pepVariantPrice{font-size:10px;color:#9a7187;margin-top:2px}.pepVariantQty{width:64px!important;height:38px!important;padding:0 7px!important;text-align:center;border-radius:10px!important}.pepVariantAdd{height:38px;border:0;border-radius:10px;background:#c64b89;color:#fff;font-size:10px;font-weight:950;cursor:pointer}.pepVariantAdd:hover{background:#b73b7b}.pepMin{font-size:9px;color:#9b5279;font-weight:850;margin:4px 2px 0}
      .pepEmpty{grid-column:1/-1;background:#fff;border:1px dashed #e6cbd9;border-radius:18px;padding:35px;text-align:center;color:#7f7079}
      @media(max-width:980px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){#pepCheckoutPolishHead{padding:23px 20px 19px}#pepCheckoutPolishBody{padding:18px 20px 22px}.pepQR{grid-template-columns:1fr;text-align:center}.pepQR img{margin:0 auto;width:210px;height:210px}.pepQRText{text-align:left}#checkoutModal .pepFormGrid{grid-template-columns:1fr}.pepField.full{grid-column:auto}.pepCOActions{flex-direction:column}.pepCOActions .primary{flex:none}.pepOrderLine{align-items:flex-start}#productGrid{grid-template-columns:1fr}.pepProductImage{height:210px}.pepVariantRow{grid-template-columns:minmax(0,1fr) 58px 54px}}
    `;document.head.appendChild(s)
  }

  function buildCheckout(){
    const modal=$('checkoutModal');if(!modal)return;const box=modal.querySelector('.modalbox');if(!box)return;const {cart,subtotal}=cartTotals();if(!cart.length)return;const gb=getGB();const qr=gb?.final_payment_qr_url||'';const adminFee=Number(gb?.admin_fee||0);const email=getVerifiedEmail();const shipping=shippingOptions[0];const orderOptions=cart.map((i,idx)=>`<option value="${idx}">${esc(itemName(i))}${itemStrength(i)?' — '+esc(itemStrength(i)):''} × ${itemQty(i)} — ${peso(itemPrice(i)*itemQty(i))}</option>`).join('');const lines=cart.map(i=>`<div class="pepOrderLine"><div class="left"><b>${esc(itemName(i))}</b><span>${esc(itemStrength(i))}${itemStrength(i)?' • ':''}Qty ${itemQty(i)} × ${peso(itemPrice(i))}</span></div><div class="amount">${peso(itemPrice(i)*itemQty(i))}</div></div>`).join('');const qrBlock=qr?`<div class="pepCOCard"><div class="pepCOCardTitle">FINAL PAYMENT</div><div class="pepQR"><img src="${esc(qr)}" alt="PEPMOSA payment QR"><div class="pepQRText"><h3>Scan to Pay</h3><p>Use the QR code above for your order payment. After payment, upload your receipt below.</p><div class="pepQRNote">Please make sure the payment amount matches your total.</div></div></div></div>`:`<div class="pepCOCard"><div class="pepCOCardTitle">PAYMENT</div><div class="pepQRText"><h3>Payment QR not available yet</h3><p>Admin has not uploaded the final payment QR for this Group Buy yet.</p></div></div>`;box.innerHTML=`<div id="pepCheckoutPolishHead"><div class="kicker">PEPMOSA • CHECKOUT</div><h2>Complete Your Order</h2><p>Review your products, delivery details, total, and payment proof before submitting.</p></div><div id="pepCheckoutPolishBody"><div id="pepCheckoutMsg"></div><div class="pepCOCard"><div class="pepCOCardTitle">ORDERED PRODUCTS</div><select id="pepOrderSelect" class="pepOrderSelect"><option value="">View your ${cart.length} ordered item${cart.length===1?'':'s'}…</option>${orderOptions}</select><div class="pepOrderList">${lines}</div></div><div class="pepCOCard"><div class="pepCOCardTitle">ORDER TOTAL</div><div class="pepTotals"><div class="pepTotalRow"><span>Products subtotal</span><b>${peso(subtotal)}</b></div><div class="pepTotalRow"><span>Admin fee <span class="pepPaid">ALREADY PAID</span></span><b>${peso(adminFee)}</b></div><div class="pepTotalRow"><span>Shipping fee</span><b id="pepShippingFee">${peso(shipping.fee)}</b></div><div class="pepTotalRow grand"><span>TOTAL TO PAY</span><span id="pepGrandTotal">${peso(subtotal+shipping.fee)}</span></div></div></div>${qrBlock}<div class="pepCOCard"><div class="pepCOCardTitle">CUSTOMER DETAILS</div><div class="pepFormGrid"><div class="pepField"><label>Email <span class="pepRequired">*</span></label><input id="pepEmail" type="email" value="${esc(email)}" required></div><div class="pepField"><label>Customer Name <span class="pepRequired">*</span></label><input id="pepCustomerName" required value="${esc(localStorage.getItem('pepmosa_customer_name')||'')}"></div><div class="pepField"><label>Contact Number <span class="pepRequired">*</span></label><input id="pepContact" required value="${esc(localStorage.getItem('pepmosa_phone')||'')}"></div><div class="pepField"><label>Shipping Method <span class="pepRequired">*</span></label><select id="pepShippingMethod" required>${shippingOptions.map((o,i)=>`<option value="${i}">${esc(o.name)}</option>`).join('')}</select></div><div class="pepField full"><label>Delivery Address <span class="pepRequired">*</span></label><textarea id="pepAddress" required placeholder="Complete delivery address"></textarea></div></div></div><div class="pepCOCard"><div class="pepCOCardTitle">PAYMENT PROOF <span class="pepRequired">*</span></div><div class="pepUpload"><input id="pepOrderProof" type="file" accept="image/*,.pdf" required><div class="pepUploadHint">Upload your payment receipt/screenshot. Maximum 5MB. Required before submitting the order.</div></div></div><div class="pepCOActions"><button id="pepPlaceOrder" class="primary" type="button">SUBMIT ORDER</button><button id="pepCancelOrder" class="secondary" type="button">CANCEL</button></div></div>`;$('pepShippingMethod').addEventListener('change',updateTotals);$('pepPlaceOrder').onclick=submitOrder;$('pepCancelOrder').onclick=()=>modal.classList.remove('open');updateTotals()
  }
  function updateTotals(){const idx=Number($('pepShippingMethod')?.value||0),fee=Number(shippingOptions[idx]?.fee||0);const {subtotal}=cartTotals();if($('pepShippingFee'))$('pepShippingFee').textContent=peso(fee);if($('pepGrandTotal'))$('pepGrandTotal').textContent=peso(subtotal+fee)}
  window.checkout=function(){const {cart}=cartTotals();if(!cart.length){if(typeof window.openCart==='function')window.openCart();return}const email=getVerifiedEmail();if(!email){const verify=$('pepVerifyModal');if(verify){verify.classList.add('open');return}alert('Please verify your email before checkout.');return}buildCheckout();$('checkoutModal')?.classList.add('open')};
  window.placeOrder=async function(){await submitOrder()};
  async function submitOrder(){const msg=$('pepCheckoutMsg'),btn=$('pepPlaceOrder');const {cart,subtotal}=cartTotals();const gb=getGB();const s=S();if(!s||!gb||!cart.length){if(msg)msg.innerHTML='<div class="pepCOError">Your checkout session is not ready. Please refresh and try again.</div>';return}const email=($('pepEmail')?.value||'').trim().toLowerCase();const name=($('pepCustomerName')?.value||'').trim();const contact=($('pepContact')?.value||'').trim();const method=$('pepShippingMethod')?.selectedOptions?.[0]?.textContent?.trim()||'';const address=($('pepAddress')?.value||'').trim();const file=$('pepOrderProof')?.files?.[0];const shippingFee=Number(shippingOptions[Number($('pepShippingMethod')?.value||0)]?.fee||0);const total=subtotal+shippingFee;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||!contact||!method||!address||!file){msg.innerHTML='<div class="pepCOError">Please complete all required fields and upload your payment proof.</div>';return}if(file.size>5*1024*1024){msg.innerHTML='<div class="pepCOError">Payment proof must be 5MB or smaller.</div>';return}btn.disabled=true;btn.textContent='SUBMITTING…';msg.innerHTML='';try{const oid=orderId();const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`orders/${gb.gb_number}/${oid}-${Date.now()}.${ext}`;const up=await s.storage.from('payment-proofs').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(up.error)throw up.error;const proof=s.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;const customer=await s.from('customers').upsert({email,customer_name:name,contact,address},{onConflict:'email'}).select('customer_id').single();if(customer.error)throw customer.error;const ord=await s.from('orders').insert({order_id:oid,gb_number:gb.gb_number,customer_id:customer.data.customer_id,email,total,payment_status:'PROOF SUBMITTED',shipping_method:method,shipping_fee:shippingFee,payment_proof_url:proof,payment_reference:'CHECKOUT PROOF'}).select('*').single();if(ord.error)throw ord.error;const rows=cart.map(i=>({order_item_id:crypto.randomUUID(),order_id:oid,product_id:itemProductId(i),variant_id:itemVariantId(i),product_name:itemName(i),strength:itemStrength(i)||null,qty:itemQty(i),unit_price:itemPrice(i),line_total:itemPrice(i)*itemQty(i)}));const oi=await s.from('order_items').insert(rows);if(oi.error)throw oi.error;localStorage.setItem('pepmosa_last_order_id',oid);localStorage.setItem('pepmosa_customer_email',email);localStorage.setItem('pepmosa_customer_name',name);localStorage.setItem('pepmosa_phone',contact);localStorage.removeItem('pepmosaCart');window.cart=[];if($('cartCount'))$('cartCount').textContent='0';$('checkoutModal').classList.remove('open');if($('pepInfoTitle')&&$('pepInfoText')&&$('pepInfoModal')){$('pepInfoTitle').textContent='Order Submitted ✓';$('pepInfoText').textContent=`Your order ${oid} has been submitted successfully. Payment proof is now pending admin review.`;$('pepInfoOk').textContent='DONE';$('pepInfoModal').classList.add('open')}else alert(`Order submitted: ${oid}`);if(typeof window.renderProducts==='function')window.renderProducts()}catch(e){console.error('PEPMOSA CHECKOUT ERROR',e);msg.innerHTML='<div class="pepCOError">Unable to submit the order. Please try again. If the problem continues, contact admin.</div>'}finally{btn.disabled=false;btn.textContent='SUBMIT ORDER'}}

  /* =========================================================
     STOREFRONT REPAIR + CLEAN PRODUCT GRID
     The original product query relied on an ambiguous Supabase
     relationship. Load products and variants separately instead.
     ========================================================= */
  async function repairStorefront(){
    const s=S();
    if(!s)return false;
    try{
      let gb=getGB();
      if(!gb){
        const r=await s.from('group_buys').select('*').eq('status','OPEN').order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(r.error||!r.data)return false;
        gb=r.data;
        try{currentGB=gb}catch(e){}
      }
      const cr=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);
      if(cr.error)throw cr.error;
      const categories=(cr.data||[]).map(x=>x.category_name).filter(Boolean);
      if(!categories.length){products=[];renderCleanProducts();return true}
      const pr=await s.from('products').select('*').eq('active',true).in('category',categories).order('product_name');
      if(pr.error)throw pr.error;
      const base=pr.data||[];
      const ids=base.map(p=>p.product_id).filter(Boolean);
      let variants=[];
      if(ids.length){
        const vr=await s.from('product_variants').select('*').in('product_id',ids).eq('active',true).order('price');
        if(vr.error)throw vr.error;
        variants=vr.data||[];
      }
      const mr=await s.from('gb_minimum_quantities').select('*').eq('gb_number',gb.gb_number);
      const mins=mr.error?[]:(mr.data||[]);
      base.forEach(p=>{p.product_variants=variants.filter(v=>v.product_id===p.product_id).map(v=>{const m=mins.find(x=>x.variant_id===v.variant_id);return {...v,minimum_qty:Math.max(1,Number(m?.minimum_qty||1))}})});
      products=base;
      renderCleanProducts();
      return true;
    }catch(e){console.error('PEPMOSA STOREFRONT REPAIR ERROR',e);return false}
  }

  function renderCleanProducts(){
    const host=$('productGrid');if(!host)return;
    const search=($('search')?.value||'').toLowerCase().trim();
    const filtered=(products||[]).filter(p=>(p.product_name+' '+(p.description||'')).toLowerCase().includes(search));
    if(!filtered.length){host.innerHTML='<div class="pepEmpty"><div style="font-size:28px;margin-bottom:7px">♡</div><b>No products available</b><div style="margin-top:5px;font-size:12px">There are no products in the current Group Buy categories.</div></div>';return}
    host.innerHTML=filtered.map(p=>{
      const variants=(p.product_variants||[]).filter(v=>v.active!==false);
      const image=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:`<div>${esc(p.product_name)}</div>`;
      const rows=variants.map(v=>`<div><div class="pepVariantRow"><div class="pepVariantInfo"><div class="pepVariantStrength">${esc(v.strength||'Standard')}</div><div class="pepVariantPrice">${peso(v.price)}</div></div><input class="pepVariantQty" type="number" min="${Number(v.minimum_qty||1)}" value="${Number(v.minimum_qty||1)}" id="qty-${esc(v.variant_id)}"><button class="pepVariantAdd" type="button" onclick="addToCart('${esc(p.product_id)}','${esc(v.variant_id)}')">ADD</button></div><div class="pepMin">Minimum ${Number(v.minimum_qty||1)} pc</div></div>`).join('');
      return `<article class="pepProductCard"><div class="pepProductImage${p.image_url?'':' noImage'}">${image}</div><div class="pepProductName">${esc(p.product_name)}</div><p class="pepProductDesc">${esc(p.description||'')}</p><div class="pepVariants">${rows||'<div class="pepMin">No variants available.</div>'}</div></article>`;
    }).join('');
  }

  window.renderProducts=renderCleanProducts;

  function boot(){
    injectStyles();
    const timer=setInterval(()=>{if($('checkoutModal')){installed=true;clearInterval(timer)}},100);
    let attempts=0;
    const repairTimer=setInterval(async()=>{
      attempts++;
      const host=$('productGrid');
      if(host && S() && (getGB() || attempts>5)){
        const ok=await repairStorefront();
        if(ok||attempts>=12)clearInterval(repairTimer);
      }
      if(attempts>=12)clearInterval(repairTimer);
    },700);
  }
  document.addEventListener('DOMContentLoaded',boot);boot();
})();
