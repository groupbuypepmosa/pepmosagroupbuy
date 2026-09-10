(function(){
  'use strict';

  function gbNow(){ return String(window.activeGroupBuyNumber||'').trim(); }
  function email(v){ return String(v||'').trim().toLowerCase(); }
  function money(v){ return Number(v||0); }
  function getClient(){
    const c=window.PEPMOSA_CONFIG||{};
    if(!window.supabase?.createClient) throw new Error('Supabase client unavailable');
    return window.__pepmosaGBScopeClient||(window.__pepmosaGBScopeClient=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY));
  }
  function normItem(i){
    return {
      product_name:i.product_name||'Product',
      strength:i.strength||'',
      qty:Number(i.qty||0),
      unit_price:money(i.unit_price),
      line_total:money(i.line_total!=null?i.line_total:money(i.unit_price)*Number(i.qty||0)),
      is_refunded:false,
      refund_amount:0
    };
  }

  // IMPORTANT: a shipment belongs to one Group Buy. Never reuse a shipment
  // from another GB just because the buyer has the same email.
  async function ensureShipmentForGB(client, gb, emailValue, clientOrders){
    const key=email(emailValue);
    const orderShipmentIds=[...new Set((clientOrders||[]).map(o=>o.shipment_id).filter(Boolean))];

    if(orderShipmentIds.length){
      const {data,error}=await client.from('consolidated_shipments')
        .select('*').in('shipment_id',orderShipmentIds);
      if(error)throw error;
      const sameGB=(data||[]).find(s=>String(s.gb_number||'')===gb);
      if(sameGB)return sameGB.shipment_id;
    }

    // If an old/legacy shipment has no GB number but is attached only to this
    // GB, adopt it safely. A shipment already carrying another GB is NEVER reused.
    if(orderShipmentIds.length){
      const {data,error}=await client.from('consolidated_shipments')
        .select('*').in('shipment_id',orderShipmentIds);
      if(error)throw error;
      const legacy=(data||[]).find(s=>!s.gb_number);
      if(legacy){
        const up=await client.from('consolidated_shipments').update({gb_number:gb,updated_at:new Date().toISOString()}).eq('shipment_id',legacy.shipment_id);
        if(up.error)throw up.error;
        return legacy.shipment_id;
      }
    }

    const {data,error}=await client.from('consolidated_shipments').insert({
      email:key,
      gb_number:gb,
      status:'ORDER RECEIVED'
    }).select().single();
    if(error)throw error;
    const h=await client.from('shipment_status_history').insert({shipment_id:data.shipment_id,status:'ORDER RECEIVED'});
    if(h.error)console.warn(h.error);
    return data.shipment_id;
  }

  async function createShipmentScoped(emailValue){
    const gb=gbNow();
    if(!gb)throw new Error('Select a Group Buy first.');
    const client=getClient();
    const key=email(emailValue);
    const orders=(window.trackingDashboardOrders||[]).filter(o=>email(o.email)===key);
    if(!orders.length)throw new Error('No orders found for this buyer in '+gb+'.');
    const shipmentId=await ensureShipmentForGB(client,gb,key,orders);
    const ids=orders.map(o=>o.order_id).filter(Boolean);
    if(ids.length){
      const up=await client.from('orders').update({shipment_id:shipmentId}).in('order_id',ids).eq('gb_number',gb);
      if(up.error)throw up.error;
    }
    if(typeof window.showMessage==='function')window.showMessage('Client shipment created for '+gb+'.','success');
    if(typeof window.loadTrackingDashboard==='function')await window.loadTrackingDashboard();
  }

  async function saveBulkScoped(){
    const status=document.getElementById('bulkTrackingStatus')?.value||'';
    const courier=document.getElementById('bulkTrackingCourier')?.value||'';
    const note=(document.getElementById('bulkTrackingNote')?.value||'').trim();
    const gb=gbNow();
    if(!status)return window.showMessage?.('Please select a status.','error');
    if(!gb)return window.showMessage?.('Select a Group Buy first.','error');
    const btn=document.getElementById('bulkTrackingSaveBtn');
    if(btn){btn.disabled=true;btn.textContent='UPDATING...';}
    try{
      if(typeof window.loadTrackingDashboard==='function')await window.loadTrackingDashboard();
      const orders=window.trackingDashboardOrders||[];
      const emails=[...new Set(orders.map(o=>email(o.email)).filter(Boolean))];
      if(!emails.length)throw new Error('No client orders found for '+gb+'.');
      const client=getClient(),now=new Date().toISOString(),u=await client.auth.getUser();
      for(const e of emails){
        const clientOrders=orders.filter(o=>email(o.email)===e);
        const shipmentId=await ensureShipmentForGB(client,gb,e,clientOrders);
        const {data:shipment,error:se}=await client.from('consolidated_shipments').select('*').eq('shipment_id',shipmentId).single();
        if(se)throw se;
        const payload={status,updated_at:now,delivered_at:status==='DELIVERED'?now:null,gb_number:gb};
        if(courier)payload.courier=courier;
        if(note)payload.notes=note;
        const up=await client.from('consolidated_shipments').update(payload).eq('shipment_id',shipmentId).eq('gb_number',gb);
        if(up.error)throw up.error;
        if(String(shipment.status||'')!==status){
          const h=await client.from('shipment_status_history').insert({shipment_id:shipmentId,status,courier:courier||shipment.courier||null,tracking_number:shipment.tracking_number||null,changed_by:u.data?.user?.id||null});
          if(h.error)console.warn(h.error);
        }
        const ids=clientOrders.map(o=>o.order_id).filter(Boolean);
        if(ids.length){
          const ou=await client.from('orders').update({shipment_id:shipmentId}).in('order_id',ids).eq('gb_number',gb);
          if(ou.error)throw ou.error;
        }
      }
      if(typeof window.closeBulkTrackingModal==='function')window.closeBulkTrackingModal();
      window.showMessage?.('Tracking updated for '+emails.length+' client'+(emails.length===1?'':'s')+' in '+gb+'.','success');
      if(typeof window.loadTrackingDashboard==='function')await window.loadTrackingDashboard();
    }catch(e){
      console.error('GB-SCOPED BULK TRACKING',e);
      window.showMessage?.(e.message||'Unable to update this Group Buy tracking.','error');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='UPDATE ALL CLIENTS';}
    }
  }

  async function loadWaybillScoped(){
    const gb=gbNow();
    if(!gb){
      if(typeof window.__pepmosaBaseWaybillLoad==='function')await window.__pepmosaBaseWaybillLoad();
      return;
    }
    const client=getClient();
    const [or,cr,sr,kr]=await Promise.all([
      client.from('orders').select('*,order_items(*)').eq('gb_number',gb).order('created_at',{ascending:false}),
      client.from('customers').select('customer_id,email,customer_name,contact,address'),
      client.from('consolidated_shipments').select('*').eq('gb_number',gb).order('updated_at',{ascending:false}),
      client.from('cancelled_kits').select('id,order_id,email,product_id,variant_id,product_name,strength,qty,refund_amount,status,refunded_at').eq('gb_number',gb)
    ]);
    if(or.error)throw or.error;
    if(cr.error)console.warn('Customers load warning:',cr.error);
    if(sr.error)throw sr.error;
    if(kr.error)console.warn('Cancelled kits load warning:',kr.error);

    const customersByEmail=new Map((cr.data||[]).map(x=>[email(x.email),x]));
    const shipmentsById=new Map((sr.data||[]).map(x=>[x.shipment_id,x]));
    const refunded=(kr.data||[]).filter(x=>String(x.status||'').toUpperCase()==='REFUNDED');
    const refundedByOrder=new Map();
    for(const x of refunded){
      if(!refundedByOrder.has(x.order_id))refundedByOrder.set(x.order_id,[]);
      refundedByOrder.get(x.order_id).push(x);
    }

    const grouped=new Map();
    for(const o of (or.data||[])){
      const approved=typeof window.isPaidForWaybill==='function'?window.isPaidForWaybill(o):(['PAID','PAYMENT APPROVED','APPROVED'].includes(String(o.payment_status||'').toUpperCase()));
      if(!approved)continue;
      const key=email(o.email);if(!key)continue;
      if(!grouped.has(key))grouped.set(key,{email:key,orders:[],items:[],total:0,shipping:0,refunded:[]});
      const g=grouped.get(key);
      g.orders.push(o);
      g.total+=money(o.total);
      g.shipping+=money(o.shipping_fee);
      for(const i of (o.order_items||[]))g.items.push(normItem(i));
      for(const rr of (refundedByOrder.get(o.order_id)||[]))g.refunded.push(rr);
    }

    window.waybillRows=[...grouped.values()].map(g=>{
      const customer=customersByEmail.get(g.email)||{};
      const latest=g.orders.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0]||{};
      const shipment=g.orders.map(o=>shipmentsById.get(o.shipment_id)).find(Boolean)||{};
      const merged=new Map();
      for(const i of g.items){
        const key=[i.product_name,i.strength,i.unit_price,i.is_refunded?'REFUNDED':'ACTIVE'].join('||');
        const old=merged.get(key)||{...i,qty:0,line_total:0,refund_amount:0};
        old.qty+=Number(i.qty||0);old.line_total+=Number(i.line_total||0);merged.set(key,old);
      }
      for(const rr of g.refunded){
        const match=[...merged.values()].find(p=>String(p.product_name).trim().toLowerCase()===String(rr.product_name||'').trim().toLowerCase()&&String(p.strength||'').trim().toLowerCase()===String(rr.strength||'').trim().toLowerCase());
        if(match){match.is_refunded=true;match.refund_amount=money(rr.refund_amount);}
      }
      return {
        ...g,
        customer_name:customer.customer_name||latest.full_name||g.email,
        contact:customer.contact||latest.contact_number||'',
        address:customer.address||latest.address||'Address not yet saved',
        shipping_method:latest.shipping_method||'',
        courier:shipment.courier||latest.shipping_method||'To be assigned',
        waybill_number:shipment.waybill_number||shipment.tracking_number||'',
        tracking_number:shipment.tracking_number||shipment.waybill_number||'',
        shipment_status:shipment.status||'READY TO PRINT',
        gb_number:gb,
        products:[...merged.values()],
        payment:g.refunded.length?'PAID • REFUND ADJUSTED':'PAID'
      };
    }).sort((a,b)=>a.customer_name.localeCompare(b.customer_name));

    if(typeof window.selectedWaybillBuyer!=='undefined' && (!window.selectedWaybillBuyer||!window.waybillRows.some(x=>x.email===window.selectedWaybillBuyer)))window.selectedWaybillBuyer=window.waybillRows[0]?.email||null;
    if(typeof window.renderWaybillCenter==='function')window.renderWaybillCenter();
  }

  function install(){
    if(typeof window.loadTrackingDashboard==='function' && !window.__pepmosaGBScopeInstalled){
      if(typeof window.createTrackingShipment==='function')window.createTrackingShipment=createShipmentScoped;
      window.saveBulkTracking=saveBulkScoped;
      window.__pepmosaGBScopeInstalled=true;
    }
    if(typeof window.loadWaybillCenter==='function'){
      if(!window.__pepmosaBaseWaybillLoad)window.__pepmosaBaseWaybillLoad=window.loadWaybillCenter;
      window.loadWaybillCenter=loadWaybillScoped;
      return true;
    }
    return false;
  }

  let tries=0;
  const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer)},100);
})();
