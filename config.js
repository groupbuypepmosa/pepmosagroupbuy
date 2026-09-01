window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-UnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function(){
  'use strict';
  const VERSION = '20260901-stable13';

  function loadOnce(file){
    if(!file || document.querySelector('script[data-pepmosa-stable="'+file+'"]')) return;
    const s=document.createElement('script');
    s.src=file+'?v='+VERSION;
    s.dataset.pepmosaStable=file;
    /* Keep storefront repairs in the exact order listed below. */
    s.async=false;
    document.body.appendChild(s);
  }

  function boot(){
    const path=(window.location.pathname||'').toLowerCase();
    const isAdmin=path.endsWith('/admin.html')||path.endsWith('admin.html');
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');

    if(isAdmin){
      if(!document.querySelector('script[data-pepmosa-stable="admin-repair.js"]')){
        document.write('<script src="admin-repair.js?v='+VERSION+'" data-pepmosa-stable="admin-repair.js"></'+'script>');
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
    }
  }

  boot();
})();
