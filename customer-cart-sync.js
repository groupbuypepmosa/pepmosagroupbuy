/* PEPMOSA CLOUD CART
   Keeps the customer's cart attached to their approved account so it follows
   them across phones, computers and browsers. LocalStorage remains the fast
   local cache; Supabase is the cross-device source of truth.
*/
(function(){
  const KEY='pepmosaCart';
  let userId=null, lastSaved='', timer=null, ready=false;

  function readLocal(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'[]');
      return Array.isArray(x)?x:[];
    }catch(e){return[]}
  }
  function cleanCart(x){
    return (Array.isArray(x)?x:[]).filter(i=>i&&i.variant_id&&Number(i.qty)>0).map(i=>({
      gb_number:i.gb_number??null,
      product_id:i.product_id??null,
      variant_id:i.variant_id,
      product_name:i.product_name??'',
      strength:i.strength??'',
      price:Number(i.price||0),
      qty:Number(i.qty||0)
    }));
  }
  function sig(x){try{return JSON.stringify(cleanCart(x))}catch(e){return'[]'}}
  function writeLocal(x){
    const cart=cleanCart(x);
    localStorage.setItem(KEY,JSON.stringify(cart));
    if(Array.isArray(window.cart))window.cart=cart;
    if(typeof window.updateCart==='function'){try{window.updateCart()}catch(e){}}
    window.dispatchEvent(new Event('pepmosa-cart-updated'));
    return cart;
  }
  function merge(a,b){
    const out=[];
    const add=item=>{
      const k=String(item.gb_number||'')+'|'+String(item.variant_id||'');
      const found=out.find(x=>String(x.gb_number||'')+'|'+String(x.variant_id||'')===k);
      if(found)found.qty=Number(found.qty||0)+Number(item.qty||0);
      else out.push({...item});
    };
    [...cleanCart(a),...cleanCart(b)].forEach(add);
    return out;
  }
  async function getUser(){
    const s=window.sb;
    if(!s)return null;
    try{
      const r=await s.auth.getUser();
      return r.data?.user||null;
    }catch(e){return null}
  }
  async function loadCloud(){
    const s=window.sb,u=await getUser();
    if(!s||!u)return;
    userId=u.id;
    try{
      const {data,error}=await s.from('customer_carts').select('cart').eq('user_id',u.id).maybeSingle();
      if(error)throw error;
      const local=cleanCart(readLocal()), cloud=cleanCart(data?.cart||[]);
      const merged=cloud.length?merge(cloud,local):local;
      writeLocal(merged);
      lastSaved=sig(merged);
      if(!data || sig(merged)!==sig(cloud)) await saveCloud(merged);
      ready=true;
    }catch(e){console.warn('PEPMOSA cloud cart load',e);ready=true}
  }
  async function saveCloud(cartValue){
    const s=window.sb;
    if(!s||!userId)return;
    const cart=cleanCart(cartValue), signature=sig(cart);
    if(signature===lastSaved)return;
    try{
      const {error}=await s.from('customer_carts').upsert({
        user_id:userId,cart,updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error)throw error;
      lastSaved=signature;
    }catch(e){console.warn('PEPMOSA cloud cart save',e)}
  }
  function scheduleSave(){
    if(!ready||!userId)return;
    clearTimeout(timer);
    timer=setTimeout(()=>saveCloud(readLocal()),500);
  }
  async function boot(){
    if(!window.sb){setTimeout(boot,400);return}
    await loadCloud();
    window.addEventListener('pepmosa-cart-updated',scheduleSave);
    window.addEventListener('storage',e=>{if(e.key===KEY)scheduleSave()});
    let previous=sig(readLocal());
    setInterval(()=>{
      const now=sig(readLocal());
      if(now!==previous){previous=now;scheduleSave()}
    },800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
