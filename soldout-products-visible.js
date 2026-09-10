/* PEPMOSA storefront — SOLD OUT products stay visible outside the rerendered product grid. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let soldOutRows=[];
  let loading=false;

  function styles(){
    if($('pepSoldOutStyles'))return;
    const s=document.createElement('style');
    s.id='pepSoldOutStyles';
    s.textContent=`
      #pepSoldOutSection{display:block!important;clear:both;margin-top:26px!important}
      #pepSoldOutSection .pepSoldOutHead{margin:0 0 14px}
      #pepSoldOutSection .pepSoldOutHead .eyebrow{font-size:10px;letter-spacing:.16em;font-weight:950;color:#9b7c89}
      #pepSoldOutSection .pepSoldOutHead h3{margin:5px 0 0;font-size:22px;color:#4b3b43}
      #pepSoldOutGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}
      .pepSoldOutCard{position:relative!important;filter:saturate(.72);opacity:.92}
      .pepSoldOutCard .pepSoldOutImg{position:relative;height:245px;overflow:hidden;background:#fff7fb;display:flex;align-items:center;justify-content:center}
      .pepSoldOutCard .pepSoldOutImg:after{content:'SOLD OUT';position:absolute;left:12px;top:12px;padding:7px 11px;border-radius:999px;background:#6f6470;color:#fff;font-size:10px;font-weight:950;letter-spacing:.10em}
      .pepSoldOutCard .pepSoldOutImg img{width:100%;height:100%;object-fit:cover;display:block}
      .pepSoldOutCard .pepStoreBody{padding:16px}
      .pepSoldOutCard .pepStoreBody h3{margin:0 0 6px;font-size:19px;color:#392b33}
      .pepSoldOutBadge{display:inline-flex;align-items:center;margin:5px 0 8px;padding:5px 9px;border-radius:999px;background:#f0eaee;color:#6f626b;font-size:9px;font-weight:950;letter-spacing:.08em}
      .pepSoldOutDisabled{width:100%;border:1px solid #ded4da!important;background:#f4f0f2!important;color:#756a71!important;cursor:not-allowed!important;opacity:.85}
      .pepSoldOutPrice{font-size:15px;font-weight:950;color:#574650;margin:8px 4px 0}
      @media(max-width:620px){#pepSoldOutGrid{grid-template-columns:1fr;gap:14px}.pepSoldOutCard .pepSoldOutImg{height:220px}}
    `;
    document.head.appendChild(s)
  }

  function getHost(){
    const grid=$('productGrid');
    return grid&&grid.parentNode?grid.parentNode:null;
  }

  function ensureSection(){
    const host=getHost();
    if(!host)return null;
    let section=$('pepSoldOutSection');
    if(!section || section.parentNode!==host){
      if(section)section.remove();
      section=document.createElement('section');
      section.id='pepSoldOutSection';
      section.innerHTML='<div class="pepSoldOutHead"><div class="eyebrow">CURRENTLY UNAVAILABLE</div><h3>Sold Out Products</h3></div><div id="pepSoldOutGrid"></div>';
      host.appendChild(section);
    }
    return $('pepSoldOutGrid');
  }

  function render(){
    const grid=ensureSection();
    if(!grid)return;
    styles();
    const existing=new Set(Array.from(grid.querySelectorAll('[data-pepmosa-soldout-id]')).map(x=>String(x.dataset.pepmosaSoldoutId)));
    soldOutRows.forEach(p=>{
      const id=String(p.id||'');
      if(!id||existing.has(id))return;
      const card=document.createElement('article');
      card.className='card pepStoreCard pepSoldOutCard';
      card.dataset.pepmosaSoldoutId=id;
      card.innerHTML=`<div class="productImg pepSoldOutImg"><img src="${esc(p.image_url||'')}" alt="${esc(p.name||'Product')}" loading="lazy"></div><div class="pepStoreBody"><h3>${esc(p.name||'Product')}</h3><span class="pepSoldOutBadge">SOLD OUT</span><p class="muted">This product is currently sold out and is shown for reference only.</p><div class="pepSoldOutPrice">${peso(p.amount)}</div><div class="pepStoreBottom"><button type="button" class="btn pepSoldOutDisabled" disabled>SOLD OUT</button></div></div>`;
      grid.appendChild(card);
    });
  }

  async function load(){
    const s=window.sb||window.__sb;
    if(!s)return;
    if(loading)return;
    loading=true;
    try{
      const r=await s.from('ofa_products').select('id,name,amount,moq,image_url,status').eq('status','SOLD_OUT');
      if(r.error){console.warn('SOLD OUT products unavailable:',r.error.message);return}
      soldOutRows=r.data||[];
      render();
    }finally{loading=false}
  }

  function boot(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if($('productGrid')){
        render();
        load();
      }
      if(tries>80)clearInterval(timer);
    },250);

    const watch=new MutationObserver(()=>{
      if($('productGrid')){
        const section=$('pepSoldOutSection');
        const host=getHost();
        if(!section||section.parentNode!==host||!section.querySelector('[data-pepmosa-soldout-id]')){
          render();
        }
      }
    });
    watch.observe(document.body,{childList:true,subtree:true});

    setInterval(()=>{
      if($('productGrid')){load();render()}
    },10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();