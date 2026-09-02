window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

/* Keep page-specific enhancements isolated so admin changes do not touch
   checkout, login, storefront, tracking, or payment logic. */
(function(){
  'use strict';
  const VERSION = '20260902-waybill-v2';

  function loadOnce(file){
    if(!file || document.querySelector('script[data-pepmosa-stable="'+file+'"]')) return;
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
      return;
    }

    /* Only the admin waybill view receives this visual/print enhancement. */
    if(isAdmin){
      loadOnce('admin-waybill.js');
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();