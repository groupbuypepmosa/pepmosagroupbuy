(async()=>{
let sb;let filter='PENDING';let allCustomers=[];let customerStats=new Map();
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
  const verified=!!u.email_verified_at,status=u.account_status||'PENDING_EMAIL'; const s=customerStats.get(u.id)||{cart:[],orders:[],logins:[]}; const cartQty=(s.cart||[]).reduce((n,x)=>n+Math.max(0,Number(x.qty||0)),0); const spent=(s.orders||[]).reduce((n,o)=>n+Number(o.total||0),0);
  return '<div class="user"><div class="row"><div class="customerMain"><div class="email">'+esc(u.full_name||'NO NAME')+'</div><div class="meta strong">Email: '+esc(u.email||'—')+'</div><div class="accountStats"><span><b>CART</b>'+cartQty+' items</span><span><b>ORDERS</b>'+(s.orders||[]).length+'</span><span><b>TOTAL SPENT</b>₱'+spent.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span><span><b>LOGINS</b>'+(s.logins||[]).length+'</span></div><div class="detailGrid"><div><b>Contact</b><span>'+esc(u.contact_number||'—')+'</span></div><div><b>WhatsApp</b><span>'+esc(u.whatsapp_name||'—')+'</span></div><div class="wide"><b>Complete Address</b><span>'+esc(u.address||'—')+'</span></div></div><div class="meta">Created: '+(u.created_at?new Date(u.created_at).toLocaleString():'—')+' • Approved: '+(u.approved_at?new Date(u.approved_at).toLocaleString():'—')+'</div><div class="meta">Email: <span class="badge '+(verified?'verified':'unverified')+'">'+(verified?'VERIFIED':'NOT VERIFIED')+'</span></div></div><span class="badge '+(status==='APPROVED'?'approved':status==='REJECTED'?'rejected':'pending')+'">'+esc(status.replaceAll('_',' '))+'</span></div><div class="actions">'+(!verified&&status==='PENDING_EMAIL'?'<button class="action approve" onclick="verifyUser(\''+u.id+'\',this)">VERIFY EMAIL</button>':'')+(status!=='APPROVED'&&verified?'<button class="action approve" onclick="approveUser(\''+u.id+'\')">APPROVE</button>':'')+(status!=='REJECTED'?'<button class="action" onclick="rejectUser(\''+u.id+'\')">REJECT</button>':'')+(status==='APPROVED'||status==='REJECTED'?'<button class="action delete-account" onclick="deleteUser(\''+u.id+'\',this)">DELETE PERMANENTLY</button>':'')+'<button class="action purchaseHistoryBtn" onclick="viewPurchaseHistory(\''+u.id+'\')">🛍️ VIEW PURCHASE HISTORY</button></div></div>';
 }).join('');
}
async function loadStats(){
 customerStats=new Map();
 allCustomers.forEach(u=>customerStats.set(u.id,{cart:[],orders:[],logins:[]}));
 if(!allCustomers.length)return;
 const ids=allCustomers.map(u=>u.id),emails=allCustomers.map(u=>String(u.email||'').trim().toLowerCase()).filter(Boolean);
 const [cr,or,lr]=await Promise.all([sb.from('customer_carts').select('user_id,cart').in('user_id',ids),emails.length?sb.from('orders').select('email,total').in('email',emails):Promise.resolve({data:[]}),sb.from('customer_login_history').select('user_id').in('user_id',ids)]);
 (cr.data||[]).forEach(x=>{const s=customerStats.get(x.user_id);if(s)s.cart=Array.isArray(x.cart)?x.cart:[]});
 (or.data||[]).forEach(o=>{const u=allCustomers.find(x=>String(x.email||'').trim().toLowerCase()===String(o.email||'').trim().toLowerCase());if(u)customerStats.get(u.id).orders.push(o)});
 (lr.data||[]).forEach(x=>{const s=customerStats.get(x.user_id);if(s)s.logins.push(x)});
}
async function load(){
 list.innerHTML='<div class="empty">Loading customer accounts…</div>';
 let q=sb.from('profiles').select('id,email,is_admin,account_status,email_verified_at,created_at,approved_at,rejected_at,full_name,contact_number,whatsapp_name,address').eq('is_admin',false).order('created_at',{ascending:false});
 if(filter!=='ALL')q=filter==='PENDING'?q.eq('account_status','EMAIL_VERIFIED_PENDING_ADMIN'):q.eq('account_status',filter);
 const {data,error}=await q;if(error){list.innerHTML='<div class="empty">'+error.message+'</div>';return}allCustomers=data||[]; await loadStats(); render();
}
window.closePurchaseHistory=()=>{document.getElementById('purchaseHistoryModal')?.classList.remove('show')};
window.viewPurchaseHistory=async(id)=>{
 const user=allCustomers.find(x=>String(x.id)===String(id));
 if(!user)return;
 const modal=document.getElementById('purchaseHistoryModal'),body=document.getElementById('purchaseHistoryBody');
 if(!modal||!body)return;
 document.getElementById('purchaseHistoryTitle').textContent=(user.full_name||'Customer')+' — Purchase History';
 document.getElementById('purchaseHistoryEmail').textContent=user.email||'';
 body.innerHTML='<div class="purchaseHistoryLoading">Loading purchase history…</div>';
 modal.classList.add('show');
 const email=String(user.email||'').trim().toLowerCase();
 if(!email){body.innerHTML='<div class="empty mini">No email linked to this account.</div>';return}
 try{
   const {data:ordersData,error:ordersError}=await sb.from('orders').select('order_id,gb_number,total,payment_status,created_at').ilike('email',email).order('created_at',{ascending:false});
   if(ordersError)throw ordersError;
   const rows=ordersData||[];
   if(!rows.length){body.innerHTML='<div class="empty mini">No previous purchases found for this customer.</div>';return}
   const ids=rows.map(o=>o.order_id).filter(Boolean);
   let items=[];
   if(ids.length){
     const {data:itemData,error:itemError}=await sb.from('order_items').select('order_id,product_name,strength,qty,unit_price,line_total').in('order_id',ids);
     if(itemError)throw itemError;
     items=itemData||[];
   }
   const byOrder=new Map();
   items.forEach(item=>{if(!byOrder.has(item.order_id))byOrder.set(item.order_id,[]);byOrder.get(item.order_id).push(item)});
   const spent=rows.reduce((n,o)=>n+Number(o.total||0),0);
   body.innerHTML='<div class="purchaseHistorySummary"><span><b>ORDERS</b>'+rows.length+'</span><span><b>TOTAL SPENT</b>₱'+spent.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span><span><b>CUSTOMER</b>'+esc(user.full_name||'—')+'</span></div>'+
   rows.map(o=>{
     const its=byOrder.get(o.order_id)||[];
     const products=its.length?its.map(i=>esc(i.product_name||'Product')+(i.strength?' — '+esc(i.strength):'')+' × '+Number(i.qty||0)+' @ ₱'+Number(i.unit_price||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})).join('<br>'):'Order items unavailable';
     const status=esc(o.payment_status||o.status||'—');
     const gbRaw=String(o.gb_number||'—'); const gbMatch=gbRaw.match(/(\\d+)/); const gbDisplay=gbMatch?gbMatch[1]:gbRaw;
     return '<div class="purchaseOrder"><div class="purchaseOrderHead"><div class="purchaseOrderIdentity"><div class="purchaseOrderGb"><small>GROUP BUY</small><strong>#'+esc(gbDisplay)+'</strong></div><div><div class="purchaseOrderTitle">Order '+esc(o.order_id||'—')+'</div><div class="purchaseOrderMeta">'+(o.created_at?new Date(o.created_at).toLocaleString():'—')+' <span class="gbText">• GB '+esc(gbRaw)+'</span></div></div></div><span class="badge '+(String(o.payment_status||'').toLowerCase()==='paid'?'approved':'pending')+'">'+status+'</span></div><div class="purchaseOrderProducts">'+products+'</div><div class="purchaseOrderTotal">Total: ₱'+Number(o.total||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div></div>';
   }).join('');
 }catch(e){
   console.error('Purchase history error:',e);
   body.innerHTML='<div class="empty mini">Unable to load purchase history: '+esc(e.message||'Unknown error')+'</div>';
 }
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePurchaseHistory()});

