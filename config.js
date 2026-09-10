window.PEPMOSA_CONFIG = {
  SUPABASE_URL: "https://pnetzdggtlbuhuxdzzak.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_f-FUnzjqozjjeB-KIIml-A_i9zFvQ2U"
};

(function(){
  'use strict';
  const VERSION = '20260910-buyer-email-v12';
  function hasScript(file){return Array.from(document.scripts).some(s=>{const src=(s.getAttribute('src')||'').split('?')[0];return src===file||src.endsWith('/'+file)})}
  function loadOnce(file){if(!file||hasScript(file)||document.querySelector('script[data-pepmosa-stable="'+file+'"]'))return;const s=document.createElement('script');s.src=file+'?v='+VERSION;s.dataset.pepmosaStable=file;s.async=false;document.body.appendChild(s)}
  function boot(){
    const path=(window.location.pathname||'').toLowerCase();
    const isStorefront=path==='/'||path.endsWith('/index.html')||path.endsWith('index.html');
    const isAdmin=path.endsWith('/admin')||path.endsWith('/admin.html')||path==='/admin';
    const isTracker=path.endsWith('/track')||path.endsWith('/track.html');
    if(isStorefront){loadOnce('storefront-repair.js');loadOnce('checkout-polish.js');loadOnce('group-buy-total-polish.js');loadOnce('soldout-products-visible.js');return}
    if(isAdmin){loadOnce('admin-waybill.js');loadOnce('buyer-order-email-hook.js');loadOnce('tracking-gb-scope-fix.js');loadOnce('bulk-email-direct.js');loadOnce('bulk-email-button-final.js');return}
    if(isTracker)loadOnce('tracking-ui-polish.js');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
