(function(){
  'use strict';
  const FN='send-buyer-order-processing-email';
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));}
  function toast(msg,ok){const old=document.getElementById('buyerEmailHookToast');if(old)old.remove();const d=document.createElement('div');d.id='buyerEmailHookToast';d.textContent=msg;d.style.cssText='position:fixed;right:18px;bottom:18px;z-index:999999;padding:13px 16px;border-radius:14px;background:'+(ok?'#e8f8ef':'#fff0f3')+';color:'+(ok?'#176d41':'#a6243d')+';border:1px solid '+(ok?'#bfe5cf':'#efc9d2')+';font:800 13px Arial;box-shadow:0 12px 30px rgba(0,0,0,.12)';document.body.appendChild(d);setTimeout(()=>d.remove(),5000)}
  async function send(shipmentId){
    try{
      const c=window.PEPMOSA_CONFIG||{};
      if(!c.SUPABASE_URL||!c.SUPABASE_ANON_KEY)throw new Error('Supabase configuration missing');
      if(!window.supabase?.createClient)throw new Error('Supabase client unavailable');
      const client=window.__pepmosaEmailClient||(window.__pepmosaEmailClient=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY));
      const session=(await client.auth.getSession()).data?.session;
      if(!session?.access_token)throw new Error('Admin session not found');
      const r=await fetch(c.SUPABASE_URL+'/functions/v1/'+FN,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'apikey':c.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({shipment_id:shipmentId})});
      const j=await r.json();
      if(!r.ok||!j.ok)throw new Error(j.error||'Email could not be sent');
      toast(j.already_sent?'Processing email already sent to '+j.email:'Order processing email sent to '+j.email,true);
      return j;
    }catch(e){console.error('BUYER EMAIL',e);toast('Buyer email: '+(e.message||'Unable to send'),false);return null}
  }
  window.sendBuyerOrderProcessingEmail=send;
  function install(){
    if(typeof window.updateTrackingShipment!=='function')return false;
    if(window.updateTrackingShipment.__buyerEmailHook)return true;
    const original=window.updateTrackingShipment;
    const wrapped=async function(id,k){
      const statusEl=document.getElementById(k+'-status');
      const status=statusEl?.value||'';
      const result=await original.apply(this,arguments);
      if(status==='ORDER PROCESSING')await send(id);
      return result;
    };
    wrapped.__buyerEmailHook=true;
    window.updateTrackingShipment=wrapped;
    return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>150)clearInterval(timer)},100);
})();