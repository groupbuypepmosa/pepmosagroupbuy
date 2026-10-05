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

  function installVialScreenshotView(){
    if(!window.renderVialTracker || window.__pepVialWrapped)return;
    const original=window.renderVialTracker;
    window.renderVialTracker=function(){
      original.apply(this,arguments);
      setTimeout(renderVialScreenshotView,30);
    };
    window.__pepVialWrapped=true;
    renderVialScreenshotView();
  }
  function renderVialScreenshotView(){
    const box=document.querySelector('#vialTrackerResults');
    if(!box)return;
    const rows=window.vialTrackerRows||[];
    const incomplete=rows.filter(r=>Number(r.inCurrent||0)>0).sort((a,b)=>{
      const ak=(a.product_name||"")+" "+(a.strength||"");
      const bk=(b.product_name||"")+" "+(b.strength||"");
      return ak.localeCompare(bk);
    });
    let panel=document.querySelector('#pepVialScreenshotPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='pepVialScreenshotPanel';
      box.parentNode.insertBefore(panel,box);
    }
    if(!incomplete.length){
      panel.innerHTML='<div class="pepVialShot emptyShot"><div class="shotTitle">✓ NO KULANG — ALL CURRENT KITS COMPLETE</div></div>';
      return;
    }
    panel.innerHTML=
      '<div class="pepVialShot">'+
      '<div class="shotHeader"><div><div class="shotEyebrow">PEPMOSA • VIAL TRACKER</div><div class="shotTitle">KULANG NA VIALS</div><div class="shotSub">Screenshot-ready • 10 vials = 1 kit</div></div><button type="button" class="shotPrint" id="pepVialPrintBtn">PRINT / SAVE</button></div>'+
      '<div class="shotRows">'+incomplete.map(r=>{
        const qty=Number(r.qty||0),inCurrent=Number(r.inCurrent||0),need=Number(r.remainingToComplete||0);
        return '<div class="shotRow"><div class="shotProduct"><b>'+esc(r.product_name||"Unnamed Product")+'</b><span>'+esc(r.strength||r.variant_id||"")+'</span></div><div class="shotStat"><small>ORDERED</small><b>'+qty+'</b></div><div class="shotNeed"><small>KULANG</small><b>'+need+'</b><span>to complete kit</span></div></div>';
      }).join("")+'</div>'+
      '<div class="shotFooter"><b>'+incomplete.length+' PRODUCT/S NEEDING VIALS</b><span>Send this screenshot to the supplier</span></div></div>';
    const btn=document.querySelector('#pepVialPrintBtn');
    if(btn)btn.onclick=printVialShortage;
  }
  function printVialShortage(){
    const rows=(window.vialTrackerRows||[]).filter(r=>Number(r.inCurrent||0)>0).sort((a,b)=>((a.product_name||"")+" "+(a.strength||"")).localeCompare((b.product_name||"")+" "+(b.strength||"")));
    if(!rows.length){alert('No incomplete kits.');return}
    const gb=document.querySelector('#vialTrackerGB')?.value||'ALL GROUP BUYS';
    const totalMissing=rows.reduce((s,r)=>s+Number(r.remainingToComplete||0),0);
    const w=window.open('','_blank','width=760,height=900');
    if(!w){alert('Please allow popups to print.');return}
    w.document.write('<!doctype html><html><head><title>PEPMOSA Vial Shortage</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#2b2530;max-width:720px;margin:auto}.head{border-bottom:3px solid #c92d82;padding-bottom:14px;margin-bottom:18px}.brand{font-size:28px;font-weight:950;letter-spacing:.12em;color:#c92d82}.sub{color:#786d77;margin-top:5px}.row{display:grid;grid-template-columns:1fr 120px;gap:12px;align-items:center;padding:16px 10px;border-bottom:1px solid #ead9e5}.name b{display:block;font-size:18px}.name span{display:block;color:#786d77;font-size:12px;margin-top:4px}.stat{text-align:center}.stat small{display:block;font-size:9px;letter-spacing:.1em;color:#987088;font-weight:900}.stat b{display:block;font-size:25px;margin-top:3px}.need{background:#fff0f7;border-radius:12px;padding:10px}.need b{color:#c92d82}.total{margin-top:18px;padding:16px;border:2px solid #c92d82;border-radius:14px;display:flex;justify-content:space-between;font-size:18px;font-weight:900}@media print{body{padding:0}.noPrint{display:none}}</style></head><body><div class="head"><div class="brand">PEPMOSA</div><div class="sub">VIAL SHORTAGE • '+esc(gb)+'</div></div>'+rows.map(r=>'<div class="row"><div class="name"><b>'+esc(r.product_name||"Unnamed Product")+'</b><span>'+esc(r.strength||r.variant_id||"")+'</span></div><div class="stat"><small>ORDERED</small><b>'+Number(r.qty||0)+'</b></div><div class="stat need"><small>KULANG</small><b>'+Number(r.remainingToComplete||0)+'</b></div></div>').join('')+'<div class="total"><span>TOTAL VIALS NEEDED</span><span>'+totalMissing+'</span></div><script>window.onload=()=>window.print()<\/script></body></html>');
    w.document.close();
  }
  function installVialStyles(){
    if(document.querySelector('#pepVialShotStyles'))return;
    const s=document.createElement('style');s.id='pepVialShotStyles';s.textContent='.pepVialShot{margin:0 0 18px;border:2px solid #e7b3cf;border-radius:20px;background:linear-gradient(145deg,#fff,#fff7fb);overflow:hidden;box-shadow:0 10px 30px rgba(170,70,120,.08)}.shotHeader{padding:18px 20px;background:linear-gradient(135deg,#fff0f7,#fff);display:flex;justify-content:space-between;gap:14px;align-items:center}.shotEyebrow{font-size:9px;font-weight:950;letter-spacing:.14em;color:#ad4d79}.shotTitle{font-size:24px;font-weight:950;color:#bd236f;margin-top:3px}.shotSub{font-size:11px;color:#786d77;margin-top:3px}.shotPrint{border:0;border-radius:11px;padding:10px 13px;background:#c92d82;color:#fff;font-weight:900;cursor:pointer}.shotRows{padding:10px 14px}.shotRow{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:10px;align-items:center;padding:13px 8px;border-bottom:1px solid #f0dfe8}.shotRow:last-child{border-bottom:0}.shotProduct b{display:block;font-size:14px}.shotProduct span{display:block;font-size:11px;color:#786d77;margin-top:3px}.shotStat{text-align:center}.shotStat small,.shotNeed small{display:block;font-size:8px;font-weight:950;letter-spacing:.1em;color:#9b6b82}.shotStat b{font-size:20px}.shotNeed{background:#fff0f7;border-radius:12px;padding:8px;text-align:center}.shotNeed b{display:block;font-size:25px;color:#c92d82}.shotNeed span{display:block;font-size:8px;color:#987088}.shotFooter{padding:12px 18px;background:#fff4f9;display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#866878}.emptyShot{padding:18px}.emptyShot .shotTitle{font-size:18px}.pepVialShot + .pepKitCards{margin-top:0}@media(max-width:650px){.shotHeader{align-items:flex-start}.shotTitle{font-size:20px}.shotRow{grid-template-columns:minmax(0,1fr) 60px 95px}.shotPrint{font-size:10px;padding:9px}.shotFooter{flex-direction:column}}';document.head.appendChild(s);
  }
  function bootVialShot(){installVialStyles();setTimeout(installVialScreenshotView,900)}

  bootVialShot();
})();