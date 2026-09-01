/* PEPMOSA FINAL STOREFRONT UI LAYER
   Visual-only consolidation layer. It intentionally does not replace cart,
   checkout, payment, or Group Buy data logic from the existing modules. */
(function(){
  'use strict';
  const STYLE_ID='pepmosa-final-storefront-style';

  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      /* Clean storefront grid */
      #products{max-width:1120px;margin:0 auto;padding:0 18px 60px}
      #products .sectionHead{display:flex;align-items:end;justify-content:space-between;gap:24px;margin:48px 0 22px}
      #products .sectionHead h2{margin:4px 0 0;font-size:34px;letter-spacing:-1px}
      #products .search{width:280px;box-sizing:border-box;border:1px solid #e8c9db;background:rgba(255,255,255,.92);border-radius:14px;padding:13px 16px;outline:none}
      #products .grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:22px!important;align-items:start}
      #products .grid>.card{min-width:0!important;width:auto!important;height:auto!important;max-height:none!important;overflow:hidden!important;border:1px solid #ead6e1!important;border-radius:22px!important;background:#fff!important;box-shadow:0 12px 30px rgba(102,42,84,.07)!important;padding:0!important;transition:transform .18s ease,box-shadow .18s ease}
      #products .grid>.card:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(102,42,84,.11)!important}
      /* Product image: preserve the complete source image */
      #products .productImg{height:205px!important;min-height:205px!important;margin:0!important;padding:10px!important;box-sizing:border-box;background:#fff7fb;border:0!important;border-radius:21px 21px 0 0;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
      #products .productImg img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;display:block!important}
      /* Card content */
      #products .grid>.card>h3,#products .grid>.card>.productName{margin:16px 18px 5px!important;font-size:19px!important;line-height:1.15!important}
      #products .grid>.card>p{margin:0 18px 12px!important;color:#8b7482!important;line-height:1.45!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      /* Variants: no giant internal scrollbars */
      #products .variants,#products .variantList,#products .productVariants{max-height:none!important;overflow:visible!important;padding:0 14px 16px!important;margin:0!important}
      #products .variant,#products .variantRow{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;align-items:center!important;gap:8px!important;padding:10px 8px!important;margin:7px 0!important;border:1px solid #f0dbe6!important;border-radius:13px!important;background:#fffafd!important}
      #products .variantName{font-weight:800!important;font-size:14px!important}
      #products .variantPrice{font-size:12px!important;color:#8a7180!important;white-space:nowrap!important}
      #products .variant input[type=number]{width:54px!important;height:38px!important;box-sizing:border-box!important;text-align:center!important;border:1px solid #e7cddd!important;border-radius:10px!important}
      #products .variant button,#products .variantRow button{height:38px!important;padding:0 13px!important;border-radius:10px!important;background:#d62983!important;color:#fff!important;border:0!important;font-weight:900!important;cursor:pointer}
      #products .minimum{font-size:10px!important;color:#a25a7f!important;font-weight:700!important;margin:0 8px 4px!important}
      /* If legacy variant container has a fixed height, let it breathe inside card */
      #products .grid>.card [style*="overflow"],#products .grid>.card [style*="max-height"]{scrollbar-width:thin}
      /* Clean modal shell, shared by product/cart/checkout/notice */
      .modal{padding:20px!important;box-sizing:border-box!important;background:rgba(33,17,29,.56)!important;backdrop-filter:blur(8px)!important}
      .modalbox{width:min(760px,100%)!important;max-height:min(88vh,900px)!important;overflow:auto!important;border:1px solid rgba(255,255,255,.9)!important;border-radius:26px!important;background:linear-gradient(145deg,#fff,#fff7fb 62%,#faf2ff)!important;box-shadow:0 30px 90px rgba(51,20,44,.25)!important}
      .modalbox h2{letter-spacing:-1px}
      .modalbox .btn.primary{background:linear-gradient(135deg,#df2787,#c51d72)!important;box-shadow:0 8px 18px rgba(214,39,131,.18)!important}
      .modalbox .btn.secondary{background:#fff7fb!important;border-color:#eccfe0!important}
      /* Checkout and cart are above legacy overlay layers */
      #cartModal,#checkoutModal{z-index:10050!important}
      /* Notice popup */
      #siteNoticeModal{z-index:10100!important}
      @media(max-width:980px){#products .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:650px){
        #products{padding:0 12px 45px}
        #products .sectionHead{display:block;margin-top:34px}
        #products .search{width:100%;margin-top:14px}
        #products .grid{grid-template-columns:1fr!important;gap:16px!important}
        #products .productImg{height:220px!important;min-height:220px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function normalizeImages(){
    document.querySelectorAll('#productGrid img').forEach(img=>{
      img.style.objectFit='contain';
      img.style.objectPosition='center';
    });
  }

  function boot(){
    installStyle();
    normalizeImages();
    const grid=document.getElementById('productGrid');
    if(grid){
      new MutationObserver(normalizeImages).observe(grid,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
