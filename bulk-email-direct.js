(function(){
  'use strict';
  function getGB(){return String(window.activeGroupBuyNumber||localStorage.getItem('pepmosa_active_gb')||'').trim();}
  function email(v){return String(v||'').trim().toLowerCase();}
  function toast(msg,type){if(typeof showMessage==='function')showMessage(msg,type||'success');}

  async function snapshot(client,gb){
    const r=await client.from('orders').select('order_id,email,shipment_id,gb_number').eq('gb_number',gb).not('email','is',null);
    if(r.error)throw r.error;
    const orders=r.data||[];
    const ids=[...new Set(orders.map(x=>x.shipment_id).filter(Boolean))];
    let shipments=[];
    if(ids.length){
      const s=await client.from('consolidated_shipments').select('shipment_id,email,status,courier,tracking_number,waybill_number,gb_number').in('shipment_id',ids);
      if(s.error)throw s.error;
      shipments=s.data||[];
    }
    return {orders,shipments};
  }

  async function install(){
    if(typeof window.saveBulkTracking!=='function'||typeof window.sendBuyerTrackingUpdateEmail!=='function')return false;
    if(window.saveBulkTracking.__directEmailBridge)return true;

    const original=window.saveBulkTracking;
    const wrapped=async function(){
      const status=document.getElementById('bulkTrackingStatus')?.value||'';
      const gb=getGB();
      const client=window.sb;
      if(!status||!gb||!client?.from)return original.apply(this,arguments);

      let before=null;
      try{before=await snapshot(client,gb);}catch(e){console.warn('Bulk email snapshot failed',e);}

      // Observe calls made by the GB-scoped UPDATE ALL implementation.
      // If it already sent an email, the fallback below will not send a duplicate.
      const originalSend=window.sendBuyerTrackingUpdateEmail;
      const sentByOriginal=new Set();
      window.sendBuyerTrackingUpdateEmail=async function(shipmentId,newStatus){
        sentByOriginal.add(String(shipmentId)+'|'+String(newStatus));
        return originalSend.apply(this,arguments);
      };

      let result;
      try{
        result=await original.apply(this,arguments);
      }finally{
        window.sendBuyerTrackingUpdateEmail=originalSend;
      }

      try{
        const after=await snapshot(client,gb);
        const beforeById=new Map((before?.shipments||[]).map(s=>[s.shipment_id,s]));
        const emails=[...new Set((after.orders||[]).map(o=>email(o.email)).filter(Boolean))];
        let fallbackSent=0;

        for(const e of emails){
          const buyerOrders=(after.orders||[]).filter(o=>email(o.email)===e);
          const shipment=buyerOrders
            .map(o=>(after.shipments||[]).find(s=>s.shipment_id===o.shipment_id && String(s.gb_number||'')===gb))
            .find(Boolean);
          if(!shipment||String(shipment.status||'')!==String(status))continue;

          const old=beforeById.get(shipment.shipment_id);
          if(old&&String(old.status||'')===String(status))continue;
          if(sentByOriginal.has(String(shipment.shipment_id)+'|'+String(status)))continue;

          await originalSend(shipment.shipment_id,status);
          fallbackSent++;
        }
        if(fallbackSent)toast('Buyer emails queued: '+fallbackSent+' client'+(fallbackSent===1?'':'s'),'success');
      }catch(e){console.error('DIRECT BULK EMAIL BRIDGE',e);}
      return result;
    };
    wrapped.__directEmailBridge=true;
    window.saveBulkTracking=wrapped;
    return true;
  }

  let tries=0;
  const timer=setInterval(function(){
    if(install()||++tries>300)clearInterval(timer);
  },100);
})();
