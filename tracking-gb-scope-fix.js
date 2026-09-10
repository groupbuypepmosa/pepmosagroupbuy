(function(){
  'use strict';

  function getGB(){return String(window.activeGroupBuyNumber||localStorage.getItem('pepmosa_active_gb')||'').trim();}
  function email(v){return String(v||'').trim().toLowerCase();}
  function toast(msg,type){if(typeof showMessage==='function')showMessage(msg,type||'success');}
  function client(){return window.sb;}

  async function loadScoped(){
    const gb=getGB();
    if(!gb)throw new Error('Please select a Group Buy first.');
    const [or,sr]=await Promise.all([
      client().from('orders').select('order_id,email,shipment_id,gb_number').eq('gb_number',gb).not('email','is',null),
      client().from('consolidated_shipments').select('*').order('updated_at',{ascending:false})
    ]);
    if(or.error)throw or.error;if(sr.error)throw sr.error;
    return {gb,orders:or.data||[],shipments:sr.data||[]};
  }

  function install(){
    if(typeof window.openBulkTrackingModal!=='function'||typeof window.saveBulkTracking!=='function')return false;
    if(window.openBulkTrackingModal.__gbScoped)return true;

    window.openBulkTrackingModal=async function(){
      const modal=document.getElementById('bulkTrackingModal');if(!modal)return;
      const count=document.getElementById('bulkTrackingClientCount');
      const sel=document.getElementById('bulkTrackingStatus');
      modal.classList.add('show');
      if(count)count.textContent='Loading clients…';
      if(sel)sel.innerHTML='<option value="">Loading statuses…</option>';
      try{
        const {gb,orders}=await loadScoped();
        const statuses=(typeof TRACKING_STATUSES!=='undefined'&&TRACKING_STATUSES.length)?TRACKING_STATUSES:["ORDER RECEIVED","PAYMENT CONFIRMED","ORDER PROCESSING","IN TRANSIT TO THE PHILIPPINES","ARRIVED IN THE PHILIPPINES","RECEIVED AT WAREHOUSE","PACKING & LABELLING","HANDED OVER TO LOCAL COURIER","DELIVERED"];
        if(sel)sel.innerHTML='<option value="">Select new status</option>'+statuses.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
        const emails=[...new Set(orders.map(o=>email(o.email)).filter(Boolean))];
        if(count)count.textContent=emails.length+' client'+(emails.length===1?'':'s')+' will be updated for '+gb;
      }catch(e){
        if(count)count.textContent='Unable to load clients';
        if(sel)sel.innerHTML='<option value="">Unable to load</option>';
        console.error('GB TRACKING SCOPE',e);toast(e.message||'Unable to load this Group Buy.','error');
      }
    };
    window.openBulkTrackingModal.__gbScoped=true;

    window.saveBulkTracking=async function(){
      const status=document.getElementById('bulkTrackingStatus')?.value||'';
      const courier=document.getElementById('bulkTrackingCourier')?.value||'';
      const note=document.getElementById('bulkTrackingNote')?.value.trim()||'';
      const btn=document.getElementById('bulkTrackingSaveBtn');
      if(!status)return toast('Please select a status.','error');
      if(btn){btn.disabled=true;btn.textContent='UPDATING...';}
      try{
        const {gb,orders,shipments}=await loadScoped();
        const emails=[...new Set(orders.map(o=>email(o.email)).filter(Boolean))];
        if(!emails.length)throw new Error('No client orders found for '+gb+'.');
        const now=new Date().toISOString();
        const user=await client().auth.getUser();
        let changed=0,unchanged=0,created=0;

        for(const e of emails){
          const clientOrders=orders.filter(o=>email(o.email)===e);
          const shipmentIds=[...new Set(clientOrders.map(o=>o.shipment_id).filter(Boolean))];
          const rows=shipments.filter(s=>shipmentIds.includes(s.shipment_id));
          let primary=rows.length?trackingPrimaryShipment(rows):null;
          let shipmentId;

          if(primary){
            shipmentId=primary.shipment_id;
            const oldStatus=String(primary.status||'');
            const payload={status,updated_at:now,delivered_at:status==='DELIVERED'?now:null};
            if(courier)payload.courier=courier;
            if(note)payload.notes=note;
            const r=await client().from('consolidated_shipments').update(payload).eq('shipment_id',shipmentId);
            if(r.error)throw r.error;
            if(oldStatus!==status){
              changed++;
              const h=await client().from('shipment_status_history').insert({shipment_id:shipmentId,status,courier:payload.courier||primary.courier||null,tracking_number:primary.tracking_number||null,changed_by:user.data?.user?.id||null});
              if(h.error)console.warn(h.error);
              if(typeof window.sendBuyerTrackingUpdateEmail==='function')await window.sendBuyerTrackingUpdateEmail(shipmentId,status);
            }else unchanged++;
          }else{
            const ins=await client().from('consolidated_shipments').insert({email:e,status,courier:courier||null,notes:note||null,delivered_at:status==='DELIVERED'?now:null,updated_at:now,gb_number:gb}).select().single();
            if(ins.error)throw ins.error;
            shipmentId=ins.data.shipment_id;created++;
            const h=await client().from('shipment_status_history').insert({shipment_id:shipmentId,status,courier:courier||null,changed_by:user.data?.user?.id||null});
            if(h.error)console.warn(h.error);
            if(typeof window.sendBuyerTrackingUpdateEmail==='function')await window.sendBuyerTrackingUpdateEmail(shipmentId,status);
          }

          const ids=clientOrders.map(o=>o.order_id).filter(Boolean);
          if(ids.length){
            const up=await client().from('orders').update({shipment_id:shipmentId}).in('order_id',ids);
            if(up.error)throw up.error;
          }
        }
        if(typeof closeBulkTrackingModal==='function')closeBulkTrackingModal();
        toast('Tracking updated for '+emails.length+' client'+(emails.length===1?'':'s')+' in '+gb+'. Changed: '+changed+', unchanged: '+unchanged+', created: '+created+'.','success');
        if(typeof loadTrackingDashboard==='function')await loadTrackingDashboard();
      }catch(e){
        console.error('GB BULK TRACKING',e);toast(e.message||'Unable to update this Group Buy.','error');
      }finally{if(btn){btn.disabled=false;btn.textContent='UPDATE ALL CLIENTS';}}
    };
    window.saveBulkTracking.__gbScoped=true;
    return true;
  }

  let tries=0;const timer=setInterval(function(){if(install()||++tries>150)clearInterval(timer)},100);
})();
