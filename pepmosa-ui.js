/* PEPMOSA STOREFRONT UI
   Single visual/compatibility layer. Keep functional data/order logic in the core files.
*/
(function(){
  'use strict';
  const $=id=>document.getElementById(id);

  function injectStyles(){
    if($('pepmosaUnifiedUIStyles')) return;
    const s=document.createElement('style');
    s.id='pepmosaUnifiedUIStyles';
    s.textContent=`
      :root{--pep-pink:#d92a8b;--pep-pink2:#c85acb;--pep-ink:#33242d;--pep-muted:#806f79;--pep-line:#efdce7;--pep-soft:#fff5fa}
      body{background:#fff8fc!important;color:var(--pep-ink)}

      /* PRODUCTS — clean premium cards, no competing variant scrollers */
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

      /* ALL POPUPS — one consistent girly treatment */
      .modal,.pepFeeModal,#pepSiteNoticeModal{background:rgba(45,20,37,.58)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}
      .modalbox,.pepFeeBox,.pepSiteNoticeCard{border:1px solid #efd4e3!important;border-radius:26px!important;background:linear-gradient(145deg,#fff,#fff7fb)!important;box-shadow:0 28px 90px rgba(55,20,45,.25)!important;overflow:auto!important}
      .modalbox h2,.pepFeeBox h2,.pepSiteNoticeCard h2{color:#30222b!important}
      .modalbox .btn,.pepFeeBtn,.pepSiteNoticeActions .primary{border-radius:12px!important}
      .pepFeeBtn,.pepSiteNoticeActions .primary{background:linear-gradient(135deg,var(--pep-pink),var(--pep-pink2))!important;color:#fff!important;border:0!important}
      #pepFeeModal .pepFeeBox,#pepVerifyModal .pepFeeBox,#pepInfoModal .pepFeeBox{padding:0!important}
      #pepFeeModal .pepFeeBox>h2,#pepVerifyModal .pepFeeBox h2,#pepInfoModal .pepFeeBox h2{padding:24px 28px 17px!important;margin:0!important;background:linear-gradient(135deg,#ffeaf5,#fff8fc 62%,#f4ecff)!important;border-bottom:1px solid #efdce7!important}
      #pepSiteNoticeModal{z-index:100000!important}

      /* CHECKOUT — no payment-method cards, shipping stays a dropdown */
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

      /* Compatibility: checkout no longer asks for a payment-method selection. */
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
      const grid=card.querySelector('.pepPaymentGrid');
      if(grid) card.remove();
    });
    // The legacy checkout validates this variable even though the UI is intentionally removed.
    window.pepmosaSelectedPayment='ONLINE PAYMENT';
  }

  function clean(){injectStyles();removePaymentCard()}
  function boot(){
    clean();
    const observer=new MutationObserver(()=>removePaymentCard());
    observer.observe(document.body,{subtree:true,childList:true});
    setInterval(clean,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();