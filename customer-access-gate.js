(function(){
  'use strict';
  const ACCOUNT='/account.html';
  const SHOP='/shop.html';

  function path(){return window.location.pathname||'/';}
  function isAccount(){return /\/account\.html$/i.test(path());}
  function isHome(){return path()==='/' || /\/index\.html$/i.test(path()) || path()==='';}
  function isPublic(){return isHome() || /\/buyers-proof\.html$/i.test(path()) || isAccount();}
  function isApproved(profile,user){
    return !!user &&
      (profile?.is_admin===true || profile?.account_status==='APPROVED') &&
      !!user.email_confirmed_at;
  }
  function goAccount(){
    if(!isAccount()) window.location.replace(ACCOUNT);
  }
  function loginPrompt(){
    const grid=document.getElementById('productGrid');
    if(!grid)return;
    grid.dataset.pepmosaLocked='1';
    grid.innerHTML=
      '<div class="card" style="grid-column:1/-1;text-align:center;padding:42px 24px;border:1px solid rgba(219,62,143,.18);border-radius:24px;background:linear-gradient(135deg,#fffafd,#fff4fa);box-shadow:0 14px 35px rgba(92,43,74,.10)">'+
      '<div style="font-size:34px;margin-bottom:10px">🔐</div>'+
      '<h3 style="margin:0 0 8px;color:#382631">Login to View Price List</h3>'+
      '<p class="muted" style="margin:0 auto 18px;max-width:520px">Please log in to your approved PEPMOSA account to view product prices and place orders.</p>'+
      '<a class="btn primary" href="'+ACCOUNT+'">LOG IN / CREATE ACCOUNT</a>'+
      '</div>';
  }
  function watchHomeProducts(){
    const grid=document.getElementById('productGrid');
    if(!grid || grid.dataset.pepmosaWatch==='1')return;
    grid.dataset.pepmosaWatch='1';
    const observer=new MutationObserver(()=>{
      if(window.pepmosaCustomerApproved===false && !grid.dataset.pepmosaRebuilding){
        grid.dataset.pepmosaRebuilding='1';
        loginPrompt();
        delete grid.dataset.pepmosaRebuilding;
      }
    });
    observer.observe(grid,{childList:true,subtree:true});
  }
  function protectSideRail(approved){
    const rail=document.querySelector('.pepSideRail');
    if(!rail)return;
    rail.classList.toggle('pepmosa-rail-locked',!approved);
    rail.querySelectorAll('a').forEach(a=>{
      if(!a.dataset.pepmosaRailBound){
        a.dataset.pepmosaRailBound='1';
        a.addEventListener('click',function(e){
          if(window.pepmosaCustomerApproved===true)return;
          e.preventDefault();
          e.stopPropagation();
          goAccount();
        });
      }
      if(!approved){
        a.setAttribute('aria-disabled','true');
        a.setAttribute('tabindex','-1');
      }else{
        a.removeAttribute('aria-disabled');
        a.removeAttribute('tabindex');
      }
    });
  }

  function protectHomeProducts(approved){
    protectSideRail(approved);
    if(approved)return;
    watchHomeProducts();
    const products=document.getElementById('products');
    if(products){
      const heading=products.querySelector('h2,h1');
      if(heading){
        const note=document.createElement('div');
        note.id='pepmosa-price-login-note';
        note.style.cssText='margin:10px 0 18px;padding:12px 16px;border-radius:14px;background:#fff0f7;border:1px solid #f2bfd8;color:#9c155d;font-weight:800;font-size:13px;';
        note.textContent='🔐 Log in first to view the PEPMOSA price list and products.';
        heading.insertAdjacentElement('afterend',note);
      }
    }
    loginPrompt();
  }
  async function check(){
    try{
      const client=window.sb || (typeof initSupabase==='function'?initSupabase():null);
      if(!client){
        if(isHome())protectHomeProducts(false); else if(!isPublic())goAccount();
        return;
      }
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user){
        window.pepmosaCustomerApproved=false;
        if(isHome())protectHomeProducts(false);
        else if(!isPublic())goAccount();
        return;
      }
      const {data:profile,error:profileError}=await client.from('profiles').select('account_status,is_admin,email_verified_at').eq('id',user.id).maybeSingle();
      const approved=!profileError&&isApproved(profile,user);
      window.pepmosaCustomerApproved=approved;
      protectSideRail(approved);
      if(approved){
        document.documentElement.classList.add('pepmosa-approved');
        return;
      }
      if(isHome())protectHomeProducts(false);
      else if(!isPublic())goAccount();
    }catch(e){
      console.error('PEPMOSA account gate',e);
      window.pepmosaCustomerApproved=false;
      if(isHome())protectHomeProducts(false);
      else if(!isPublic())goAccount();
    }
  }
  function boot(){
    if(isAccount())return;
    document.documentElement.classList.add('pepmosa-auth-checking');
    check().finally(()=>document.documentElement.classList.remove('pepmosa-auth-checking'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();