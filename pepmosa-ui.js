/* PEPMOSA STOREFRONT UI
   Single visual/compatibility layer. Keep functional data/order logic in the core files.
   Checkout submit is handled here because the legacy submit path still expected the
   removed payment-method selector.
*/
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const S=()=>window.sb||window.__sb;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

  function injectStyles(){
    if($('pepmosaUnifiedUIStyles')) return;
    const s=document.createElement('style');
    s.id='pepmosaUnifiedUIStyles';
    s.textContent=`
      :root{--pep-pink:#d92a8b;--pep-pink2:#c85acb;--pep-ink:#33242d;--pep-muted:#806f79;--pep-line:#efdce7;--pep-soft:#fff5fa}
      body{background:#fff8fc!important;color:var(--pep-ink)}
      #productGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px!important;align-items:start!important}
      #productGrid .pepProductCard,#productGrid .card{background:linear-gradient(145deg,#fff,#fff8fc)!important;border:1px solid #efdce7!important;border-radius:22px!important;box-shadow:0 8px 26px rgba(78,35,67,.07)!important;overflow:hidden!important;padding:14px!important;transition:transform .18s ease,box-shadow .18s ease!important}
      #productGrid .pepProductCard:hover,#productGrid .card:hover{transform:translateY(-3px)!important;box-shadow:0 16px 34px rgba(78,35,67,.11)!important}
      #productGrid .pepProductImage,#productGrid .productImg{height:210px!important;min-height:0!important;aspect-ratio:auto!important;margin:0 0 14px!important;border-radius:16px!important;background:linear-gradient(145deg,#fff0f8,#f8f0ff)!important;border:1px solid #f1dbe7!important;overflow:hidden!important;display:grid!important;place-items:center!important}
      #productGrid .pepProductImage img,#productGrid .productImg img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;padding:10px!important;box-sizing:border-box!important}
      #productGrid .pepProductName,#productGrid .card h3{font-size:16px!important;line-height:1.15!important;font-weight:950!important;color:#30222b!important;margin:0 0 6px!important}
      #productGrid .pepProductDesc,#productGrid .card>.muted{font-size:11px!important;line-height:1.5!important;color:#87757f!important;margin:0 0 11px!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
      #productGrid .pepVariants,#productGrid .variantList{display:grid!important;gap:8px!important;margin-top:8px!important;max-height:none!important;overflow:visible!important;padding:0!important}
      #productGrid .pepVariantRow,#productGrid .variantRow{display:grid!important;grid-template-columns:minmax(0,1fr) 70px auto!important;align-items:center!important;gap:7px!important;padding:8px!important;background:#fff!important;border:1px solid #f0dfe8!important;border-radius:13px!important}
      #productGrid .pepVariantStrength,#productGrid .variantStrength{font-size:12px!important;font-weight:900!important;color:#3a2b34!important}
      #productGrid .pepVariantPrice,#productGrid .variantPrice{font-size:10px!important;color:#927d88!important;margin-top:2px!important}
      #productGrid .pepVariantQty,#productGrid .qty{width:70px!important;height:36px!important;box-sizing:border-box!important;border:1px solid #e6d4df!important;border-radius:10px!important;text-align:center!important;background:#fff!important}
      #productGrid .pepVariantAdd,#productGrid .variantRow .btn{height:36px!important;min-width:54px!important;border:0!important;border-radius:10px!important;background:linear-gradient(135deg,var(--pep-pink),var(--pep-pink2))!important;color:#fff!important;font-size:10px!important;font-weight:950!important;cursor:pointer!important}
      #productGrid .pepMin,#productGrid .minBadge{font-size:9px!important;color:#9b5d7d!important;font-weight:800!important;margin:3px 3px 0!important}
      .modal,.pepFeeModal,#pepSiteNoticeModal{background:rgba(45,20,37,.58)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}
      .modalbox,.pepFeeBox,.pepSiteNoticeCard{border:1px solid #efd4e3!important;border-radius:26px!important;background:linear-gradient(145deg,#fff,#fff7fb)!important;box-shadow:0 28px 90px rgba(55,20,45,.25)!important;overflow:auto!important}
      .modalbox h2,.pepFeeBox h2,.pepSiteNoticeCard h2{color:#30222b!important}
      .modalbox .btn,.pepFeeBtn,.pepSiteNoticeActions .primary{border-radius:12px!important}
      .pepFeeBtn,.pepSiteNoticeActions .primary{background:linear-gradient(135deg,var(--pep-pink),var(--pep-pink2))!important;color:#fff!important;border:0!important}
      #pepFeeModal .pepFeeBox,#pepVerifyModal .pepFeeBox,#pepInfoModal .pepFeeBox{padding:0!important}
      #pepFeeModal .pepFeeBox>h2,#pepVerifyModal .pepFeeBox h2,#pepInfoModal .pepFeeBox h2{padding:24px 28px 17px!important;margin:0!important;background:linear-gradient(135deg,#ffeaf5,#fff8fc 62%,#f4ecff)!important;border-bottom:1px solid #efdce7!important}
      #pepSiteNoticeModal{z-index:100000!important}
      #checkoutModal{z-index:100001!important;padding:12px!important}
      #checkoutModal .modalbox{width:min(820px,100%)!important;max-height:94vh!important;padding:0!important;border-radius:28px!important}
      #checkoutModal .pepFinalHead{background:linear-gradient(135deg,#ffeaf5,#fff8fc 58%,#f4ecff)!important;border-bottom:1px solid #efdce7!important}
      #checkoutModal .pepFinalCard{background:#fffafd!important;border:1px solid #efdce7!important;border-radius:18px!important}
      #checkoutModal .pepSubmit{border:0!important;border-radius:13px!important;background:linear-gradient(135deg,var(--pep-pink),var(--pep-pink2))!important;box-shadow:0 10px 24px rgba(217,42,139,.18)!important;color:#fff!important}
      #checkoutModal .pepCancel{border:1px solid #ead5e1!important;border-radius:13px!important;background:#fff7fb!important}
      #checkoutModal .pepField input,#checkoutModal .pepField textarea,#checkoutModal .pepField select{border-color:#e8d5e0!important;border-radius:12px!important;background:#fff!important}
      #checkoutModal .pepField input:focus,#checkoutModal .pepField textarea:focus,#checkoutModal .pepField select:focus{border-color:#dc5d9f!important;box-shadow:0 0 0 3px rgba(220,93,159,.09)!important}
      #checkoutModal .pepPaymentGrid,#checkoutModal .pepSelectedPayment,#checkoutModal .pepPaymentHint{display:none!important}
      #checkoutModal .pepShippingChoices,#pepShippingChoices{display:none!important}
      #checkoutModal #pepShippingMethod{display:block!important;width:100%!important;min-height:44px!important}
      .pepPaymentGrid{display:none!important}
      @media(max-width:900px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:560px){
        #productGrid{grid-template-columns:1fr!important}
        #productGrid .pepProductImage,#productGrid .productImg{height:190px!important}
        #productGrid .pepVariantRow,#productGrid .variantRow{grid-template-columns:minmax(0,1fr) 66px auto!important}
        #productGrid .pepVariantQty,#productGrid .qty{width:66px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function removePaymentCard(){
    const modal=$('checkoutModal');
    if(!modal) return;
    modal.querySelectorAll('.pepFinalCard').forEach(card=>{
      if(card.querySelector('.pepPaymentGrid')) card.remove();
    });
    // Legacy compatibility only; no payment-method UI is shown to customers.
    window.pepmosaSelectedPayment='ONLINE PAYMENT';
  }

  function getCart(){
    try{return Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]')}
    catch(e){return[]}
  }
  function getGB(){return window.currentGB||window.pepmosaCurrentGB||null}
  function itemName(i){return i.product_name||i.productName||i.name||'Product'}
  function itemStrength(i){return i.strength||i.variant_strength||i.variant||''}
  function itemQty(i){return Number(i.qty??i.quantity??1)}
  function itemPrice(i){return Number(i.unit_price??i.price??0)}
  function itemProductId(i){return i.product_id||i.productId||null}
  function itemVariantId(i){return i.variant_id||i.variantId||null}
  function orderId(){
    const gb=getGB();
    const n=(gb?.gb_number||'GB').replace(/[^A-Za-z0-9-]/g,'');
    return `${n}-ORD-${Date.now().toString(36).toUpperCase()}`;
  }
  function setMsg(html){const el=$('pepCheckoutMsg');if(el)el.innerHTML=html}
  function showError(message){setMsg(`<div class="pepFinalError">${esc(message)}</div>`)}

  async function placeOrderUnified(){
    if(window.__pepSubmitting)return;
    const s=S();
    if(!s){showError('Checkout is not connected to the order system. Please refresh the page and try again.');return}

    const cart=getCart();
    const gb=getGB();
    const email=($('pepEmail')?.value||'').trim().toLowerCase();
    const name=($('pepCustomerName')?.value||'').trim();
    const contact=($('pepContact')?.value||'').trim();
    const address=($('pepAddress')?.value||'').trim();
    const shippingSelect=$('pepShippingMethod');
    const shippingIndex=Number(shippingSelect?.value??0);
    const shippingOptions=[
      {name:'J&T Express — Luzon',fee:80},
      {name:'J&T Express — Visayas',fee:90},
      {name:'J&T Express — Mindanao',fee:100},
      {name:'Lalamove — APP RATE',fee:0}
    ];
    const shipping=shippingOptions[shippingIndex]||shippingOptions[0];
    const proof=$('pepOrderProof')?.files?.[0]||null;

    if(!cart.length){showError('Your cart is empty. Please add an item before checking out.');return}
    if(!gb?.gb_number){showError('The current Group Buy could not be loaded. Please refresh and try again.');return}
    if(!email||!/^\S+@\S+\.\S+$/.test(email)){showError('Please enter a valid email address.');return}
    if(!name){showError('Please enter your full name.');return}
    if(!contact){showError('Please enter your contact number.');return}
    if(!address){showError('Please enter your complete delivery address.');return}
    if(!proof){showError('Please upload your payment proof before submitting the order.');return}
    if(proof.size>5*1024*1024){showError('Payment proof must be 5MB or smaller.');return}

    const subtotal=cart.reduce((sum,i)=>sum+(itemPrice(i)*itemQty(i)),0);
    const total=subtotal+shipping.fee;
    const submitBtn=document.querySelector('#checkoutModal .pepSubmit');
    window.__pepSubmitting=true;
    if(submitBtn){submitBtn.disabled=true;submitBtn.dataset.originalText=submitBtn.textContent;submitBtn.textContent='Submitting…'}
    setMsg('<div class="pepFinalError" style="background:#fff7fb;border-color:#efdce7;color:#7f6572">Submitting your order… please wait.</div>');

    let proofUrl=null;
    try{
      // Reuse an existing customer when the email already exists; otherwise create one.
      const customerPayload={email,customer_name:name,contact,address};
      const customerRes=await s.from('customers').upsert(customerPayload,{onConflict:'email'}).select('customer_id').single();
      if(customerRes.error)throw new Error(`Customer profile: ${customerRes.error.message}`);
      const customerId=customerRes.data?.customer_id||null;

      const proofPath=`orders/${gb.gb_number}/${Date.now()}-${Math.random().toString(36).slice(2,10)}-${proof.name.replace(/[^A-Za-z0-9._-]/g,'_')}`;
      const uploadRes=await s.storage.from('payment-proofs').upload(proofPath,proof,{upsert:false,contentType:proof.type||undefined});
      if(uploadRes.error)throw new Error(`Payment proof upload: ${uploadRes.error.message}`);
      const publicRes=s.storage.from('payment-proofs').getPublicUrl(proofPath);
      proofUrl=publicRes?.data?.publicUrl||null;

      const id=orderId();
      const orderPayload={
        order_id:id,
        gb_number:gb.gb_number,
        customer_id:customerId,
        email,
        total,
        payment_status:'PENDING',
        shipping_method:shipping.name,
        shipping_fee:shipping.fee,
        payment_proof_url:proofUrl,
        payment_reference:null
      };
      const orderRes=await s.from('orders').insert(orderPayload).select('order_id').single();
      if(orderRes.error)throw new Error(`Order creation: ${orderRes.error.message}`);

      const itemRows=cart.map(i=>({
        order_item_id:(crypto.randomUUID?crypto.randomUUID():`OI-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        order_id:id,
        product_id:itemProductId(i),
        variant_id:itemVariantId(i),
        product_name:itemName(i),
        strength:itemStrength(i)||null,
        qty:itemQty(i),
        unit_price:itemPrice(i),
        line_total:itemPrice(i)*itemQty(i)
      }));
      const itemRes=await s.from('order_items').insert(itemRows);
      if(itemRes.error)throw new Error(`Order items: ${itemRes.error.message}`);

      localStorage.setItem('pepmosa_customer_email',email);
      localStorage.setItem('pepmosa_customer_name',name);
      localStorage.setItem('pepmosa_phone',contact);
      window.cart=[];
      localStorage.removeItem('pepmosaCart');
      if($('checkoutModal')){$('checkoutModal').classList.remove('open','show');$('checkoutModal').style.removeProperty('display')}

      // Show a lightweight success state without changing the existing page structure.
      const success=document.createElement('div');
      success.className='pepOrderSuccess';
      success.innerHTML=`<div style="font-size:28px">♡</div><h3>Order submitted!</h3><p>Order <b>${esc(id)}</b> was received successfully.</p><p>We will verify your payment proof and update your order status.</p><button type="button" class="pepFeeBtn" style="padding:11px 18px;margin-top:8px">DONE</button>`;
      Object.assign(success.style,{position:'fixed',inset:'0',zIndex:'100010',display:'grid',placeItems:'center',padding:'20px',background:'rgba(45,20,37,.58)',backdropFilter:'blur(8px)'});
      const box=document.createElement('div');
      Object.assign(box.style,{maxWidth:'430px',width:'100%',boxSizing:'border-box',padding:'28px',textAlign:'center',border:'1px solid #efd4e3',borderRadius:'26px',background:'linear-gradient(145deg,#fff,#fff7fb)',boxShadow:'0 28px 90px rgba(55,20,45,.25)',color:'#33242d'});
      box.innerHTML=success.innerHTML;success.replaceChildren(box);document.body.appendChild(success);
      box.querySelector('button')?.addEventListener('click',()=>success.remove());
    }catch(err){
      console.error('PEPMOSA CHECKOUT SUBMIT',err);
      showError(err?.message||'We could not submit your order. Please check your connection and try again. Your cart has not been cleared.');
    }finally{
      window.__pepSubmitting=false;
      if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=submitBtn.dataset.originalText||'Submit Order'}
    }
  }

  function clean(){
    injectStyles();
    removePaymentCard();
  }
  function boot(){
    clean();
    // Replace only the broken legacy submit path. The rest of checkout remains in the existing core file.
    window.placeOrder=placeOrderUnified;
    const observer=new MutationObserver(()=>{removePaymentCard();if(typeof window.placeOrder!=='function'||window.placeOrder!==placeOrderUnified)window.placeOrder=placeOrderUnified});
    observer.observe(document.body,{subtree:true,childList:true});
    setInterval(clean,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();