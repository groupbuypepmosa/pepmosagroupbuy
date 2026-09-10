(function(){
  'use strict';
  const GAS_URL='https://script.google.com/macros/s/AKfycby_PRzoiFSzMhWkqmWMat8IsH7wvEqPPiWe7WFuw4HZBNPyefzDI4-XETnr400waavo/exec';

  function toast(msg,ok){
    const old=document.getElementById('buyerEmailHookToast');if(old)old.remove();
    const d=document.createElement('div');d.id='buyerEmailHookToast';d.textContent=msg;
    d.style.cssText='position:fixed;right:18px;bottom:18px;z-index:999999;padding:13px 16px;border-radius:14px;background:'+(ok?'#e8f8ef':'#fff0f3')+';color:'+(ok?'#176d41':'#a6243d')+';border:1px solid '+(ok?'#bfe5cf':'#efc9d2')+';font:800 13px Arial;box-shadow:0 12px 30px rgba(0,0,0,.12)';
    document.body.appendChild(d);setTimeout(()=>d.remove(),5000);
  }

  async function getShipment(client,id){
    const r=await client.from('consolidated_shipments').select('shipment_id,email,status,courier,tracking_number,waybill_number,gb_number').eq('shipment_id',id).maybeSingle();
    if(r.error)throw r.error;return r.data;
  }

  async function buildPayload(client,shipment,status){
    // For a Group Buy shipment, only use orders from that same Group Buy.
    // Never fall back to unrelated MOQ orders for a GB shipment.
    const gbQuery=client.from('orders').select('order_id,customer_id,email,total,shipping_method,shipping_fee,gb_number').eq('shipment_id',shipment.shipment_id);
    if(shipment.gb_number)gbQuery.eq('gb_number',shipment.gb_number);
    const gb=await gbQuery;
    if(gb.error)throw gb.error;

    let source=shipment.gb_number?'GROUP BUY':'GROUP BUY';
    let orders=gb.data||[];
    let items=[];

    if(orders.length){
      const ids=orders.map(x=>x.order_id);
      const oi=await client.from('order_items').select('order_id,product_name,strength,qty,unit_price,line_total').in('order_id',ids);
      if(oi.error)throw oi.error;items=oi.data||[];
    }else if(!shipment.gb_number){
      // Only a shipment with no GB number may use the legacy MOQ fallback.
      source='MOQ';
      const mo=await client.from('ofa_orders').select('order_id,customer_name,email,total,shipping_method,shipping_fee').eq('email',shipment.email);
      if(mo.error)throw mo.error;orders=mo.data||[];
      if(orders.length){
        const ids=orders.map(x=>x.order_id);
        const oi=await client.from('ofa_order_items').select('order_id,product_name,qty,unit_price,line_total').in('order_id',ids);
        if(oi.error)throw oi.error;items=(oi.data||[]).map(x=>({...x,strength:''}));
      }
    }

    const map=new Map();
    items.forEach(x=>{
      const key=[String(x.product_name||''),String(x.strength||'')].join('|').toLowerCase();
      if(!map.has(key))map.set(key,{product:x.product_name||'',variant:x.strength||'',qty:0,unitPrice:Number(x.unit_price||0),lineTotal:0});
      const v=map.get(key);v.qty+=Number(x.qty||0);v.lineTotal+=Number(x.line_total!=null?x.line_total:Number(x.unit_price||0)*Number(x.qty||0));
    });

    const subtotal=[...map.values()].reduce((s,x)=>s+x.lineTotal,0);
    const shippingFee=orders.reduce((s,x)=>s+Number(x.shipping_fee||0),0);
    const total=orders.reduce((s,x)=>s+Number(x.total||0),0)||subtotal+shippingFee;

    // Group Buy orders do not carry customer_name in the current schema,
    // so use the customers table as the greeting fallback when available.
    let customerName=(orders.find(x=>x.customer_name)?.customer_name)||'';
    if(!customerName){
      const cr=await client.from('customers').select('customer_name,email').eq('email',shipment.email).maybeSingle();
      if(!cr.error)customerName=cr.data?.customer_name||'';
    }

    const round=[...new Set(orders.map(x=>x.gb_number).filter(Boolean))].join(', ')||String(shipment.gb_number||'');

    return {
      action:'sendTrackingUpdateEmail',to:shipment.email,customerName,source,round,status,
      trackingNumber:shipment.tracking_number||'',courier:shipment.courier||'',waybillNumber:shipment.waybill_number||'',
      items:[...map.values()],subtotal,shippingFee,total,
      shippingMethod:(orders.find(x=>x.shipping_method)?.shipping_method)||''
    };
  }

  // Bulk UPDATE ALL calls this repeatedly. Give every request its own iframe
  // target so one buyer's POST can never cancel/replace another buyer's POST.
  function postToGas(payload){
    return new Promise(function(resolve){
      let settled=false;
      const stamp=Date.now()+'_'+Math.random().toString(36).slice(2);
      const frameId='pepmosaEmailFrame_'+stamp;
      const formId='pepmosaEmailForm_'+stamp;
      const cleanup=function(){
        const f=document.getElementById(formId);if(f)f.remove();
        const frame=document.getElementById(frameId);if(frame)setTimeout(()=>frame.remove(),1000);
      };
      const finish=function(ok){if(settled)return;settled=true;cleanup();resolve(ok);};
      try{
        const frame=document.createElement('iframe');
        frame.name=frameId;frame.id=frameId;frame.style.display='none';
        frame.onload=function(){finish(true);};
        document.body.appendChild(frame);

        const form=document.createElement('form');
        form.id=formId;form.method='POST';form.action=GAS_URL;form.target=frameId;form.style.display='none';
        const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);form.appendChild(input);
        document.body.appendChild(form);
        form.submit();

        // The iframe load is the normal completion signal. This fallback only
        // prevents the UI from hanging if Google never fires a load event.
        setTimeout(()=>finish(true),15000);
      }catch(e){console.error('PEPMOSA EMAIL',e);finish(false);}
    });
  }

  async function send(shipmentId,status){
    try{
      const c=window.PEPMOSA_CONFIG||{};
      if(!window.supabase?.createClient)throw new Error('Supabase client unavailable');
      const client=window.__pepmosaEmailClient||(window.__pepmosaEmailClient=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY));
      const shipment=await getShipment(client,shipmentId);
      if(!shipment?.email)throw new Error('Buyer email is missing.');
      const payload=await buildPayload(client,shipment,status);
      const ok=await postToGas(payload);
      if(ok)toast('Buyer email queued for '+shipment.email,true);else toast('Buyer email could not be queued',false);
      return ok;
    }catch(e){console.error('BUYER EMAIL',e);toast('Buyer email: '+(e.message||'Unable to send'),false);return false;}
  }

  window.sendBuyerTrackingUpdateEmail=send;

  function install(){
    if(typeof window.updateTrackingShipment!=='function')return false;
    if(window.updateTrackingShipment.__buyerEmailHook)return true;
    const original=window.updateTrackingShipment;
    const wrapped=async function(id,k){
      const c=window.PEPMOSA_CONFIG||{};
      const client=window.__pepmosaEmailClient||(window.__pepmosaEmailClient=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY));
      let before=null;
      try{before=await getShipment(client,id);}catch(e){console.warn('Could not read previous tracking status',e);}
      const result=await original.apply(this,arguments);
      const status=document.getElementById(k+'-status')?.value||'';
      if(status && (!before || before.status!==status))await send(id,status);
      return result;
    };
    wrapped.__buyerEmailHook=true;
    window.updateTrackingShipment=wrapped;
    return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>150)clearInterval(timer)},100);
})();