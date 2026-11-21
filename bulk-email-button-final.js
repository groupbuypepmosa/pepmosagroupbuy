(function(){
  'use strict';
  function getGB(){return String(window.activeGroupBuyNumber||localStorage.getItem('pepmosa_active_gb')||'').trim();}
  function email(v){return String(v||'').trim().toLowerCase();}
  function toast(msg,type){if(typeof showMessage==='function')showMessage(msg,type||'success');}

  async function snapshot(client,gb){
    const r=await client.from('orders').select('order_id,email,shipment_id,gb_number').eq('gb_number',gb).not('email','is',null);
    if(r.error)throw r.error;
    const orders=r.data||[];
    const ids=[...new Set(orders.map(o=>o.shipment_id).filter(Boolean))];
    let shipments=[];
    if(ids.length){
      const s=await client.from('consolidated_shipments').select('shipment_id,email,status,courier,tracking_number,waybill_number,gb_number').in('shipment_id',ids);
      if(s.error)throw s.error;
      shipments=s.data||[];
    }
    return {orders,shipments};
  }

  async function install(){
    const btn=document.getElementById('bulkTrackingSaveBtn');
    const send=window.sendBuyerTrackingUpdateEmail;
    const base=window.saveBulkTracking;
    if(!btn||typeof send!=='function'||typeof base!=='function')return false;
    if(btn.__pepmosaFinalEmailBridge)return true;

    // Only wrap the GB-scoped implementation. Never allow this safety bridge
    // to invoke the old all-GB bulk updater.
    if(!base.__gbScoped){return false;}

    btn.__pepmosaFinalEmailBridge=true;
    btn.onclick=async function(){
      const status=document.getElementById('bulkTrackingStatus')?.value||'';
      const gb=getGB();
      const client=window.sb;
      if(!status)return toast('Please select a status.','error');
      if(!gb)return toast('Please select a Group Buy first.','error');
      if(!client?.from)return toast('Database connection is not ready.','error');

      let before=null;
      try{before=await snapshot(client,gb);}catch(e){console.warn('Final email bridge snapshot failed',e);}

      const originalSend=window.sendBuyerTrackingUpdateEmail;
      const sent=new Set();
      window.sendBuyerTrackingUpdateEmail=async function(shipmentId,newStatus){
        sent.add(String(shipmentId)+'|'+String(newStatus));
        return originalSend.apply(this,arguments);
      };

      try{
        await base.apply(this,arguments);
      }finally{
        window.sendBuyerTrackingUpdateEmail=originalSend;
      }

      try{
        const after=await snapshot(client,gb);
        const beforeById=new Map((before?.shipments||[]).map(s=>[s.shipment_id,s]));
        let fallbackSent=0;
        for(const s of (after.shipments||[])){
          if(String(s.gb_number||'')!==gb)continue;
          if(String(s.status||'')!==String(status))continue;
          const old=beforeById.get(s.shipment_id);
          if(old&&String(old.status||'')===String(status))continue;
          const key=String(s.shipment_id)+'|'+String(status);
          if(sent.has(key))continue;
          await originalSend(s.shipment_id,status);
          fallbackSent++;
        }
        if(fallbackSent)toast('Buyer emails queued: '+fallbackSent+' client'+(fallbackSent===1?'':'s'),'success');
      }catch(e){
        console.error('FINAL BULK EMAIL BRIDGE',e);
        toast('Tracking updated, but buyer email check failed.','warning');
      }
    };
    return true;
  }

  let tries=0;
  const timer=setInterval(function(){
    if(install()||++tries>300)clearInterval(timer);
  },100);
})();
