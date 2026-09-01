window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

/* Single source of truth:
   Admin loads only the code already built into admin.html.
   Do not inject legacy admin repair layers here, because overlapping
   overrides can break login and replace newer handlers. */
(function(){
  'use strict';
  const VERSION = '20260902-admin-stable';
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

    /* Storefront layers remain untouched. */
    if(isStorefront){
      loadOnce('storefront-repair.js');
      loadOnce('checkout-polish.js');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();