(() => {
const $=id=>document.getElementById(id);
let sb;
let currentUser=null;
function show(id,on=true){$(id)?.classList.toggle('hidden',!on)}
function msg(text,type=''){const el=$('message');if(!el)return;el.textContent=text;el.className='notice '+type;show('message',true)}
function accountMsg(text,type=''){const el=$('accountMessage');if(el){el.textContent=text;el.className='notice '+type}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function peso(v){return '₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}
function init(){
 sb=initSupabase();wire();
 const tab=new URLSearchParams(location.search).get('tab');
 if(tab==='signup')switchTab('signup'); else if(tab==='login')switchTab('login');
 refresh()
}
function wire(){
 $('loginTab').onclick=()=>switchTab('login'); $('signupTab').onclick=()=>switchTab('signup');
 $('loginForm').onsubmit=login; $('signupForm').onsubmit=signup;
 $('toggleLoginPassword').onclick=()=>{const input=$('loginPassword'),btn=$('toggleLoginPassword');const showPassword=input.type==='password';input.type=showPassword?'text':'password';btn.textContent=showPassword?'HIDE':'SHOW';btn.setAttribute('aria-label',showPassword?'Hide password':'Show password')};
 $('verifyForm').onsubmit=verifyCode; $('resendCode').onclick=resendCode; $('profileEditForm').onsubmit=saveProfileDetails;
 $('forgot').onclick=async e=>{e.preventDefault();const email=$('loginEmail').value.trim();if(!email)return msg('Enter your email first.','error');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html'});msg(error?.message||'Password reset email sent. Check your inbox.','success')};
 $('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
 document.querySelectorAll('[data-account-tab]').forEach(btn=>btn.onclick=()=>showAccountTab(btn.dataset.accountTab));
 sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 window.addEventListener('storage',e=>{if(e.key==='pepmosaCart')renderCart()});
}
function switchTab(which){const login=which==='login';$('loginTab').classList.toggle('active',login);$('signupTab').classList.toggle('active',!login);$('loginPanel').classList.toggle('active',login);$('signupPanel').classList.toggle('active',!login);$('verifyPanel').classList.remove('active');msg('', '');show('message',false)}
function showVerify(email){$('verifyEmail').textContent=email;$('verifyCode').value='';$('verifyPanel').classList.add('active');$('loginPanel').classList.remove('active');$('signupPanel').classList.remove('active');$('loginTab').classList.remove('active');$('signupTab').classList.remove('active');show('message',false);setTimeout(()=>$('verifyCode').focus(),100)}
async function verifyCode(e){e.preventDefault();const email=$('verifyEmail').textContent.trim(),token=$('verifyCode').value.trim();if(!/^\d{6}$/.test(token))return msg('Enter the 6-digit verification code.','error');const btn=$('verifyForm').querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='VERIFYING...';const {data,error}=await sb.auth.verifyOtp({email,token,type:'email'});btn.disabled=false;btn.textContent='VERIFY EMAIL';if(error)return msg(error.message,'error');await savePendingProfileDetails();msg('Email verified. Your account is now waiting for PEPMOSA admin approval.','success');await refresh()}
async function resendCode(){const email=$('verifyEmail').textContent.trim(),btn=$('resendCode');btn.disabled=true;btn.textContent='SENDING...';const {error}=await sb.auth.resend({type:'signup',email});btn.disabled=false;btn.textContent='RESEND CODE';msg(error?.message||'A new verification code has been sent to your email.','success')}
async function signup(e){e.preventDefault();const name=$('signupName').value.trim(),address=$('signupAddress').value.trim(),contact=$('signupContact').value.trim(),whatsapp=$('signupWhatsapp').value.trim(),email=$('signupEmail').value.trim(),p=$('signupPassword').value,p2=$('signupPassword2').value;if(!name||!address||!contact||!whatsapp)return msg('Please complete your name, address, contact number, and WhatsApp name.','error');if(p!==p2)return msg('Passwords do not match.','error');const submit=$('signupForm').querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='CREATING...';sessionStorage.setItem('pepmosa_pending_profile',JSON.stringify({full_name:name,address,contact_number:contact,whatsapp_name:whatsapp}));const {data,error}=await sb.auth.signUp({email,password:p,options:{data:{full_name:name,address,contact_number:contact,whatsapp_name:whatsapp},emailRedirectTo:location.origin+'/account.html'}});submit.disabled=false;submit.textContent='CREATE ACCOUNT';if(error)return msg(error.message,'error');if(data.user&&!data.user.email_confirmed_at){const {error:resendError}=await sb.auth.resend({type:'signup',email});showVerify(email);if(resendError){const text=(resendError.message||'').toLowerCase();if(text.includes('already confirmed')||text.includes('already registered')||text.includes('confirmed'))msg('This email already has an account. Please use Log In instead.','error');else msg(resendError.message,'error')}else msg('A new 6-digit verification code has been sent to your email.','success');return}if(data.session){await savePendingProfileDetails();await refresh();return}msg('Account created. Please verify your email first.','success')}
async function login(e){
 e.preventDefault();
 const email=$('loginEmail').value.trim(),password=$('loginPassword').value;
 if(!email||!password)return msg('Please enter your email and password.','error');
 const btn=$('loginSubmit');if(btn){btn.disabled=true;btn.textContent='LOGGING IN...';btn.classList.add('loginBusy')}
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){
   if(btn){btn.disabled=false;btn.textContent='LOG IN';btn.classList.remove('loginBusy')}
   const raw=(error.message||'').toLowerCase();
   if(raw.includes('email not confirmed'))return msg('Please verify your email first. Check your inbox for the PEPMOSA verification code.','error');
   if(raw.includes('invalid login credentials'))return msg('Incorrect email or password. Please try again.','error');
   return msg(error.message,'error');
 }
 try{await sb.rpc('record_customer_login')}catch(e){console.warn('PEPMOSA login history',e)}
 const {data:profile}=await sb.from('profiles').select('account_status,is_admin,full_name,email_verified_at').eq('id',data.user.id).maybeSingle();
 if(profile?.is_admin===true||profile?.account_status==='APPROVED'){
   const name=profile?.full_name||data.user.user_metadata?.full_name||email.split('@')[0];
   localStorage.setItem('pepmosa_logged_in_name',name);
   window.location.replace('/shop.html');
   return;
 }
 if(btn){btn.disabled=false;btn.textContent='LOG IN';btn.classList.remove('loginBusy')}
 await refresh();
}
async function refresh(){
 const {data:{user}}=await sb.auth.getUser();currentUser=user;
 if(!user){show('authArea',true);show('accountArea',false);return}
 show('authArea',false);show('accountArea',true);
 const {data:profile}=await sb.from('profiles').select('account_status,email_verified_at,is_admin,full_name,address,contact_number,whatsapp_name').eq('id',user.id).maybeSingle();
 const name=profile?.full_name||user.user_metadata?.full_name||user.user_metadata?.name||(user.email||'PEPMOSA').split('@')[0];
 $('accountName').textContent=name;$('accountProfileName').textContent=name;$('accountEmail').textContent=user.email||'';$('accountProfileEmail').textContent=user.email||'';$('accountProfileContact').textContent=profile?.contact_number||'—';$('accountProfileWhatsapp').textContent=profile?.whatsapp_name||'—';$('accountProfileAddress').textContent=profile?.address||'—';$('profileEditName').value=name;$('profileEditAddress').value=profile?.address||'';$('profileEditContact').value=profile?.contact_number||'';$('profileEditWhatsapp').value=profile?.whatsapp_name||'';
 const approved=!!(profile?.is_admin||profile?.account_status==='APPROVED');
 const status=profile?.is_admin?'ADMIN':profile?.account_status||'PENDING';
 $('accountProfileStatus').textContent=status;
 if(!user.email_confirmed_at){accountMsg('Please verify your email address. Check your inbox for the PEPMOSA verification email.','pending');setStatus('pending','EMAIL VERIFICATION REQUIRED');hideDashboardSections();return}
 if(approved){
   accountMsg('Your account is approved. Welcome to PEPMOSA.','success');
   setStatus('approved',profile?.is_admin?'ADMIN':'APPROVED');
   showDashboardSections();
   await Promise.all([loadOrders(user.email),renderCart()]);
   return
 }
 if(profile?.account_status==='REJECTED'){accountMsg('Your account application was not approved. Please contact PEPMOSA admin if you believe this is an error.','error');setStatus('rejected','NOT APPROVED');hideDashboardSections();return}
 accountMsg('Your email is verified. Your account is now waiting for PEPMOSA admin approval.','pending');setStatus('pending','WAITING FOR ADMIN APPROVAL');hideDashboardSections()
}
async function savePendingProfileDetails(){try{const raw=sessionStorage.getItem('pepmosa_pending_profile');if(!raw||!sb)return;const p=JSON.parse(raw);const r=await sb.rpc('update_customer_profile_details',{p_full_name:p.full_name||'',p_address:p.address||'',p_contact_number:p.contact_number||'',p_whatsapp_name:p.whatsapp_name||''});if(r.error)throw r.error;sessionStorage.removeItem('pepmosa_pending_profile')}catch(e){console.warn('PEPMOSA profile save',e)}}
async function saveProfileDetails(e){e.preventDefault();const btn=$('profileEditForm').querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='SAVING...';const r=await sb.rpc('update_customer_profile_details',{p_full_name:$('profileEditName').value.trim(),p_address:$('profileEditAddress').value.trim(),p_contact_number:$('profileEditContact').value.trim(),p_whatsapp_name:$('profileEditWhatsapp').value.trim()});btn.disabled=false;btn.textContent='SAVE DETAILS';if(r.error)return accountMsg(r.error.message,'error');accountMsg('Your account details have been saved.','success');await refresh()}
function setStatus(type,label){$('accountStatus').innerHTML='<span class="status '+type+'">'+esc(label)+'</span>'}

function showDashboardSections(){document.querySelector('.accountQuickGrid').classList.remove('hidden');document.querySelectorAll('.accountSection').forEach(x=>x.classList.remove('hidden'));showAccountTab('orders')}
function hideDashboardSections(){document.querySelector('.accountQuickGrid').classList.add('hidden');document.querySelectorAll('.accountSection').forEach(x=>x.classList.add('hidden'))}
function showAccountTab(tab){document.querySelectorAll('[data-account-tab]').forEach(b=>b.classList.toggle('active',b.dataset.accountTab===tab));document.querySelectorAll('.accountSection').forEach(s=>s.classList.remove('active'));const map={orders:'accountOrdersSection',cart:'accountCartSection',profile:'accountProfileSection'};$(map[tab])?.classList.add('active')}
async function loadOrders(email){
 const box=$('orderHistory');box.innerHTML='<div class="accountLoading">Loading your order history…</div>';
 const [gbRes,moqRes]=await Promise.all([
  sb.from('orders').select('order_id,gb_number,total,payment_status,shipping_method,shipping_fee,created_at,shipment_id,order_items(product_name,strength,qty,unit_price,line_total)').eq('email',email).order('created_at',{ascending:false}),
  sb.from('ofa_orders').select('order_id,gb_id,total,payment_status,shipping_method,shipping_fee,created_at').eq('email',email).order('created_at',{ascending:false})
 ]);
 if(gbRes.error||moqRes.error){box.innerHTML='<div class="accountEmpty">We could not load your order history right now.</div>';return}
 const regular=gbRes.data||[], moq=moqRes.data||[], moqIds=moq.map(o=>o.order_id).filter(Boolean), moqGbIds=moq.map(o=>o.gb_id).filter(Boolean);
 let moqItems=[], moqGbs=[];
 if(moqIds.length){const r=await sb.from('ofa_order_items').select('order_id,product_name,qty,unit_price,line_total').in('order_id',moqIds);if(r.error){box.innerHTML='<div class="accountEmpty">We could not load your MOQ history right now.</div>';return}moqItems=r.data||[]}
 if(moqGbIds.length){const r=await sb.from('ofa_group_buys').select('gb_id,gb_number,customer_facing_name').in('gb_id',moqGbIds);if(r.error){box.innerHTML='<div class="accountEmpty">We could not load your MOQ details right now.</div>';return}moqGbs=r.data||[]}
 const gbMap=new Map(moqGbs.map(g=>[String(g.gb_id),g])), itemMap=new Map();
 moqItems.forEach(i=>{if(!itemMap.has(i.order_id))itemMap.set(i.order_id,[]);itemMap.get(i.order_id).push(i)});
 const rows=[...regular.map(o=>({...o,historyType:'GB'})),...moq.map(o=>({...o,historyType:'MOQ'}))].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 $('orderCount').textContent=rows.length+' '+(rows.length===1?'order':'orders');
 if(!rows.length){box.innerHTML='<div class="accountEmpty"><div style="font-size:28px">📦</div><b>No orders yet</b><br><span>Your completed orders will appear here.</span><br><a class="sectionAction" href="/shop.html">SHOP PRODUCTS →</a></div>';return}
 box.innerHTML=rows.map(o=>{
  const isMoq=o.historyType==='MOQ', g=isMoq?gbMap.get(String(o.gb_id)):null;
  const items=isMoq?(itemMap.get(o.order_id)||[]):(Array.isArray(o.order_items)?o.order_items:[]);
  const raw=isMoq?(g?.gb_number||'—'):(o.gb_number||'—');
  const products=items.length?items.map(i=>'<div class="orderItem"><span>'+esc(i.product_name||'Product')+(i.strength?' • '+esc(i.strength):'')+' × '+Number(i.qty||0)+'</span><b>'+peso(i.line_total)+'</b></div>').join(''):'<div class="orderItem"><span>Order items</span><b>—</b></div>';
  const total=Number(o.total||0)+Number(o.shipping_fee||0);
  return '<article class="orderCard '+(isMoq?'moqOrderCard':'')+'"><div class="orderTop"><div><div class="orderId">'+(isMoq?'MOQ • ':'')+esc(o.order_id)+'</div><div class="orderDate">'+new Date(o.created_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})+'</div></div><span class="orderBadge">'+esc(o.payment_status||'PENDING')+'</span></div><div class="orderItems">'+products+'</div><div class="orderBottom"><div class="orderTotal"><small>TOTAL</small><b>'+peso(total)+'</b></div><div class="orderGb"><strong>'+(isMoq?'MOQ':'GROUP BUY')+'</strong><br>'+esc(raw)+(isMoq&&g?.customer_facing_name?'<br>'+esc(g.customer_facing_name):'')+(o.shipping_method?' • '+esc(o.shipping_method):'')+(o.shipment_id?'<br>Shipment: '+esc(o.shipment_id):'')+'</div></div></article>';
 }).join('')
}

function renderCart(){
 let cart=[];try{cart=JSON.parse(localStorage.getItem('pepmosaCart')||'[]')}catch(e){}
 const count=cart.reduce((n,i)=>n+Number(i.qty||0),0);$('cartCountAccount').textContent=count+' '+(count===1?'item':'items');
 const box=$('accountCart');if(!cart.length){box.innerHTML='<div class="accountEmpty"><div style="font-size:28px">🛒</div><b>Your cart is empty</b><br><span>Add products and they will show here.</span><br><a class="sectionAction" href="/shop.html">SHOP PRODUCTS →</a></div>';return}
 const total=cart.reduce((s,i)=>s+Number(i.price||i.unit_price||0)*Number(i.qty||0),0);
 box.innerHTML=cart.map(i=>'<div class="cartAccountCard"><div class="cartAccountIcon">🧴</div><div class="cartAccountMain"><b>'+esc(i.product_name||'Product')+'</b><small>'+esc(i.strength||'')+' • Qty '+Number(i.qty||0)+'</small></div><div class="cartAccountPrice">'+peso(Number(i.price||i.unit_price||0)*Number(i.qty||0))+'</div></div>').join('')+'<div class="cartAccountTotal"><span>CART TOTAL</span><b>'+peso(total)+'</b></div><a class="btn" href="/shop.html" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box">OPEN CART / CHECKOUT</a>'
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();