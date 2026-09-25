(function(){
  const KEY='pepmosaActivityQueue';
  let lastPage='';
  function safeDetails(v){try{return JSON.parse(JSON.stringify(v||{}))}catch(e){return{}}}
  async function log(action,entityType=null,entityId=null,details={}){
    try{
      const sb=window.sb;if(!sb)return false;
      const r=await sb.rpc('record_site_activity',{p_action:action,p_entity_type:entityType,p_entity_id:entityId,p_page:location.pathname,p_details:safeDetails(details)});
      if(r.error)throw r.error;return true;
    }catch(e){console.warn('PEPMOSA activity log',e);return false}
  }
  async function boot(){
    let tries=0;
    while(!window.sb&&tries<30){await new Promise(r=>setTimeout(r,250));tries++}
    if(!window.sb)return;
    if(lastPage!==location.pathname){lastPage=location.pathname;log('PAGE_VIEW','PAGE',location.pathname,{title:document.title})}
    window.pepLogActivity=log;
    document.addEventListener('click',e=>{
      const el=e.target?.closest?.('[data-audit-action]');
      if(!el)return;
      log(el.dataset.auditAction,el.dataset.auditEntity||'UI',el.dataset.auditId||null,{text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,200)});
    },true);
    document.addEventListener('submit',e=>{
      const f=e.target;if(!f?.dataset?.auditAction)return;
      log(f.dataset.auditAction,f.dataset.auditEntity||'FORM',null,{form:f.id||f.getAttribute('name')||''});
    },true);
    window.addEventListener('beforeunload',()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();