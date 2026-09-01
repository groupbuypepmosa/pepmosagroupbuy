/* PEPMOSA checkout shipping selector */
(function(){
  'use strict';
  const RATES=[
    {id:'jnt_luzon',name:'J&T Express',area:'Luzon',fee:80,detail:'Standard J&T delivery • ₱80'},
    {id:'jnt_visayas',name:'J&T Express',area:'Visayas',fee:90,detail:'Standard J&T delivery • ₱90'},
    {id:'jnt_mindanao',name:'J&T Express',area:'Mindanao',fee:100,detail:'Standard J&T delivery • ₱100'},
    {id:'lalamove',name:'Lalamove',area:'Same-day / on-demand',fee:0,detail:'Delivery fee is based on the Lalamove app. Customer pays the delivery fee upon delivery.'}
  ];
  let patched=null;
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  function getSubtotal(){
    try{
      const c=Array.isArray(window.cart)?window.cart:JSON.parse(localStorage.pepmosaCart||'[]');
      return c.reduce((s,i)=>s+Number(i.line_total??i.total??(Number(i.price||i.unit_price||0)*Number(i.qty??i.quantity??0))),0);
    }catch(e){return 0}
  }
  function inject(){
    if(document.getElementById('pepShippingRatesStyles'))return;
    const s=document.createElement('style');s.id='pepShippingRatesStyles';s.textContent=`
      .pepShippingChoices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:3px}
      .pepShipChoice{appearance:none;width:100%;text-align:left;border:1px solid #ead6e3;background:#fff;border-radius:14px;padding:12px 13px;cursor:pointer;transition:.16s;position:relative;color:#30242c}
      .pepShipChoice:hover{border-color:#e08bb9;transform:translateY(-1px)}
      .pepShipChoice.selected{border:1.5px solid #d7288d;background:linear-gradient(135deg,#fff0f8,#fff9fc);box-shadow:0 6px 18px rgba(215,40,141,.10)}
      .pepShipChoice.selected:after{content:'✓';position:absolute;right:10px;top:9px;width:21px;height:21px;border-radius:50%;background:#d7288d;color:#fff;font-size:12px;font-weight:950;display:grid;place-items:center}
      .pepShipTop{display:flex;justify-content:space-between;gap:7px;align-items:flex-start;padding-right:22px}.pepShipName{font-size:12px;font-weight:950}.pepShipArea{font-size:10px;color:#9b567d;margin-top:3px;font-weight:850}.pepShipFee{font-size:12px;font-weight:950;color:#d7288d;white-space:nowrap}.pepShipDetail{font-size:9px;line-height:1.4;color:#81747c;margin-top:6px}.pepShipDetail.lala{color:#8a4d70;font-weight:750}
      #pepShippingHiddenSelect{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important}
      .pepLalamoveNote{margin-top:9px;padding:10px 12px;border-radius:12px;background:#fff5fa;border:1px solid #f0d7e5;color:#80516d;font-size:10px;line-height:1.5}
      @media(max-width:620px){.pepShippingChoices{grid-template-columns:1fr}.pepShipChoice{padding:13px}}
    `;document.head.appendChild(s)
  }
  function patch(){
    const select=document.getElementById('pepShippingMethod');
    if(!select || select.dataset.pepShippingPatched==='1')return;
    inject();
    select.dataset.pepShippingPatched='1';select.id='pepShippingHiddenSelect';
    select.setAttribute('aria-hidden','true');
    const wrap=document.createElement('div');wrap.className='pepShippingChoices';wrap.id='pepShippingChoices';
    RATES.forEach((r,i)=>{
      const b=document.createElement('button');b.type='button';b.className='pepShipChoice'+(i===0?' selected':'');
      b.innerHTML='<div class="pepShipTop"><div><div class="pepShipName">'+r.name+'</div><div class="pepShipArea">'+r.area+'</div></div><div class="pepShipFee">'+(r.fee?peso(r.fee):'APP RATE')+'</div></div><div class="pepShipDetail '+(r.id==='lalamove'?'lala':'')+'">'+r.detail+'</div>';
      b.addEventListener('click',()=>choose(i));wrap.appendChild(b)
    });
    select.parentNode.appendChild(wrap);
    choose(0);
    patched=select;
  }
  function choose(i){
    const select=patched||document.getElementById('pepShippingHiddenSelect');if(!select)return;
    const r=RATES[i];select.value=String(i);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelectorAll('.pepShipChoice').forEach((b,n)=>b.classList.toggle('selected',n===i));
    const fee=document.getElementById('pepShippingFee'),grand=document.getElementById('pepGrandTotal');
    if(fee)fee.textContent=r.fee?peso(r.fee):'APP RATE';
    if(grand)grand.textContent=r.fee?peso(getSubtotal()+r.fee):peso(getSubtotal());
    let note=document.querySelector('.pepLalamoveNote');
    if(r.id==='lalamove'){
      if(!note){note=document.createElement('div');note.className='pepLalamoveNote';const choices=document.getElementById('pepShippingChoices');choices?.parentNode.appendChild(note)}
      note.innerHTML='<b>Lalamove delivery</b><br>The delivery fee will be based on the actual rate shown in the Lalamove app. The customer will pay the Lalamove delivery fee <b>upon delivery</b>.';
    }else if(note)note.remove();
  }
  function watch(){patch();const obs=new MutationObserver(()=>patch());obs.observe(document.body,{childList:true,subtree:true});setInterval(patch,700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
