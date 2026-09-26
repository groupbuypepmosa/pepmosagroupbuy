(function(){
  function safeDetails(v){try{return JSON.parse(JSON.stringify(v||{}))}catch(e){return{}}}
  async function log(action,entityType=null,entityId=null,details={}){
    try{
      const sb=window.sb;if(!sb)return false;
      const r=await sb.rpc('record_site_activity',{p_action:action,p_entity_type:entityType,p_entity_id:entityId,p_page:location.pathname,p_details:safeDetails(details)});
      if(r.error)throw r.error;
      return true;
    }catch(e){console.warn('PEPMOSA activity log',e);return false}
  }
  async function boot(){
    let tries=0;
    while(!window.sb&&tries<30){await new Promise(r=>setTimeout(r,250));tries++}
    if(!window.sb)return;
    window.pepLogActivity=log;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();