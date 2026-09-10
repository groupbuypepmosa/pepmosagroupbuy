window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFv2Qv2U"
};

/* PEPMOSA loader guard.
   Never load storefront scripts twice: duplicate handlers caused cart/access
   races and inconsistent behavior between fresh browser profiles. */
(function(){
  'use strict';
  const VERSION = '20260910-buyer-email-v3';

  function hasScript(file){
    return Array.from(document.scripts).some(s=>{
      const src=(s.getAttribute('src')||'').split('?')[0];
      return src===file || src.endsWith('/'+file);
    });
  }

  function loadOnce(file){
    if(!file || hasScript(file) || document.querySelector('script[data-pepmosa-stable="'+file+'"]')) return;
    const s=document.createElement('script');
    s.src=file+'?v='+VERSION;
    s.dataset.pepmosaStable=file;
    s.async=false;
    document.body.appendChild(s);
  }

  function boot(){
    const path=(window.location.pathname||'').toLowerCase();
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');
    const isAdmin=path.endsWith('/admin')||path.endsWith('/admin.html')||path==='/admin';

    if(isStorefront){
      loadOnce('storefront-repair.js');
      loadOnce('checkout-polish.js');
      loadOnce('group-buy-total-polish.js');
      return;
    }

    if(isAdmin){
      loadOnce('admin-waybill.js');
      loadOnce('buyer-order-email-hook.js');
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();