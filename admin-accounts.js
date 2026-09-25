(async()=>{
let sb;let filter='PENDING';let allCustomers=[];
const list=document.getElementById('list'),search=document.getElementById('customerSearch'),count=document.getElementById('customerCount');
sb=initSupabase();
try{await requireAdmin();}catch(e){list.innerHTML='<div class="empty">Admin access required. <a href="/admin.html">Go to admin login</a></div>';return}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');load()});
search?.addEventListener('input',render);
function render(){
 const q=(search?.value||'').trim().toLowerCase();
 const data=allCustomers.filter(u=>!q||[u.full_name,u.email,u.contact_number,u.whatsapp_name,u.address,u.account_status].some(v=>String(v||'').toLowerCase().includes(q)));
 if(count)count.textContent=data.length+' customer'+(data.length===1?'':'s');
 if(!data.length){list.innerHTML='<div class="empty">No matching customer accounts.</div>';return}
 list.innerHTML=data.map(u=>{
  const verified=!!u.email_verified_at,status=u.account_status||'PENDING_EMAIL';
  return '<div class="user"><div class="row"><div class="customerMain"><div class="email">'+esc(u.full_name||'NO NAME')+'</div><div class="meta strong">Email: '+esc(u.email||'—')+'</div><div class="detailGrid"><div><b>Contact</b><span>'+esc(u.contact_number||'—')+'</span></div><div><b>WhatsApp</b><span>'+esc(u.whatsapp_name||'—')+'</span></div><div class="wide"><b>Complete Address</b><span>'+esc(u.address||'—')+'</span></div></div><div class="meta">Created: '+(u.created_at?new Date(u.created_at).toLocaleString():'—')+' • Approved: '+(u.approved_at?new Date(u.approved_at).toLocaleString():'—')+'</div><div class="meta">Email: <span class="badge '+(verified?'verified':'unverified')+'">'+(verified?'VERIFIED':'NOT VERIFIED')+'</span></div></div><span class="badge '+(status==='APPROVED'?'approved':status==='REJECTED'?'rejected':'pending')+'">'+esc(status.replaceAll('_',' '))+'</span></div><div class="actions">'+(!verified&&status==='PENDING_EMAIL'?'<button class="action approve" onclick="verifyUser(\''+u.id+'\',this)">VERIFY EMAIL</button>':'')+(status!=='APPROVED'&&verified?'<button class="action approve" onclick="approveUser(\''+u.id+'\')">APPROVE</button>':'')+(status!=='REJECTED'?'<button class="action" onclick="rejectUser(\''+u.id+'\')">REJECT</button>':'')+(status==='APPROVED'||status==='REJECTED'?'<button class="action delete-account" onclick="deleteUser(\''+u.id+'\',this)">DELETE PERMANENTLY</button>':'')+'</div></div>';
 }).join('');
}
async function load(){
 list.innerHTML='<div class="empty">Loading customer accounts…</div>';
 let q=sb.from('profiles').select('id,email,is_admin,account_status,email_verified_at,created_at,approved_at,rejected_at,full_name,contact_number,whatsapp_name,address').eq('is_admin',false).order('created_at',{ascending:false});
 if(filter!=='ALL')q=filter==='PENDING'?q.eq('account_status','EMAIL_VERIFIED_PENDING_ADMIN'):q.eq('account_status',filter);
 const {data,error}=await q;if(error){list.innerHTML='<div class="empty">'+error.message+'</div>';return}allCustomers=data||[];render();
}
window.verifyUser=async(id,btn)=>{if(!confirm('Manually verify this customer email? This bypasses the email OTP.'))return;if(btn){btn.disabled=true;btn.textContent='VERIFYING...'}const {data,error}=await sb.functions.invoke('admin-verify-customer-email',{body:{user_id:id}});if(error||data?.error){alert(error?.message||data?.error||'Verification failed.');if(btn){btn.disabled=false;btn.textContent='VERIFY EMAIL'}return}load()};
window.approveUser=async id=>{const {data:profile}=await sb.from('profiles').select('email_verified_at').eq('id',id).maybeSingle();if(!profile?.email_verified_at){alert('Verify the customer email first.');return}const {error}=await sb.from('profiles').update({account_status:'APPROVED',approved_at:new Date().toISOString(),rejected_at:null}).eq('id',id);if(error)alert(error.message);else load()};
window.rejectUser=async id=>{if(!confirm('Reject this account?'))return;const {error}=await sb.from('profiles').update({account_status:'REJECTED',rejected_at:new Date().toISOString(),approved_at:null}).eq('id',id);if(error)alert(error.message);else load()};
window.deleteUser=async(id,btn)=>{if(!confirm('PERMANENTLY DELETE this customer account? This will remove the login account and profile permanently. This cannot be undone.'))return;if(btn){btn.disabled=true;btn.textContent='DELETING...'}const {data,error}=await sb.functions.invoke('delete-customer-account',{body:{user_id:id}});if(error||data?.error){alert(error?.message||data?.error||'Delete failed.');if(btn){btn.disabled=false;btn.textContent='DELETE PERMANENTLY'}return}alert('Customer account permanently deleted.');load()};
load();
})();