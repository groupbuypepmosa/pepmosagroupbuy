/* PEPMOSA Group Buy Access modal polish + Admin Fee QR repair. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  let lastGB='';

  function injectStyles(){
    if($('pepFeeRepairStyles'))return;
    const s=document.createElement('style');s.id='pepFeeRepairStyles';s.textContent=`
      #pepFeeModal .pepFeeBox{width:min(590px,100%);padding:0;overflow:hidden;border:1px solid rgba(215,43,145,.14);background:#fff;box-shadow:0 28px 100px rgba(65,25,55,.30)}
      .pepFeeHeader{padding:25px 27px 20px;background:linear-gradient(135deg,#fff3fa 0%,#fff 58%,#f5efff 100%);border-bottom:1px solid #f0dce9;position:relative}
      .pepFeeHeaderKicker{font-size:10px;font-weight:950;letter-spacing:.16em;color:#d7288d;text-transform:uppercase;margin-bottom:7px}
      .pepFeeHeader h2{font-size:28px;line-height:1.1;margin:0;color:#241b24}.pepFeeHeader p{margin:7px 0 0;color:#766b75;font-size:13px}
      .pepFeeClose{position:absolute;right:18px;top:17px;width:36px;height:36px;border:1px solid #ead7e3;background:#fff;border-radius:50%;font-size:20px;cursor:pointer;color:#4a3d47}
      .pepFeeBody{padding:22px 27px 27px}
      .pepGBSummary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;background:#fff0f8;border:1px solid #f2d7e7;margin-bottom:19px}
      .pepGBSummary .label{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#a54c7d}.pepGBSummary .name{font-size:18px;font-weight:950;color:#241b24;margin-top:3px}.pepGBSummary .fee{font-size:18px;font-weight:950;color:#168044;white-space:nowrap}
      .pepQrWrap{border:1px solid #ecdce6;background:#fffafd;border-radius:18px;padding:15px;text-align:center;margin:0 0 19px}.pepQrTitle{font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#4a3d47;margin-bottom:11px}.pepQrImage{width:min(245px,72vw);height:auto;max-height:245px;object-fit:contain;border-radius:12px;background:#fff;display:block;margin:0 auto}.pepQrMissing{padding:25px 10px;color:#8a7c86;font-size:13px}
      .pepFeeFields{display:grid;grid-template-columns:1fr 1fr;gap:13px}.pepFeeField.full{grid-column:1/-1}.pepFeeField label{color:#342831;font-size:11px;font-weight:950}.pepFeeField input{margin-top:6px}
      .pepPaymentHint{font-size:12px;color:#786d77;margin-top:7px;line-height:1.5}.pepFeeActions{padding-top:3px}
      @media(max-width:560px){.pepFeeHeader{padding:22px 20px 18px}.pepFeeBody{padding:18px 20px 22px}.pepFeeFields{grid-template-columns:1fr}.pepFeeField.full{grid-column:auto}.pepGBSummary{align-items:flex-start;flex-direction:column}.pepGBSummary .fee{font-size:17px}}
    `;document.head.appendChild(s)
  }

  function render(){
    const modal=$('pepFeeModal');
    const gb=window.gb;
    if(!modal||!gb)return;
    if(lastGB===gb.gb_number && modal.dataset.pepPolished==='1')return;
    lastGB=gb.gb_number;
    const box=modal.querySelector('.pepFeeBox');if(!box)return;
    box.innerHTML=`
      <div class="pepFeeHeader"><button class="pepFeeClose" type="button" aria-label="Close">×</button><div class="pepFeeHeaderKicker">GROUP BUY ACCESS</div><h2>Join this Group Buy</h2><p>Pay the admin fee below, then upload your payment proof for approval.</p></div>
      <div class="pepFeeBody">
        <div class="pepGBSummary"><div><div class="label">Group Buy</div><div class="name">${esc(gb.customer_facing_name||gb.gb_number)}</div></div><div><div class="label">Admin Fee</div><div class="fee">${peso(gb.admin_fee)}</div></div></div>
        <div class="pepQrWrap"><div class="pepQrTitle">Scan to Pay Admin Fee</div>${gb.admin_fee_qr_url?`<img class="pepQrImage" src="${esc(gb.admin_fee_qr_url)}" alt="Admin Fee QR Code">`:'<div class="pepQrMissing">Admin fee QR code is not available yet. Please contact admin.</div>'}</div>
        <div class="pepFeeFields">
          <div class="pepFeeField full"><label>FULL NAME *</label><input id="pepFeeName" placeholder="Your full name"></div>
          <div class="pepFeeField"><label>TELEGRAM NAME *</label><input id="pepFeeTelegram" placeholder="@telegramname"></div>
          <div class="pepFeeField"><label>MOBILE NUMBER *</label><input id="pepFeePhone" placeholder="09xxxxxxxxx" inputmode="tel"></div>
          <div class="pepFeeField full"><label>PAYMENT PROOF *</label><input id="pepFeeProof" type="file" accept="image/*,.pdf"><div class="pepPaymentHint">Upload your payment receipt or screenshot. Maximum file size: 5MB.</div></div>
        </div>
        <div id="pepFeeMsg"></div>
        <div class="pepFeeActions"><button id="pepFeeSubmit" class="pepFeeBtn">I HAVE PAID</button><button class="pepFeeBtn secondary" type="button" id="pepFeeCancel">CANCEL</button></div>
      </div>`;
    modal.dataset.pepPolished='1';
    $('pepFeeClose').onclick=()=>modal.classList.remove('open');$('pepFeeCancel').onclick=()=>modal.classList.remove('open');
    if(typeof localStorage!=='undefined'){
      $('pepFeeName').value=localStorage.getItem('pepmosa_customer_name')||'';
      $('pepFeeTelegram').value=localStorage.getItem('pepmosa_telegram')||'';
      $('pepFeePhone').value=localStorage.getItem('pepmosa_phone')||'';
    }
    // Preserve the stable storefront submit handler.
    if(typeof window.submitFee==='function')$('pepFeeSubmit').onclick=window.submitFee;
  }

  function watch(){injectStyles();render();setTimeout(watch,400)}
  watch();
})();
