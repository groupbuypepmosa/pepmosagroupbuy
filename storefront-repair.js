/* PEPMOSA storefront stable repair layer.
   Admin-approved fee -> explicit email verification -> ordering + Site Notice popup. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const peso=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const S=()=>window.sb||window.__sb;
  let gb=null,products=[],minimums=[],categoryMinimums=[],feePayment=null,verifiedEmail=localStorage.getItem('pepmosa_verified_email')||'',lastFeeStatus=null,noticeLoaded=false;

  function styles(){if($('pepStableStoreStyles'))return;const s=document.createElement('style');s.id='pepStableStoreStyles';s.textContent=`
    #productGrid .pepStoreCard{padding:0!important;overflow:hidden;border-radius:18px!important}
    #productGrid .pepStoreCard .productImg{height:145px!important;background:#fff7fb!important;display:flex!important;align-items:center!important;justify-content:center!important}
    #productGrid .pepStoreCard .productImg img{width:100%!important;height:100%!important;object-fit:contain!important}
    #productGrid .pepStoreBody{padding:13px 14px!important}
    #productGrid .pepStoreBody h3{font-size:19px!important;margin:0 0 6px!important}
    #productGrid .pepStoreBottom{margin-top:10px!important;padding-top:10px!important}
    #productGrid .pepSelectVariant{position:relative;z-index:2!important}
    @media(max-width:620px){#productGrid{gap:12px!important}#productGrid .pepStoreCard .productImg{height:135px!important}#productGrid .pepStoreBody>.muted{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;font-size:13px!important}}

    .pepFallbackModal{position:fixed;inset:0;background:rgba(30,15,25,.45);z-index:99999;display:flex;align-items:flex-end;justify-content:center;padding:18px}
    .pepFallbackPanel{position:relative;width:min(520px,100%);background:#fff;border-radius:24px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .pepFallbackClose{position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:30px;line-height:1}
    .pepFallbackPanel h3{margin:0 36px 6px 0}.pepFallbackPanel p{margin:0 0 14px;color:#777}.pepFallbackChoices{display:grid;gap:10px}.pepFallbackVariant{border:1px solid #f0c8da;background:#fff7fb;border-radius:14px;padding:15px;text-align:left;font-weight:800;font-size:15px}
    .pepFeeBtn{border:0;border-radius:14px;padding:13px 20px;font-weight:900;letter-spacing:.02em;cursor:pointer;background:linear-gradient(135deg,#e52b8b,#b93bb6);color:#fff;box-shadow:0 10px 22px rgba(211,43,137,.18)}.pepFeeBtn:hover{transform:translateY(-1px)}.pepFeeBtn.secondary{background:#fff;color:#6b5360;border:1px solid #ead7e3;box-shadow:none}.pepFeeBtn:disabled{opacity:.55;cursor:not-allowed;transform:none}
    .pepFeeModal{position:fixed;inset:0;background:rgba(48,25,40,.62);backdrop-filter:blur(7px);display:none;align-items:center;justify-content:center;padding:18px;z-index:99999}.pepFeeModal.open{display:flex}
    .pepFeeBox{width:min(650px,100%);max-height:92vh;overflow:auto;background:linear-gradient(145deg,#fff,#fff9fc 55%,#fff4fa);border:1px solid rgba(235,177,208,.7);border-radius:30px;padding:0;box-shadow:0 28px 100px rgba(55,18,43,.32)}
    .pepFeeHead{padding:26px 30px 20px;background:linear-gradient(135deg,#ffe7f3,#fff8fc 60%,#f7edff);border-bottom:1px solid #f0d8e5}.pepFeeKicker{font-size:10px;letter-spacing:.18em;font-weight:950;color:#c62c7f;text-transform:uppercase}.pepFeeBox h2{margin:6px 0 0;color:#30222b;font-size:29px}.pepFeeBody{padding:20px 30px 28px}.pepFeeMuted{color:#746a73;font-size:13px;line-height:1.55}.pepFeeField{display:flex;flex-direction:column;gap:7px;margin-top:13px}.pepFeeField label{font-size:10px;font-weight:950;letter-spacing:.07em;text-transform:uppercase;color:#4d3c46}.pepFeeField input{width:100%;box-sizing:border-box;border:1px solid #ead4e1;border-radius:14px;padding:13px 14px;background:#fff;color:#382a33}.pepFeeField input:focus{outline:none;border-color:#dc5c9f;box-shadow:0 0 0 3px rgba(220,92,159,.10)}
    .pepFeeSummary{padding:15px 17px;border-radius:18px;background:linear-gradient(135deg,#fff0f7,#f8efff);border:1px solid #efd8e6;color:#6e3f57}.pepFeeSummary b{color:#2f252b}.pepFeePaymentGrid{display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:center;margin:17px 0;padding:17px;border-radius:20px;background:#fff;border:1px solid #f0dce7}.pepFeeQR{width:190px;height:190px;object-fit:contain;background:#fff;border:7px solid #fff;border-radius:18px;box-shadow:0 8px 26px rgba(110,48,82,.12)}.pepFeeQRPlaceholder{width:190px;height:190px;display:grid;place-items:center;text-align:center;border:2px dashed #e8bdd2;border-radius:18px;color:#9b7183;background:#fff7fb;font-size:12px;padding:12px;box-sizing:border-box}.pepFeePayText h3{margin:0 0 7px;color:#35242d;font-size:18px}.pepFeePayText p{margin:0;color:#7e6b76;font-size:12px;line-height:1.6}.pepFeeAmount{display:inline-block;margin-top:10px;padding:9px 12px;border-radius:11px;background:#fff0f7;color:#b32973;font-weight:950}.pepFeeNotice{padding:13px 15px;border-radius:14px;background:#fff1fa;margin:12px 0}.pepFeeNotice.success{background:#e8f8ef;color:#176e42}.pepFeeNotice.warn{background:#fff7df;color:#805f00}.pepFeeNotice.error{background:#fff0f3;color:#a5253e}.pepFeeActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.pepFeeStatus{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:900}.pepFeeStatus.pending{background:#fff1ce;color:#8b6500}.pepFeeStatus.paid{background:#e6f8ef;color:#177044}.pepFeeStatus.rejected{background:#ffe9ed;color:#b32745}.pepFeeUpload{padding:14px;border:1.5px dashed #e2a8c4;border-radius:16px;background:#fff7fb}.pepFeeUpload input{padding:9px;background:#fff}.pepFeeFileHint{margin-top:8px;font-size:11px;color:#8a7380}
    @media(max-width:600px){.pepFeeBox{border-radius:24px}.pepFeeHead,.pepFeeBody{padding-left:20px;padding-right:20px}.pepFeePaymentGrid{grid-template-columns:1fr;text-align:center}.pepFeeQR,.pepFeeQRPlaceholder{margin:auto}.pepFeeActions .pepFeeBtn{flex:1}.pepFeeBox h2{font-size:25px}}
    #pepSiteNoticeModal{position:fixed;inset:0;background:rgba(27,17,25,.62);display:none;align-items:center;justify-content:center;padding:18px;z-index:100000}.pepSiteNoticeCard{width:min(600px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#fff,#fff4fa 58%,#f7efff);border:1px solid rgba(215,43,145,.16);border-radius:28px;padding:30px;box-shadow:0 30px 100px rgba(80,30,70,.28);position:relative}.pepSiteNoticeClose{position:absolute;right:16px;top:14px;border:0;background:rgba(255,255,255,.8);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer}.pepSiteNoticeKicker{font-size:10px;font-weight:950;letter-spacing:.15em;color:#d72b91;text-transform:uppercase}.pepSiteNoticeCard h2{font-size:30px;line-height:1.1;margin:9px 42px 12px 0}.pepSiteNoticeMessage{color:#6f6570;line-height:1.7;white-space:pre-wrap}.pepSiteNoticeActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}
    .pepSiteNoticeCard.type-WARNING,.pepSiteNoticeCard.type-URGENT{background:linear-gradient(145deg,#fff,#fff2f3 58%,#fff8df)}
    @media(max-width:560px){.pepSiteNoticeCard{padding:24px;border-radius:22px}.pepSiteNoticeCard h2{font-size:25px}}
    #pepInfoModal{background:rgba(48,25,40,.62);backdrop-filter:blur(8px)}
    .pepInfoBox{width:min(560px,100%);text-align:center;padding:34px 30px 30px;background:linear-gradient(145deg,#fff,#fff8fc 58%,#f6efff);border:1px solid #efcee0;border-radius:30px;box-shadow:0 30px 100px rgba(55,18,43,.32)}
    .pepInfoIcon{width:66px;height:66px;margin:0 auto 15px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#e92f91,#b85ad0);color:#fff;font-size:34px;font-weight:950;box-shadow:0 12px 28px rgba(207,42,136,.24)}
    .pepInfoKicker{font-size:9px;font-weight:950;letter-spacing:.20em;color:#ca2e80;text-transform:uppercase}
    .pepInfoBox h2{margin:8px 0 8px;font-size:31px;line-height:1.1;color:#30222b}
    .pepInfoText{max-width:430px;margin:0 auto;color:#776873;font-size:13px;line-height:1.65}
    .pepInfoActions{display:flex;justify-content:center;margin-top:23px}
    .pepInfoActions .pepFeeBtn{min-width:150px;min-height:48px;border-radius:15px}
    @media(max-width:560px){.pepInfoBox{padding:28px 20px 23px;border-radius:25px}.pepInfoBox h2{font-size:27px}.pepInfoText{font-size:12px}}
  `;document.head.appendChild(s)}
  function makeModal(id,html,cls='pepFeeModal'){if($(id))return;const d=document.createElement('div');d.id=id;d.className=cls;d.innerHTML=html;d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('open')});document.body.appendChild(d)}
  function ensureUI(){styles();const status=$('gbStatus');if(status&&!$('pepKitCompletionCard')){const k=document.createElement('section');k.id='pepKitCompletionCard';k.className='notice';k.style.cssText='display:none;margin:14px 0 18px;padding:18px;border-radius:18px;text-align:left';k.innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><span class="status open">KIT COMPLETION</span><b style="font-size:16px">Complete the remaining vials</b></div><div class="muted" style="line-height:1.65"><b>Each mg is tracked separately.</b> Example: <b>15mg</b> and <b>30mg</b> have their own separate 10-vial kits and their own remaining count. Only the specific mg/variants with remaining vials are shown. You may order from <b>1 vial</b> up to the remaining quantity for that exact variant.</div><div class="muted" style="margin-top:8px;font-size:13px">Once a remaining vial is secured, it becomes unavailable to the next buyer.</div>';const grid=$('productGrid');if(grid&&grid.parentNode)grid.parentNode.insertBefore(k,grid);else status.parentNode.insertBefore(k,status.nextSibling)}if(status&&!$('pepFeeCard')){const c=document.createElement('div');c.id='pepFeeCard';c.className='notice';c.style.marginTop='14px';c.innerHTML='<div style="font-weight:900">GROUP BUY ACCESS</div><div id="pepFeeState" class="pepFeeMuted" style="margin:5px 0 10px">Loading…</div><div class="pepFeeActions"><button id="pepFeeAction" class="pepFeeBtn">PAY ADMIN FEE</button><button id="pepVerifyExisting" class="pepFeeBtn secondary">VERIFY EMAIL</button></div>';status.parentNode.insertBefore(c,status.nextSibling);$('pepFeeAction').onclick=feeAction;$('pepVerifyExisting').onclick=openVerify}
    makeModal('pepFeeModal',`<div class="pepFeeBox"><div class="pepFeeHead"><div class="pepFeeKicker">PEPMOSA GROUP BUY</div><h2>Group Buy Access ✦</h2></div><div class="pepFeeBody"><div id="pepFeeGb" class="pepFeeSummary"></div><div id="pepFeePaymentInfo" class="pepFeePaymentGrid"></div><div class="pepFeeField"><label>Email *</label><input id="pepFeeEmail" type="email" placeholder="your@email.com" autocomplete="email"></div><div class="pepFeeField"><label>Full Name *</label><input id="pepFeeName" placeholder="Your full name" autocomplete="name"></div><div class="pepFeeField"><label>Telegram Name *</label><input id="pepFeeTelegram" placeholder="@telegramname"></div><div class="pepFeeField"><label>Mobile Number *</label><input id="pepFeePhone" placeholder="09xxxxxxxxx" inputmode="tel"></div><div class="pepFeeField"><label>Payment Proof *</label><div class="pepFeeUpload"><input id="pepFeeProof" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.jfif,.pdf"><div class="pepFeeFileHint">Upload your receipt or screenshot. JPG, PNG, WEBP, JFIF or PDF • max 5MB.</div></div></div><div id="pepFeeMsg"></div><div class="pepFeeActions"><button id="pepFeeSubmit" class="pepFeeBtn">I HAVE PAID</button><button class="pepFeeBtn secondary" onclick="document.getElementById('pepFeeModal').classList.remove('open')">CANCEL</button></div></div></div>`);
    makeModal('pepVerifyModal',`<div class="pepFeeBox"><div class="pepFeeHead"><div class="pepFeeKicker">PEPMOSA GROUP BUY</div><h2>Check Your Email Access</h2></div><div class="pepFeeBody"><div class="pepFeeMuted">Enter the email you used for your Admin Fee payment. PEPMOSA will check the payment status in the system and unlock ordering immediately once it is approved.</div><div class="pepFeeField"><label>Email *</label><input id="pepVerifyEmail" type="email" placeholder="your@email.com" autocomplete="email"></div><div id="pepVerifyMsg"></div><div class="pepFeeActions"><button id="pepVerifySend" class="pepFeeBtn">CHECK EMAIL</button><button class="pepFeeBtn secondary" onclick="document.getElementById('pepVerifyModal').classList.remove('open')">CLOSE</button></div></div></div>`);
    makeModal('pepInfoModal',`<div class="pepInfoBox"><div class="pepInfoIcon">✓</div><div class="pepInfoKicker">PEPMOSA</div><h2 id="pepInfoTitle">Success</h2><div id="pepInfoText" class="pepInfoText"></div><div class="pepInfoActions"><button id="pepInfoOk" class="pepFeeBtn">DONE</button></div></div>`);
    $('pepFeeSubmit').onclick=submitFee;$('pepVerifySend').onclick=sendVerify;$('pepInfoOk').onclick=()=> $('pepInfoModal').classList.remove('open');
  }
  function info(title,text,onceKey){if(onceKey&&sessionStorage.getItem(onceKey))return; if(onceKey)sessionStorage.setItem(onceKey,'1');$('pepInfoTitle').textContent=title;$('pepInfoText').textContent=text;$('pepInfoOk').textContent='OK';$('pepInfoModal').classList.add('open')}
  async function checkAccessByEmail(email){if(!gb||!S()||!email)return null;const savedId=localStorage.getItem('pepmosa_fee_payment_id')||null;const r=await S().rpc('check_group_buy_access',{p_gb_number:gb.gb_number,p_email:String(email).trim().toLowerCase(),p_payment_id:savedId});if(r.error){console.error('PEPMOSA ACCESS LOOKUP',r.error);return null}const x=Array.isArray(r.data)?r.data[0]:r.data;return x&&x.status?{id:x.payment_id,status:x.status,email:String(email).trim().toLowerCase()}:null}
  async function findFee(){if(!gb||!S())return null;const email=(localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'').trim().toLowerCase();if(!email)return null;return await checkAccessByEmail(email)}
  async function refreshFeeState(showApprovalPopup=false){if(gb?.status==='CLOSED'){const state=$('pepFeeState'),btn=$('pepFeeAction');if(state)state.textContent='Group Buy is closed. Admin Fee payment is unavailable.';if(btn){btn.textContent='GROUP BUY CLOSED';btn.disabled=true;btn.onclick=null}return}const previous=feePayment?.status||lastFeeStatus;feePayment=await findFee();lastFeeStatus=feePayment?.status||null;const state=$('pepFeeState'),btn=$('pepFeeAction');if(!state||!btn)return;if(showApprovalPopup&&previous==='SUBMITTED'&&feePayment?.status==='PAID')info('Admin Fee Approved ✓','Your Admin Fee payment has been approved. Click CHECK EMAIL to unlock ordering.','pepmosa_fee_approval_popup');if(!feePayment){state.textContent=`Admin fee: ${peso(gb?.admin_fee)}. Submit payment proof for approval.`;btn.textContent='PAY ADMIN FEE';btn.disabled=false;btn.onclick=feeAction;return}if(feePayment.status==='PAID'){state.innerHTML='Admin fee <span class="pepFeeStatus paid">APPROVED</span>. You can order using the same paid email.';btn.textContent='READY TO ORDER';btn.disabled=false;btn.onclick=()=>info('Ready to Order','Use the same email that has the approved Admin Fee when checking out.');return}if(feePayment.status==='REJECTED'){state.innerHTML='Previous payment <span class="pepFeeStatus rejected">REJECTED</span>. You may submit a new payment proof.';btn.textContent='SUBMIT AGAIN';btn.disabled=false;btn.onclick=feeAction;return}state.innerHTML='Admin fee <span class="pepFeeStatus pending">PENDING APPROVAL</span>. Please wait for admin approval.';btn.textContent='VIEW PAYMENT';btn.disabled=false;btn.onclick=feeAction}
  function feeAction(){if(!gb||gb.status==='CLOSED')return info('Ordering Closed','This Group Buy is closed. Admin Fee payments are no longer accepted.');if(feePayment?.status==='PAID'){info('Ready to Order','Use the same email that has the approved Admin Fee when checking out.');return}if(feePayment?.status==='SUBMITTED'){info('Payment Pending','Your admin fee payment is waiting for admin approval. You will be able to verify your email after approval.');return}
    const name=gb.customer_facing_name||gb.gb_number,qr=String(gb.admin_fee_qr_url||'').trim();
    $('pepFeeGb').innerHTML=`<b>${esc(name)}</b><br><span class="pepFeeMuted">Pay the admin fee using the QR below, then upload your proof of payment.</span>`;
    $('pepFeePaymentInfo').innerHTML=qr?`<img class="pepFeeQR" src="${esc(qr)}" alt="Admin fee payment QR"><div class="pepFeePayText"><h3>Scan to pay</h3><p>Use the QR code for this Group Buy. After completing the payment, upload a clear receipt or screenshot below.</p><div class="pepFeeAmount">Admin Fee: ${peso(gb.admin_fee)}</div></div>`:`<div class="pepFeeQRPlaceholder">QR code is not available yet.</div><div class="pepFeePayText"><h3>Payment details</h3><p>The admin payment QR has not been uploaded yet. Please contact PEPMOSA before submitting payment proof.</p><div class="pepFeeAmount">Admin Fee: ${peso(gb.admin_fee)}</div></div>`;
    $('pepFeeEmail').value=feePayment?.email||localStorage.getItem('pepmosa_customer_email')||localStorage.getItem('pepmosa_verified_email')||'';$('pepFeeName').value=feePayment?.full_name||localStorage.getItem('pepmosa_customer_name')||'';$('pepFeeTelegram').value=feePayment?.telegram_name||localStorage.getItem('pepmosa_telegram')||'';$('pepFeePhone').value=feePayment?.phone||localStorage.getItem('pepmosa_phone')||'';$('pepFeeProof').value='';$('pepFeeMsg').innerHTML='';$('pepFeeModal').classList.add('open')}
  async function submitFee(){if(!gb||gb.status==='CLOSED'){const msg=$('pepFeeMsg');if(msg)msg.innerHTML='<div class="pepFeeNotice error">This Group Buy is closed. Admin Fee payments are no longer accepted.</div>';return}const email=$('pepFeeEmail').value.trim().toLowerCase(),name=$('pepFeeName').value.trim(),tg=$('pepFeeTelegram').value.trim(),phone=$('pepFeePhone').value.trim(),file=$('pepFeeProof').files[0],msg=$('pepFeeMsg');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.innerHTML='<div class="pepFeeNotice error">Please enter a valid email address.</div>';return}if(!name||!tg||!phone||!file){msg.innerHTML='<div class="pepFeeNotice error">Please complete all required fields and choose your payment proof.</div>';return}if(file.size>5*1024*1024){msg.innerHTML='<div class="pepFeeNotice error">Payment proof must be 5MB or smaller.</div>';return}const s=S();if(!s){msg.innerHTML='<div class="pepFeeNotice error">System is still loading. Please refresh and try again.</div>';return}$('pepFeeSubmit').disabled=true;$('pepFeeSubmit').textContent='SUBMITTING…';msg.innerHTML='';try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',uid=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36),path=`${gb.gb_number}/${Date.now()}-${uid}.${ext}`;const up=await s.storage.from('payment-proofs').upload(path,file,{upsert:false,cacheControl:'3600',contentType:file.type||'application/octet-stream'});if(up.error)throw new Error('Upload failed: '+up.error.message);const url=s.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;if(!url)throw new Error('Payment proof URL could not be created.');const paymentId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));const payment={id:paymentId,gb_number:gb.gb_number,email,full_name:name,telegram_name:tg,phone,payment_proof_url:url,amount:Number(gb.admin_fee||0),payment_reference:'PROOF UPLOAD',note:'Customer submitted payment proof',status:'SUBMITTED'};const ins=await s.from('admin_fee_payments').insert(payment);if(ins.error)throw new Error('Saving payment failed: '+ins.error.message);feePayment=payment;localStorage.setItem('pepmosa_fee_payment_id',paymentId);localStorage.setItem('pepmosa_customer_email',email);localStorage.setItem('pepmosa_customer_name',name);localStorage.setItem('pepmosa_telegram',tg);localStorage.setItem('pepmosa_phone',phone);$('pepFeeModal').classList.remove('open');info('Payment Submitted ✓','Your admin fee payment proof has been submitted using '+email+'. Please wait for admin approval.','pepmosa_fee_submit_popup');await refreshFeeState(false)}catch(e){console.error('PEPMOSA ADMIN FEE SUBMIT',e);msg.innerHTML='<div class="pepFeeNotice error"><b>Unable to submit payment proof.</b><br>'+esc(e.message||'Please try again.')+'</div>'}finally{$('pepFeeSubmit').disabled=false;$('pepFeeSubmit').textContent='I HAVE PAID'}}
  function openVerify(){if($('pepVerifyEmail'))$('pepVerifyEmail').value=localStorage.getItem('pepmosa_verified_email')||localStorage.getItem('pepmosa_customer_email')||'';if($('pepVerifyMsg'))$('pepVerifyMsg').innerHTML='Enter the same email used for your approved admin fee. If your fee is not approved yet, you will be asked to pay or wait for approval.';$('pepVerifyModal').classList.add('open')}
  async function sendVerify(){const email=$('pepVerifyEmail').value.trim().toLowerCase(),msg=$('pepVerifyMsg');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.innerHTML='<div class="pepFeeNotice error">Please enter a valid email.</div>';return}msg.innerHTML='<div class="pepFeeNotice">Checking your Admin Fee status in the PEPMOSA system…</div>';const access=await checkAccessByEmail(email);if(!access){verifiedEmail='';localStorage.removeItem('pepmosa_verified_email');msg.innerHTML='<div class="pepFeeNotice error">No Admin Fee payment was found for this email in the current Group Buy. Please choose PAY ADMIN FEE first.</div>';return}feePayment=access;localStorage.setItem('pepmosa_customer_email',email);if(access.id)localStorage.setItem('pepmosa_fee_payment_id',access.id);if(access.status==='SUBMITTED'){verifiedEmail='';localStorage.removeItem('pepmosa_verified_email');msg.innerHTML='<div class="pepFeeNotice warn">Your Admin Fee payment is still waiting for approval.</div>';await refreshFeeState(false);return}if(access.status==='REJECTED'){verifiedEmail='';localStorage.removeItem('pepmosa_verified_email');msg.innerHTML='<div class="pepFeeNotice error">This Admin Fee payment was rejected. Please submit a new payment proof.</div>';await refreshFeeState(false);return}if(access.status!=='PAID'){verifiedEmail='';localStorage.removeItem('pepmosa_verified_email');msg.innerHTML='<div class="pepFeeNotice error">Admin Fee approval is still required.</div>';return}verifiedEmail=email;localStorage.setItem('pepmosa_verified_email',email);localStorage.setItem('pepmosa_customer_email',email);$('pepVerifyModal').classList.remove('open');info('Email Verified ✓','Your Admin Fee is approved. This email is now verified in the PEPMOSA system and you can order immediately.','pepmosa_email_verified_popup');await refreshFeeState(false);renderProducts()}
  async function authReturn(){return}
  function minFor(variantId,category){if(gb?.status==='KIT_COMPLETION')return 1;const x=minimums.find(m=>m.variant_id===variantId);const cat=categoryMinimums.find(m=>m.category_name===category);return Math.max(1,Number(x?.minimum_qty??cat?.minimum_qty??1))}
  function renderProducts(){
  const grid=$('productGrid');
  if(!grid)return;

  const q=($('search')?.value||'').toLowerCase().trim();
  const list=products.filter(p=>`${p.product_name} ${p.category} ${(p.product_variants||[]).map(v=>v.strength).join(' ')}`.toLowerCase().includes(q));

  if(!list.length){
    grid.innerHTML='<div class="card"><b>No products available yet.</b><br><span class="muted">No active products are available for this Group Buy.</span></div>';
    return;
  }

  grid.innerHTML=list.map(p=>{
    const variants=(p.product_variants||[]).filter(v=>v.active!==false);
    const lowest=variants.length?Math.min(...variants.map(v=>Number(v.price)||0)):0;
    return `<article class="card pepStoreCard" data-product-id="${esc(p.product_id)}">
      <div class="productImg">${p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.product_name)+'">':''}</div>
      <div class="pepStoreBody">
        <h3>${esc(p.product_name)}</h3>
        <div class="muted">${esc(p.description||'')}</div>
        <div class="pepStoreBottom">
          <div class="pepStarting"><small>${gb?.status==='KIT_COMPLETION'?'KIT COMPLETION':'STARTING AT'}</small><b>${peso(lowest)}</b><span>${gb?.status==='KIT_COMPLETION'?'Select an mg to see its exact remaining vial count':variants.length+' variant'+(variants.length===1?'':'s')+' available'}</span></div>
          <button class="pepFeeBtn pepSelectVariant" type="button" data-product-id="${esc(p.product_id)}">CHOOSE VARIANT</button>
        </div>
      </div>
      ${variants.map(v=>{const m=minFor(v.variant_id,p.category);return '<input type="hidden" id="qty-'+esc(v.variant_id)+'" value="'+m+'">';}).join('')}
    </article>`;
  }).join('');
}
  document.addEventListener('click',function(e){
    const btn=e.target.closest('.pepSelectVariant');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();

    const pid=btn.getAttribute('data-product-id');
    const product=products.find(p=>String(p.product_id)===String(pid));
    const picker=window.pepOpenProductPicker || window.openProductPicker;

    if(product && typeof picker==='function'){
      picker(pid,product);
      return;
    }

    // Visible fallback instead of a dead button if the main picker is unavailable.
    if(product){
      const variants=(product.product_variants||[]).filter(v=>v.active!==false);
      const choices=variants.map(v=>{
        const label=esc(v.strength||'Variant');
        return '<button type="button" class="pepFallbackVariant" data-pid="'+esc(pid)+'" data-vid="'+esc(v.variant_id)+'">'+label+' · '+peso(Number(v.price)||0)+(gb?.status==='KIT_COMPLETION'?' · '+Number(v.remaining_qty||0)+' vial(s) remaining for this '+esc(v.strength||'variant'):'')+'</button>';
      }).join('');
      const modal=document.createElement('div');
      modal.className='pepFallbackModal';
      modal.innerHTML='<div class="pepFallbackPanel"><button class="pepFallbackClose" type="button">×</button><h3>'+esc(product.product_name)+'</h3><p>Select a variant</p><div class="pepFallbackChoices">'+choices+'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(ev){
        if(ev.target===modal || ev.target.closest('.pepFallbackClose')) modal.remove();
        const choice=ev.target.closest('.pepFallbackVariant');
        if(choice){
          const v=variants.find(x=>String(x.variant_id)===String(choice.dataset.vid));
          if(gb?.status==='CLOSED'){
            info('Pricelist View','This variant is '+(v?.strength||'selected')+'. Price: '+peso(Number(v?.price)||0)+'. Ordering is currently closed.');
            return;
          }
          if(v && typeof window.pepAddToCart==='function'){
            window.pepAddToCart(pid,v.variant_id);
            modal.remove();
          }
        }
      });
    }
  },true);
  // Shared hard gate used by EVERY cart entry point, including Kit Completion.
  window.pepRequireApprovedFee=async function(){
    const email=(verifiedEmail||localStorage.getItem('pepmosa_verified_email')||'').trim().toLowerCase();
    if(!email){
      info('Admin Fee Required','Please pay and verify your approved Admin Fee email before adding products to your cart.');
      return false;
    }
    const access=await checkAccessByEmail(email);
    if(!access||String(access.status||'').toUpperCase()!=='PAID'){
      verifiedEmail='';
      feePayment=null;
      localStorage.removeItem('pepmosa_verified_email');
      info('Admin Fee Required','Your Admin Fee is not approved for this email yet. Please complete payment and wait for approval before ordering.');
      await refreshFeeState(false);
      return false;
    }
    verifiedEmail=email;
    feePayment=access;
    localStorage.setItem('pepmosa_verified_email',email);
    localStorage.setItem('pepmosa_customer_email',email);
    return true;
  };

  window.pepAddToCart=async function(pid,vid){
    if(gb?.status==='CLOSED'){
      info('Ordering Closed','Ordering is currently closed. You can browse variants and prices only.');
      return;
    }
    if(!await window.pepRequireApprovedFee()) return;
    const p=products.find(x=>x.product_id===pid),v=p?.product_variants?.find(x=>x.variant_id===vid);if(!p||!v)return;const min=minFor(vid,p.category);let q=Math.max(min,Number($('pepQty_'+vid)?.value||min));let cart=JSON.parse(localStorage.pepmosaCart||'[]');const old=cart.find(x=>x.variant_id===vid&&x.gb_number===gb.gb_number);if(gb?.status==='KIT_COMPLETION'){const remaining=Number(v.remaining_qty||0),already=Number(old?.qty||0),available=Math.max(0,remaining-already);if(available<1)return info('Sold Out','All remaining vials for this variant are already in your cart or no longer available.');q=Math.min(q,available);if(q<1)return info('Sold Out','No remaining vials are available for this variant.')}if(old)old.qty+=q;else cart.push({gb_number:gb.gb_number,product_id:pid,variant_id:vid,product_name:p.product_name,strength:v.strength,unit_price:Number(v.price),qty:q});localStorage.pepmosaCart=JSON.stringify(cart);if(typeof window.renderCart==='function')window.renderCart();if($('cartCount'))$('cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0);info('Added to Cart',q+' × '+p.product_name+' '+v.strength+(gb?.status==='KIT_COMPLETION'?' (limited to available remaining vials)':'')+' added to your cart.')};
  function hookCheckout(){if(typeof window.checkout!=='function'||window.checkout.__pepStableGuard)return;const original=window.checkout;window.checkout=async function(){return original()};window.checkout.__pepStableGuard=true}
  function hookPlaceOrder(){if(typeof window.placeOrder!=='function'||window.placeOrder.__pepStableGuard)return;const original=window.placeOrder;window.placeOrder=async function(){if($('email')&&verifiedEmail)$('email').value=verifiedEmail;return original()};window.placeOrder.__pepStableGuard=true}
  async function loadNotices(){if(noticeLoaded||!S())return;noticeLoaded=true;try{const r=await S().from('site_notices').select('*').eq('active',true).order('created_at',{ascending:false}).limit(10);if(r.error)throw r.error;const now=Date.now();const n=(r.data||[]).find(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));if(!n)return;const key=`pepmosa_site_notice_seen_${n.notice_id}_${n.updated_at}`;if(localStorage.getItem(key))return;showNotice(n,key)}catch(e){console.error('PEPMOSA SITE NOTICE',e)}}
  function showNotice(n,key){if($('pepSiteNoticeModal'))$('pepSiteNoticeModal').remove();const d=document.createElement('div');d.id='pepSiteNoticeModal';d.innerHTML=`<div class="pepSiteNoticeCard type-${esc(n.notice_type||'INFO')}"><button class="pepSiteNoticeClose" aria-label="Close">×</button><div class="pepSiteNoticeKicker">${esc(n.notice_type||'ANNOUNCEMENT')}</div><h2>${esc(n.title)}</h2><div class="pepSiteNoticeMessage">${esc(n.message)}</div><div class="pepSiteNoticeActions"><button id="pepNoticeGotIt" class="pepFeeBtn">${esc(n.button_text||'GOT IT')}</button>${n.button_url?`<a class="pepFeeBtn secondary" href="${esc(n.button_url)}" target="_blank" rel="noopener">LEARN MORE</a>`:''}</div></div>`;document.body.appendChild(d);const close=()=>{localStorage.setItem(key,'1');d.classList.remove('open');setTimeout(()=>d.remove(),180)};d.querySelector('.pepSiteNoticeClose').onclick=close;d.querySelector('#pepNoticeGotIt').onclick=close;d.onclick=e=>{if(e.target===d)close()};requestAnimationFrame(()=>d.classList.add('open'))}
  async function load(){try{const s=S();if(!s)return;ensureUI();const g=await s.from('group_buys').select('*').in('status',['OPEN','KIT_COMPLETION','CLOSED']).order('created_at',{ascending:false}).limit(20);if(g.error)throw g.error;
    const rows=g.data||[];
    gb=rows.find(x=>['OPEN','KIT_COMPLETION'].includes(x.status))||rows.find(x=>x.status==='CLOSED')||null;
    if(!gb){if($('gbStatus'))$('gbStatus').innerHTML='<div class="notice error">No Group Buy available right now.</div>';return}
    if($('gbStatus')){
      if(gb.status==='KIT_COMPLETION'){
        $('gbStatus').innerHTML='<div style="display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap"><span class="status open">KIT COMPLETION</span><span class="muted">Only remaining vials are available.</span></div>';
        if($('pepKitCompletionCard'))$('pepKitCompletionCard').style.display='block'
      }else if(gb.status==='CLOSED'){
        $('gbStatus').innerHTML=`<b>${esc(gb.customer_facing_name||gb.gb_number)}</b> <span class="status closed">CLOSED • PRICELIST VIEW</span><div class="muted" style="margin-top:8px">Products and prices are visible. Ordering is currently closed.</div>`;
        if($('pepKitCompletionCard'))$('pepKitCompletionCard').style.display='none'
      }else{
        $('gbStatus').innerHTML=`<b>${esc(gb.customer_facing_name||gb.gb_number)}</b> <span class="status open">OPEN</span>`;
        if($('pepKitCompletionCard'))$('pepKitCompletionCard').style.display='none'
      }
    }const links=await s.from('gb_categories').select('category_name').eq('gb_number',gb.gb_number);if(links.error)throw links.error;const allowed=new Set((links.data||[]).map(x=>x.category_name));const ps=await s.from('products').select('product_id,product_name,category,description,image_url,active').eq('active',true).order('product_name');if(ps.error)throw ps.error;
    const baseProducts=allowed.size?ps.data.filter(p=>allowed.has(p.category)):ps.data;
    const ids=baseProducts.map(p=>p.product_id).filter(Boolean);
    let allVariants=[];
    if(ids.length){
      const vr=await s.from('product_variants').select('variant_id,product_id,strength,price,active').in('product_id',ids);
      if(vr.error)throw vr.error;
      allVariants=vr.data||[];
    }
    products=baseProducts.map(p=>({...p,product_variants:allVariants.filter(v=>String(v.product_id)===String(p.product_id)&&v.active!==false)}));const ms=await s.from('gb_minimum_quantities').select('gb_number,product_id,variant_id,minimum_qty').eq('gb_number',gb.gb_number);if(ms.error)throw ms.error;minimums=ms.data||[];const cs=await s.from('gb_category_settings').select('gb_number,category_name,minimum_qty').eq('gb_number',gb.gb_number);if(cs.error){console.warn('PEPMOSA CATEGORY MINIMUMS',cs.error);categoryMinimums=[]}else categoryMinimums=cs.data||[];
    if(gb.status==='KIT_COMPLETION'){const kr=await s.rpc('get_kit_completion_inventory',{p_gb_number:gb.gb_number});if(kr.error)throw kr.error;const kitMap=new Map((kr.data||[]).map(x=>[String(x.variant_id),Number(x.remaining_qty||0)]));products=products.map(p=>({...p,product_variants:(p.product_variants||[]).filter(v=>Number(kitMap.get(String(v.variant_id))||0)>0).map(v=>({...v,minimum_qty:1,remaining_qty:Number(kitMap.get(String(v.variant_id))||0)}))})).filter(p=>(p.product_variants||[]).length>0)}else{products=products.map(p=>({...p,product_variants:(p.product_variants||[]).map(v=>({...v,minimum_qty:minFor(v.variant_id,p.category)}))}))}
    renderProducts();
    if(gb.status==='CLOSED'){
      const a=$('pepFeeState')||$('groupBuyAccess');
      if(a)a.innerHTML='<div class="muted">Ordering is closed. You can browse the pricelist.</div>';
      const payBtn=$('pepPayFeeBtn'); if(payBtn)payBtn.style.display='none';
      const verifyBtn=$('pepVerifyBtn'); if(verifyBtn)verifyBtn.style.display='none';
      await loadNotices();
      return;
    }
    feePayment=await findFee();lastFeeStatus=feePayment?.status||null;await refreshFeeState(false);hookCheckout();hookPlaceOrder();await loadNotices();await authReturn();}catch(e){console.error('PEPMOSA STOREFRONT STABLE',e);if($('gbStatus'))$('gbStatus').innerHTML='<div class="notice error">Unable to load the current Group Buy. Please refresh and try again.</div>'}}
  function boot(){styles();ensureUI();let n=0;const t=setInterval(()=>{if(S()){clearInterval(t);load()}if(++n>100)clearInterval(t)},100);if(S())load();setTimeout(()=>{ensureUI();if(S())load()},1800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
