(function(){
  'use strict';
  const GAS_URL='https://script.google.com/macros/s/AKfycbwD-e-Wv9NloaVlcOsZlfYR3KU81SvO9jLQ8lFpaNOh6XNY1ZRGJX6Yvs1UbP0EEBRM/exec';

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
    const gb=await client.from('orders').select('order_id,customer_id,email,total,shipping_method,shipping_fee,gb_number').eq('shipment_id',shipment.shipment_id);
    if(gb.error)throw gb.error;

    let source='GROUP BUY';let orders=gb.data||[];let items=[];
    if(orders.length){
      const ids=orders.map(x=>x.order_id);
      const oi=await client.from('order_items').select('order_id,product_name,strength,qty,unit_price,line_total').in('order_id',ids);
      if(oi.error)throw oi.error;items=oi.data||[];
    }else{
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
    const customerName=(orders.find(x=>x.customer_name)?.customer_name)||'';
    const round=[...new Set(orders.map(x=>x.gb_number).filter(Boolean))].join(', ');

    return {
      action:'sendTrackingUpdateEmail',to:shipment.email,customerName,source,round,status,
      trackingNumber:shipment.tracking_number||'',courier:shipment.courier||'',waybillNumber:shipment.waybill_number||'',
      items:[...map.values()],subtotal,shippingFee,total,
      shippingMethod:(orders.find(x=>x.shipping_method)?.shipping_method)||''
    };
  }

  function postToGas(payload){
    return new Promise(function(resolve){
      try{
        const form=document.createElement('form');form.method='POST';form.action=GAS_URL;form.target='pepmosaEmailFrame';form.style.display='none';
        const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);form.appendChild(input);
        let frame=document.getElementById('pepmosaEmailFrame');
        if(!frame){frame=document.createElement('iframe');frame.name='pepmosaEmailFrame';frame.id='pepmosaEmailFrame';frame.style.display='none';document.body.appendChild(frame);}
        document.body.appendChild(form);form.submit();form.remove();resolve(true);
      }catch(e){console.error('PEPMOSA EMAIL',e);resolve(false);}
    });
  }

  async function send(shipmentId,status){
    try{
      const c=window.PEPMOSA_CONFIG||{};
      if(!window.supabase?.createClient)throw new Error('Supabase client unavailable');
      const client=window.__pepmosaEmailClient||(window.__pepmosaEmailClient=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY));
      const shipment=await getShipment(client,shipmentId);
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