window.verifyUser=async(id,btn)=>{if(!confirm('Manually verify this customer email? This bypasses the email OTP.'))return;if(btn){btn.disabled=true;btn.textContent='VERIFYING...'}const {data,error}=await sb.functions.invoke('admin-verify-customer-email',{body:{user_id:id}});if(error||data?.error){alert(error?.message||data?.error||'Verification failed.');if(btn){btn.disabled=false;btn.textContent='VERIFY EMAIL'}return}load()};
window.approveUser=async id=>{const {data:profile}=await sb.from('profiles').select('email_verified_at').eq('id',id).maybeSingle();if(!profile?.email_verified_at){alert('Verify the customer email first.');return}const {error}=await sb.from('profiles').update({account_status:'APPROVED',approved_at:new Date().toISOString(),rejected_at:null}).eq('id',id);if(error)alert(error.message);else load()};
window.rejectUser=async id=>{if(!confirm('Reject this account?'))return;const {error}=await sb.from('profiles').update({account_status:'REJECTED',rejected_at:new Date().toISOString(),approved_at:null}).eq('id',id);if(error)alert(error.message);else load()};
window.deleteUser=async(id,btn)=>{if(!confirm('PERMANENTLY DELETE this customer account? This will remove the login account and profile permanently. This cannot be undone.'))return;if(btn){btn.disabled=true;btn.textContent='DELETING...'}const {data,error}=await sb.functions.invoke('delete-customer-account',{body:{user_id:id}});if(error||data?.error){alert(error?.message||data?.error||'Delete failed.');if(btn){btn.disabled=false;btn.textContent='DELETE PERMANENTLY'}return}alert('Customer account permanently deleted.');load()};
load();
})();