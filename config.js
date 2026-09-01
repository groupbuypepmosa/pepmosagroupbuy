window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function(){
  'use strict';
  function loadOnce(file){
    if(!file || document.querySelector('script[data-pepmosa-stable="'+file+'"]')) return;
    const s=document.createElement('script');
    s.src=file+'?v=20260901-stable5';
    s.dataset.pepmosaStable=file;
    document.body.appendChild(s);
  }
  function boot(){
    const path=(window.location.pathname||'').toLowerCase();
    const isAdmin=path.endsWith('/admin.html')||path.endsWith('admin.html');
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');
    if(isAdmin){
      // The legacy admin bootstrap checks the session immediately during parsing.
      // Load the stable repair layer before that check so the old schema calls never run.
      if(!document.querySelector('script[data-pepmosa-stable="admin-repair.js"]')){
        document.write('<script src="admin-repair.js?v=20260901-stable5" data-pepmosa-stable="admin-repair.js"></'+'script>');
      }
    }
    if(isStorefront) loadOnce('storefront-repair.js');
  }
  boot();
})();
