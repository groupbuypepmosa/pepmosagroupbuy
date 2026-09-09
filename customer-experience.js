/* PEPMOSA customer experience upgrades */
(function(){
  const $=id=>document.getElementById(id);
  function addStyles(){
    if($('pepCustomerExperienceStyle'))return;
    const s=document.createElement('style');s.id='pepCustomerExperienceStyle';s.textContent=`
.pepFloatingCart{position:fixed!important;right:18px!important;bottom:18px!important;z-index:9999!important;border-radius:999px!important;padding:13px 18px!important}.pepCustomerHeroActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pepCustomerHeroActions a{flex:1;min-width:170px;text-decoration:none}
.pepLiveMoq{margin:22px 0 4px;padding:20px 22px;border:1px solid #f0d6e2;border-radius:24px;background:linear-gradient(135deg,#fff,#fff1f7 55%,#f8efff);box-shadow:0 14px 34px rgba(164,72,121,.08)}
.pepLiveMoqTop{display:flex;justify-content:space-between;gap:16px;align-items:center}.pepLiveMoq h3{margin:5px 0;color:#3b2b34;font-size:22px}.pepLiveMoq .label{font-size:10px;font-weight:950;letter-spacing:.14em;color:#c55b91}.pepMoqCount{font-weight:950;color:#c62d7e;white-space:nowrap}.pepMoqBar{height:11px;background:#f3dce7;border-radius:999px;overflow:hidden;margin-top:15px}.pepMoqFill{height:100%;border-radius:999px;background:linear-gradient(90deg,#ef8bb4,#d72b91,#a847b5);transition:width .6s ease}.pepMoqMsg{margin:10px 0 0;color:#79636f;font-size:12px}
.pepTrust{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.pepTrust div{background:#fff;border:1px solid #f0dce6;border-radius:18px;padding:15px;text-align:center;font-size:11px;color:#755e6a}.pepTrust b{display:block;color:#4a303c;margin-bottom:4px}
.pepFaq{margin:34px 0;padding:28px;border-radius:28px;background:#fff;border:1px solid #eedce6}.pepFaqHead{text-align:center;margin-bottom:16px}.pepFaqHead h2{margin:5px 0}.pepFaq details{border-top:1px solid #f0e1e8;padding:15px 4px}.pepFaq summary{cursor:pointer;font-weight:850;color:#4a303c}.pepFaq p{color:#7c6973;font-size:13px;line-height:1.6;margin:10px 0 0}
@media(max-width:650px){.pepLiveMoq{padding:18px}.pepLiveMoqTop{align-items:flex-start;flex-direction:column}.pepTrust{grid-template-columns:1fr}.pepFaq{padding:22px 17px}.pepStickyTrack{right:12px;bottom:12px}}
`;document.head.appendChild(s);
  }
  function insertUI(){
    addStyles();
    const existingCart=document.querySelector('button.cart');
    if(existingCart) existingCart.classList.add('pepFloatingCart');
    const hero=document.querySelector('.gbPanel');
    if(hero&&!$('pepCustomerHeroActions')){
      const d=document.createElement('div');d.id='pepCustomerHeroActions';d.className='pepCustomerHeroActions';
      d.innerHTML='<a class="pepHeroBtn pepHeroPrimary" href="#products">SHOP AVAILABLE PRODUCTS</a><a class="pepHeroBtn pepHeroSecondary" href="track.html">TRACK MY ORDER</a>';
      hero.appendChild(d);
    }
    const products=document.getElementById('products');
    if(products&&!$('pepLiveMoq')){
      const d=document.createElement('section');d.id='pepLiveMoq';d.className='pepLiveMoq';
      d.innerHTML='<div class="pepLiveMoqTop"><div><div class="label">LIVE GROUP BUY PROGRESS</div><h3 id="pepMoqTitle">Current Group Buy</h3></div><div class="pepMoqCount" id="pepMoqCount">Loading…</div></div><div class="pepMoqBar"><div class="pepMoqFill" id="pepMoqFill" style="width:0%"></div></div><p class="pepMoqMsg" id="pepMoqMsg">Live order totals are loading.</p>';
      products.parentNode.insertBefore(d,products);
    }
    if(products&&!$('pepTrust')){
      const d=document.createElement('section');d.id='pepTrust';d.className='pepTrust';
      d.innerHTML='<div><b>🔒 PRIVATE & SECURE</b>Your information stays protected.</div><div><b>📦 ORDER UPDATES</b>Track your order anytime.</div><div><b>♥ BUYER PROOF</b>See community feedback and proofs.</div>';
      products.parentNode.insertBefore(d,products);
    }
    if(products&&!$('pepFaq')){
      const d=document.createElement('section');d.id='pepFaq';d.className='pepFaq';
      d.innerHTML='<div class="pepFaqHead"><div class="eyebrow">NEED HELP?</div><h2>FREQUENTLY ASKED QUESTIONS</h2></div><details><summary>How does Group Buy work?</summary><p>Secure your access, choose your available products, add them to your cart, and submit your order. Updates are reflected through PEPMOSA.</p></details><details><summary>How do I check my order?</summary><p>Use TRACK MY ORDER and enter the same details used for your order.</p></details><details><summary>What happens after I submit my order?</summary><p>Your order enters processing and you can check updates and delivery progress from the tracking page.</p></details><details><summary>Where can I see buyer feedback?</summary><p>Open BUYERS’ PROOF to view published customer proofs and feedback.</p></details>';
      products.parentNode.insertBefore(d,products.nextSibling);
    }
  }
  async function loadProgress(){
    const sb=window.sb||window.__sb;if(!sb||!window.currentGB)return;
    const gb=window.currentGB;const title=$('pepMoqTitle'),count=$('pepMoqCount'),fill=$('pepMoqFill'),msg=$('pepMoqMsg');
    if(title)title.textContent=gb.customer_facing_name||gb.gb_number||'Current Group Buy';
    try{
      const r=await sb.from('orders').select('order_id,payment_status').eq('gb_number',gb.gb_number);
      if(r.error)throw r.error;
      const valid=(r.data||[]).filter(o=>!['REJECTED','CANCELLED','CANCELED'].includes(String(o.payment_status||'').toUpperCase()));
      const ids=valid.map(o=>o.order_id).filter(Boolean);
      let total=0;if(ids.length){const q=await sb.from('order_items').select('qty').in('order_id',ids);if(q.error)throw q.error;total=(q.data||[]).reduce((a,x)=>a+Number(x.qty||0),0)}
      const target=Number(gb.moq||gb.moq_target||gb.target_qty||50)||50;const pct=Math.min(100,Math.round(total/target*100));
      if(count)count.textContent=total+' / '+target;
      if(fill)fill.style.width=pct+'%';
      if(msg)msg.textContent=total>=target?'🎉 MOQ target reached! Watch for the next update.':(target-total)+' more item'+(target-total===1?'':'s')+' to reach the displayed target.';
    }catch(e){if(count)count.textContent='Live';if(msg)msg.textContent='Check current Group Buy status and updates above.'}
  }
  function boot(){insertUI();setTimeout(loadProgress,1200);setTimeout(loadProgress,3000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();