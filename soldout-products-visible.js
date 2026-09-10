/* PEPMOSA storefront — keep SOLD OUT products visible.
   Sold-out products stay on the storefront for transparency, but cannot be ordered. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let addedForGB='';

  function styles(){
    if($('pepSoldOutStyles'))return;
    const s=document.createElement('style');s.id='pepSoldOutStyles';
    s.textContent=`
      .pepSoldOutCard{position:relative!important;filter:saturate(.72);opacity:.92}
      .pepSoldOutCard .pepSoldOutImg{position:relative}
      .pepSoldOutCard .pepSoldOutImg:after{content:'SOLD OUT';position:absolute;left:12px;top:12px;padding:7px 11px;border-radius:999px;background:#6f6470;color:#fff;font-size:10px;font-weight:950;letter-spacing:.10em;box-shadow:0 6px 15px rgba(55,35,48,.16)}
      .pepSoldOutBadge{display:inline-flex;align-items:center;margin:5px 0 8px;padding:5px 9px;border-radius:999px;background:#f0eaee;color:#6f626b;font-size:9px;font-weight:950;letter-spacing:.08em}
      .pepSoldOutDisabled{width:100%;border:1px solid #ded4da!important;background:#f4f0f2!important;color:#756a71!important;cursor:not-allowed!important;opacity:.85}
      .pepSoldOutPrice{font-size:15px;font-weight:950;color:#574650;margin:8px 4px 0}
    `;document.head.appendChild(s);
  }

  async function load(){
    const s=window.sb||window.__sb, grid=$('productGrid'), gb=window.currentGB;
    if(!s||!grid||!gb)return;
    const gbn=String(gb.gb_number||'');if(!gbn||addedForGB===gbn)return;
    const r=await s.from('ofa_products').select('id,name,amount,moq,image_url,status').in('status',['SOLD_OUT']);
    if(r.error){console.warn('SOLD OUT products unavailable:',r.error.message);return;}
    const sold=r.data||[];
    styles();
    sold.forEach(p=>{
      const id=String(p.id||'');
      if(!id||grid.querySelector('[data-pepmosa-soldout-id="'+CSS.escape(id)+'"]'))return;
      const card=document.createElement('article');
      card.className='card pepStoreCard pepSoldOutCard';
      card.dataset.pepmosaSoldoutId=id;
      card.innerHTML=`
        <div class="productImg pepSoldOutImg"><img src="${esc(p.image_url||'')}" alt="${esc(p.name||'Product')}" loading="lazy"></div>
        <div class="pepStoreBody">
          <h3>${esc(p.name||'Product')}</h3>
          <span class="pepSoldOutBadge">SOLD OUT</span>
          <p class="muted">This product is currently sold out and is shown for reference only.</p>
          <div class="pepSoldOutPrice">${peso(p.amount)}</div>
          <div class="pepStoreBottom"><button type="button" class="btn pepSoldOutDisabled" disabled>SOLD OUT</button></div>
        </div>`;
      grid.appendChild(card);
    });
    addedForGB=gbn;
  }

  function boot(){
    let tries=0;
    const timer=setInterval(()=>{tries++;if($('productGrid')&&window.currentGB){load();if(tries>8)clearInterval(timer)}if(tries>120)clearInterval(timer)},250);
    const grid=$('productGrid');
    if(grid)new MutationObserver(()=>load()).observe(grid,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
