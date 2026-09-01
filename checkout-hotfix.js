/* PEPMOSA checkout hotfix
   Ensures the current OPEN Group Buy is available before checkout,
   so the final-payment QR and submit flow have the correct GB context.
   Also makes the dynamically-rendered CANCEL button reliably clickable.
*/
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const S=()=>window.sb||window.__sb;

  async function ensureCurrentGB(){
    if(window.currentGB) return window.currentGB;
    const s=S();
    if(!s) return null;

    try{
      const r=await s
        .from('group_buys')
        .select('*')
        .eq('status','OPEN')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();

      if(!r.error && r.data){
        window.currentGB=r.data;
        window.pepmosaCurrentGB=r.data;
        return r.data;
      }
    }catch(e){
      console.error('PEPMOSA CHECKOUT GB HOTFIX',e);
    }

    return null;
  }

  function closeCheckout(){
    const modal=$('checkoutModal');
    if(!modal) return;
    modal.classList.remove('open');
    modal.classList.remove('show');
    modal.style.removeProperty('display');
  }

  function installCancel(){
    if(document.documentElement.dataset.pepCancelHotfix==='1') return;
    document.documentElement.dataset.pepCancelHotfix='1';

    document.addEventListener('click',function(e){
      const btn=e.target?.closest?.('#pepCancelOrder');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeCheckout();
    },true);

    const style=document.createElement('style');
    style.id='pepCheckoutHotfixStyles';
    style.textContent=`
      #checkoutModal{z-index:100001!important;pointer-events:auto!important}
      #checkoutModal .modalbox{pointer-events:auto!important}
      #checkoutModal button{pointer-events:auto!important;position:relative;z-index:2}
      #pepCancelOrder{cursor:pointer!important;pointer-events:auto!important}
    `;
    document.head.appendChild(style);
  }

  async function openCheckoutSafely(){
    const cart=Array.isArray(window.cart)
      ? window.cart
      : (()=>{try{return JSON.parse(localStorage.pepmosaCart||'[]')}catch(e){return []}})();

    if(!cart.length){
      if(typeof window.openCart==='function') window.openCart();
      return;
    }

    const gb=await ensureCurrentGB();
    if(!gb){
      alert('No open Group Buy is available. Please refresh and try again.');
      return;
    }

    if(typeof window.__pepOriginalCheckout==='function'){
      return window.__pepOriginalCheckout();
    }
  }

  async function placeOrderSafely(){
    const gb=await ensureCurrentGB();
    const msg=$('pepCheckoutMsg');
    if(!gb){
      if(msg) msg.innerHTML='<div class="pepCOError">Your checkout session is not ready. Please refresh and try again.</div>';
      return;
    }
    if(typeof window.__pepOriginalPlaceOrder==='function'){
      return window.__pepOriginalPlaceOrder();
    }
  }

  function boot(){
    installCancel();

    /* Save the working functions from checkout-polish before overriding them. */
    if(typeof window.checkout==='function' && !window.__pepOriginalCheckout){
      window.__pepOriginalCheckout=window.checkout;
    }
    if(typeof window.placeOrder==='function' && !window.__pepOriginalPlaceOrder){
      window.__pepOriginalPlaceOrder=window.placeOrder;
    }

    window.checkout=openCheckoutSafely;
    window.placeOrder=placeOrderSafely;

    /* Keep the GB context fresh while the page is open. */
    ensureCurrentGB();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  /* checkout-polish may finish loading shortly after this script on slow connections. */
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof window.checkout==='function' && window.checkout!==openCheckoutSafely){
      if(!window.__pepOriginalCheckout) window.__pepOriginalCheckout=window.checkout;
      window.checkout=openCheckoutSafely;
    }
    if(typeof window.placeOrder==='function' && window.placeOrder!==placeOrderSafely){
      if(!window.__pepOriginalPlaceOrder) window.__pepOriginalPlaceOrder=window.placeOrder;
      window.placeOrder=placeOrderSafely;
    }
    if(tries>=30) clearInterval(timer);
  },250);
})();
