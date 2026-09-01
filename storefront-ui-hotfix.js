/* PEPMOSA storefront hotfix: avoid ambiguous Supabase product relationships + premium payment UI */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let loadedKey='';

  function styles(){
    if($('pepPremiumModalStyles'))return;
    const s=document.createElement('style');s.id='pepPremiumModalStyles';s.textContent=`
      #pepFeeModal .pepGBSummary .fee{color:#d7288d!important}
      #pepFeeModal .pepFeeBox{width:min(620px,calc(100vw - 28px));padding:0!important;overflow:hidden;border:1px solid #f0d5e5!important;border-radius:26px!important;background:#fff!important;box-shadow:0 30px 90px rgba(88,38,76,.24)!important}
      #pepFeeModal .pepFeeHeader{padding:27px 30px 22px!important;background:linear-gradient(135deg,#fff0f8 0%,#fff 58%,#f5efff 100%)!important;border-bottom:1px solid #f0dce9!important;position:relative!important}
      #pepFeeModal .pepFeeHeaderKicker{color:#d7288d!important;font-size:10px!important;font-weight:900!important;letter-spacing:.18em!important;text-transform:uppercase!important}
      #pepFeeModal .pepFeeHeader h2{font-size:29px!important;margin:7px 0 0!important;color:#241b24!important;letter-spacing:-.8px!important}
      #pepFeeModal .pepFeeHeader p{font-size:13px!important;color:#7d6f79!important;margin:8px 42px 0 0!important;line-height:1.5!important}
      #pepFeeModal .pepFeeClose{right:20px!important;top:20px!important;width:38px!important;height:38px!important;border-radius:12px!important;border:1px solid #ecd8e5!important;background:#fff!important;color:#5a4b56!important;font-size:21px!important}
      #pepFeeModal .pepFeeBody{padding:22px 30px 30px!important}
      #pepFeeModal .pepGBSummary{padding:17px 18px!important;border-radius:18px!important;background:#fff6fb!important;border:1px solid #f1dce8!important}
      #pepFeeModal .pepGBSummary .label{color:#a45b83!important;font-size:9px!important;letter-spacing:.12em!important}
      #pepFeeModal .pepGBSummary .name{font-size:18px!important;font-weight:900!important}
      #pepFeeModal .pepGBSummary .fee{font-size:20px!important;font-weight:950!important;color:#d7288d!important}
      #pepFeeModal .pepQrWrap{padding:18px!important;border-radius:20px!important;background:linear-gradient(180deg,#fffafd,#fff)!important;border:1px solid #eadde7!important;box-shadow:0 8px 25px rgba(100,50,90,.06)!important}
      #pepFeeModal .pepQrTitle{color:#4b3b47!important;font-size:10px!important;letter-spacing:.14em!important;margin-bottom:12px!important}
      #pepFeeModal .pepQrImage{width:min(270px,70vw)!important;max-height:270px!important;border-radius:14px!important;border:8px solid #fff!important;box-shadow:0 8px 22px rgba(60,30,55,.10)!important}
      #pepFeeModal .pepFeeField label{color:#392d35!important;font-size:10px!important;letter-spacing:.04em!important}
      #pepFeeModal .pepFeeField input{border-color:#ead8e4!important;border-radius:12px!important}
      #pepFeeModal .pepPaymentHint{color:#8a7c86!important}
      #pepFeeModal .pepFeeActions{display:flex!important;gap:10px!important;margin-top:18px!important}
      #pepFeeModal .pepFeeActions button{border-radius:13px!important;min-height:46px!important}

      #checkoutModal .modalbox{width:min(650px,calc(100vw - 28px));padding:0!important;overflow:hidden;border:1px solid #f0d5e5!important;border-radius:26px!important;background:#fff!important;box-shadow:0 30px 90px rgba(88,38,76,.24)!important}
      #checkoutModal .pepCheckoutHead{padding:27px 30px 22px;background:linear-gradient(135deg,#fff0f8,#fff 58%,#f5efff);border-bottom:1px solid #f0dce9;position:relative}
      #checkoutModal .pepCheckoutKicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:#d7288d;text-transform:uppercase;margin-bottom:7px}
      #checkoutModal .pepCheckoutHead h2{margin:0!important;font-size:29px!important;letter-spacing:-.8px;color:#241b24!important}
      #checkoutModal .pepCheckoutHead p{margin:8px 0 0;color:#7d6f79;font-size:13px;line-height:1.5}
      #checkoutModal .pepCheckoutBody{padding:23px 30px 30px}
      #checkoutModal .pepCheckoutInfo{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid #f1dce8;background:#fff6fb;border-radius:17px;margin-bottom:19px}
      #checkoutModal .pepCheckoutIcon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#d7288d;color:#fff;font-weight:900}
      #checkoutModal .pepCheckoutInfo b{font-size:13px;color:#322630}.pepCheckoutInfo span{display:block;font-size:11px;color:#847681;margin-top:2px}
      #checkoutModal .formGrid{gap:14px!important}
      #checkoutModal .field label{font-size:10px!important;font-weight:900!important;letter-spacing:.04em;color:#392d35!important}
      #checkoutModal .field input,#checkoutModal .field textarea{border:1px solid #ead8e4!important;border-radius:12px!important;background:#fff!important;min-height:44px;box-sizing:border-box}
      #checkoutModal .field textarea{padding:12px!important}
      #checkoutModal .actions{display:flex!important;gap:10px!important;margin-top:20px!important}
      #checkoutModal .actions .btn.primary{background:linear-gradient(135deg,#e32b91,#c71f80)!important;color:#fff!important;border:0!important;box-shadow:0 9px 22px rgba(215,43,145,.20)!important;border-radius:13px!important;min-height:46px!important}
      #checkoutModal .actions .btn.secondary{border:1px solid #ead8e4!important;background:#fff!important;color:#3e3039!important;border-radius:13px!important;min-height:46px!important}
      @media(max-width:560px){#pepFeeModal .pepFeeHeader,#checkoutModal .pepCheckoutHead{padding:22px 20px 18px!important}#pepFeeModal .pepFeeBody,#checkoutModal .pepCheckoutBody{padding:18px 20px 22px!important}#checkoutModal .formGrid{grid-template-columns:1fr!important}.pepFeeActions,#checkoutModal .actions{flex-direction:column!important}}
    `;document.head.appendChild(s);
  }

  async function repairProducts(){
    const s=window.sb||window.__sb;
    if(!s)return;
    let gb=null;
    try{if(typeof currentGB!=='undefined')gb=currentGB}catch(e){}
    if(!gb||!gb.gb_number)return;
    const key=gb.gb_number;
    let existing=[];try{if(typeof products!=='undefined'&&Array.isArray(products))existing=products}catch(e){}
    if(loadedKey===key&&existing.length)return;
    try{
      const catRes=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);
      if(catRes.error)throw catRes.error;
      const cats=(catRes.data||[]).map(x=>x.category_name).filter(Boolean);
      if(!cats.length){try{products=[]}catch(e){};if(typeof renderProducts==='function')renderProducts();loadedKey=key;return;}
      const pRes=await s.from('products').select('product_id,product_name,category,description,image_url,active').eq('active',true).in('category',cats).order('product_name');
      if(pRes.error)throw pRes.error;
      const ids=(pRes.data||[]).map(p=>p.product_id);
      let variants=[];
      if(ids.length){
        const vRes=await s.from('product_variants').select('variant_id,product_id,strength,price,active').eq('active',true).in('product_id',ids).order('strength');
        if(vRes.error)throw vRes.error;
        variants=vRes.data||[];
      }
      const byProduct={};variants.forEach(v=>{(byProduct[v.product_id]??=[]).push(v)});
      const merged=(pRes.data||[]).map(p=>({...p,product_variants:byProduct[p.product_id]||[]})).filter(p=>p.product_variants.length);
      try{products=merged}catch(e){window.products=merged}
      loadedKey=key;
      if(typeof renderProducts==='function')renderProducts();
    }catch(e){console.error('PEPMOSA product loader',e)}
  }

  function enhanceCheckout(){
    const modal=$('checkoutModal'),box=modal?.querySelector('.modalbox');
    if(!modal||!box||box.dataset.pepCheckout==='1')return;
    const msg=box.querySelector('#checkoutMsg');
    const grid=box.querySelector('.formGrid');
    const actions=box.querySelector('.actions');
    if(!grid)return;
    const head=document.createElement('div');head.className='pepCheckoutHead';head.innerHTML='<div class="pepCheckoutKicker">PEPMOSA • CHECKOUT</div><h2>Complete Your Order</h2><p>Please review your details carefully before submitting your order.</p>';
    const body=document.createElement('div');body.className='pepCheckoutBody';
    const info=document.createElement('div');info.className='pepCheckoutInfo';info.innerHTML='<div class="pepCheckoutIcon">✓</div><div><b>Your cart is ready</b><span>Enter your contact and delivery details below.</span></div>';
    box.innerHTML='';box.appendChild(head);box.appendChild(body);body.appendChild(info);if(msg)body.appendChild(msg);body.appendChild(grid);if(actions)body.appendChild(actions);
    box.dataset.pepCheckout='1';
  }

  function enhanceFee(){
    const modal=$('pepFeeModal'),box=modal?.querySelector('.pepFeeBox');
    if(!modal||!box)return;
    let gb=null;try{if(typeof currentGB!=='undefined')gb=currentGB}catch(e){}
    if(!gb)return;
    const qr=gb.admin_fee_qr_url,fee=gb.admin_fee;
    const sum=box.querySelector('#pepFeeGb');
    if(sum){sum.classList.add('pepGBSummary');sum.innerHTML='<div><div class="label">GROUP BUY</div><div class="name">'+esc(gb.customer_facing_name||gb.gb_number)+'</div></div><div><div class="label">ADMIN FEE</div><div class="fee">'+peso(fee)+'</div></div>'}
    const q=box.querySelector('.pepQrWrap');
    if(q){q.innerHTML=qr?'<div class="pepQrTitle">SCAN TO PAY ADMIN FEE</div><img class="pepQrImage" src="'+esc(qr)+'" alt="Admin Fee QR Code">':'<div class="pepQrTitle">ADMIN FEE PAYMENT</div><div class="pepQrMissing">QR code is not available yet. Please contact admin.</div>'}
  }

  function watch(){styles();repairProducts();enhanceCheckout();enhanceFee();setTimeout(watch,700)}
  watch();
})();
