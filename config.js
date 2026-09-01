window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function(){
  'use strict';
  const VERSION = '20260902-checkout2';

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
    const isAdmin=path.endsWith('/admin.html')||path.endsWith('admin.html');
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');

    if(isAdmin){
      if(!document.querySelector('script[data-pepmosa-stable="admin-repair.js"]')){
        const s=document.createElement('script');
        s.src='admin-repair.js?v='+VERSION;
        s.dataset.pepmosaStable='admin-repair.js';
        s.async=false;
        document.body.appendChild(s);
      }
      loadOnce('admin-gb-categories.js');
    }

    if(isStorefront){
      loadOnce('storefront-repair.js');
      loadOnce('fee-modal-repair.js');
      loadOnce('storefront-ui-hotfix.js');
      loadOnce('checkout-polish.js');
      loadOnce('shipping-rates.js');
      loadOnce('checkout-hotfix.js');
      loadOnce('index-ui-final.js');
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
