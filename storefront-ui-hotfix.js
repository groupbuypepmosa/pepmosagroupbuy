/* PEPMOSA storefront UI polish + state repair */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const S=()=>window.sb||window.__sb;
  let loadedKey='';
  let noticeShown=false;

  function styles(){
    if($('pepPremiumModalStyles'))return;
    const s=document.createElement('style');s.id='pepPremiumModalStyles';s.textContent=`
      #productGrid{align-items:start!important}
      #productGrid .card{padding:14px!important;border-radius:22px!important;overflow:hidden!important;box-shadow:0 8px 24px rgba(80,35,70,.05)!important;transition:transform .18s ease,box-shadow .18s ease!important}
      #productGrid .card:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(80,35,70,.09)!important}
      #productGrid .productImg{height:auto!important;aspect-ratio:4/3!important;min-height:0!important;margin:-1px -1px 14px!important;border-radius:16px!important;background:linear-gradient(145deg,#fff4fa,#f9efff)!important;overflow:hidden!important;border:1px solid #f2dce8!important}
      #productGrid .productImg img{width:100%!important;height:100%!important;display:block!important;object-fit:contain!important;object-position:center!important;padding:7px!important;box-sizing:border-box!important}
      #productGrid .card h3{font-size:16px!important;line-height:1.15!important;margin:0 0 5px!important;letter-spacing:.1px!important}
      #productGrid .card>.muted{font-size:11px!important;line-height:1.45!important;margin:0 0 9px!important}
      #productGrid .variantList{display:grid!important;gap:7px!important;margin-top:8px!important;max-height:245px!important;overflow-y:auto!important;padding-right:3px!important;scrollbar-width:thin!important}
      #productGrid .variantRow{display:grid!important;grid-template-columns:minmax(55px,1fr) 72px auto!important;align-items:center!important;gap:7px!important;padding:8px!important;border:1px solid #f0dfe8!important;background:#fffafd!important;border-radius:13px!important}
      #productGrid .variantMeta{min-width:0!important}
      #productGrid .variantStrength{font-size:13px!important;font-weight:950!important;color:#2d232b!important;line-height:1.1!important}
      #productGrid .variantPrice{font-size:10px!important;color:#8a7480!important;margin-top:3px!important}
      #productGrid .qty{width:72px!important;height:36px!important;padding:7px 8px!important;border-radius:10px!important;border:1px solid #e7d4df!important;text-align:center!important;background:#fff!important}
      #productGrid .variantRow .btn{height:36px!important;padding:7px 12px!important;border-radius:10px!important;font-size:11px!important;min-width:54px!important}
      #productGrid .minBadge{margin:3px 3px 0!important;font-size:9px!important;color:#9a557b!important;font-weight:800!important}
      #productGrid .variantList::-webkit-scrollbar{width:5px}
      #productGrid .variantList::-webkit-scrollbar-thumb{background:#e6c7d8;border-radius:99px}

      .modal{background:rgba(35,20,31,.58)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important;padding:16px!important;z-index:99990!important}
      .modalbox{width:min(650px,calc(100vw - 28px))!important;max-height:min(88vh,760px)!important;overflow:auto!important;padding:0!important;border:1px solid #f0d5e5!important;border-radius:26px!important;background:#fff!important;box-shadow:0 30px 90px rgba(60,25,55,.25)!important}
      #cartModal .sectionHead{margin:0!important;padding:24px 26px 18px!important;background:linear-gradient(135deg,#fff0f8,#fff 62%,#f6efff)!important;border-bottom:1px solid #f0dce9!important;align-items:center!important}
      #cartModal .sectionHead h2{margin:0!important;font-size:27px!important;letter-spacing:-.5px!important}
      #cartModal .sectionHead .btn{border-radius:11px!important;padding:9px 13px!important}
      #cartItems{padding:16px 26px 0!important}
      #cartItems .row{padding:13px 0!important;align-items:center!important;border-bottom:1px solid #f1e5eb!important;font-size:13px!important}
      #cartItems .row b{display:flex!important;align-items:center!important;gap:9px!important;white-space:nowrap!important}
      #cartItems .row .btn{width:30px!important;height:30px!important;padding:0!important;border-radius:9px!important}
      #cartModal>.modalbox>.row{margin:15px 26px 0!important;padding:15px 0!important;font-size:14px!important}
      #cartModal>.modalbox>.actions{padding:0 26px 26px!important;margin-top:15px!important}
      #cartModal .wide{min-height:47px!important;border-radius:13px!important;background:linear-gradient(135deg,#e12c91,#c41f7d)!important;box-shadow:0 9px 22px rgba(215,43,145,.18)!important}

      #checkoutModal .modalbox{width:min(680px,calc(100vw - 28px))!important}
      #checkoutModal .pepCheckoutHead{padding:26px 30px 20px!important;background:linear-gradient(135deg,#fff0f8,#fff 60%,#f5efff)!important;border-bottom:1px solid #f0dce9!important}
      #checkoutModal .pepCheckoutKicker{font-size:10px!important;font-weight:950!important;letter-spacing:.16em!important;color:#d7288d!important;margin-bottom:7px!important}
      #checkoutModal .pepCheckoutHead h2{font-size:28px!important;margin:0!important;letter-spacing:-.7px!important}
      #checkoutModal .pepCheckoutHead p{font-size:12px!important;color:#7d6f79!important;margin:7px 0 0!important;line-height:1.5!important}
      #checkoutModal .pepCheckoutBody{padding:22px 30px 28px!important}
      #checkoutModal .pepCheckoutInfo{border:1px solid #f0dce8!important;background:#fff7fb!important;border-radius:15px!important}
      #checkoutModal .field input,#checkoutModal .field textarea{border:1px solid #ead8e4!important;border-radius:11px!important;background:#fff!important}
      #checkoutModal .actions{margin-top:20px!important}
      #checkoutModal .actions .btn{min-height:46px!important;border-radius:12px!important}

      .pepFeeModal{background:rgba(35,20,31,.58)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important}
      #pepFeeModal .pepFeeBox{width:min(620px,calc(100vw - 28px))!important;max-height:88vh!important;padding:0!important;overflow:auto!important;border:1px solid #f0d5e5!important;border-radius:26px!important;background:#fff!important;box-shadow:0 30px 90px rgba(60,25,55,.25)!important}
      #pepFeeModal .pepFeeBox>h2{padding:25px 30px 18px!important;margin:0!important;background:linear-gradient(135deg,#fff0f8,#fff 62%,#f6efff)!important;border-bottom:1px solid #f0dce9!important;font-size:27px!important}
      #pepFeeModal .pepFeeBox>*:not(h2){margin-left:30px;margin-right:30px}
      #pepFeeModal .pepFeeBox .pepFeeNotice{margin-top:18px!important}
      #pepFeeModal .pepFeeActions{padding-bottom:26px!important}
      #pepFeeModal .pepFeeBtn{border-radius:12px!important;min-height:44px!important;background:linear-gradient(135deg,#e12c91,#c41f7d)!important}
      #pepFeeModal .pepFeeBtn.secondary{background:#fff!important;color:#3e3039!important;border:1px solid #ead8e4!important}
      #pepVerifyModal .pepFeeBox,#pepInfoModal .pepFeeBox{width:min(560px,calc(100vw - 28px))!important;border-radius:26px!important;padding:0!important;overflow:hidden!important;border:1px solid #f0d5e5!important;box-shadow:0 30px 90px rgba(60,25,55,.25)!important}
      #pepVerifyModal .pepFeeBox h2,#pepInfoModal .pepFeeBox h2{padding:25px 30px 18px!important;margin:0!important;background:linear-gradient(135deg,#fff0f8,#fff 62%,#f6efff)!important;border-bottom:1px solid #f0dce9!important;font-size:27px!important}
      #pepVerifyModal .pepFeeBox>*:not(h2),#pepInfoModal .pepFeeBox>*:not(h2){margin-left:30px;margin-right:30px}
      #pepVerifyModal .pepFeeActions,#pepInfoModal .pepFeeActions{padding-bottom:26px!important}

      #pepSiteNoticeModal{position:fixed!important;inset:0!important;background:rgba(35,20,31,.60)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;z-index:100000!important}
      #pepSiteNoticeModal.open{display:flex!important}
      .pepSiteNoticeCard{width:min(620px,calc(100vw - 28px))!important;max-height:86vh!important;overflow:auto!important;background:linear-gradient(145deg,#fff,#fff5fa 60%,#f6efff)!important;border:1px solid rgba(215,43,145,.18)!important;border-radius:27px!important;padding:30px!important;box-shadow:0 30px 100px rgba(60,25,55,.28)!important;position:relative!important}
      .pepSiteNoticeClose{position:absolute!important;right:17px!important;top:17px!important;border:1px solid #ecd9e5!important;background:#fff!important;color:#4b3c45!important;width:38px!important;height:38px!important;border-radius:12px!important;font-size:19px!important;cursor:pointer!important}
      .pepSiteNoticeKicker{font-size:10px!important;font-weight:950!important;letter-spacing:.16em!important;color:#d7288d!important;text-transform:uppercase!important}
      .pepSiteNoticeCard h2{font-size:29px!important;line-height:1.1!important;margin:8px 48px 12px 0!important;color:#271e26!important;letter-spacing:-.6px!important}
      .pepSiteNoticeMessage{font-size:13px!important;color:#6f6570!important;line-height:1.7!important;white-space:pre-wrap!important}
      .pepSiteNoticeActions{display:flex!important;gap:9px!important;flex-wrap:wrap!important;margin-top:22px!important}
      .pepSiteNoticeActions button,.pepSiteNoticeActions a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;padding:10px 16px!important;border-radius:12px!important;font-weight:900!important;text-decoration:none!important;cursor:pointer!important;border:1px solid #ead8e4!important;background:#fff!important;color:#3e3039!important}
      .pepSiteNoticeActions .primary{border:0!important;background:linear-gradient(135deg,#e12c91,#c41f7d)!important;color:#fff!important}
      .pepSiteNoticeCard.type-WARNING,.pepSiteNoticeCard.type-URGENT{background:linear-gradient(145deg,#fff,#fff3f3 58%,#fff9e7)!important}

      @media(max-width:760px){#productGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:560px){
        #productGrid{grid-template-columns:1fr!important}
        #productGrid .variantList{max-height:none!important;overflow:visible!important}
        #productGrid .variantRow{grid-template-columns:minmax(52px,1fr) 68px auto!important}
        #productGrid .qty{width:68px!important}
        #cartModal .sectionHead{padding:20px!important}
        #cartItems{padding:14px 20px 0!important}
        #cartModal>.modalbox>.row{margin-left:20px!important;margin-right:20px!important}
        #cartModal>.modalbox>.actions{padding-left:20px!important;padding-right:20px!important;padding-bottom:20px!important}
        #checkoutModal .pepCheckoutHead{padding:21px 20px 18px!important}
        #checkoutModal .pepCheckoutBody{padding:18px 20px 22px!important}
        #pepFeeModal .pepFeeBox>h2,#pepVerifyModal .pepFeeBox h2,#pepInfoModal .pepFeeBox h2{padding:21px 20px 17px!important}
        #pepFeeModal .pepFeeBox>*:not(h2),#pepVerifyModal .pepFeeBox>*:not(h2),#pepInfoModal .pepFeeBox>*:not(h2){margin-left:20px!important;margin-right:20px!important}
        .pepSiteNoticeCard{padding:23px!important;border-radius:22px!important}
        .pepSiteNoticeCard h2{font-size:25px!important}
      }
    `;document.head.appendChild(s);
  }

  async function repairProducts(){
    const s=S();if(!s)return;
    let gb=null;try{if(typeof currentGB!=='undefined')gb=currentGB}catch(e){}
    if(!gb||!gb.gb_number)return;
    const key=gb.gb_number;let existing=[];try{if(typeof products!=='undefined'&&Array.isArray(products))existing=products}catch(e){}
    if(loadedKey===key&&existing.length)return;
    try{
      const catRes=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);if(catRes.error)throw catRes.error;
      const cats=(catRes.data||[]).map(x=>x.category_name).filter(Boolean);
      if(!cats.length){try{products=[]}catch(e){};window.products=[];if(typeof renderProducts==='function')renderProducts();loadedKey=key;return;}
      const pRes=await s.from('products').select('product_id,product_name,category,description,image_url,active').eq('active',true).in('category',cats).order('product_name');if(pRes.error)throw pRes.error;
      const ids=(pRes.data||[]).map(p=>p.product_id);let variants=[];
      if(ids.length){const vRes=await s.from('product_variants').select('variant_id,product_id,strength,price,active').eq('active',true).in('product_id',ids).order('strength');if(vRes.error)throw vRes.error;variants=vRes.data||[];}
      let mins=[];if(ids.length&&variants.length){const mRes=await s.from('gb_minimum_quantities').select('variant_id,minimum_qty').eq('gb_number',gb.gb_number).in('variant_id',variants.map(v=>v.variant_id));if(!mRes.error)mins=mRes.data||[];}
      const minMap={};mins.forEach(m=>{minMap[m.variant_id]=Math.max(1,Number(m.minimum_qty||1))});
      const byProduct={};variants.forEach(v=>{v.minimum_qty=minMap[v.variant_id]||1;(byProduct[v.product_id]??=[]).push(v)});
      const merged=(pRes.data||[]).map(p=>({...p,product_variants:byProduct[p.product_id]||[]})).filter(p=>p.product_variants.length);
      try{products=merged}catch(e){window.products=merged}window.products=merged;loadedKey=key;if(typeof renderProducts==='function')renderProducts();
    }catch(e){console.error('PEPMOSA product loader',e)}
  }

  function compactRender(){
    const grid=$('productGrid');if(!grid)return;let ps=[];try{ps=window.products||products||[]}catch(e){}
    const q=($('search')?.value||'').toLowerCase().trim();const filtered=ps.filter(p=>`${p.product_name||''} ${p.category||''} ${p.description||''} ${(p.product_variants||[]).map(v=>v.strength||'').join(' ')}`.toLowerCase().includes(q));
    if(!filtered.length){grid.innerHTML='<div class="card"><div style="text-align:center;padding:35px"><div style="font-size:34px;margin-bottom:8px">🛍️</div><b>No products available yet.</b><p class="muted">'+esc(currentGB?'No products are available in the opened Group Buy categories.':'There is no open Group Buy at the moment.')+'</p></div></div>';return;}
    grid.innerHTML=filtered.map(p=>{const variants=(p.product_variants||[]).filter(v=>v.active!==false);return `<article class="card"><div class="productImg">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.product_name)}" loading="lazy">`:esc(p.product_name)}</div><h3>${esc(p.product_name)}</h3>${p.description?`<p class="muted">${esc(p.description)}</p>`:''}<div class="variantList">${variants.map(v=>{const min=Math.max(1,Number(v.minimum_qty||1));return `<div><div class="variantRow"><div class="variantMeta"><div class="variantStrength">${esc(v.strength)}</div><div class="variantPrice">${peso(v.price)}</div></div><input class="qty" type="number" min="${min}" value="${min}" id="qty-${esc(v.variant_id)}" aria-label="Quantity for ${esc(v.strength)}"><button class="btn primary" onclick="addToCart('${esc(p.product_id)}','${esc(v.variant_id)}')">ADD</button></div><div class="minBadge">Minimum: ${min} pc</div></div>`}).join('')}</div></article>`}).join('');
  }

  function ensureSiteNoticeUI(){
    if($('pepSiteNoticeModal'))return;
    const d=document.createElement('div');d.id='pepSiteNoticeModal';d.innerHTML=`<div class="pepSiteNoticeCard"><button class="pepSiteNoticeClose" aria-label="Close">×</button><div class="pepSiteNoticeKicker">SITE NOTICE</div><h2 id="pepSiteNoticeTitle"></h2><div id="pepSiteNoticeMessage" class="pepSiteNoticeMessage"></div><div id="pepSiteNoticeActions" class="pepSiteNoticeActions"></div></div>`;
    d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('open')});document.body.appendChild(d);d.querySelector('.pepSiteNoticeClose').onclick=()=>d.classList.remove('open');
  }

  async function loadSiteNotice(){
    if(noticeShown)return;const s=S();if(!s)return;
    try{
      const r=await s.from('site_notices').select('notice_id,title,message,notice_type,button_text,button_url,active,starts_at,ends_at,created_at').eq('active',true).order('created_at',{ascending:false}).limit(10);if(r.error)throw r.error;
      const now=Date.now();const notice=(r.data||[]).find(n=>(!n.starts_at||new Date(n.starts_at).getTime()<=now)&&(!n.ends_at||new Date(n.ends_at).getTime()>=now));if(!notice)return;
      const key='pepmosa_site_notice_seen_'+notice.notice_id;if(sessionStorage.getItem(key))return;ensureSiteNoticeUI();const modal=$('pepSiteNoticeModal'),card=modal.querySelector('.pepSiteNoticeCard');
      card.className='pepSiteNoticeCard type-'+(notice.notice_type||'INFO');$('pepSiteNoticeTitle').textContent=notice.title||'Site Notice';$('pepSiteNoticeMessage').textContent=notice.message||'';const actions=$('pepSiteNoticeActions');actions.innerHTML='';
      if(notice.button_text){if(notice.button_url){const a=document.createElement('a');a.className='primary';a.href=notice.button_url;a.target='_blank';a.rel='noopener';a.textContent=notice.button_text;actions.appendChild(a)}else{const b=document.createElement('button');b.className='primary';b.textContent=notice.button_text;b.onclick=()=>modal.classList.remove('open');actions.appendChild(b)}}
      const close=document.createElement('button');close.textContent='CLOSE';close.onclick=()=>modal.classList.remove('open');actions.appendChild(close);sessionStorage.setItem(key,'1');noticeShown=true;setTimeout(()=>modal.classList.add('open'),350);
    }catch(e){console.warn('PEPMOSA site notice',e)}
  }

  function enhanceCheckout(){const modal=$('checkoutModal'),box=modal?.querySelector('.modalbox');if(!modal||!box||box.dataset.pepCheckout==='1')return;const msg=box.querySelector('#checkoutMsg'),grid=box.querySelector('.formGrid'),actions=box.querySelector('.actions');if(!grid)return;const head=document.createElement('div');head.className='pepCheckoutHead';head.innerHTML='<div class="pepCheckoutKicker">PEPMOSA • CHECKOUT</div><h2>Complete Your Order</h2><p>Please review your details carefully before submitting your order.</p>';const body=document.createElement('div');body.className='pepCheckoutBody';const info=document.createElement('div');info.className='pepCheckoutInfo';info.innerHTML='<div class="pepCheckoutIcon">✓</div><div><b>Your cart is ready</b><span>Enter your contact and delivery details below.</span></div>';box.innerHTML='';box.appendChild(head);box.appendChild(body);body.appendChild(info);if(msg)body.appendChild(msg);body.appendChild(grid);if(actions)body.appendChild(actions);box.dataset.pepCheckout='1'}
  function enhanceFee(){const modal=$('pepFeeModal'),box=modal?.querySelector('.pepFeeBox');if(!modal||!box)return;let gb=null;try{if(typeof currentGB!=='undefined')gb=currentGB}catch(e){}if(!gb)return;const qr=gb.admin_fee_qr_url,fee=gb.admin_fee,sum=box.querySelector('#pepFeeGb');if(sum){sum.classList.add('pepGBSummary');sum.innerHTML='<div><div class="label">GROUP BUY</div><div class="name">'+esc(gb.customer_facing_name||gb.gb_number)+'</div></div><div><div class="label">ADMIN FEE</div><div class="fee">'+peso(fee)+'</div></div>'}const q=box.querySelector('.pepQrWrap');if(q)q.innerHTML=qr?'<div class="pepQrTitle">SCAN TO PAY ADMIN FEE</div><img class="pepQrImage" src="'+esc(qr)+'" alt="Admin Fee QR Code">':'<div class="pepQrTitle">ADMIN FEE PAYMENT</div><div class="pepQrMissing">QR code is not available yet. Please contact admin.</div>'}

  function watch(){
    styles();ensureSiteNoticeUI();repairProducts();enhanceCheckout();enhanceFee();
    if(typeof window.renderProducts==='function'&&!window.renderProducts.__pepCompact){const wrapped=function(){compactRender()};wrapped.__pepCompact=true;window.renderProducts=wrapped;try{compactRender()}catch(e){}}
    if(!noticeShown&&S())loadSiteNotice();setTimeout(watch,900);
  }
  watch();
})();
