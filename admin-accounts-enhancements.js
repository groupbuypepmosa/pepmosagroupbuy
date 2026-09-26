(function(){
'use strict';
let sb2=null;
let enhancedCustomers=[];
let enhancedStats=new Map();
const $=id=>document.getElementById(id);
const esc2=v=>typeof window.esc==='function'?window.esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const date2=v=>v?new Date(v).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'—';
const qty2=a=>(a||[]).reduce((n,x)=>n+Math.max(0,Number(x.qty||0)),0);

function addModal(){
 if($('customerDetailModal'))return;
 const m=document.createElement('div');
 m.id='customerDetailModal';m.className='customerDetailModal';
 m.innerHTML='<div class="customerDetailCard"><div class="customerDetailHead"><div><h2 id="customerDetailTitle">Customer</h2><div id="customerDetailSub" class="meta"></div></div><button class="detailClose" type="button" id="customerDetailClose">×</button></div><div id="customerDetailBody"><div class="empty">Loading…</div></div></div>';
 document.body.appendChild(m);
 $('customerDetailClose').onclick=()=>m.classList.remove('show');
 m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
}
async function loadEnhanced(){
 sb2=window.sb||initSupabase();if(!sb2)return;
 const active=document.querySelector('.toolbar button.active');
 const f=active?.dataset?.filter||'PENDING';
 let q=sb2.from('profiles').select('id,email,is_admin,account_status,email_verified_at,created_at,approved_at,rejected_at,full_name,contact_number,whatsapp_name,address').eq('is_admin',false).order('created_at',{ascending:false});
 if(f!=='ALL')q=f==='PENDING'?q.eq('account_status','EMAIL_VERIFIED_PENDING_ADMIN'):q.eq('account_status',f);
 const r=await q;if(r.error)return;
 enhancedCustomers=r.data||[];enhancedStats=new Map();
 enhancedCustomers.forEach(u=>enhancedStats.set(u.id,{cart:[],orders:[],logins:[]}));
 if(!enhancedCustomers.length){window.__pepEnhancedRender&&window.__pepEnhancedRender();return}
 const ids=enhancedCustomers.map(u=>u.id),emails=enhancedCustomers.map(u=>String(u.email||'').trim().toLowerCase()).filter(Boolean);
 const [cr,or,lr]=await Promise.all([
   sb2.from('customer_carts').select('user_id,cart,updated_at').in('user_id',ids),
   emails.length?sb2.from('orders').select('order_id,email,total,payment_status,gb_number,created_at').in('email',emails).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
   sb2.from('customer_login_history').select('user_id,email,logged_in_at').in('user_id',ids).order('logged_in_at',{ascending:false})
 ]);
 (cr.data||[]).forEach(x=>{const s=enhancedStats.get(x.user_id);if(s)s.cart=Array.isArray(x.cart)?x.cart:[]});
 (or.data||[]).forEach(o=>{const u=enhancedCustomers.find(x=>String(x.email||'').trim().toLowerCase()===String(o.email||'').trim().toLowerCase());if(u)enhancedStats.get(u.id).orders.push(o)});
 (lr.data||[]).forEach(x=>{const s=enhancedStats.get(x.user_id);if(s)s.logins.push(x)});
 renderEnhanced();
}
function renderEnhanced(){
 const list=$('list'),search=$('customerSearch'),count=$('customerCount');if(!list)return;
 const q=(search?.value||'').trim().toLowerCase();
 const data=enhancedCustomers.filter(u=>!q||[u.full_name,u.email,u.contact_number,u.whatsapp_name,u.address,u.account_status].some(v=>String(v||'').toLowerCase().includes(q)));
 if(count)count.textContent=data.length+' customer'+(data.length===1?'':'s');
 if(!data.length){list.innerHTML='<div class="empty">No matching customer accounts.</div>';return}
 list.innerHTML=data.map(function(u){
   const s=enhancedStats.get(u.id)||{cart:[],orders:[],logins:[]},cq=qty2(s.cart);
   const spent=s.orders.reduce((n,o)=>n+Number(o.total||0),0);
   const verified=!!u.email_verified_at,status=u.account_status||'PENDING_EMAIL';
   return '<div class="user"><div class="row"><div class="customerMain"><div class="email">'+esc2(u.full_name||'NO NAME')+'</div><div class="meta strong">Email: '+esc2(u.email||'—')+'</div><div class="accountStats"><span><b>CART</b>'+cq+' item'+(cq===1?'':'s')+'</span><span><b>ORDERS</b>'+s.orders.length+'</span><span><b>TOTAL SPENT</b>'+money(spent)+'</span><span><b>LOGINS</b>'+s.logins.length+'</span></div><div class="detailGrid"><div><b>Contact</b><span>'+esc2(u.contact_number||'—')+'</span></div><div><b>WhatsApp</b><span>'+esc2(u.whatsapp_name||'—')+'</span></div><div class="wide"><b>Complete Address</b><span>'+esc2(u.address||'—')+'</span></div></div><div class="meta">Created: '+date2(u.created_at)+' • Approved: '+date2(u.approved_at)+'</div><div class="meta">Email: <span class="badge '+(verified?'verified':'unverified')+'">'+(verified?'VERIFIED':'NOT VERIFIED')+'</span></div></div><span class="badge '+(status==='APPROVED'?'approved':status==='REJECTED'?'rejected':'pending')+'">'+esc2(status.replaceAll('_',' '))+'</span></div><div class="actions"><button class="action primaryAction" type="button" data-customer-id="'+esc2(u.id)+'">VIEW CUSTOMER</button></div></div>';
 }).join('');
 list.querySelectorAll('.primaryAction').forEach(b=>b.onclick=function(){viewEnhancedCustomer(this.dataset.customerId)});
}
async function viewEnhancedCustomer(id){
 const u=enhancedCustomers.find(x=>x.id===id);if(!u)return;
 addModal();const m=$('customerDetailModal');m.classList.add('show');
 $('customerDetailTitle').textContent=u.full_name||'Customer';$('customerDetailSub').textContent=u.email||'';
 $('customerDetailBody').innerHTML='<div class="empty">Loading customer details…</div>';
 const [cr,or,lr,ar]=await Promise.all([
   sb2.from('customer_carts').select('cart,updated_at').eq('user_id',u.id).maybeSingle(),
   sb2.from('orders').select('order_id,gb_number,total,payment_status,shipping_fee,created_at,order_items(product_name,strength,qty,unit_price,line_total)').eq('email',u.email).order('created_at',{ascending:false}),
   sb2.from('customer_login_history').select('logged_in_at').eq('user_id',u.id).order('logged_in_at',{ascending:false}).limit(30),
   sb2.from('site_activity_log').select('action,details,created_at').eq('actor_user_id',u.id).order('created_at',{ascending:false}).limit(50)
 ]);
 if(cr.error||or.error||lr.error||ar.error){$('customerDetailBody').innerHTML='<div class="empty">'+esc2((cr.error||or.error||lr.error||ar.error).message)+'</div>';return}
 const cart=Array.isArray(cr.data?.cart)?cr.data.cart:[],orders=or.data||[],logins=lr.data||[],acts=ar.data||[];
 const spent=orders.reduce((n,o)=>n+Number(o.total||0),0);
 const cartHtml=cart.length?cart.map(x=>'<div class="historyLine"><div><b>'+esc2(x.product_name||x.product||'Product')+'</b><div class="small">'+esc2(x.strength||x.variant||'')+'</div></div><div class="historyRight"><b>×'+Number(x.qty||0)+'</b><span>'+money(Number(x.price||x.unit_price||0)*Number(x.qty||0))+'</span></div></div>').join(''):'<div class="empty mini">Cart is empty.</div>';
 const orderHtml=orders.length?orders.map(o=>'<div class="orderHistory"><div class="historyLine"><div><b>'+esc2(o.order_id||'ORDER')+'</b><div class="small">'+esc2(o.gb_number||'')+' • '+date2(o.created_at)+'</div></div><div class="historyRight"><b>'+money(o.total)+'</b><span class="badge '+(String(o.payment_status||'').toUpperCase()==='PAID'?'approved':'pending')+'">'+esc2(o.payment_status||'PENDING')+'</span></div></div><div class="orderProducts">'+(o.order_items||[]).map(i=>esc2(i.product_name||'Product')+(i.strength?' • '+esc2(i.strength):'')+' ×'+Number(i.qty||0)).join('<br>')+'</div></div>').join(''):'<div class="empty mini">No order history.</div>';
 const loginHtml=logins.length?logins.map(x=>'<div class="simpleHistory"><span>LOGIN</span><b>'+date2(x.logged_in_at)+'</b></div>').join(''):'<div class="empty mini">No login history.</div>';
 const actHtml=acts.length?acts.map(x=>{const d=x.details||{},extra=d.product_name?' • '+esc2(d.product_name)+(d.strength?' '+esc2(d.strength):'')+(d.qty?' ×'+Number(d.qty):''):'';return '<div class="simpleHistory"><span>'+esc2(String(x.action||'ACTIVITY').replaceAll('_',' '))+'</span><b>'+date2(x.created_at)+'</b><small>'+extra+'</small></div>}).join(''):'<div class="empty mini">No activity history.</div>';
 $('customerDetailBody').innerHTML='<div class="customerSummary"><span><b>CART</b>'+qty2(cart)+' items</span><span><b>ORDERS</b>'+orders.length+'</span><span><b>TOTAL SPENT</b>'+money(spent)+'</span><span><b>LOGINS</b>'+logins.length+'</span></div><div class="detailGrid"><div><b>Contact</b><span>'+esc2(u.contact_number||'—')+'</span></div><div><b>WhatsApp</b><span>'+esc2(u.whatsapp_name||'—')+'</span></div><div class="wide"><b>Address</b><span>'+esc2(u.address||'—')+'</span></div><div><b>Account Created</b><span>'+date2(u.created_at)+'</span></div><div><b>Approved</b><span>'+date2(u.approved_at)+'</span></div></div><div class="detailSection"><h3>🛒 CURRENT CART</h3>'+cartHtml+'<div class="small" style="margin-top:8px">Last cart sync: '+date2(cr.data?.updated_at)+'</div></div><div class="detailSection"><h3>📦 ORDER HISTORY</h3>'+orderHtml+'</div><div class="detailSection"><h3>🔐 LOGIN HISTORY</h3>'+loginHtml+'</div><div class="detailSection"><h3>📝 ACTIVITY HISTORY</h3>'+actHtml+'</div>';
}
window.viewEnhancedCustomer=viewEnhancedCustomer;
addModal();
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',function(){setTimeout(loadEnhanced,50)}));
search?.addEventListener('input',function(){renderEnhanced()});
setTimeout(loadEnhanced,150);
})();