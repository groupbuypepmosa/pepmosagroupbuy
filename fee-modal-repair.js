/* PEPMOSA Group Buy Access modal polish + Admin Fee QR repair. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let lastUrl='';
  function injectStyles(){if($('pepFeeRepairStyles'))return;const s=document.createElement('style');s.id='pepFeeRepairStyles';s.textContent=`
    #pepFeeModal .pepFeeBox{width:min(590px,100%);padding:0;overflow:hidden;border:1px solid rgba(215,43,145,.14);background:#fff;box-shadow:0 28px 100px rgba(65,25,55,.30)}
    #pepFeeModal .pepFeeBox h2{font-size:28px;line-height:1.1;margin:0;color:#241b24}
    #pepFeeModal .pepFeeHeader{padding:25px 27px 20px;background:linear-gradient(135deg,#fff3fa,#fff 58%,#f5efff);border-bottom:1px solid #f0dce9;position:relative}
    #pepFeeModal .pepFeeHeaderKicker{font-size:10px;font-weight:950;letter-spacing:.16em;color:#d7288d;text-transform:uppercase;margin-bottom:7px}
    #pepFeeModal .pepFeeHeader p{margin:7px 0 0;color:#766b75;font-size:13px}
    #pepFeeModal .pepFeeClose{position:absolute;right:18px;top:17px;width:36px;height:36px;border:1px solid #ead7e3;background:#fff;border-radius:50%;font-size:20px;cursor:pointer;color:#4a3d47}
    #pepFeeModal .pepFeeBody{padding:22px 27px 27px}
    #pepFeeModal .pepGBSummary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;background:#fff0f8;border:1px solid #f2d7e7;margin-bottom:18px}
    #pepFeeModal .pepGBSummary .label{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#a54c7d}.pepGBSummary .name{font-size:18px;font-weight:950;color:#241b24;margin-top:3px}.pepGBSummary .fee{font-size:18px;font-weight:950;color:#168044;white-space:nowrap}
    #pepFeeModal .pepQrWrap{border:1px solid #ecdce6;background:#fffafd;border-radius:18px;padding:15px;text-align:center;margin-bottom:19px}.pepQrTitle{font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#4a3d47;margin-bottom:11px}.pepQrImage{width:min(245px,72vw);height:auto;max-height:245px;object-fit:contain;border-radius:12px;background:#fff;display:block;margin:0 auto}.pepQrMissing{padding:22px 10px;color:#8a7c86;font-size:13px}
    #pepFeeModal .pepFeeField{margin-top:13px}.pepFeeField label{font-size:11px;font-weight:950}.pepPaymentHint{font-size:12px;color:#786d77;margin-top:7px;line-height:1.5}
    @media(max-width:560px){#pepFeeModal .pepFeeHeader{padding:22px 20px 18px}#pepFeeModal .pepFeeBody{padding:18px 20px 22px}#pepFeeModal .pepGBSummary{align-items:flex-start;flex-direction:column}.pepGBSummary .fee{font-size:17px}}
  `;document.head.appendChild(s)}
  async function getOpenGB(){const s=window.sb||window.__sb;if(!s)return null;try{const r=await s.from('group_buys').select('gb_number,customer_facing_name,admin_fee,admin_fee_qr_url').eq('status','OPEN').order('created_at',{ascending:false}).limit(1).maybeSingle();return r.error?null:r.data}catch(e){return null}}
  async function enhance(){
    const modal=$('pepFeeModal');const box=modal?.querySelector('.pepFeeBox');if(!modal||!box)return;
    const gb=await getOpenGB();if(!gb||!gb.admin_fee_qr_url)return;
    if(lastUrl===gb.admin_fee_qr_url&&modal.dataset.pepQrReady==='1')return;
    lastUrl=gb.admin_fee_qr_url;
    // Keep the original form and its existing submit handler. Only enhance its presentation.
    if(!box.querySelector('.pepFeeHeader')){
      const oldH=box.querySelector('h2');
      const oldGB=box.querySelector('#pepFeeGb');
      const oldActions=box.querySelector('.pepFeeActions');
      const header=document.createElement('div');header.className='pepFeeHeader';header.innerHTML=`<button class="pepFeeClose" type="button" aria-label="Close">×</button><div class="pepFeeHeaderKicker">GROUP BUY ACCESS</div><h2>Join this Group Buy</h2><p>Pay the admin fee below, then upload your payment proof for approval.</p>`;
      const body=document.createElement('div');body.className='pepFeeBody';
      if(oldGB){oldGB.className='pepGBSummary';oldGB.innerHTML=`<div><div class="label">GROUP BUY</div><div class="name">${esc(gb.customer_facing_name||gb.gb_number)}</div></div><div><div class="label">ADMIN FEE</div><div class="fee">${peso(gb.admin_fee)}</div></div>`;body.appendChild(oldGB)}
      const qr=document.createElement('div');qr.className='pepQrWrap';qr.innerHTML=`<div class="pepQrTitle">SCAN TO PAY ADMIN FEE</div><img class="pepQrImage" src="${esc(gb.admin_fee_qr_url)}" alt="Admin Fee QR Code">`;body.appendChild(qr);
      const children=[...box.children];children.forEach(ch=>{if(ch!==oldGB&&ch!==oldActions&&ch!==oldH)body.appendChild(ch)});if(oldActions)body.appendChild(oldActions);
      box.innerHTML='';box.appendChild(header);box.appendChild(body);modal.dataset.pepQrReady='1';header.querySelector('.pepFeeClose').onclick=()=>modal.classList.remove('open');
    }
  }
  function watch(){injectStyles();enhance();setTimeout(watch,1000)}
  watch();
})();
