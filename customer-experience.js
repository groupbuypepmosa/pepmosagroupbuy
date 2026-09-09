/* PEPMOSA customer experience upgrades */
(function(){
  const $=id=>document.getElementById(id);
  function addStyles(){
    if($('pepCustomerExperienceStyle'))return;
    const s=document.createElement('style');s.id='pepCustomerExperienceStyle';s.textContent=`
.pepFloatingCart{display:none!important}.pepFloatingCartButton{position:fixed!important;right:16px!important;bottom:92px!important;z-index:2147483000!important;width:76px!important;height:76px!important;border:0!important;border-radius:50%!important;background:linear-gradient(135deg,#e52b8b,#b93bb6)!important;color:#fff!important;box-shadow:0 16px 34px rgba(190,43,130,.38)!important;font-size:30px!important;display:grid!important;place-items:center!important;cursor:pointer!important}.pepFloatingCartBadge{position:absolute;right:-4px;top:-4px;min-width:30px;height:30px;padding:0 7px;border-radius:999px;background:#fff;color:#c62d7e;border:1px solid #f0d6e2;font-size:13px;font-weight:950;display:grid;place-items:center}.pepFloatingCartLabel{display:none}.pepCustomerHeroActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pepCustomerHeroActions a{flex:1;min-width:170px;text-decoration:none}
.pepLiveMoq{margin:22px 0 4px;padding:20px 22px;border:1px solid #f0d6e2;border-radius:24px;background:linear-gradient(135deg,#fff,#fff1f7 55%,#f8efff);box-shadow:0 14px 34px rgba(164,72,121,.08)}
.pepMoqHeader{display:flex;justify-content:space-between;gap:16px;align-items:center}.pepLiveMoq h3{margin:5px 0;color:#3b2b34;font-size:22px}.pepLiveMoq p{margin:6px 0 0;color:#79636f;font-size:12px}.pepLiveMoq .label{font-size:10px;font-weight:950;letter-spacing:.14em;color:#c55b91}.pepMoqOpenBtn{white-space:nowrap}.pepMoqCards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:18px}.pepMoqProduct{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;background:#fff;border:1px solid #f0d9e4;border-radius:18px;padding:10px;transition:.2s}.pepMoqProduct:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(164,72,121,.1)}.pepMoqImage{width:82px;height:82px;flex:0 0 82px;border-radius:14px;overflow:hidden;background:#fff3f8;display:grid;place-items:center}.pepMoqImage img{width:100%;height:100%;object-fit:contain}.pepMoqPlaceholder{font-size:30px}.pepMoqInfo{min-width:0;flex:1}.pepMoqInfo b{display:block;font-size:15px;color:#3b2b34;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pepMoqBadge{display:inline-block;margin-top:6px;padding:4px 8px;border-radius:999px;background:#fff0f7;color:#c62d7e;font-size:10px;font-weight:900}.pepMoqProgress{height:7px;background:#f2dce6;border-radius:999px;overflow:hidden;margin-top:9px}.pepMoqProgress div{height:100%;background:linear-gradient(90deg,#ef8bb4,#d72b91,#a847b5);border-radius:999px}.pepMoqInfo small{display:block;margin-top:6px;color:#7b6570;font-size:10px}
.pepTrust{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.pepTrust div{background:#fff;border:1px solid #f0dce6;border-radius:18px;padding:15px;text-align:center;font-size:11px;color:#755e6a}.pepTrust b{display:block;color:#4a303c;margin-bottom:4px}
.pepFaq{margin:34px 0;padding:28px;border-radius:28px;background:#fff;border:1px solid #eedce6}.pepFaqHead{text-align:center;margin-bottom:16px}.pepFaqHead h2{margin:5px 0}.pepFaq details{border-top:1px solid #f0e1e8;padding:15px 4px}.pepFaq summary{cursor:pointer;font-weight:850;color:#4a303c}.pepFaq p{color:#7c6973;font-size:13px;line-height:1.6;margin:10px 0 0}
@media(max-width:650px){.pepLiveMoq{padding:18px}.pepMoqHeader{align-items:flex-start;flex-direction:column}.pepMoqOpenBtn{width:100%;text-align:center}.pepMoqCards{grid-template-columns:1fr}.pepTrust{grid-template-columns:1fr}.pepFaq{padding:22px 17px}}
`;document.head.appendChild(s);
  }
  function insertUI(){
    addStyles();
    const existingCart=document.querySelector('button.cart');
    if(existingCart) existingCart.classList.add('pepFloatingCart');
    const oldHeroActions=$('pepCustomerHeroActions');
    if(oldHeroActions) oldHeroActions.remove();
    if(!$('pepFloatingCartButton')){
      const b=document.createElement('button');
      b.id='pepFloatingCartButton';
      b.className='pepFloatingCartButton';
      b.type='button';
      b.setAttribute('aria-label','Open cart');
      b.innerHTML='🛒<span id="pepFloatingCartBadge" class="pepFloatingCartBadge">0</span>';
      b.onclick=function(){ if(typeof window.openCart==='function') window.openCart(); else if(existingCart) existingCart.click(); };
      document.body.appendChild(b);
      const syncCart=function(){const count=$('cartCount');const badge=$('pepFloatingCartBadge');if(badge)badge.textContent=(count&&count.textContent)||'0';};
      syncCart();
      const count=$('cartCount');if(count)new MutationObserver(syncCart).observe(count,{childList:true,characterData:true,subtree:true});
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
  async function loadMOQProducts(){
    const sb=window.sb||window.__sb;
    const wrap=$('pepLiveMoq');
    if(!sb||!wrap)return;
    try{
      const [productsRes,totalsRes]=await Promise.all([
        sb.from('ofa_products').select('*').eq('status','AVAILABLE'),
        sb.rpc('ofa_public_product_totals')
      ]);
      if(productsRes.error)throw productsRes.error;
      const totals=new Map((totalsRes.data||[]).map(x=>[String(x.product_id),Number(x.total_qty)||0]));
      const items=productsRes.data||[];
      if(!items.length){wrap.remove();return;}
      wrap.innerHTML='<div class="pepMoqHeader"><div><div class="label">MOQ AVAILABLE NOW</div><h3>🌐 WHAT’S OPEN FOR MOQ</h3><p>See the products currently available so you don’t have to search for them.</p></div><a href="open-for-all.html" class="btn primary pepMoqOpenBtn">VIEW ALL MOQ</a></div><div class="pepMoqCards">'+items.map(x=>{
        const total=totals.get(String(x.id))||0;
        const target=Number(x.moq)||0;
        const pct=target?Math.min(100,Math.round(total/target*100)):0;
        const image=x.image_url?'<img src="'+String(x.image_url).replace(/"/g,'&quot;')+'" alt="'+String(x.name||'MOQ product').replace(/"/g,'&quot;')+'">':'<div class="pepMoqPlaceholder">🧪</div>';
        return '<a class="pepMoqProduct" href="open-for-all.html"><div class="pepMoqImage">'+image+'</div><div class="pepMoqInfo"><b>'+String(x.name||'MOQ PRODUCT')+'</b><span class="pepMoqBadge">MOQ '+(target||'—')+'</span><div class="pepMoqProgress"><div style="width:'+pct+'%"></div></div><small>'+total+' ordered'+(target?' • target '+target:'')+'</small></div></a>';
      }).join('')+'</div>';
    }catch(e){
      wrap.innerHTML='<div class="pepMoqHeader"><div><div class="label">MOQ AVAILABLE NOW</div><h3>🌐 WHAT’S OPEN FOR MOQ</h3><p>Open MOQ to see the currently available products.</p></div><a href="open-for-all.html" class="btn primary pepMoqOpenBtn">OPEN MOQ</a></div>';
    }
  }
  function boot(){insertUI();setTimeout(loadMOQProducts,900);setTimeout(loadMOQProducts,2500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();