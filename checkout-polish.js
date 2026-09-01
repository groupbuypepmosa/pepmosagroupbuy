/* PEPMOSA checkout polish + reliable payment-proof flow */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const S=()=>window.sb||window.__sb;
  let products=[];
  const shippingOptions=[
    {name:'J&T Express',fee:0},
    {name:'LBC',fee:0},
    {name:'JRS Express',fee:0},
    {name:'Grab / Lalamove',fee:0},
    {name:'Meet-up / Pick-up',fee:0}
  ];

  function getCart(){try{return Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]')}catch(e){return []}}
  function getGB(){return window.currentGB||window.pepmosaCurrentGB||null}
  function getVerifiedEmail(){return (localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'').trim().toLowerCase()}
  function itemName(i){return i.product_name||i.productName||i.name||'Product'}
  function itemStrength(i){return i.strength||i.variant_strength||i.variant||''}
  function itemQty(i){return Number(i.qty??i.quantity??1)}
  function itemPrice(i){return Number(i.unit_price??i.price??0)}
  function itemProductId(i){return i.product_id||i.productId||null}
  function itemVariantId(i){return i.variant_id||i.variantId||null}
  function cartTotals(){const cart=getCart();return{cart,subtotal:cart.reduce((sum,i)=>sum+itemPrice(i)*itemQty(i),0)}}
  function makeOrderId(){const gb=getGB();const n=(gb?.gb_number||'GB').replace(/[^A-Za-z0-9-]/g,'');return `${n}-ORD-${Date.now().toString(36).toUpperCase()}`}
  function uuid(){try{return crypto.randomUUID()}catch(e){return 'OI-'+Date.now()+'-'+Math.random().toString(36).slice(2)}}

  function injectStyles(){
    if($('pepCheckoutPolishStyles'))return;
    const s=document.createElement('style');s.id='pepCheckoutPolishStyles';s.textContent=`
      #checkoutModal .modalbox{width:min(780px,calc(100vw - 24px))!important;max-height:94vh!important;overflow:auto!important;padding:0!important;border-radius:28px!important;background:#fff!important;border:1px solid #f0d5e4!important;box-shadow:0 35px 110px rgba(72,30,57,.25)!important}
      #pepCheckoutPolishHead{padding:28px 30px 22px;background:linear-gradient(135deg,#fff0f8,#fff 58%,#f8efff);border-bottom:1px solid #f1dce8}
      #pepCheckoutPolishHead .kicker{font-size:10px;font-weight:950;letter-spacing:.18em;color:#d52b87;text-transform:uppercase}
      #pepCheckoutPolishHead h2{margin:7px 0 6px;font-size:31px;line-height:1.05;letter-spacing:-.9px;color:#30212b}
      #pepCheckoutPolishHead p{margin:0;color:#81727b;font-size:13px;line-height:1.55}
      #pepCheckoutPolishBody{padding:22px 30px 30px}
      .pepCOCard{border:1px solid #f0dce7;background:#fffafd;border-radius:19px;padding:17px;margin-bottom:16px}
      .pepCOCardTitle{font-size:10px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#a34f7b;margin-bottom:11px}
      .pepOrderSelect{width:100%;height:46px;border:1px solid #ead6e2;border-radius:13px;background:#fff;padding:0 13px;font-weight:800;color:#3a2932}
      .pepOrderList{margin-top:10px;display:grid;gap:7px}.pepOrderLine{display:flex;justify-content:space-between;gap:12px;padding:10px 11px;background:#fff;border:1px solid #f1e0e9;border-radius:12px;font-size:12px}.pepOrderLine .left{min-width:0}.pepOrderLine b{display:block;color:#33252d}.pepOrderLine span{display:block;color:#897983;margin-top:2px}.pepOrderLine .amount{font-weight:950;color:#3c2933;white-space:nowrap}
      .pepTotals{display:grid;gap:8px}.pepTotalRow{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#685862}.pepTotalRow.grand{padding-top:12px;margin-top:3px;border-top:1px solid #ead9e4;font-size:17px;font-weight:950;color:#2e2028}.pepPaid{font-size:9px;font-weight:900;color:#177543;background:#e8f8ef;border-radius:999px;padding:4px 7px}
      .pepQR{display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:center}.pepQR img{width:190px;height:190px;object-fit:contain;border-radius:16px;border:7px solid #fff;background:#fff;box-shadow:0 8px 25px rgba(92,40,76,.10)}.pepQRText h3{margin:0 0 5px;font-size:16px;color:#31232c}.pepQRText p{margin:0;color:#7d7078;font-size:12px;line-height:1.55}.pepQRNote{margin-top:9px;font-size:11px;color:#a0527d;font-weight:850}
      .pepUpload{border:1.5px dashed #d99abd;border-radius:16px;background:#fff6fb;padding:15px}.pepUpload input{width:100%;box-sizing:border-box}.pepUploadHint{font-size:11px;color:#7d6f78;margin-top:7px;line-height:1.5}.pepRequired{color:#d52b87}.pepFileName{display:none;margin-top:9px;padding:8px 10px;border-radius:10px;background:#fceaf4;color:#a04b77;font-size:11px;font-weight:800}.pepFileName.show{display:block}
      #checkoutModal .pepFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.pepField{display:flex;flex-direction:column;gap:6px}.pepField.full{grid-column:1/-1}.pepField label{font-size:10px;font-weight:950;letter-spacing:.04em;color:#46343e}.pepField input,.pepField select,.pepField textarea{width:100%;box-sizing:border-box;border:1px solid #ead8e4;border-radius:13px;background:#fff;min-height:45px;padding:11px 12px;font:inherit;color:#342830;outline:none}.pepField textarea{min-height:88px;resize:vertical}.pepField input:focus,.pepField select:focus,.pepField textarea:focus{border-color:#df5b9e;box-shadow:0 0 0 3px rgba(223,91,158,.08)}
      #pepCheckoutMsg{margin-bottom:13px}.pepCOError{padding:12px 14px;border-radius:13px;background:#fff0f3;color:#a5253e;font-size:12px;line-height:1.5;border:1px solid #f3d1db}.pepCOSuccess{padding:12px 14px;border-radius:13px;background:#e8f8ef;color:#176e42;font-size:12px}
      .pepCOActions{display:flex;gap:10px;margin-top:19px}.pepCOActions button{min-height:48px;border-radius:14px;padding:10px 18px;font-weight:950;cursor:pointer;border:1px solid #ead8e4}.pepCOActions .primary{flex:1;border:0;color:#fff;background:linear-gradient(135deg,#ea54a5,#c66fd4);box-shadow:0 10px 25px rgba(215,43,145,.18)}.pepCOActions .secondary{background:#fff;color:#46343e}
      #productGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}.pepProductCard{background:rgba(255,255,255,.97);border:1px solid #efdce7;border-radius:22px;padding:12px;box-shadow:0 13px 35px rgba(132,66,109,.07);min-width:0;transition:transform .16s ease,box-shadow .16s ease}.pepProductCard:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(132,66,109,.11)}.pepProductImage{height:205px;border-radius:17px;overflow:hidden;background:#fff2f8;border:1px solid #f0dce7;display:flex;align-items:center;justify-content:center}.pepProductImage img{width:100%;height:100%;object-fit:cover;display:block}.pepProductImage.noImage{font-size:22px;font-weight:950;color:#b45383}.pepProductName{font-size:17px;font-weight:950;letter-spacing:-.2px;margin:13px 4px 3px;color:#30212b}.pepProductDesc{font-size:11px;line-height:1.45;color:#897681;margin:0 4px 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:32px}.pepVariants{display:grid;gap:8px}.pepVariantRow{display:grid;grid-template-columns:minmax(0,1fr) 64px 56px;gap:7px;align-items:center;padding:9px;border:1px solid #f0dce7;background:#fffafd;border-radius:14px}.pepVariantInfo{min-width:0}.pepVariantStrength{font-size:13px;font-weight:950;color:#33262f}.pepVariantPrice{font-size:10px;color:#9a7187;margin-top:2px}.pepVariantQty{width:64px!important;height:38px!important;padding:0 7px!important;text-align:center;border-radius:10px!important}.pepVariantAdd{height:38px;border:0;border-radius:10px;background:linear-gradient(135deg,#e15b9f,#c66bcf);color:#fff;font-size:10px;font-weight:950;cursor:pointer}.pepMin{font-size:9px;color:#9b5279;font-weight:850;margin:4px 2px 0}.pepEmpty{grid-column:1/-1;background:#fff;border:1px dashed #e3c6d7;border-radius:20px;padding:38px;text-align:center;color:#83737c}
      @media(max-width:980px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){#pepCheckoutPolishHead{padding:23px 20px 19px}#pepCheckoutPolishBody{padding:18px 20px 22px}.pepQR{grid-template-columns:1fr;text-align:center}.pepQR img{margin:0 auto;width:210px;height:210px}.pepQRText{text-align:left}#checkoutModal .pepFormGrid{grid-template-columns:1fr}.pepField.full{grid-column:auto}.pepCOActions{flex-direction:column}.pepCOActions .primary{flex:none}.pepOrderLine{align-items:flex-start}#productGrid{grid-template-columns:1fr}.pepProductImage{height:220px}.pepVariantRow{grid-template-columns:minmax(0,1fr) 58px 54px}}
    `;document.head.appendChild(s);
  }

  function buildCheckout(){
    const modal=$('checkoutModal');if(!modal)return;
    const box=modal.querySelector('.modalbox');if(!box)return;
    const {cart,subtotal}=cartTotals();if(!cart.length)return;
    const gb=getGB();const qr=gb?.final_payment_qr_url||'';const adminFee=Number(gb?.admin_fee||0);const email=getVerifiedEmail();
    const orderOptions=cart.map((i,idx)=>`<option value="${idx}">${esc(itemName(i))}${itemStrength(i)?' — '+esc(itemStrength(i)):''} × ${itemQty(i)} — ${peso(itemPrice(i)*itemQty(i))}</option>`).join('');
    const lines=cart.map(i=>`<div class="pepOrderLine"><div class="left"><b>${esc(itemName(i))}</b><span>${esc(itemStrength(i))}${itemStrength(i)?' • ':''}Qty ${itemQty(i)} × ${peso(itemPrice(i))}</span></div><div class="amount">${peso(itemPrice(i)*itemQty(i))}</div></div>`).join('');
    const qrBlock=qr?`<div class="pepCOCard"><div class="pepCOCardTitle">FINAL PAYMENT</div><div class="pepQR"><img src="${esc(qr)}" alt="PEPMOSA payment QR"><div class="pepQRText"><h3>Scan to Pay</h3><p>Use the QR code above for your order payment. After payment, upload your receipt below.</p><div class="pepQRNote">Please make sure the payment amount matches your total.</div></div></div></div>`:`<div class="pepCOCard"><div class="pepCOCardTitle">PAYMENT</div><div class="pepQRText"><h3>Payment QR not available yet</h3><p>Admin has not uploaded the final payment QR for this Group Buy yet.</p></div></div>`;
    box.innerHTML=`<div id="pepCheckoutPolishHead"><div class="kicker">PEPMOSA • CHECKOUT</div><h2>Complete Your Order</h2><p>Review your order, delivery details, total, and payment proof before submitting.</p></div><div id="pepCheckoutPolishBody"><div id="pepCheckoutMsg"></div><div class="pepCOCard"><div class="pepCOCardTitle">ORDERED PRODUCTS</div><select id="pepOrderSelect" class="pepOrderSelect"><option value="">View your ${cart.length} ordered item${cart.length===1?'':'s'}…</option>${orderOptions}</select><div class="pepOrderList">${lines}</div></div><div class="pepCOCard"><div class="pepCOCardTitle">ORDER TOTAL</div><div class="pepTotals"><div class="pepTotalRow"><span>Products subtotal</span><b>${peso(subtotal)}</b></div><div class="pepTotalRow"><span>Admin fee <span class="pepPaid">ALREADY PAID</span></span><b>${peso(adminFee)}</b></div><div class="pepTotalRow"><span>Shipping fee</span><b id="pepShippingFee">₱0.00</b></div><div class="pepTotalRow grand"><span>TOTAL TO PAY</span><span id="pepGrandTotal">${peso(subtotal)}</span></div></div></div>${qrBlock}<div class="pepCOCard"><div class="pepCOCardTitle">CUSTOMER DETAILS</div><div class="pepFormGrid"><div class="pepField"><label>Email <span class="pepRequired">*</span></label><input id="pepEmail" type="email" value="${esc(email)}" autocomplete="email"></div><div class="pepField"><label>Customer Name <span class="pepRequired">*</span></label><input id="pepCustomerName" value="${esc(localStorage.getItem('pepmosa_customer_name')||'')}" autocomplete="name"></div><div class="pepField"><label>Contact Number <span class="pepRequired">*</span></label><input id="pepContact" value="${esc(localStorage.getItem('pepmosa_phone')||'')}" autocomplete="tel"></div><div class="pepField"><label>Shipping Method <span class="pepRequired">*</span></label><select id="pepShippingMethod">${shippingOptions.map((o,i)=>`<option value="${i}">${esc(o.name)}</option>`).join('')}</select></div><div class="pepField full"><label>Delivery Address <span class="pepRequired">*</span></label><textarea id="pepAddress" placeholder="Complete delivery address..."></textarea></div></div></div><div class="pepCOCard"><div class="pepCOCardTitle">PAYMENT PROOF <span class="pepRequired">*</span></div><div class="pepUpload"><input id="pepOrderProof" type="file" accept="image/*,.pdf"><div id="pepFileName" class="pepFileName"></div><div class="pepUploadHint">Upload your payment receipt or screenshot. Maximum 5MB.</div></div></div><div class="pepCOActions"><button id="pepPlaceOrder" class="primary" type="button">SUBMIT ORDER</button><button id="pepCancelOrder" class="secondary" type="button">CANCEL</button></div></div>`;
    $('pepShippingMethod').addEventListener('change',updateTotals);
    $('pepOrderProof').addEventListener('change',function(){const f=this.files?.[0],n=$('pepFileName');if(!n)return;if(f){n.textContent='✓ '+f.name;n.classList.add('show')}else{n.textContent='';n.classList.remove('show')}});
    $('pepPlaceOrder').onclick=submitOrder;
    $('pepCancelOrder').onclick=()=>modal.classList.remove('open');
    updateTotals();
  }

  function updateTotals(){const idx=Number($('pepShippingMethod')?.value||0);const fee=Number(shippingOptions[idx]?.fee||0);const {subtotal}=cartTotals();if($('pepShippingFee'))$('pepShippingFee').textContent=peso(fee);if($('pepGrandTotal'))$('pepGrandTotal').textContent=peso(subtotal+fee)}

  window.checkout=function(){const {cart}=cartTotals();if(!cart.length){if(typeof window.openCart==='function')window.openCart();return}const email=getVerifiedEmail();if(!email){const verify=$('pepVerifyModal');if(verify){verify.classList.add('open');return}alert('Please verify your email before checkout.');return}buildCheckout();$('checkoutModal')?.classList.add('open')};
  window.placeOrder=async function(){await submitOrder()};

  async function submitOrder(){
    const msg=$('pepCheckoutMsg'),btn=$('pepPlaceOrder');
    const {cart,subtotal}=cartTotals();const gb=getGB();const s=S();
    if(!s||!gb||!cart.length){if(msg)msg.innerHTML='<div class="pepCOError">Your checkout session is not ready. Please refresh and try again.</div>';return}
    const email=($('pepEmail')?.value||'').trim().toLowerCase();
    const name=($('pepCustomerName')?.value||'').trim();
    const contact=($('pepContact')?.value||'').trim();
    const method=$('pepShippingMethod')?.selectedOptions?.[0]?.textContent?.trim()||'';
    const address=($('pepAddress')?.value||'').trim();
    const file=$('pepOrderProof')?.files?.[0]||null;
    const shippingFee=Number(shippingOptions[Number($('pepShippingMethod')?.value||0)]?.fee||0);
    const total=subtotal+shippingFee;
    const missing=[];
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))missing.push('Email');
    if(!name)missing.push('Customer Name');
    if(!contact)missing.push('Contact Number');
    if(!method)missing.push('Shipping Method');
    if(!address)missing.push('Delivery Address');
    if(!file)missing.push('Payment Proof');
    if(missing.length){msg.innerHTML='<div class="pepCOError"><b>Please complete:</b> '+missing.join(', ')+'.</div>';return}
    if(!file.size){msg.innerHTML='<div class="pepCOError">The selected payment proof file is empty. Please choose the receipt/screenshot again.</div>';return}
    if(file.size>5*1024*1024){msg.innerHTML='<div class="pepCOError">Payment proof must be 5MB or smaller.</div>';return}
    btn.disabled=true;btn.textContent='SUBMITTING…';msg.innerHTML='';
    try{
      const oid=makeOrderId();
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      const path=`orders/${gb.gb_number}/${oid}-${Date.now()}.${ext}`;
      const up=await s.storage.from('payment-proofs').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
      if(up.error)throw up.error;
      const proof=s.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
      const customer=await s.from('customers').upsert({email,customer_name:name,contact,address},{onConflict:'email'}).select('customer_id').single();
      if(customer.error)throw customer.error;
      const ord=await s.from('orders').insert({order_id:oid,gb_number:gb.gb_number,customer_id:customer.data.customer_id,email,total,payment_status:'PROOF SUBMITTED',shipping_method:method,shipping_fee:shippingFee,payment_proof_url:proof,payment_reference:'CHECKOUT PROOF'}).select('*').single();
      if(ord.error)throw ord.error;
      const rows=cart.map(i=>({order_item_id:uuid(),order_id:oid,product_id:itemProductId(i),variant_id:itemVariantId(i),product_name:itemName(i),strength:itemStrength(i)||null,qty:itemQty(i),unit_price:itemPrice(i),line_total:itemPrice(i)*itemQty(i)}));
      const oi=await s.from('order_items').insert(rows);if(oi.error)throw oi.error;
      localStorage.setItem('pepmosa_last_order_id',oid);localStorage.setItem('pepmosa_customer_email',email);localStorage.setItem('pepmosa_customer_name',name);localStorage.setItem('pepmosa_phone',contact);localStorage.removeItem('pepmosaCart');window.cart=[];if($('cartCount'))$('cartCount').textContent='0';
      $('checkoutModal')?.classList.remove('open');
      if($('pepInfoTitle')&&$('pepInfoText')&&$('pepInfoModal')){$('pepInfoTitle').textContent='Order Submitted ✓';$('pepInfoText').textContent=`Your order ${oid} has been submitted successfully. Payment proof is now pending admin review.`;$('pepInfoOk').textContent='DONE';$('pepInfoModal').classList.add('open')}else alert(`Order submitted: ${oid}`);
      if(typeof window.renderProducts==='function')window.renderProducts();
    }catch(e){console.error('PEPMOSA CHECKOUT ERROR:',e);msg.innerHTML='<div class="pepCOError">Unable to submit the order. Please try again. If the problem continues, contact admin.</div>'}
    finally{btn.disabled=false;btn.textContent='SUBMIT ORDER'}
  }

  async function repairStorefront(){
    const s=S();if(!s)return false;
    try{
      let gb=getGB();
      if(!gb){const r=await s.from('group_buys').select('*').eq('status','OPEN').order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error||!r.data)return false;gb=r.data;window.currentGB=gb;window.pepmosaCurrentGB=gb}
      const cr=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);if(cr.error)throw cr.error;
      const categories=(cr.data||[]).map(x=>x.category_name).filter(Boolean);if(!categories.length){products=[];renderCleanProducts();return true}
      const pr=await s.from('products').select('*').eq('active',true).in('category',categories).order('product_name');if(pr.error)throw pr.error;
      const base=pr.data||[],ids=base.map(p=>p.product_id).filter(Boolean);let variants=[];
      if(ids.length){const vr=await s.from('product_variants').select('*').in('product_id',ids).eq('active',true).order('price');if(vr.error)throw vr.error;variants=vr.data||[]}
      const mr=await s.from('gb_minimum_quantities').select('*').eq('gb_number',gb.gb_number);const mins=mr.error?[]:(mr.data||[]);
      base.forEach(p=>{p.product_variants=variants.filter(v=>v.product_id===p.product_id).map(v=>{const m=mins.find(x=>x.variant_id===v.variant_id);return {...v,minimum_qty:Math.max(1,Number(m?.minimum_qty||1))}})});
      products=base;renderCleanProducts();return true;
    }catch(e){console.error('PEPMOSA STOREFRONT ERROR:',e);return false}
  }

  function renderCleanProducts(){
    const host=$('productGrid');if(!host)return;const search=($('search')?.value||'').toLowerCase().trim();
    const filtered=products.filter(p=>(p.product_name+' '+(p.description||'')).toLowerCase().includes(search));
    if(!filtered.length){host.innerHTML='<div class="pepEmpty"><div style="font-size:28px;margin-bottom:7px">♡</div><b>No products available</b><div style="margin-top:5px;font-size:12px">There are no products in the current Group Buy categories.</div></div>';return}
    host.innerHTML=filtered.map(p=>{const variants=(p.product_variants||[]).filter(v=>v.active!==false);const image=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:`<div>${esc(p.product_name)}</div>`;const rows=variants.map(v=>`<div><div class="pepVariantRow"><div class="pepVariantInfo"><div class="pepVariantStrength">${esc(v.strength||'Standard')}</div><div class="pepVariantPrice">${peso(v.price)}</div></div><input class="pepVariantQty" type="number" min="${Number(v.minimum_qty||1)}" value="${Number(v.minimum_qty||1)}" id="qty-${esc(v.variant_id)}"><button class="pepVariantAdd" type="button" onclick="addToCart('${esc(p.product_id)}','${esc(v.variant_id)}')">ADD</button></div><div class="pepMin">Minimum ${Number(v.minimum_qty||1)} pc</div></div>`).join('');return `<article class="pepProductCard"><div class="pepProductImage${p.image_url?'':' noImage'}">${image}</div><div class="pepProductName">${esc(p.product_name)}</div><p class="pepProductDesc">${esc(p.description||'')}</p><div class="pepVariants">${rows||'<div class="pepMin">No variants available.</div>'}</div></article>`}).join('');
  }
  window.renderProducts=renderCleanProducts;

  function boot(){injectStyles();let attempts=0;const timer=setInterval(async()=>{attempts++;if($('checkoutModal')){if(!products.length)await repairStorefront();if(attempts>4)clearInterval(timer)}if(attempts>=12)clearInterval(timer)},700)}
  document.addEventListener('DOMContentLoaded',boot);boot();
})();