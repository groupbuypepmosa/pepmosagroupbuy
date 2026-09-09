/* PEPMOSA customer experience upgrades */
(function(){
  const $=id=>document.getElementById(id);
  function addStyles(){
    if($('pepCustomerExperienceStyle'))return;
    const s=document.createElement('style');s.id='pepCustomerExperienceStyle';s.textContent=`
.pepFloatingCart{display:none!important}.pepFloatingCartButton{position:fixed!important;right:16px!important;bottom:92px!important;z-index:2147483000!important;width:72px!important;height:72px!important;border:0!important;border-radius:24px!important;background:linear-gradient(145deg,#f35ca6 0%,#d9278c 55%,#a73db7 100%)!important;color:#fff!important;box-shadow:0 14px 30px rgba(190,43,130,.35),inset 0 1px 0 rgba(255,255,255,.35)!important;display:grid!important;place-items:center!important;cursor:pointer!important;transition:transform .18s ease!important}.pepFloatingCartButton:active{transform:scale(.94)!important}.pepFloatingCartButton svg{width:34px;height:34px}.pepCartSparkle{position:absolute;top:8px;left:10px;font-size:12px;color:#fff;opacity:.9}.pepFloatingCartBadge{position:absolute;right:-7px;top:-7px;min-width:30px;height:30px;padding:0 7px;border-radius:999px;background:#fff;color:#c62d7e;border:2px solid #f5d8e6;font-size:13px;font-weight:950;display:grid;place-items:center;box-shadow:0 5px 14px rgba(82,31,57,.14)}.pepFloatingCartButton.pepCartHidden{opacity:0!important;pointer-events:none!important;transform:scale(.8)!important}.pepFloatingCartLabel{display:none}.pepCustomerHeroActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pepCustomerHeroActions a{flex:1;min-width:170px;text-decoration:none}
.pepLiveMoq{margin:22px 0 4px;padding:20px 22px;border:1px solid #f0d6e2;border-radius:24px;background:linear-gradient(135deg,#fff,#fff1f7 55%,#f8efff);box-shadow:0 14px 34px rgba(164,72,121,.08)}
.pepMoqHeader{display:flex;justify-content:space-between;gap:16px;align-items:center}.pepLiveMoq h3{margin:5px 0;color:#3b2b34;font-size:22px}.pepLiveMoq p{margin:6px 0 0;color:#79636f;font-size:12px}.pepLiveMoq .label{font-size:10px;font-weight:950;letter-spacing:.14em;color:#c55b91}.pepMoqOpenBtn{white-space:nowrap}.pepMoqCards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:18px}.pepMoqProduct{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;background:#fff;border:1px solid #f0d9e4;border-radius:18px;padding:10px;transition:.2s}.pepMoqProduct:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(164,72,121,.1)}.pepMoqImage{width:82px;height:82px;flex:0 0 82px;border-radius:14px;overflow:hidden;background:#fff3f8;display:grid;place-items:center}.pepMoqImage img{width:100%;height:100%;object-fit:contain}.pepMoqPlaceholder{font-size:30px}.pepMoqInfo{min-width:0;flex:1}.pepMoqInfo b{display:block;font-size:15px;color:#3b2b34;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pepMoqBadge{display:inline-block;margin-top:6px;padding:4px 8px;border-radius:999px;background:#fff0f7;color:#c62d7e;font-size:10px;font-weight:900}.pepMoqProgress{height:7px;background:#f2dce6;border-radius:999px;overflow:hidden;margin-top:9px}.pepMoqProgress div{height:100%;background:linear-gradient(90deg,#ef8bb4,#d72b91,#a847b5);border-radius:999px}.pepMoqInfo small{display:block;margin-top:6px;color:#7b6570;font-size:10px}
.pepTrust{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.pepTrust div{background:#fff;border:1px solid #f0dce6;border-radius:18px;padding:15px;text-align:center;font-size:11px;color:#755e6a}.pepTrust b{display:block;color:#4a303c;margin-bottom:4px}
.pepFaq{margin:34px 0;padding:28px;border-radius:28px;background:#fff;border:1px solid #eedce6}.pepFaqHead{text-align:center;margin-bottom:16px}.pepFaqHead h2{margin:5px 0}.pepFaq details{border-top:1px solid #f0e1e8;padding:15px 4px}.pepFaq summary{cursor:pointer;font-weight:850;color:#4a303c}.pepFaq p{color:#7c6973;font-size:13px;line-height:1.6;margin:10px 0 0}
.pepTrust a{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #f0dce6;border-radius:18px;padding:15px;text-align:center;font-size:11px;color:#755e6a;transition:transform .18s ease,box-shadow .18s ease}.pepTrust a:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(160,80,120,.1)}.pepTrust a b{display:block;color:#4a303c;margin-bottom:4px}
.pepCartToast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);z-index:2147483500;opacity:0;pointer-events:none;padding:13px 18px;border-radius:16px;background:linear-gradient(135deg,#e52b8b,#a93fb6);color:#fff;font-size:13px;font-weight:900;box-shadow:0 18px 40px rgba(170,38,120,.28);transition:.24s ease}.pepCartToast.show{opacity:1;transform:translate(-50%,0)}.pepCartPulse{animation:pepCartPulse .55s ease}@keyframes pepCartPulse{0%{transform:scale(1)}45%{transform:scale(1.12) rotate(-3deg)}100%{transform:scale(1)}}
.pepBackTop{position:fixed;left:16px;bottom:92px;width:48px;height:48px;border:1px solid rgba(213,43,135,.16);border-radius:17px;background:rgba(255,255,255,.92);color:#bf397c;font-size:24px;font-weight:900;display:grid;place-items:center;z-index:2147482900;box-shadow:0 12px 28px rgba(105,55,85,.13);opacity:0;pointer-events:none;transform:translateY(10px);transition:.2s}.pepBackTop.show{opacity:1;pointer-events:auto;transform:none}
@media(max-width:650px){.pepLiveMoq{padding:18px}.pepMoqHeader{align-items:flex-start;flex-direction:column}.pepMoqOpenBtn{width:100%;text-align:center}.pepMoqCards{grid-template-columns:1fr}.pepTrust{grid-template-columns:1fr;margin:18px 0}.pepFaq{padding:22px 17px;margin:24px 0}.pepFloatingCartButton{bottom:calc(88px + env(safe-area-inset-bottom))!important}.pepBackTop{bottom:calc(88px + env(safe-area-inset-bottom))!important}.pepCartToast{bottom:calc(22px + env(safe-area-inset-bottom))}}
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
      b.innerHTML='<span class="pepCartSparkle">✦</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7"></path><circle cx="10" cy="20" r="1.35" fill="currentColor"></circle><circle cx="18" cy="20" r="1.35" fill="currentColor"></circle></svg><span id="pepFloatingCartBadge" class="pepFloatingCartBadge">0</span>';
      b.onclick=function(){ if(typeof window.openCart==='function') window.openCart(); else if(existingCart) existingCart.click(); };
      document.body.appendChild(b);
      const syncCart=function(){const count=$('cartCount');const badge=$('pepFloatingCartBadge');if(badge)badge.textContent=(count&&count.textContent)||'0';};
      syncCart();
      const count=$('cartCount');if(count)new MutationObserver(syncCart).observe(count,{childList:true,characterData:true,subtree:true});

      const originalOpenCart=window.openCart;
      if(typeof originalOpenCart==='function'&&!window.__pepCartWrapped){
        window.__pepCartWrapped=true;
        window.openCart=function(){
          const fb=$('pepFloatingCartButton'); if(fb)fb.classList.add('pepCartHidden');
          return originalOpenCart.apply(this,arguments);
        };
        const originalCloseModal=window.closeModal;
        if(typeof originalCloseModal==='function'){
          window.closeModal=function(id){
            const result=originalCloseModal.apply(this,arguments);
            if(id==='cartModal'){const fb=$('pepFloatingCartButton');if(fb)fb.classList.remove('pepCartHidden');}
            return result;
          };
        }
      }
    }
    if(!$('pepCartToast')){
      const t=document.createElement('div');t.id='pepCartToast';t.className='pepCartToast';t.textContent='✓ Added to cart';document.body.appendChild(t);
      let toastTimer;
      window.addEventListener('pepmosa-cart-updated',()=>{
        const fb=$('pepFloatingCartButton');
        if(fb){fb.classList.remove('pepCartPulse');void fb.offsetWidth;fb.classList.add('pepCartPulse');}
        t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);
      });
    }
    if(!$('pepBackTop')){
      const top=document.createElement('button');top.id='pepBackTop';top.className='pepBackTop';top.type='button';top.setAttribute('aria-label','Back to top');top.textContent='↑';top.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});document.body.appendChild(top);
      window.addEventListener('scroll',()=>top.classList.toggle('show',window.scrollY>700),{passive:true});
    }
    const products=document.getElementById('products');
    if(products&&!$('pepLiveMoq')){
      const d=document.createElement('section');d.id='pepLiveMoq';d.className='pepLiveMoq';
      d.innerHTML='<div class="pepLiveMoqTop"><div><div class="label">LIVE GROUP BUY PROGRESS</div><h3 id="pepMoqTitle">Current Group Buy</h3></div><div class="pepMoqCount" id="pepMoqCount">Loading…</div></div><div class="pepMoqBar"><div class="pepMoqFill" id="pepMoqFill" style="width:0%"></div></div><p class="pepMoqMsg" id="pepMoqMsg">Live order totals are loading.</p>';
      products.parentNode.insertBefore(d,products);
    }
    if(products&&!$('pepTrust')){
      const d=document.createElement('section');d.id='pepTrust';d.className='pepTrust';
      d.innerHTML='<a href="coa.html"><b>🔒 PRIVATE & SECURE</b>Your information stays protected.</a><a href="track.html"><b>📦 ORDER UPDATES</b>Track your order anytime.</a><a href="buyers-proof"><b>♥ BUYER PROOF</b>See community feedback and proofs.</a>';
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
        const remaining=target?Math.max(0,target-total):0;
        const progressText=target?(remaining===0?'MOQ target reached!':' • '+remaining+' remaining'):'';
        return '<a class="pepMoqProduct" href="open-for-all.html"><div class="pepMoqImage">'+image+'</div><div class="pepMoqInfo"><b>'+String(x.name||'MOQ PRODUCT')+'</b><span class="pepMoqBadge">MOQ '+(target||'—')+'</span><div class="pepMoqProgress"><div style="width:'+pct+'%"></div></div><small>'+total+' ordered'+(target?' • target '+target+progressText:'')+'</small></div></a>';
      }).join('')+'</div>';
    }catch(e){
      wrap.innerHTML='<div class="pepMoqHeader"><div><div class="label">MOQ AVAILABLE NOW</div><h3>🌐 WHAT’S OPEN FOR MOQ</h3><p>Open MOQ to see the currently available products.</p></div><a href="open-for-all.html" class="btn primary pepMoqOpenBtn">OPEN MOQ</a></div>';
    }
  }
  function boot(){insertUI();setTimeout(loadMOQProducts,900);setTimeout(loadMOQProducts,2500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();