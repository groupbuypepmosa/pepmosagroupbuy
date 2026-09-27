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
    const s=S();if(!s)return null;
    try{
      const {data:{user},error:userError}=await s.auth.getUser();if(userError||!user)return null;
      const {data:p,error:pError}=await s.from('profiles').select('email,full_name,address,contact_number,whatsapp_name,account_status,email_verified_at').eq('id',user.id).maybeSingle();
      if(pError)throw pError;if(!p||p.account_status!=='APPROVED'||!p.email_verified_at)return null;
      return {user_id:user.id,email:(p.email||user.email||'').trim().toLowerCase(),customer_name:(p.full_name||user.user_metadata?.full_name||'').trim(),contact:(p.contact_number||'').trim(),address:(p.address||'').trim(),whatsapp_name:(p.whatsapp_name||'').trim()};
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
#pepInfoModal #pepInfoTitle{font-size:26px!important}@media(max-width:700px){.pepFinalBody{padding:17px 18px 23px}.pepFinalHead{padding:24px 20px 20px}.pepFinalHead h2{font-size:29px}.pepPaymentGrid{grid-template-columns:1fr 1fr}.pepQRWrap{grid-template-columns:1fr;text-align:center}.pepQRWrap img{margin:auto;width:210px;height:210px}.pepQRText{text-align:left}.pepFields{grid-template-columns:1fr}.pepField.full{grid-column:auto}.pepFinalActions{flex-direction:column}.pepCancel{order:2}}`;s.textContent += "\n
/* PEPMOSA CHECKOUT V3 — complete visual redesign */
#checkoutModal .modalbox{width:min(960px,100%)!important;max-height:95vh!important;border-radius:30px!important;overflow:auto!important;background:#fff!important}
.pepFinalHead{padding:26px 30px 20px!important;background:linear-gradient(135deg,#fff0f7 0%,#fff 55%,#f6edff 100%)!important}
.pepHeadTop{display:flex;justify-content:space-between;align-items:center;gap:10px}.pepSecure{font-size:8px;letter-spacing:.1em;font-weight:900;color:#a25c82;background:#fff;border:1px solid #efd9e6;border-radius:999px;padding:7px 10px}
.pepHeroTitle{display:flex;justify-content:space-between;align-items:center;margin-top:5px}.pepHeroTitle h2{font-size:40px!important;margin:0!important}.pepHeroTitle p{max-width:650px!important;margin-top:7px!important}
.pepHeroHeart{font:90px/1 Georgia,serif;color:#e5a1c8;opacity:.45;padding-right:20px}.pepProgress{display:flex;align-items:center;gap:8px;margin-top:18px;max-width:520px}.pepProgress div{display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:.08em;font-weight:950;color:#a98a99}.pepProgress span{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#eee3ea;color:#8d7180}.pepProgress .active span{background:linear-gradient(135deg,#e72d91,#bd3eb4);color:#fff}.pepProgress i{height:1px;background:#ead7e2;flex:1}
.pepFinalBody{padding:22px 30px 30px!important}.pepCheckoutGrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.72fr);gap:18px;align-items:start}.pepCheckoutMain{min-width:0}.pepCheckoutSide{position:sticky;top:10px}
.pepSectionLabel{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px;color:#ad3977;font-size:10px;letter-spacing:.16em;font-weight:950}.pepSectionLabel span{font-size:8px;letter-spacing:.04em;color:#a28a96;background:#fff2f8;border-radius:999px;padding:6px 8px}
.pepFinalCard{border-radius:20px!important;padding:16px!important;margin-bottom:12px!important;background:#fffafd!important;border:1px solid #efd9e6!important;box-shadow:0 8px 25px rgba(94,42,74,.045)!important}
.pepOrderLine{padding:12px 13px!important;margin-top:6px!important;border-radius:14px!important;background:#fff!important}.pepProductName{font-size:13px;font-weight:950;color:#34242e}.pepOrderInfo small{font-size:9px;color:#957f89}.pepOrderAmount{font-size:13px!important}
.pepPaymentCard{background:linear-gradient(145deg,#fffafd,#fff4fa)!important}.pepLiveDot{font-size:7px;letter-spacing:.05em;color:#16804c;background:#e8f8ef;padding:5px 7px;border-radius:999px}.pepQRWrap{grid-template-columns:180px 1fr!important;gap:20px!important}.pepQRFrame{display:grid;place-items:center;padding:10px;background:#fff;border:1px solid #f0dbe6;border-radius:20px;box-shadow:0 12px 28px rgba(82,37,67,.09)}.pepQRWrap img{width:160px!important;height:160px!important;border:0!important;box-shadow:none!important;border-radius:10px!important}.pepPayLabel{font-size:8px;letter-spacing:.14em;color:#c52c80;font-weight:950;margin-bottom:5px}.pepQRText h3{font-size:19px!important}.pepQRText p{font-size:11px!important}.pepQRNote{font-size:9px!important}
.pepSummaryCard{border:1px solid #efcfe0;border-radius:23px;padding:20px;background:linear-gradient(145deg,#fff8fc,#fff0f8);box-shadow:0 12px 30px rgba(107,39,78,.08)}.pepSummaryEyebrow{font-size:10px;letter-spacing:.16em;color:#a93673;font-weight:950;margin-bottom:15px}.pepSummaryCard .pepTotalRows{gap:10px}.pepSummaryCard .pepTotalRow{font-size:11px}.pepSummaryCard .pepTotalRow small{font-size:6px;color:#167247;background:#e7f8ee;border-radius:999px;padding:3px 5px;margin-left:4px;font-weight:950}.pepGrand{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #ecd4e1;margin-top:15px;padding-top:15px}.pepGrand span{font-size:10px;color:#856c78;font-weight:800}.pepGrand strong{font-size:22px;color:#c5257b}.pepSummaryNote{margin-top:13px;padding:9px 10px;border-radius:11px;background:#fff;color:#966079;font-size:9px;line-height:1.5}
.pepShippingSelect{width:100%;height:48px;border:1px solid #ead3df;border-radius:14px;padding:0 13px;background:#fff;color:#3c2a34;font:inherit;outline:none}.pepShippingSelect:focus{border-color:#db5c9e;box-shadow:0 0 0 3px rgba(219,92,158,.08)}
.pepUploadLarge{display:flex!important;align-items:center;gap:13px;position:relative}.pepUploadIcon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#f7c2df,#e6c9ef);color:#a92675;font-size:22px;font-weight:900}.pepUploadCopy{display:flex;flex-direction:column;gap:3px;flex:1}.pepUploadCopy strong{font-size:11px;color:#46313d}.pepUploadCopy span{font-size:8px;color:#907a85}.pepUploadLarge input{max-width:190px}
.pepSummaryCard+.pepSubmit{width:100%;min-height:54px;margin-top:12px;border-radius:16px!important}.pepSubmit span{font-size:18px;margin-left:8px}.pepCheckoutSide .pepCancel{width:100%;min-height:45px;margin-top:8px}.pepSecureNote{text-align:center;margin-top:11px;font-size:8px;color:#9a8490;line-height:1.5}
@media(max-width:760px){.pepFinalHead{padding:23px 18px 19px!important}.pepHeroTitle h2{font-size:32px!important}.pepHeroHeart{font-size:65px;padding-right:0}.pepFinalBody{padding:17px 16px 24px!important}.pepCheckoutGrid{grid-template-columns:1fr}.pepCheckoutSide{position:static;display:flex;flex-direction:column}.pepSummaryCard{order:0}.pepSubmit{order:1}.pepCancel{order:2}.pepSecureNote{order:3}.pepQRWrap{grid-template-columns:1fr!important}.pepQRFrame{width:185px;margin:0 auto}.pepQRText{text-align:left;margin-top:10px}.pepUploadLarge{flex-wrap:wrap}.pepUploadLarge input{max-width:100%;width:100%}.pepProgress{max-width:100%}}

/* PEPMOSA CHECKOUT — glossy girly refresh */\n#checkoutModal{padding:14px!important;background:rgba(48,24,42,.64)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}\n#checkoutModal .modalbox{width:min(900px,100%)!important;max-height:95vh!important;border-radius:34px!important;border:1px solid #f1c5dd!important;background:linear-gradient(145deg,#fff,#fff8fc 62%,#faefff)!important;box-shadow:0 35px 110px rgba(48,18,42,.34)!important}\n.pepFinalHead{padding:32px 34px 25px!important;background:radial-gradient(circle at 88% 20%,rgba(231,63,151,.13),transparent 22%),linear-gradient(135deg,#ffeaf6,#fff9fc 55%,#f6ecff)!important;border-bottom:1px solid #f1d5e4!important}\n.pepFinalHead:after{content:'♡';right:27px!important;bottom:-25px!important;font-size:112px!important;color:rgba(215,47,143,.12)!important}\n.pepFinalKicker{font-size:10px!important;letter-spacing:.22em!important;color:#cf2b83!important}.pepFinalHead h2{font-size:38px!important;color:#3b2634!important;letter-spacing:-1.5px!important}.pepFinalHead p{font-size:13px!important;color:#7e6975!important;max-width:650px!important}\n.pepFinalBody{padding:20px 34px 32px!important}.pepStep{margin:3px 0 13px!important;color:#b05c87!important;letter-spacing:.08em}.pepStep span{width:28px!important;height:28px!important;background:linear-gradient(135deg,#eb3195,#be42b6)!important;box-shadow:0 6px 14px rgba(211,44,139,.18)!important}\n.pepFinalCard{border:1px solid #f0d5e3!important;border-radius:23px!important;padding:18px!important;background:rgba(255,251,253,.88)!important;box-shadow:0 8px 26px rgba(103,42,76,.045)!important}\n.pepFinalTitle{color:#b02e78!important;font-size:11px!important;letter-spacing:.17em!important}.pepOrderLine{border-color:#f0dce7!important;border-radius:15px!important;padding:12px 13px!important}.pepOrderAmount{font-size:13px!important}\n.pepTotalRows{gap:9px!important}.pepTotalRow{font-size:13px!important}.pepTotalRow.grand{font-size:21px!important;color:#3b2634!important}.pepTotalRow.grand span:last-child{padding:7px 15px;border-radius:999px;background:#ffe4f2;color:#c5267c}\n.pepQRWrap{grid-template-columns:205px 1fr!important;gap:24px!important}.pepQRWrap img{width:205px!important;height:205px!important;border:9px solid #fff!important;border-radius:22px!important;box-shadow:0 12px 32px rgba(92,39,76,.12)!important}.pepQRText h3{font-size:18px!important}.pepQRText p{font-size:12px!important}.pepQRNote{padding:11px 13px!important;border-radius:13px!important;background:#ffedf7!important;color:#a04476!important}\n.pepFields{gap:13px!important}.pepField label{font-size:10px!important}.pepField input,.pepField textarea,.pepField select{min-height:48px!important;border:1px solid #e8d0df!important;border-radius:15px!important;background:#fff!important}.pepReturningNote{border-radius:15px!important;background:linear-gradient(135deg,#fff0f7,#faf1ff)!important;color:#a04476!important;border-color:#efd2e3!important}\n.pepUpload{border:1.5px dashed #dc8fba!important;border-radius:18px!important;background:#fff5fa!important;padding:16px!important}.pepUploadHint{font-size:10px!important}.pepFinalActions{margin-top:19px!important}.pepSubmit{min-height:54px!important;border-radius:17px!important;background:linear-gradient(135deg,#f02e95,#bd3db5)!important;box-shadow:0 13px 28px rgba(210,43,139,.24)!important;font-size:14px!important}.pepCancel{min-height:54px!important;border-radius:17px!important}\n@media(max-width:700px){.pepFinalHead{padding:25px 20px 21px!important}.pepFinalHead h2{font-size:31px!important}.pepFinalBody{padding:17px 16px 24px!important}.pepQRWrap{grid-template-columns:1fr!important}.pepQRWrap img{width:220px!important;height:220px!important}.pepQRText{text-align:left!important}.pepFinalCard{border-radius:20px!important}}\n";document.head.appendChild(s)}
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
    const modal=$('checkoutModal'),box=modal?.querySelector('.modalbox'),{cart,subtotal}=totals();if(!modal||!box||!cart.length)return;
    const gb=getGB(),qr=gb?.final_payment_qr_url||'',adminFee=Number(gb?.admin_fee||0),customer=checkoutCustomer||{},email=customer.email||'',gbName=gb?.customer_facing_name||gb?.gb_number||'PEPMOSA GROUP BUY';
    const lines=cart.map(i=>`<div class="pepOrderLine"><div class="pepOrderInfo"><div class="pepProductName">${esc(itemName(i))}</div><small>${esc(itemStrength(i))}${itemStrength(i)?' • ':''}Qty ${itemQty(i)} × ${peso(itemPrice(i))}</small></div><div class="pepOrderAmount">${peso(itemPrice(i)*itemQty(i))}</div></div>`).join('');
    const qrBlock=qr?`<div class="pepFinalCard pepPaymentCard"><div class="pepFinalTitle"><span>PAYMENT</span><span class="pepLiveDot">SECURE PAYMENT</span></div><div class="pepQRWrap"><div class="pepQRFrame"><img src="${esc(qr)}" alt="PEPMOSA payment QR"></div><div class="pepQRText"><div class="pepPayLabel">SCAN TO PAY</div><h3>Complete your payment</h3><p>Scan the QR code, pay the exact order total, then upload your receipt below.</p><div class="pepQRNote">✓ Make sure the amount paid matches your final total.</div></div></div></div>`:`<div class="pepFinalCard pepPaymentCard"><div class="pepFinalTitle"><span>PAYMENT</span></div><div class="pepQRText"><h3>Payment QR unavailable</h3><p>Please contact PEPMOSA before submitting your order.</p></div></div>`;
    box.innerHTML=`<div class="pepFinalHead">
      <div class="pepHeadTop"><div class="pepFinalKicker">PEPMOSA GROUP BUY</div><div class="pepSecure">♡ SAVED ACCOUNT</div></div>
      <div class="pepHeroTitle"><div><h2>Checkout</h2><p>You're almost done. Review your order, choose shipping, make payment, and send your proof.</p></div><div class="pepHeroHeart">♡</div></div>
      <div class="pepProgress"><div class="active"><span>1</span> REVIEW</div><i></i><div class="active"><span>2</span> PAY</div><i></i><div><span>3</span> SUBMIT</div></div>
    </div>
    <div class="pepFinalBody">
      <div class="pepCheckoutGrid">
        <main class="pepCheckoutMain">
          <div id="pepCheckoutMsg"></div>
          <div class="pepSectionLabel">YOUR ORDER <span>${esc(gbName)}</span></div>
          <div class="pepFinalCard pepOrderCard">${lines}</div>
          ${qrBlock}
          <div class="pepFinalCard">
            <div class="pepFinalTitle"><span>DELIVERY DETAILS</span><span class="optional">FROM YOUR ACCOUNT</span></div>
            <div class="pepFields">
              <div class="pepField"><label>FULL NAME</label><input value="${esc(customer.customer_name)}" readonly></div>
              <div class="pepField"><label>CONTACT NUMBER</label><input value="${esc(customer.contact)}" readonly></div>
              <div class="pepField"><label>EMAIL</label><input value="${esc(email)}" readonly></div>
              <div class="pepField"><label>WHATSAPP NAME</label><input value="${esc(customer.whatsapp_name)}" readonly></div>
              <div class="pepField full"><label>COMPLETE DELIVERY ADDRESS</label><textarea readonly>${esc(customer.address)}</textarea></div>
            </div>
            <div class="pepReturningNote">♡ Your saved PEPMOSA account details are automatically used for this order.</div>
          </div>
          <div class="pepFinalCard">
            <div class="pepFinalTitle"><span>SHIPPING METHOD</span><span class="optional">REQUIRED</span></div>
            <select id="pepShippingMethod" class="pepShippingSelect">
              <option value="0">J&amp;T Express — Luzon • ₱100</option>
              <option value="1">J&amp;T Express — Visayas • ₱150</option>
              <option value="2">J&amp;T Express — Mindanao • ₱180</option>
              <option value="3">Lalamove — APP RATE</option>
            </select>
          </div>
          <div class="pepFinalCard">
            <div class="pepFinalTitle"><span>PAYMENT PROOF</span><span class="optional">REQUIRED</span></div>
            <div class="pepUpload pepUploadLarge"><div class="pepUploadIcon">↑</div><div class="pepUploadCopy"><strong>Upload your payment receipt</strong><span>JPG, PNG, WEBP or PDF • Maximum 5MB</span></div><input id="pepOrderProof" type="file" accept="image/*,.pdf"></div>
            <div id="pepFileName" class="pepFileName"></div>
          </div>
        </main>
        <aside class="pepCheckoutSide">
          <div class="pepSummaryCard">
            <div class="pepSummaryEyebrow">ORDER SUMMARY</div>
            <div class="pepTotalRows">
              <div class="pepTotalRow"><span>Products</span><b>${peso(subtotal)}</b></div>
              <div class="pepTotalRow"><span>Admin fee <small>CHECKED ON SUBMIT</small></span><b>${peso(adminFee)}</b></div>
              <div class="pepTotalRow"><span>Shipping</span><b id="pepShippingFee">₱100.00</b></div>
            </div>
            <div class="pepGrand"><span>Total to pay</span><strong id="pepGrandTotal">${peso(subtotal+100)}</strong></div>
            <div class="pepSummaryNote">♡ Your order total updates automatically when you change shipping.</div>
          </div>
          <button id="pepPlaceOrder" class="pepSubmit" type="button">SUBMIT MY ORDER <span>→</span></button>
          <button id="pepCancelOrder" class="pepCancel" type="button">CANCEL</button>
          <div class="pepSecureNote">🔒 Your payment proof is securely submitted for PEPMOSA admin review.</div>
        </aside>
      </div>
    </div>`;
    $('pepOrderProof')?.addEventListener('change',function(){const f=this.files?.[0],n=$('pepFileName');if(f){n.textContent='✓ '+f.name;n.classList.add('show')}else{n.textContent='';n.classList.remove('show')}});
    $('pepShippingMethod')?.addEventListener('change',updateTotals);$('pepPlaceOrder').onclick=submitOrder;$('pepCancelOrder').onclick=closeCheckout;updateTotals();
  }
  function updateTotals(){
    const {subtotal}=totals();const i=Number($('pepShippingMethod')?.value||0),fee=[100,150,180,0][i]??100;
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
    const activeGB=getGB();if(!activeGB||!['OPEN','KIT_COMPLETION'].includes(String(activeGB.status||'').toUpperCase())){if(typeof window.pepmosaPopup==='function')window.pepmosaPopup('Ordering is currently closed. You can still browse products and keep items in your cart.');else alert('Ordering is currently closed.');return}
    if(typeof window.pepRequireApprovedFee==='function'){const feeOk=await window.pepRequireApprovedFee();if(!feeOk)return}
    const{cart}=totals();if(!cart.length){if(typeof window.openCart==='function')window.openCart();return}
    if(typeof window.closeModal==='function')window.closeModal('cartModal');else $('cartModal')?.classList.remove('show');
    const freshCart=cart.filter(i=>String(i.gb_number||'')===String(activeGB?.gb_number||''));if(freshCart.length!==cart.length){window.cart=freshCart;localStorage.setItem(CART_KEY,JSON.stringify(freshCart));localStorage.setItem(CART_GB_KEY,String(activeGB?.gb_number||''))}
    if(!freshCart.length){if(typeof window.openCart==='function')window.openCart();return}
    let cleanCart=freshCart;try{const cleaned=await sanitizeKitCart(cleanCart,activeGB);cleanCart=cleaned.cart;if(cleaned.changed){if(!cleanCart.length){showSoldOutAndRefresh('Sorry! The remaining vial was just secured by another customer. This variant is now SOLD OUT. Refreshing the shop…');return}alert('Your cart was updated because one of the variants is no longer available. Please review the remaining items.')}}catch(e){alert(e.message||'Unable to verify live remaining vials. Please try again.');return}
    if(!cleanCart.length){if(typeof window.openCart==='function')window.openCart();return}
    checkoutCustomer=await loadCheckoutCustomer();
    if(!checkoutCustomer?.email||!checkoutCustomer.customer_name||!checkoutCustomer.contact||!checkoutCustomer.address){if(typeof window.pepmosaPopup==='function')window.pepmosaPopup('Please complete your PEPMOSA account details before checkout.');else alert('Please complete your PEPMOSA account details before checkout.');return}
    buildCheckout();$('checkoutModal')?.classList.add('open')
  };
  /* Keep the storefront's existing order-submission flow.
     The redesign must not replace the proven atomic checkout RPC. */
  window.placeOrder=async function(){ return submitOrder(); };
  async function submitOrder(){
    if(typeof window.pepRequireApprovedFee==='function'){
      const feeApproved=await window.pepRequireApprovedFee();
      if(!feeApproved)return;
    }
    if(!checkoutCustomer){ try{ checkoutCustomer=await loadCheckoutCustomer(); }catch(e){} }
    const msg=$('pepCheckoutMsg'),btn=$('pepPlaceOrder'),{cart,subtotal}=totals(),gb=getGB(),s=S();if(!s||!gb||!cart.length){if(msg)msg.innerHTML='<div class="pepFinalError">Your checkout session is not ready. Please refresh and try again.</div>';return}
    const latest=await s.from('group_buys').select('gb_number,status').eq('gb_number',gb.gb_number).maybeSingle();
    if(latest.error||!latest.data||!['OPEN','KIT_COMPLETION'].includes(latest.data.status)){msg.innerHTML='<div class="pepFinalError">This Group Buy is no longer open. Please refresh the page.</div>';return}
    const email=(checkoutCustomer?.email||'').trim().toLowerCase(),name=(checkoutCustomer?.customer_name||'').trim(),contact=(checkoutCustomer?.contact||'').trim(),address=(checkoutCustomer?.address||'').trim();
    const file=$('pepOrderProof')?.files?.[0]||null;
    const shipIndex=Number($('pepShippingMethod')?.value||0),shipNames=['J&T Express - Luzon','J&T Express - Visayas','J&T Express - Mindanao','Lalamove'],shipFees=[100,150,180,0];
    const shippingMethod=shipNames[shipIndex]||'';
    const shippingFee=shipFees[shipIndex]||0,total=subtotal+shippingFee;
    const missing=[];if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))missing.push('Account Email');if(!name)missing.push('Full Name');if(!contact)missing.push('Contact Number');if(!shippingMethod)missing.push('Shipping Method');if(!address)missing.push('Delivery Address')
    if(!file)missing.push('Payment Proof');if(missing.length){msg.innerHTML='<div class="pepFinalError"><b>Please complete the following:</b> '+missing.join(' • ')+'</div>';return}if(file.size>5*1024*1024){msg.innerHTML='<div class="pepFinalError">Payment proof must be 5MB or smaller.</div>';return}
    btn.disabled=true;btn.textContent='SUBMITTING…';msg.innerHTML='';
    try{
      // Last-second inventory check: never submit a stale Kit Completion item.
      const cleaned=await sanitizeKitCart(cart,gb);
      if(cleaned.changed){
        btn.disabled=false;btn.textContent='SUBMIT MY ORDER';
        if(!cleaned.cart.length){
          showSoldOutAndRefresh('Sorry! The remaining vial was just secured by another customer. This variant is now SOLD OUT. Refreshing the shop…');
          return;
        }else{
          msg.innerHTML='<div class="pepFinalError"><b>Your cart was updated.</b><br>One or more items changed availability. Please review the updated cart and reopen Checkout before submitting payment.</div>';
        }
        return;
      }
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
      localStorage.setItem('pepmosa_last_order_id',oid);localStorage.setItem('pepmosa_customer_email',email);localStorage.setItem('pepmosa_customer_name',name);localStorage.setItem('pepmosa_phone',contact);
      // Clear both in-memory and persisted cart state only AFTER the order RPC succeeds.
      clearPersistedCart();
      const cartModal=$('cartModal');if(cartModal)cartModal.classList.remove('show','open');closeCheckout();
      const info=$('pepInfoModal');
      if(info){
        info.innerHTML=`<div class="pepSuccessCard">
          <div class="pepSuccessIcon" aria-hidden="true"><span>✓</span></div>
          <div class="pepSuccessBrand">PEPMOSA</div>
          <h2 class="pepSuccessTitle">Payment Submitted</h2>
          <div class="pepSuccessOrder">Order <b>${esc(oid)}</b></div>
          <p class="pepSuccessText">Your order has been submitted successfully. Your payment proof is now <b>pending admin review</b>.</p>
          <div class="pepSuccessNote"><span>✓</span><span>We’ll review your payment and update your order status once approved.</span></div>
          <button type="button" id="pepInfoOk" class="pepSuccessDone">DONE</button>
        </div>`;
        info.classList.add('open');
        const done=$('pepInfoOk');
        if(done)done.onclick=()=>{info.classList.remove('open');info.setAttribute('aria-hidden','true')};
      }else alert('Order submitted: '+oid)}catch(e){
      console.error('PEPMOSA CHECKOUT ERROR',e);
      const errorText=String(e?.message||'Please try again.');
      const soldOut=/no longer available|only .* vial\(s\) remain|remaining vial|sold out|kit completion quantity|inventory/i.test(errorText);
      if(soldOut){
        showSoldOutAndRefresh('Sorry! Another customer secured the last remaining vial first. This variant is now SOLD OUT. Refreshing the shop…');
      }else{
        msg.innerHTML='<div class="pepFinalError"><b>Order was not submitted.</b><br>'+esc(errorText)+'<br><small>Your cart has not been cleared.</small></div>';
      }
    }finally{btn.disabled=false;btn.textContent='SUBMIT MY ORDER'}
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
    const gbNow=getGB();
    // This file has its own product cache, while the main storefront and
    // product picker may already have the same catalog in their own cache.
    // Use those shared fallbacks so approving the Admin Fee never makes the
    // immediately-following Add to Cart lose the selected product.
    const shared=(Array.isArray(window.__pepBaseProducts)?window.__pepBaseProducts:[]);
    const picked=window.__pepLastPickerProduct;
    const product=products.find(p=>String(p.product_id)===String(pid))
      || shared.find(p=>String(p.product_id)===String(pid))
      || (picked&&String(picked.product_id)===String(pid)?picked:null);
    const variant=product?.product_variants?.find(v=>String(v.variant_id)===String(vid))
      || (picked&&String(picked.product_id)===String(pid)?(picked.product_variants||[]).find(v=>String(v.variant_id)===String(vid)):null);
    if(!product||!variant){
      console.error('PEPMOSA ADD TO CART: product/variant not found', {pid,vid,cache:products.length,shared:shared.length,picked:!!picked});
      alert('Product not found. Please refresh the page and try again.');
      return;
    }
    const input=$('qty-'+vid);
    let qty=Math.max(Number(variant.minimum_qty||1),Number(input?.value||variant.minimum_qty||1));
    // Never carry cart quantities across different Group Buys.
    // A cart item belongs only to the GB where it was added.
    const activeGBNumber=String(gbNow?.gb_number||'');
    const cartNow=getCart().filter(x=>String(x.gb_number||'')===activeGBNumber);
    const existing=cartNow.find(x=>
      String(itemVariantId(x))===String(vid) &&
      String(x.gb_number||'')===activeGBNumber
    );
    if(gbNow?.status==='KIT_COMPLETION'){
      const remaining=Number(variant.remaining_qty||0),already=Number(existing?itemQty(existing):0);
      if(remaining<1){alert('This variant is no longer available. Please refresh.');return;}
      if(qty>remaining){qty=remaining;if(input)input.value=qty;alert('Only '+remaining+' vial(s) remain for this variant.');}
      if(already+qty>remaining){alert('Only '+Math.max(0,remaining-already)+' more vial(s) can be added for this variant.');return;}
    }
    if(existing)existing.qty=itemQty(existing)+qty;
    else cartNow.push({
      gb_number:gbNow?.gb_number||null,
      product_id:pid,variant_id:vid,product_name:product.product_name,
      strength:variant.strength||'',price:Number(variant.price||0),qty
    });
    window.cart=cartNow;
    localStorage.setItem(CART_KEY,JSON.stringify(cartNow));
    localStorage.setItem(CART_GB_KEY,activeGBNumber);
    if(typeof window.updateCart==='function')window.updateCart();
    // ADD TO CART must stay on the storefront. Do not open an empty/stale cart
    // and do not refresh or mutate Kit Completion inventory here.
    window.dispatchEvent(new Event('pepmosa-cart-updated'));
  };
  function boot(){injectStyles();let tries=0;const t=setInterval(async()=>{tries++;if($('checkoutModal')){if(!products.length)await repairStorefront();clearInterval(t)}if(tries>=15)clearInterval(t)},500)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();