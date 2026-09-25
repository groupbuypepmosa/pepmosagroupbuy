(() => {
const $=id=>document.getElementById(id);
let sb;
function show(id,on=true){$(id).classList.toggle('hidden',!on)}
function msg(text,type=''){const el=$('message');el.textContent=text;el.className='notice '+type;show('message',true)}
function accountMsg(text,type=''){const el=$('accountMessage');el.textContent=text;el.className='notice '+type}
function init(){sb=initSupabase(); wire(); refresh()}
function wire(){
 $('loginTab').onclick=()=>switchTab('login'); $('signupTab').onclick=()=>switchTab('signup');
 $('loginForm').onsubmit=login; $('signupForm').onsubmit=signup;
 $('forgot').onclick=async e=>{e.preventDefault();const email=$('loginEmail').value.trim();if(!email)return msg('Enter your email first.','error');const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html'});msg(error?.message||'Password reset email sent. Check your inbox.','success')};
 $('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
 sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));
}
function switchTab(which){const login=which==='login';$('loginTab').classList.toggle('active',login);$('signupTab').classList.toggle('active',!login);$('loginPanel').classList.toggle('active',login);$('signupPanel').classList.toggle('active',!login);$('verifyPanel').classList.remove('active');msg('', '');show('message',false)}
function showVerify(email){$('verifyEmail').textContent=email;$('verifyPanel').classList.add('active');$('loginPanel').classList.remove('active');$('signupPanel').classList.remove('active');$('loginTab').classList.remove('active');$('signupTab').classList.remove('active');show('message',false);setTimeout(()=>$('verifyCode').focus(),100)}
async function verifyCode(e){e.preventDefault();const email=$('verifyEmail').textContent.trim(),token=$('verifyCode').value.trim();if(!/^\d{6}$/.test(token))return msg('Enter the 6-digit verification code.','error');const {data,error}=await sb.auth.verifyOtp({email,token,type:'email'});if(error)return msg(error.message,'error');msg('Email verified. Your account is now waiting for PEPMOSA admin approval.','success');await refresh()}
async function resendCode(){const email=$('verifyEmail').textContent.trim();const {error}=await sb.auth.resend({type:'signup',email});msg(error?.message||'A new verification code has been sent to your email.','success')}
async function signup(e){e.preventDefault();const name=$('signupName').value.trim(),email=$('signupEmail').value.trim(),p=$('signupPassword').value,p2=$('signupPassword2').value;if(p!==p2)return msg('Passwords do not match.','error');const {data,error}=await sb.auth.signUp({email,password:p,options:{data:{full_name:name},emailRedirectTo:location.origin+'/account.html'}});if(error)return msg(error.message,'error');if(data.user && !data.user.email_confirmed_at){showVerify(email);msg('Check your email for the 6-digit verification code.','success');return}if(data.session){await refresh();return}msg('Account created. Please verify your email first.','success')}
async function login(e){e.preventDefault();const email=$('loginEmail').value.trim(),password=$('loginPassword').value;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)return msg(error.message,'error');await refresh()}
async function refresh(){const {data:{user}}=await sb.auth.getUser();if(!user){show('authArea',true);show('accountArea',false);return}show('authArea',false);show('accountArea',true);$('accountEmail').textContent=user.email||'';const {data:profile}=await sb.from('profiles').select('account_status,email_verified_at,is_admin').eq('id',user.id).maybeSingle();if(!user.email_confirmed_at){accountMsg('Please verify your email address. Check your inbox for the PEPMOSA verification email.','pending');setStatus('pending','EMAIL VERIFICATION REQUIRED');return}if(profile?.is_admin||profile?.account_status==='APPROVED'){accountMsg('Your account is approved. Welcome to PEPMOSA.','success');setStatus('approved','APPROVED');return}if(profile?.account_status==='REJECTED'){accountMsg('Your account application was not approved. Please contact PEPMOSA admin if you believe this is an error.','error');setStatus('rejected','NOT APPROVED');return}accountMsg('Your email is verified. Your account is now waiting for PEPMOSA admin approval.','pending');setStatus('pending','WAITING FOR ADMIN APPROVAL')}
function setStatus(type,label){$('accountStatus').innerHTML='<span class="status '+type+'">'+label+'</span>'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();