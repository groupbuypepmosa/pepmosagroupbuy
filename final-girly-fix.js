/* Final overrides for the requested simple shipping dropdown. */
(function(){
  'use strict';
  function install(){
    if(document.getElementById('pepFinalDropdownFix'))return;
    const s=document.createElement('style');s.id='pepFinalDropdownFix';s.textContent=`#pepShippingChoices,.pepShippingChoices{display:none!important}#pepShippingMethod{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;pointer-events:auto!important;width:100%!important;height:auto!important;min-height:44px!important;appearance:auto!important}`;document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
