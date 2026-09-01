/* PEPMOSA admin hotfix: run only database-aligned loaders. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const S=()=>window.sb||window.__sb;
  let installed=false;

  async function loadFeesFixed(){
    const s=S(), box=$('feeList');
    if(!s||!box)return;
    box.innerHTML='Loading…';
    const q=($('feeSearch')?.value||'').trim().toLowerCase();
    let query=s.from('admin_fee_payments').select('*').order('created_at',{ascending:false}).limit(200);
    if(q)query=query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,telegram_name.ilike.%${q}%,phone.ilike.%${q}%`);
    const {data,error}=await query;
    if(error){box.innerHTML='<div class="notice error">Unable to load admin fee payments: '+esc(error.message)+'</div>';return;}
    if(!(data||[]).length){box.innerHTML='<div class="empty">No admin fee payments yet.</div>';return;}
    box.innerHTML=data.map(x=>{
      const st=x.status||'SUBMITTED';
      return `<div class="item"><div class="itemHead"><div><b>${esc(x.full_name||'No name')}</b><div class="small">Telegram: ${esc(x.telegram_name||'—')} • ${esc(x.phone||'—')}</div><div class="small">${esc(x.gb_number)} • ₱${Number(x.amount||0).toLocaleString('en-PH',{minimumFractionDigits:2})} • ${new Date(x.created_at).toLocaleString('en-PH')}</div><div class="small">Email: ${esc(x.email||'Not verified yet')}</div>${x.payment_proof_url?`<div style="margin-top:10px"><a href="${esc(x.payment_proof_url)}" target="_blank" rel="noopener"><img src="${esc(x.payment_proof_url)}" alt="Payment proof" style="max-width:280px;max-height:220px;object-fit:contain;border:1px solid #ead9e4;border-radius:12px"></a></div>`:'<div class="small">Payment proof: missing</div>'}</div><span class="badge ${st==='PAID'?'green':st==='REJECTED'?'red':'yellow'}">${esc(st==='SUBMITTED'?'PENDING':st)}</span></div>${st==='SUBMITTED'?`<div class="actions"><button class="btn success" onclick="window.pepSetFeeStatus('${esc(x.id)}','PAID')">APPROVE PAYMENT</button><button class="btn danger" onclick="window.pepSetFeeStatus('${esc(x.id)}','REJECTED')">REJECT</button></div>`:''}</div>`;
    }).join('');
  }

  window.pepSetFeeStatus=async function(id,status){
    const s=S(); if(!s)return;
    if(!confirm((status==='PAID'?'APPROVE':'REJECT')+' this admin fee payment?'))return;
    const r=await s.from('admin_fee_payments').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)alert(r.error.message); else {await loadFeesFixed(); if(status==='PAID')alert('Admin fee approved. Customer can now verify their email and continue ordering.');}
  };

  async function install(){
    const s=S();
    if(!s||typeof window.loadGroupBuys!=='function'||typeof window.loadCategories!=='function'||typeof window.loadProducts!=='function')return;
    if(installed)return;
    installed=true;
    window.loadFees=loadFeesFixed;
    window.loadEverything=async function(){
      try{
        await Promise.all([window.loadGroupBuys(),window.loadCategories(),window.loadProducts(),loadFeesFixed()]);
        if($('vialTrackerGB'))$('vialTrackerGB').innerHTML='<option value="">All Group Buys</option>'+(window.groupBuys||[]).map(g=>`<option value="${esc(g.gb_number)}">${esc(g.gb_number)} — ${esc(g.customer_facing_name||'')}</option>`).join('');
        if($('minimumGB'))$('minimumGB').innerHTML='<option value="">Select GB</option>'+(window.groupBuys||[]).map(g=>`<option value="${esc(g.gb_number)}">${esc(g.gb_number)} — ${esc(g.customer_facing_name||'')}</option>`).join('');
        if($('globalMsg'))$('globalMsg').innerHTML='';
      }catch(e){console.error('PEPMOSA ADMIN HOTFIX',e);if($('globalMsg'))$('globalMsg').innerHTML='<div class="notice error">'+esc(e.message||'Unable to load admin data.')+'</div>';}
    };
    const feeTab=document.querySelector('[data-panel="feesPanel"]');
    if(feeTab&&!feeTab.dataset.hotfixBound){feeTab.dataset.hotfixBound='1';feeTab.addEventListener('click',()=>setTimeout(loadFeesFixed,30));}
    if($('feeSearch')&&!$('feeSearch').dataset.hotfixBound){$('feeSearch').dataset.hotfixBound='1';$('feeSearch').addEventListener('input',loadFeesFixed);}
    await window.loadEverything();
  }

  let tries=0;
  const timer=setInterval(()=>{install().then(()=>{if(installed)clearInterval(timer)}).catch(console.error);if(++tries>300)clearInterval(timer)},100);
})();
