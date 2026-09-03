/* PEPMOSA checkout - final clean pink girly design + payment-method fix */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const S=()=>window.sb||window.__sb;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let products=[];
  let checkoutCustomer=null;
  async function loadCheckoutCustomer(email){
    const s=S(),gb=getGB();
    if(!s||!email||!gb?.gb_number)return null;
    try{
      // Returning status is scoped to the CURRENT Group Buy only.
      // Orders from older/closed GBs must not make a customer "returning"
      // when a brand-new GB opens.
      const o=await s.from('orders')
        .select('shipping_method,created_at')
        .eq('email',email)
        .eq('gb_number',gb.gb_number)
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if(o.error)throw o.error;
      if(!o.data)return null;

      const c=await s.from('customers').select('*').eq('email',email).maybeSingle();
      if(c.error)throw c.error;
      if(!c.data)return null;

      return {...c.data,last_shipping_method:o.data.shipping_method||''};
    }catch(e){console.warn('PEPMOSA customer lookup',e);return null}
  }
  function getCart(){try{return Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]')}catch(e){return[]}}
  function getGB(){return window.currentGB||window.pepmosaCurrentGB||null}
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
#checkoutModal{z-index:100001!important;padding:12px!important;background:rgba(48,20,39,.58)!important;backdrop-filter:blur(8px)!important}#checkoutModal .modalbox{width:min(820px,100%)!important;max-height:94vh!important;overflow:auto!important;padding:0!important;border:1px solid #efcfe0!important;border-radius:30px!important;background:#fff!important;box-shadow:0 30px 100px rgba(55,19,43,.30)!important}.pepFinalHead{position:relative;overflow:hidden;padding:28px 30px 24px;background:linear-gradient(135deg,#ffeaf5 0%,#fff7fb 58%,#f5ecff 100%);border-bottom:1px solid #f1d9e6}.pepFinalHead:after{content:'♡';position:absolute;right:28px;bottom:-19px;font:100px/1 Georgia,serif;color:rgba(216,55,143,.10)}.pepFinalKicker{font-size:9px;letter-spacing:.20em;font-weight:950;color:#d52887;text-transform:uppercase}.pepFinalHead h2{position:relative;margin:7px 0 5px;font-size:34px;line-height:1.02;letter-spacing:-1.2px;color:#30212b}.pepFinalHead p{position:relative;margin:0;max-width:590px;color:#816f79;font-size:12px;line-height:1.55}.pepFinalBody{padding:20px 30px 30px}.pepStep{display:flex;align-items:center;gap:10px;margin:0 0 17px;color:#a17d8f;font-size:10px;font-weight:900}.pepStep span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#d92a8b;color:#fff;font-size:10px}.pepStep:after{content:'';height:1px;background:#efd9e5;flex:1}.pepFinalCard{background:#fffafd;border:1px solid #efdce7;border-radius:20px;padding:17px;margin-bottom:14px}.pepFinalTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;font-size:10px;letter-spacing:.14em;font-weight:950;color:#9e4c78;text-transform:uppercase}.pepFinalTitle .optional{font-size:8px;letter-spacing:.04em;color:#b59ba8}.pepOrderLine{display:flex;justify-content:space-between;gap:15px;padding:10px 11px;background:#fff;border:1px solid #f1e1e9;border-radius:13px;margin-top:7px;font-size:12px}.pepOrderLine b{display:block;color:#33242d}.pepOrderLine small{display:block;margin-top:2px;color:#917d87}.pepOrderAmount{font-weight:950;color:#3c2933;white-space:nowrap}.pepTotalRows{display:grid;gap:7px}.pepTotalRow{display:flex;justify-content:space-between;gap:12px;color:#74636c;font-size:12px}.pepTotalRow.grand{margin-top:6px;padding-top:12px;border-top:1px solid #ead8e3;color:#2f2229;font-size:18px;font-weight:950}.pepPaid{font-size:8px;font-weight:950;color:#177143;background:#e8f8ef;border-radius:999px;padding:4px 6px;margin-left:4px}.pepPaymentGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.pepPayChoice{position:relative;min-height:88px;text-align:left;border:1px solid #ead8e4;border-radius:16px;background:#fff;padding:13px 10px;cursor:pointer;color:#35252e;transition:.16s}.pepPayChoice:hover{transform:translateY(-1px);border-color:#df76ac}.pepPayChoice.selected{border:2px solid #d92a8b;background:linear-gradient(145deg,#fff0f8,#fff9fc);box-shadow:0 8px 20px rgba(217,42,139,.11)}.pepPayChoice.selected:after{content:'✓';position:absolute;right:8px;top:8px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#d92a8b;color:#fff;font-size:11px;font-weight:950}.pepPayIcon{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#fce3f1;color:#c12678;font-weight:950;font-size:13px;margin-bottom:8px}.pepPayName{display:block;font-size:12px;font-weight:950}.pepPaySub{display:block;font-size:8px;color:#9a7b8a;margin-top:2px}.pepPaymentHint{margin-top:9px;font-size:10px;line-height:1.5;color:#826e79}.pepSelectedPayment{margin-top:8px;padding:8px 10px;border-radius:11px;background:#fcecf5;color:#9d4c77;font-size:10px;font-weight:850}.pepQRWrap{display:grid;grid-template-columns:185px 1fr;gap:18px;align-items:center}.pepQRWrap img{width:185px;height:185px;object-fit:contain;background:#fff;border:7px solid #fff;border-radius:18px;box-shadow:0 7px 24px rgba(95,38,76,.10)}.pepQRText h3{margin:0 0 5px;color:#30222b;font-size:16px}.pepQRText p{margin:0;color:#7f7078;font-size:11px;line-height:1.6}.pepQRNote{margin-top:9px;padding:9px 10px;border-radius:11px;background:#fff1f8;color:#9c4b76;font-size:10px;font-weight:800}.pepFields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pepField{display:flex;flex-direction:column;gap:6px}.pepField.full{grid-column:1/-1}.pepField label{font-size:9px;font-weight:950;letter-spacing:.05em;color:#4b3842}.pepField label em{font-style:normal;color:#d52887}.pepField input,.pepField textarea,.pepField select{width:100%;box-sizing:border-box;border:1px solid #e9d7e2;border-radius:13px;background:#fff;min-height:44px;padding:10px 12px;color:#34262e;outline:none;font:inherit}.pepField textarea{min-height:78px;resize:vertical}.pepField input:focus,.pepField textarea:focus,.pepField select:focus{border-color:#db5c9e;box-shadow:0 0 0 3px rgba(219,92,158,.08)}.pepUpload{border:1.5px dashed #d89abb;border-radius:16px;background:#fff5fa;padding:14px}.pepUpload input{width:100%;font-size:11px}.pepUploadHint{margin-top:7px;font-size:10px;color:#84727b;line-height:1.5}.pepFileName{display:none;margin-top:8px;padding:8px 10px;border-radius:10px;background:#fceaf4;color:#9e4b77;font-size:10px;font-weight:850}.pepFileName.show{display:block}.pepReturningNote{margin-top:12px;padding:12px 13px;border-radius:13px;background:linear-gradient(135deg,#fff0f7,#faf1ff);border:1px solid #efd4e5;color:#914b73;font-size:11px;line-height:1.55;font-weight:750}#pepCheckoutMsg{margin-bottom:12px}.pepFinalError{padding:12px 14px;border-radius:13px;background:#fff0f3;border:1px solid #f0cbd5;color:#a3253f;font-size:11px;line-height:1.55}.pepFinalActions{display:flex;gap:9px;margin-top:17px}.pepFinalActions button{min-height:49px;border-radius:14px;padding:10px 18px;font-weight:950;cursor:pointer}.pepSubmit{flex:1;border:0;color:#fff;background:linear-gradient(135deg,#e82f91,#c55ed0);box-shadow:0 11px 25px rgba(210,43,139,.20)}.pepCancel{border:1px solid #e7d2df;background:#fff7fb;color:#4b3842;min-width:120px}@media(max-width:700px){.pepFinalBody{padding:17px 18px 23px}.pepFinalHead{padding:24px 20px 20px}.pepFinalHead h2{font-size:29px}.pepPaymentGrid{grid-template-columns:1fr 1fr}.pepQRWrap{grid-template-columns:1fr;text-align:center}.pepQRWrap img{margin:auto;width:210px;height:210px}.pepQRText{text-align:left}.pepFields{grid-template-columns:1fr}.pepField.full{grid-column:auto}.pepFinalActions{flex-direction:column}.pepCancel{order:2}}`;document.head.appendChild(s)}
  function buildCheckout(){
    const modal=$('checkoutModal'),box=modal?.querySelector('.modalbox'),{cart,subtotal}=totals();if(!modal||!box||!cart.length)return;
    const gb=getGB(),qr=gb?.final_payment_qr_url||'',adminFee=Number(gb?.admin_fee||0),email=getVerifiedEmail();
    const returning=!!checkoutCustomer;
    const lines=cart.map(i=>`<div class="pepOrderLine"><div><b>${esc(itemName(i))}</b><small>${esc(itemStrength(i))}${itemStrength(i)?' • ':''}Qty ${itemQty(i)} × ${peso(itemPrice(i))}</small></div><div class="pepOrderAmount">${peso(itemPrice(i)*itemQty(i))}</div></div>`).join('');
    const qrBlock=qr?`<div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT QR <span class="optional">Scan to pay</span></div><div class="pepQRWrap"><img src="${esc(qr)}" alt="PEPMOSA payment QR"><div class="pepQRText"><h3>Pay your order</h3><p>Complete the payment using the QR above, then upload your payment receipt or screenshot below.</p><div class="pepQRNote">Make sure the amount paid matches your order total.</div></div></div></div>`:`<div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT</div><div class="pepQRText"><h3>Payment QR unavailable</h3><p>Please contact PEPMOSA before submitting your order.</p></div></div>`;
    box.innerHTML=`<div class="pepFinalHead"><div class="pepFinalKicker">PEPMOSA GROUP BUY</div><h2>Checkout ♡</h2><p>Almost done! Review your order, select your payment method, complete your details, and upload your proof of payment.</p></div><div class="pepFinalBody"><div class="pepStep"><span>1</span> ORDER REVIEW</div><div id="pepCheckoutMsg"></div><div class="pepFinalCard"><div class="pepFinalTitle">YOUR ORDER</div>${lines}</div><div class="pepFinalCard"><div class="pepFinalTitle">ORDER TOTAL</div><div class="pepTotalRows"><div class="pepTotalRow"><span>Products</span><b>${peso(subtotal)}</b></div><div class="pepTotalRow"><span>Admin fee <span class="pepPaid">CHECKED ON SUBMIT</span></span><b>${peso(adminFee)}</b></div>${returning?'':`<div class="pepTotalRow"><span>Shipping</span><b id="pepShippingFee">₱80.00</b></div>`}<div class="pepTotalRow grand"><span>TOTAL</span><span id="pepGrandTotal">${peso(returning?subtotal:subtotal+80)}</span></div></div></div><div class="pepStep"><span>2</span> PAYMENT</div>${qrBlock}<div class="pepStep"><span>3</span> ${returning?'RETURNING CUSTOMER':'CUSTOMER & DELIVERY DETAILS'}</div><div class="pepFinalCard">${returning?`<div class="pepFields"><div class="pepField full"><label>Email <em>*</em></label><input id="pepEmail" type="email" value="${esc(email)}" autocomplete="email"></div></div><div class="pepReturningNote">♡ Welcome back! Your saved customer and delivery details will be used automatically. No shipping fee will be added to this checkout.</div>`:`<div class="pepFields"><div class="pepField"><label>Email <em>*</em></label><input id="pepEmail" type="email" value="${esc(email)}" autocomplete="email"></div><div class="pepField"><label>Full Name <em>*</em></label><input id="pepCustomerName" value="${esc(localStorage.getItem('pepmosa_customer_name')||'')}" autocomplete="name"></div><div class="pepField"><label>Contact Number <em>*</em></label><input id="pepContact" value="${esc(localStorage.getItem('pepmosa_phone')||'')}" autocomplete="tel"></div><div class="pepField"><label>Shipping Method <em>*</em></label><select id="pepShippingMethod"><option value="0">J&T Express — Luzon • ₱80</option><option value="1">J&T Express — Visayas • ₱90</option><option value="2">J&T Express — Mindanao • ₱100</option><option value="3">Lalamove — APP RATE</option></select></div><div class="pepField full"><label>Complete Delivery Address <em>*</em></label><textarea id="pepAddress" placeholder="House / Unit, Street, Barangay, City / Municipality, Province, ZIP Code"></textarea></div></div>`}</div><div class="pepFinalCard"><div class="pepFinalTitle">PAYMENT PROOF <span class="optional">Required</span></div><div class="pepUpload"><input id="pepOrderProof" type="file" accept="image/*,.pdf"><div id="pepFileName" class="pepFileName"></div><div class="pepUploadHint">Upload your payment receipt or screenshot • JPG, PNG, or PDF • Maximum 5MB</div></div></div><div class="pepFinalActions"><button id="pepPlaceOrder" class="pepSubmit" type="button">SUBMIT MY ORDER</button><button id="pepCancelOrder" class="pepCancel" type="button">CANCEL</button></div></div>`;
    $('pepOrderProof')?.addEventListener('change',function(){const f=this.files?.[0],n=$('pepFileName');if(f){n.textContent='✓ '+f.name;n.classList.add('show')}else{n.textContent='';n.classList.remove('show')}});$('pepShippingMethod')?.addEventListener('change',updateTotals);$('pepPlaceOrder').onclick=submitOrder;$('pepCancelOrder').onclick=closeCheckout;updateTotals();
  }
  function updateTotals(){
    const {subtotal}=totals();
    if(checkoutCustomer){if($('pepGrandTotal'))$('pepGrandTotal').textContent=peso(subtotal);return}
    const i=Number($('pepShippingMethod')?.value||0),fee=[80,90,100,0][i]??80;
    if($('pepShippingFee'))$('pepShippingFee').textContent=fee?peso(fee):'APP RATE';
    if($('pepGrandTotal'))$('pepGrandTotal').textContent=fee?peso(subtotal+fee):peso(subtotal)
  }
  function closeCheckout(){const m=$('checkoutModal');if(m){m.classList.remove('open','show');m.style.removeProperty('display')}}
  window.checkout=async function(){
    const{cart}=totals();if(!cart.length){if(typeof window.openCart==='function')window.openCart();return}
    const activeGB=getGB();
    const freshCart=cart.filter(i=>!i.gb_number||i.gb_number===activeGB?.gb_number);
    if(freshCart.length!==cart.length){window.cart=freshCart;localStorage.pepmosaCart=JSON.stringify(freshCart);}
    if(!freshCart.length){if(typeof window.openCart==='function')window.openCart();return}
    const email=getVerifiedEmail();
    checkoutCustomer=email?await loadCheckoutCustomer(email):null;
    buildCheckout();
    $('checkoutModal')?.classList.add('open')
  };window.placeOrder=async()=>submitOrder();
  async function submitOrder(){
    const msg=$('pepCheckoutMsg'),btn=$('pepPlaceOrder'),{cart,subtotal}=totals(),gb=getGB(),s=S();if(!s||!gb||!cart.length){if(msg)msg.innerHTML='<div class="pepFinalError">Your checkout session is not ready. Please refresh and try again.</div>';return}
    const latest=await s.from('group_buys').select('gb_number,status').eq('gb_number',gb.gb_number).maybeSingle();
    if(latest.error||!latest.data||!['OPEN','KIT_COMPLETION'].includes(latest.data.status)){msg.innerHTML='<div class="pepFinalError">This Group Buy is no longer open. Please refresh the page.</div>';return}
    const email=($('pepEmail')?.value||'').trim().toLowerCase(),returning=!!checkoutCustomer;
    const name=(returning?checkoutCustomer.customer_name:$('pepCustomerName')?.value||'').trim();
    const contact=(returning?checkoutCustomer.contact:$('pepContact')?.value||'').trim();
    const address=(returning?checkoutCustomer.address:$('pepAddress')?.value||'').trim();
    const file=$('pepOrderProof')?.files?.[0]||null;
    const shipIndex=Number($('pepShippingMethod')?.value||0),shipNames=['J&T Express - Luzon','J&T Express - Visayas','J&T Express - Mindanao','Lalamove'],shipFees=[80,90,100,0];
    const shippingMethod=returning?(checkoutCustomer.last_shipping_method||'Saved delivery details'):(shipNames[shipIndex]||'');
    const shippingFee=returning?0:(shipFees[shipIndex]||0),total=subtotal+shippingFee;
    const missing=[];if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))missing.push('Email');
    if(!returning){if(!name)missing.push('Full Name');if(!contact)missing.push('Contact Number');if(!shippingMethod)missing.push('Shipping Method');if(!address)missing.push('Delivery Address')}
    if(!file)missing.push('Payment Proof');if(missing.length){msg.innerHTML='<div class="pepFinalError"><b>Please complete the following:</b> '+missing.join(' • ')+'</div>';return}if(file.size>5*1024*1024){msg.innerHTML='<div class="pepFinalError">Payment proof must be 5MB or smaller.</div>';return}
    btn.disabled=true;btn.textContent='SUBMITTING…';msg.innerHTML='';
    try{
      const oid=orderId(),ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=`orders/${gb.gb_number}/${oid}-${Date.now()}.${ext}`;
      const up=await s.storage.from('payment-proofs').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
      if(up.error)throw new Error('Payment proof upload failed: '+up.error.message);
      const proof=s.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
      const items=cart.map(i=>({product_id:itemProductId(i),variant_id:itemVariantId(i),product_name:itemName(i),strength:itemStrength(i)||null,qty:itemQty(i),unit_price:itemPrice(i),line_total:itemPrice(i)*itemQty(i)}));
      const submitted=await s.rpc('submit_group_buy_order',{
        p_order_id:oid,p_gb_number:gb.gb_number,p_email:email,p_customer_name:name,p_contact:contact,p_address:address,
        p_total:total,p_shipping_method:shippingMethod,p_shipping_fee:shippingFee,p_payment_proof_url:proof,p_items:items
      });
      if(submitted.error)throw new Error(submitted.error.message||'Order could not be submitted.');
      localStorage.setItem('pepmosa_last_order_id',oid);localStorage.setItem('pepmosa_customer_email',email);localStorage.setItem('pepmosa_customer_name',name);localStorage.setItem('pepmosa_phone',contact);localStorage.removeItem('pepmosaCart');window.cart=[];if(typeof window.clearCart==='function'){window.clearCart();}else{if($('cartCount'))$('cartCount').textContent='0';}const cartModal=$('cartModal');if(cartModal)cartModal.classList.remove('show','open');closeCheckout();if($('pepInfoTitle')&&$('pepInfoText')&&$('pepInfoModal')){$('pepInfoTitle').textContent='Order Submitted ✓';$('pepInfoText').textContent=`Your order ${oid} has been submitted successfully. Payment proof is now pending admin review.`;$('pepInfoOk').textContent='DONE';$('pepInfoModal').classList.add('open')}else alert('Order submitted: '+oid)}catch(e){console.error('PEPMOSA CHECKOUT ERROR',e);msg.innerHTML='<div class="pepFinalError"><b>Order was not submitted.</b><br>'+esc(e?.message||'Please try again.')+'<br><small>Your cart has not been cleared.</small></div>'}finally{btn.disabled=false;btn.textContent='SUBMIT MY ORDER'}
  }
  async function repairStorefront(){const s=S();if(!s)return false;try{let gb=getGB();if(!gb){const r=await s.from('group_buys').select('*').in('status',['OPEN','KIT_COMPLETION']).order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error||!r.data)return false;gb=r.data;window.currentGB=gb;window.pepmosaCurrentGB=gb}const cr=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);if(cr.error)throw cr.error;const categories=(cr.data||[]).map(x=>x.category_name).filter(Boolean);if(!categories.length){products=[];return true}const pr=await s.from('products').select('*').eq('active',true).in('category',categories).order('product_name');if(pr.error)throw pr.error;const base=pr.data||[],ids=base.map(p=>p.product_id).filter(Boolean);let variants=[];if(ids.length){const vr=await s.from('product_variants').select('*').in('product_id',ids).eq('active',true).order('price');if(vr.error)throw vr.error;variants=vr.data||[]}const mr=await s.from('gb_minimum_quantities').select('*').eq('gb_number',gb.gb_number);const mins=mr.error?[]:(mr.data||[]);
    let kitMap=new Map();
    if(gb.status==='KIT_COMPLETION'){
      const kr=await s.rpc('get_kit_completion_inventory',{p_gb_number:gb.gb_number});
      if(kr.error)throw kr.error;
      kitMap=new Map((kr.data||[]).map(x=>[String(x.variant_id),Number(x.remaining_qty||0)]));
    }
    base.forEach(p=>{
      p.product_variants=variants.filter(v=>v.product_id===p.product_id).map(v=>{
        const m=mins.find(x=>x.variant_id===v.variant_id);
        const remaining=kitMap.get(String(v.variant_id));
        return {...v,
          minimum_qty:gb.status==='KIT_COMPLETION'?1:Math.max(1,Number(m?.minimum_qty||1)),
          remaining_qty:gb.status==='KIT_COMPLETION'?Number(remaining||0):null
        };
      }).filter(v=>gb.status!=='KIT_COMPLETION'||Number(v.remaining_qty)>0);
    });
    products=base.filter(p=>(p.product_variants||[]).length>0);
    return true}catch(e){console.error('PEPMOSA STOREFRONT',e);return false}}
  function renderProducts(){const host=$('productGrid');if(!host)return;const q=($('search')?.value||'').toLowerCase().trim();const list=products.filter(p=>(p.product_name+' '+(p.description||'')).toLowerCase().includes(q));if(!list.length){host.innerHTML='<div class="pepEmpty">No products available in this Group Buy.</div>';return}host.innerHTML=list.map(p=>{const vars=(p.product_variants||[]).filter(v=>v.active!==false);const image=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:`<div>${esc(p.product_name)}</div>`;const rows=vars.map(v=>{const kit=getGB()?.status==='KIT_COMPLETION';const rem=Number(v.remaining_qty||0);return `<div><div class="pepVariantRow"><div class="pepVariantInfo"><div class="pepVariantStrength">${esc(v.strength||'Standard')}</div><div class="pepVariantPrice">${peso(v.price)}</div></div><input class="pepVariantQty" type="number" min="${Number(v.minimum_qty||1)}" ${kit?`max="${rem}"`:''} value="${Number(v.minimum_qty||1)}" id="qty-${esc(v.variant_id)}"><button class="pepVariantAdd" type="button" onclick="addToCart('${esc(p.product_id)}','${esc(v.variant_id)}')">ADD</button></div><div class="pepMin">${kit?`Only ${rem} vial(s) remaining to complete this kit • minimum 1 vial`:`Minimum ${Number(v.minimum_qty||1)} pc`}</div></div>`}).join('');return`<article class="pepProductCard"><div class="pepProductImage${p.image_url?'':' noImage'}">${image}</div><div class="pepProductName">${esc(p.product_name)}</div><p class="pepProductDesc">${esc(p.description||'')}</p><div class="pepVariants">${rows||'<div class="pepMin">No variants available.</div>'}</div></article>`}).join('')}
  window.renderProducts=renderProducts;
  window.addToCart=function(pid,vid){
    const gbNow=getGB(),product=products.find(p=>String(p.product_id)===String(pid));
    const variant=product?.product_variants?.find(v=>String(v.variant_id)===String(vid));
    if(!product||!variant){alert('Product not found.');return;}
    const input=$('qty-'+vid);
    let qty=Math.max(Number(variant.minimum_qty||1),Number(input?.value||variant.minimum_qty||1));
    const cartNow=getCart();
    const existing=cartNow.find(x=>String(itemVariantId(x))===String(vid));
    if(gbNow?.status==='KIT_COMPLETION'){
      const remaining=Number(variant.remaining_qty||0),already=Number(existing?itemQty(existing):0);
      if(remaining<1){alert('This variant is no longer available. Please refresh.');return;}
      if(qty>remaining){qty=remaining;if(input)input.value=qty;alert('Only '+remaining+' vial(s) remain for this variant.');}
      if(already+qty>remaining){alert('Only '+Math.max(0,remaining-already)+' more vial(s) can be added for this variant.');return;}
    }
    if(existing)existing.qty=itemQty(existing)+qty;
    else cartNow.push({product_id:pid,variant_id:vid,product_name:product.product_name,strength:variant.strength||'',price:Number(variant.price||0),qty});
    window.cart=cartNow;localStorage.pepmosaCart=JSON.stringify(cartNow);
    if(typeof window.updateCart==='function')window.updateCart();
    if(typeof window.openCart==='function')window.openCart();
  };
  function boot(){injectStyles();let tries=0;const t=setInterval(async()=>{tries++;if($('checkoutModal')){if(!products.length)await repairStorefront();clearInterval(t)}if(tries>=15)clearInterval(t)},500)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();