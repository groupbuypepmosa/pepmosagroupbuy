/* PEPMOSA FINAL CHECKOUT SUBMIT COMPATIBILITY FIX
   Payment-method UI was removed by design, but the legacy submit function still
   validates its internal paymentMethod variable. Keep that legacy requirement
   satisfied internally without showing a payment-method selector to customers.
*/
(function(){
  'use strict';
  function boot(){
    if(document.documentElement.dataset.pepSubmitFix==='1') return;
    document.documentElement.dataset.pepSubmitFix='1';

    document.addEventListener('click',function(e){
      const btn=e.target?.closest?.('#pepPlaceOrder');
      if(!btn) return;
      window.pepmosaSelectedPayment='PAYMENT_QR';
    },true);

    const style=document.createElement('style');
    style.id='pepSubmitFixStyles';
    style.textContent=`
      #checkoutModal .pepPaymentGrid,
      #checkoutModal .pepPaymentHint,
      #checkoutModal .pepSelectedPayment{display:none!important}
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
