window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function(){
  'use strict';
  function loadOnce(file){
    if(!file || document.querySelector('script[data-pepmosa-stable="'+file+'"]')) return;
    const s=document.createElement('script');s.src=file+'?v=20260901-stable9';s.dataset.pepmosaStable=file;document.body.appendChild(s);
  }
  function boot(){
    const path=(window.location.pathname||'').toLowerCase();
    const isAdmin=path.endsWith('/admin.html')||path.endsWith('admin.html');
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');
    if(isAdmin){
      if(!document.querySelector('script[data-pepmosa-stable="admin-repair.js"]'))document.write('<script src="admin-repair.js?v=20260901-stable9" data-pepmosa-stable="admin-repair.js"></'+'script>');
      loadOnce('admin-gb-categories.js');
    }
    if(isStorefront){
      loadOnce('storefront-repair.js');
      loadOnce('fee-modal-repair.js');
      loadOnce('storefront-ui-hotfix.js');
    }
  }
  boot();
})();
