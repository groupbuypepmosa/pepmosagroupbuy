(function(){
  'use strict';
  const ACCOUNT='/account.html';
  const RETURN_KEY='pepmosa_auth_return';
  function path(){return window.location.pathname||'/';}
  function isAccount(){return /\/account\.html$/i.test(path());}
  function isApproved(profile,user){
    return !!user && (profile?.is_admin===true || profile?.account_status==='APPROVED') && !!user.email_confirmed_at;
  }
  function goAccount(){
    if(!isAccount()){
      try{sessionStorage.setItem(RETURN_KEY,window.location.pathname+window.location.search+window.location.hash)}catch(e){}
      window.location.replace(ACCOUNT);
    }
  }
  async function check(){
    try{
      const client=window.sb || (typeof initSupabase==='function'?initSupabase():null);
      if(!client)return;
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user){goAccount();return;}
      const {data:profile,error:profileError}=await client.from('profiles').select('account_status,is_admin,email_verified_at').eq('id',user.id).maybeSingle();
      if(profileError||!isApproved(profile,user)){goAccount();return;}
      window.pepmosaCustomerApproved=true;
      document.documentElement.classList.add('pepmosa-approved');
    }catch(e){console.error('PEPMOSA account gate',e);goAccount();}
  }
  function boot(){
    if(isAccount())return;
    document.documentElement.classList.add('pepmosa-auth-checking');
    check().finally(()=>document.documentElement.classList.remove('pepmosa-auth-checking'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();