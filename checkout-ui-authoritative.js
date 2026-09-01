/* PEPMOSA AUTHORITATIVE CHECKOUT / PRODUCT UI OVERRIDE
   This layer is intentionally last. It removes legacy payment-method cards,
   keeps shipping as a native dropdown, and applies the final girly UI directly
   to the DOM after legacy checkout scripts render. */
(function(){
  'use strict';
  const STYLE='pepAuthoritativeUI';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function install(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      :root{--pep-pink:#d92a8b;--pep-soft:#fff4f9;--pep-line:#efd8e6;--pep-ink:#30232c;--pep-muted:#8d7883}
      body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      /* PRODUCT INDEX */
      #products{max-width:1160px!important;margin:0 auto!important;padding:10px 22px 70px!important}
      #productGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:20px!important;align-items:stretch!important}
      #productGrid>.card{min-width:0!important;overflow:hidden!important;padding:0!important;border:1px solid var(--pep-line)!important;border-radius:24px!important;background:linear-gradient(180deg,#fff,#fffafd)!important;box-shadow:0 14px 34px rgba(115,48,91,.08)!important}
      #productGrid>.card:hover{transform:translateY(-3px);box-shadow:0 20px 42px rgba(115,48,91,.12)!important}
      #productGrid .productImg{height:220px!important;min-height:220px!important;margin:0!important;padding:14px!important;border:0!important;border-bottom:1px solid #f3e1e9!important;border-radius:24px 24px 0 0!important;background:linear-gradient(145deg,#fff,#fff3f9 65%,#f8efff)!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
      #productGrid .productImg img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;display:block!important}
      #productGrid>.card h3,#productGrid>.card>.productName{margin:16px 18px 6px!important;font-size:18px!important;line-height:1.15!important;font-weight:900!important;color:#30232c!important}
      #productGrid>.card>p,#productGrid>.card>.muted{margin:0 18px 12px!important;color:#927f89!important;font-size:10.5px!important;line-height:1.45!important}
      #productGrid .variants,#productGrid .variantList,#productGrid .productVariants{max-height:none!important;overflow:visible!important;padding:0 15px 17px!important;display:grid!important;gap:8px!important}
      #productGrid .variant,#productGrid .variantRow{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;align-items:center!important;gap:7px!important;margin:0!important;padding:9px!important;border:1px solid #f0dce7!important;border-radius:14px!important;background:#fff!important}
      #productGrid .variant button,#productGrid .variantRow button{height:36px!important;border:0!important;border-radius:10px!important;background:linear-gradient(135deg,#e73591,#c64e9c)!important;color:#fff!important;font-weight:900!important;cursor:pointer!important}
      /* ALL MODALS */
      .modal{background:rgba(43,22,38,.58)!important;backdrop-filter:blur(9px)!important}
      .modalbox{border:1px solid #efd3e2!important;border-radius:28px!important;background:linear-gradient(145deg,#fff,#fff7fb 65%,#f7f0ff)!important;box-shadow:0 30px 100px rgba(53,20,45,.28)!important}
      /* CHECKOUT */
      #checkoutModal .modalbox{width:min(820px,calc(100vw - 24px))!important;max-height:92vh!important;overflow:auto!important;padding:0!important}
      #checkoutModal .pepFinalHead,#checkoutModal .girlyCheckoutHead{background:linear-gradient(135deg,#ffe8f3,#fff7fb 60%,#f5edff)!important}
      #checkoutModal .pepFinalCard,#checkoutModal .girlySection{border-color:#efd9e6!important;border-radius:20px!important;background:rgba(255,250,253,.9)!important}
      #checkoutModal .pepFinalTitle,#checkoutModal .girlySectionTitle{color:#9e4c78!important}
      #checkoutModal .pepSubmit,#checkoutModal .girlySubmit{background:linear-gradient(135deg,#e73591,#c64e9c)!important;border:0!important}
      /* Shipping is ALWAYS a simple dropdown */
      #checkoutModal #pepShippingChoices,.pepShippingChoices{display:none!important}
      #checkoutModal #pepShippingMethod{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;pointer-events:auto!important;width:100%!important;min-height:44px!important;height:auto!important;appearance:auto!important;border:1px solid #e8d5e0!important;border-radius:13px!important;background:#fff!important;padding:10px 12px!important;color:#382a32!important;font-weight:700!important}
      /* Hide every legacy payment-method card/step */
      #checkoutModal .pepPaymentGrid{display:none!important}
      #checkoutModal .pepPaymentGrid~.pepPaymentHint{display:none!important}
      #checkoutModal .pepPaymentGrid~.pepSelectedPayment{display:none!important}
      #checkoutModal .pepPaymentGrid{visibility:hidden!important;height:0!important;margin:0!important;padding:0!important}
      @media(max-width:850px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:650px){#products{padding:8px 12px 50px!important}#productGrid{grid-template-columns:1fr!important;gap:15px!important}#productGrid .productImg{height:235px!important;min-height:235px!important}}
    `;document.head.appendChild(s)
  }

  function removePaymentSection(){
    const grid=$('#checkoutModal .pepPaymentGrid');
    if(!grid)return;
    const card=grid.closest('.pepFinalCard,.girlySection');
    if(card)card.remove();
    $$('#checkoutModal .pepStep').forEach(step=>{
      const t=(step.textContent||'').toUpperCase();
      if(t.includes('PAYMENT') && t.includes('2'))step.remove();
    });
    $$('#checkoutModal .pepQRText p').forEach(p=>{
      p.textContent='Complete your payment using the displayed QR, then upload your payment receipt or screenshot below.';
    });
  }

  function clean(){
    install();
    removePaymentSection();
  }

  function boot(){
    clean();
    const obs=new MutationObserver(()=>clean());
    obs.observe(document.body,{childList:true,subtree:true});
    setInterval(clean,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
