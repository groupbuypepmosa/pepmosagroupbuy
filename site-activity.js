(function(){
  function safeDetails(v){try{return JSON.parse(JSON.stringify(v||{}))}catch(e){return{}}}
  async function log(action,entityType=null,entityId=null,details={}){
    try{
      const sb=window.sb;if(!sb)return false;
      const r=await sb.rpc('record_site_activity',{p_action:action,p_entity_type:entityType,p_entity_id:entityId,p_page:location.pathname,p_details:safeDetails(details)});
      if(r.error)throw r.error;
      return true;
    }catch(e){console.warn('PEPMOSA activity log',e);return false}
  }
  async function boot(){
    let tries=0;
    while(!window.sb&&tries<30){await new Promise(r=>setTimeout(r,250));tries++}
    if(!window.sb)return;
    window.pepLogActivity=log;
  }

  function shippingEditor(){
    if(location.pathname!=='/admin' && !location.pathname.endsWith('/admin.html'))return;
    if(!document.querySelector('#waybillPreview'))return;
    if(document.querySelector('#pepWaybillShippingEditor'))return;
    const host=document.createElement('div');
    host.id='pepWaybillShippingEditor';
    host.style.cssText='margin-bottom:12px;padding:14px;border:1px solid #ead9e5;border-radius:16px;background:#fff8fc';
    host.innerHTML='<div style="font-size:11px;font-weight:950;letter-spacing:.08em;color:#a52a70;margin-bottom:8px">SHIPPING OPTION</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
      '<select id="pepWaybillShippingSelect" style="flex:1;min-width:220px;border:1px solid #e5d5e1;border-radius:10px;padding:10px;background:#fff">'+
      '<option value="">Select shipping option</option><option value="100|J&T Express - Luzon">J&T Express - Luzon • ₱100</option>'+
      '<option value="150|J&T Express - Visayas">J&T Express - Visayas • ₱150</option>'+
      '<option value="180|J&T Express - Mindanao">J&T Express - Mindanao • ₱180</option>'+
      '<option value="0|Lalamove">Lalamove • ₱0</option></select>'+
      '<button id="pepWaybillShippingSave" type="button" style="border:0;border-radius:10px;padding:10px 14px;background:#d72b91;color:#fff;font-weight:900;cursor:pointer">SAVE SHIPPING</button></div>'+
      '<div id="pepWaybillShippingMsg" style="font-size:11px;color:#786d77;margin-top:7px">Only orders with missing shipping will be updated.</div>';
    const preview=document.querySelector('#waybillPreview');
    preview.parentNode.insertBefore(host,preview);
    document.querySelector('#pepWaybillShippingSave').onclick=saveWaybillShipping;
  }
  async function saveWaybillShipping(){
    const email=window.selectedWaybillBuyer;
    const select=document.querySelector('#pepWaybillShippingSelect');
    const msg=document.querySelector('#pepWaybillShippingMsg');
    if(!email||!select?.value){if(msg)msg.textContent='Select a shipping option first.';return}
    const [feeText,method]=select.value.split('|'),fee=Number(feeText);
    const sb=window.sb;if(!sb)return;
    const btn=document.querySelector('#pepWaybillShippingSave');if(btn)btn.disabled=true;
    try{
      const q=await sb.from('orders').select('order_id,shipping_method,shipping_fee').eq('email',email);
      if(q.error)throw q.error;
      const missing=(q.data||[]).filter(o=>!String(o.shipping_method||'').trim());
      if(!missing.length){if(msg)msg.textContent='No missing shipping records found for this buyer.';return}
      const ids=missing.map(o=>o.order_id);
      const up=await sb.from('orders').update({shipping_method:method,shipping_fee:fee}).in('order_id',ids);
      if(up.error)throw up.error;
      if(Array.isArray(window.waybillRows)){
        const row=window.waybillRows.find(x=>x.email===email);
        if(row){row.shipping_method=method;row.shipping_fee_paid=fee}
      }
      if(typeof window.renderWaybillCenter==='function')window.renderWaybillCenter();
      if(msg)msg.textContent=missing.length+' order(s) updated to '+method+' • ₱'+fee.toFixed(2)+'.';
    }catch(e){
      console.error(e);if(msg)msg.textContent=e.message||'Unable to update shipping.';
    }finally{if(btn)btn.disabled=false}
  }
  function watchWaybill(){
    shippingEditor();
    const target=document.body;
    if(target&&!window.__pepWaybillObserver){
      window.__pepWaybillObserver=new MutationObserver(()=>shippingEditor());
      window.__pepWaybillObserver.observe(target,{childList:true,subtree:true});
    }
  }
  function bootWaybill(){setTimeout(watchWaybill,700)}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  bootWaybill();
})();