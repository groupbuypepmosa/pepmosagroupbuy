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

  async function ensureGBShipment(gb,emailValue,clientOrders,shipments){
    const e=email(emailValue);
    const ids=[...new Set((clientOrders||[]).map(o=>o.shipment_id).filter(Boolean))];
    const rows=(shipments||[]).filter(s=>ids.includes(s.shipment_id));
    const sameGB=rows.find(s=>String(s.gb_number||'')===gb);
    if(sameGB)return sameGB;
    const legacy=rows.find(s=>!s.gb_number);
    if(legacy){
      const up=await client().from('consolidated_shipments').update({gb_number:gb,updated_at:new Date().toISOString()}).eq('shipment_id',legacy.shipment_id);
      if(up.error)throw up.error;
      legacy.gb_number=gb;
      return legacy;
    }
    const ins=await client().from('consolidated_shipments').insert({email:e,status:'ORDER RECEIVED',gb_number:gb}).select().single();
    if(ins.error)throw ins.error;
    const h=await client().from('shipment_status_history').insert({shipment_id:ins.data.shipment_id,status:'ORDER RECEIVED'});
    if(h.error)console.warn(h.error);
    return ins.data;
  }

  async function buildScopedWaybills(){
    const gb=getGB();
    if(!gb)throw new Error('Please select a Group Buy first.');
    const [or,cr,sr,kr]=await Promise.all([
      client().from('orders').select('*,order_items(*)').eq('gb_number',gb).order('created_at',{ascending:false}),
      client().from('customers').select('customer_id,email,customer_name,contact,address'),
      client().from('consolidated_shipments').select('*').eq('gb_number',gb).order('updated_at',{ascending:false}),
      client().from('cancelled_kits').select('id,order_id,email,product_id,variant_id,product_name,strength,qty,refund_amount,status,refunded_at').eq('gb_number',gb)
    ]);
    if(or.error)throw or.error;if(sr.error)throw sr.error;
    if(cr.error)console.warn('Customers load warning:',cr.error);
    if(kr.error)console.warn('Cancelled kits load warning:',kr.error);

    const customersByEmail=new Map((cr.data||[]).map(x=>[email(x.email),x]));
    const shipmentsById=new Map((sr.data||[]).map(x=>[x.shipment_id,x]));
    const refunded=(kr.data||[]).filter(x=>String(x.status||'').toUpperCase()==='REFUNDED');
    const grouped=new Map();
    for(const o of (or.data||[])){
      const approved=['PAID','PAYMENT APPROVED','APPROVED'].includes(String(o.payment_status||'').toUpperCase());
      if(!approved)continue;
      const e=email(o.email);if(!e)continue;
      if(!grouped.has(e))grouped.set(e,{email:e,orders:[],items:[],total:0,shipping:0,refunded:[]});
      const g=grouped.get(e);
      g.orders.push(o);g.total+=Number(o.total||0);g.shipping+=Number(o.shipping_fee||0);
      for(const i of (o.order_items||[]))g.items.push({...i,is_refunded:false,refund_amount:0});
      for(const r of refunded.filter(x=>String(x.order_id||'')===String(o.order_id||'')))g.refunded.push(r);
    }
    const rows=[...grouped.values()].map(g=>{
      const customer=customersByEmail.get(g.email)||{};
      const latest=g.orders.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0]||{};
      const shipment=g.orders.map(o=>shipmentsById.get(o.shipment_id)).find(Boolean)||{};
      const merged=new Map();
      for(const i of g.items){
        const key=[i.product_name||'Product',i.strength||'',Number(i.unit_price||0)].join('||');
        const old=merged.get(key)||{product_name:i.product_name||'Product',strength:i.strength||'',qty:0,unit_price:Number(i.unit_price||0),line_total:0,is_refunded:false,refund_amount:0};
        old.qty+=Number(i.qty||0);old.line_total+=Number(i.line_total!=null?i.line_total:Number(i.unit_price||0)*Number(i.qty||0));
        merged.set(key,old);
      }
      for(const r of g.refunded){
        const p=[...merged.values()].find(x=>String(x.product_name||'').trim().toLowerCase()===String(r.product_name||'').trim().toLowerCase()&&String(x.strength||'').trim().toLowerCase()===String(r.strength||'').trim().toLowerCase());
        if(p){p.is_refunded=true;p.refund_amount=Number(r.refund_amount||0);}
      }
      const total=Math.max(0,g.total-g.refunded.reduce((s,x)=>s+Number(x.refund_amount||0),0));
      return {email:g.email,gb_number:gb,orders:g.orders,items:g.items,total,shipping:g.shipping,customer_name:customer.customer_name||latest.full_name||g.email,contact:customer.contact||latest.contact_number||'',address:customer.address||latest.address||'Address not yet saved',shipping_method:latest.shipping_method||'',courier:shipment.courier||latest.shipping_method||'To be assigned',waybill_number:shipment.waybill_number||shipment.tracking_number||'',tracking_number:shipment.tracking_number||shipment.waybill_number||'',shipment_status:shipment.status||'READY TO PRINT',products:[...merged.values()],refunded:g.refunded,payment:g.refunded.length?'PAID • REFUND ADJUSTED':'PAID'};
    });
    return rows.sort((a,b)=>a.customer_name.localeCompare(b.customer_name));
  }

  async function loadWaybillScoped(){
    try{
      waybillRows=await buildScopedWaybills();
      if(!selectedWaybillBuyer||!waybillRows.some(x=>x.email===selectedWaybillBuyer))selectedWaybillBuyer=waybillRows[0]?.email||null;
      if(typeof renderWaybillCenter==='function')renderWaybillCenter();
    }catch(e){
      console.error('GB WAYBILL SCOPE',e);
      const box=document.getElementById('waybillBuyerList');
      if(box)box.innerHTML='<div class="notice error">'+esc(e.message||'Unable to load waybills for this Group Buy.')+'</div>';
      const preview=document.getElementById('waybillPreview');if(preview)preview.innerHTML='';
    }
  }

  function install(){
    // Do not install the bulk override until the buyer email hook exists.
    // This avoids UPDATE ALL running with no email callback on a fresh page.
    if(typeof window.openBulkTrackingModal!=='function'||typeof window.saveBulkTracking!=='function'||typeof window.sendBuyerTrackingUpdateEmail!=='function')return false;
    if(!window.openBulkTrackingModal.__gbScoped){
      window.openBulkTrackingModal=async function(){
        const modal=document.getElementById('bulkTrackingModal');if(!modal)return;
        const count=document.getElementById('bulkTrackingClientCount'),sel=document.getElementById('bulkTrackingStatus');
        modal.classList.add('show');if(count)count.textContent='Loading clients…';
        try{
          const {gb,orders}=await loadScoped();
          const statuses=(typeof TRACKING_STATUSES!=='undefined'&&TRACKING_STATUSES.length)?TRACKING_STATUSES:['ORDER RECEIVED','PAYMENT CONFIRMED','ORDER PROCESSING','IN TRANSIT TO THE PHILIPPINES','ARRIVED IN THE PHILIPPINES','RECEIVED AT WAREHOUSE','PACKING & LABELLING','HANDED OVER TO LOCAL COURIER','DELIVERED'];
          if(sel)sel.innerHTML='<option value="">Select new status</option>'+statuses.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
          const emails=[...new Set(orders.map(o=>email(o.email)).filter(Boolean))];
          if(count)count.textContent=emails.length+' client'+(emails.length===1?'':'s')+' will be updated for '+gb;
        }catch(e){if(count)count.textContent='Unable to load clients';console.error('GB TRACKING SCOPE',e);toast(e.message||'Unable to load this Group Buy.','error');}
      };
      window.openBulkTrackingModal.__gbScoped=true;
    }

    window.saveBulkTracking=async function(){
      const status=document.getElementById('bulkTrackingStatus')?.value||'';
      const courier=document.getElementById('bulkTrackingCourier')?.value||'';
      const note=document.getElementById('bulkTrackingNote')?.value.trim()||'';
      const btn=document.getElementById('bulkTrackingSaveBtn');
      if(!status)return toast('Please select a status.','error');
      const gb=getGB();if(!gb)return toast('Please select a Group Buy first.','error');
      if(btn){btn.disabled=true;btn.textContent='UPDATING...';}
      try{
        const {orders,shipments}=await loadScoped();
        const emails=[...new Set(orders.map(o=>email(o.email)).filter(Boolean))];
        if(!emails.length)throw new Error('No client orders found for '+gb+'.');
        const now=new Date().toISOString(),user=await client().auth.getUser();
        let changed=0,unchanged=0,created=0;
        for(const e of emails){
          const clientOrders=orders.filter(o=>email(o.email)===e);
          const shipment=await ensureGBShipment(gb,e,clientOrders,shipments);
          const oldStatus=String(shipment.status||'');
          const payload={status,updated_at:now,delivered_at:status==='DELIVERED'?now:null,gb_number:gb};
          if(courier)payload.courier=courier;if(note)payload.notes=note;
          const up=await client().from('consolidated_shipments').update(payload).eq('shipment_id',shipment.shipment_id).eq('gb_number',gb);
          if(up.error)throw up.error;
          if(oldStatus!==status){
            changed++;
            const h=await client().from('shipment_status_history').insert({shipment_id:shipment.shipment_id,status,courier:payload.courier||shipment.courier||null,tracking_number:shipment.tracking_number||null,changed_by:user.data?.user?.id||null});
            if(h.error)console.warn(h.error);
            await window.sendBuyerTrackingUpdateEmail(shipment.shipment_id,status);
          }else unchanged++;
          const ids=clientOrders.map(o=>o.order_id).filter(Boolean);
          if(ids.length){const ou=await client().from('orders').update({shipment_id:shipment.shipment_id}).in('order_id',ids).eq('gb_number',gb);if(ou.error)throw ou.error;}
        }
        if(typeof closeBulkTrackingModal==='function')closeBulkTrackingModal();
        toast('Tracking updated for '+emails.length+' client'+(emails.length===1?'':'s')+' in '+gb+'. Changed: '+changed+', unchanged: '+unchanged+', created: '+created+'.','success');
        if(typeof loadTrackingDashboard==='function')await loadTrackingDashboard();
      }catch(e){console.error('GB BULK TRACKING',e);toast(e.message||'Unable to update this Group Buy.','error');}
      finally{if(btn){btn.disabled=false;btn.textContent='UPDATE ALL CLIENTS';}}
    };
    window.saveBulkTracking.__gbScoped=true;

    if(typeof window.createTrackingShipment==='function'&&!window.createTrackingShipment.__gbScoped){
      window.createTrackingShipment=async function(emailValue){
        try{
          const {gb,orders,shipments}=await loadScoped();
          const e=email(emailValue),clientOrders=orders.filter(o=>email(o.email)===e);
          if(!clientOrders.length)throw new Error('No orders found for '+e+' in '+gb+'.');
          const shipment=await ensureGBShipment(gb,e,clientOrders,shipments);
          const ids=clientOrders.map(o=>o.order_id).filter(Boolean);
          if(ids.length){const up=await client().from('orders').update({shipment_id:shipment.shipment_id}).in('order_id',ids).eq('gb_number',gb);if(up.error)throw up.error;}
          toast('Client shipment created for '+gb+'.','success');
          if(typeof loadTrackingDashboard==='function')await loadTrackingDashboard();
        }catch(e){console.error('GB CREATE SHIPMENT',e);toast(e.message||'Unable to create shipment.','error');}
      };
      window.createTrackingShipment.__gbScoped=true;
    }

    window.loadWaybillCenter=loadWaybillScoped;
    return true;
  }

  let tries=0;const timer=setInterval(function(){if(install()||++tries>150)clearInterval(timer)},100);
})();
