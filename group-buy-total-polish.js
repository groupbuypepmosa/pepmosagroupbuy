/* PEPMOSA OPEN GROUP BUY — TOTAL ORDERED spotlight
   Shows TOTAL QTY ORDERED prominently on OPEN Group Buy product cards.
   It never counts customers; it sums item quantities only. */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  let totalsByProduct=new Map();
  let lastGB='';
  let loading=false;

  function injectStyles(){
    if($('pepTotalOrderedStyle'))return;
    const s=document.createElement('style');
    s.id='pepTotalOrderedStyle';
    s.textContent=`
      /* OPEN GROUP BUY — prominent TOTAL ORDERED */
      #productGrid .pepStoreCard.pepHasTotalOrdered{position:relative!important}
      .pepTotalOrdered{
        position:relative;
        overflow:hidden;
        margin:12px 0 13px;
        padding:14px 16px 13px;
        border:1px solid rgba(218,46,135,.28);
        border-radius:18px;
        background:linear-gradient(135deg,#fff 0%,#fff3f8 55%,#f7efff 100%);
        box-shadow:0 12px 28px rgba(198,45,124,.10);
      }
      .pepTotalOrdered:before{
        content:"";
        position:absolute;
        width:105px;height:105px;border-radius:50%;
        right:-36px;top:-52px;
        background:radial-gradient(circle,rgba(224,47,141,.16),transparent 68%);
        pointer-events:none;
      }
      .pepTotalOrderedTop{
        position:relative;
        z-index:1;
        display:flex;
        align-items:center;
        gap:9px;
        color:#b92c78;
        font-size:10px;
        font-weight:950;
        letter-spacing:.13em;
      }
      .pepTotalOrderedIcon{
        width:31px;height:31px;
        display:grid;place-items:center;
        border-radius:11px;
        background:linear-gradient(135deg,#e72e8d,#b43eb1);
        color:#fff;
        font-size:17px;
        box-shadow:0 7px 16px rgba(206,44,135,.20);
      }
      .pepTotalOrderedValueRow{
        position:relative;
        z-index:1;
        display:flex;
        align-items:flex-end;
        gap:7px;
        margin-top:8px;
      }
      .pepTotalOrderedValue{
        font-size:clamp(34px,4.1vw,48px);
        line-height:.88;
        font-weight:1000;
        letter-spacing:-.055em;
        color:#d52b87;
      }
      .pepTotalOrderedUnit{
        padding-bottom:3px;
        color:#765462;
        font-size:11px;
        font-weight:950;
        letter-spacing:.08em;
      }
      .pepTotalOrderedNote{
        position:relative;
        z-index:1;
        margin-top:7px;
        color:#8a6978;
        font-size:10px;
        font-weight:800;
      }
      @media(max-width:620px){
        .pepTotalOrdered{margin:11px 0 12px;padding:13px 14px}
        .pepTotalOrderedValue{font-size:42px}
      }
    `;
    document.head.appendChild(s);
  }

  async function getTotals(gbNumber){
    const s=window.sb||window.__sb;
    if(!s||!gbNumber)return null;

    // Preferred: aggregate-only public RPC. This keeps customer/order details private.
    let r=await s.rpc('get_public_gb_order_totals',{p_gb_number:gbNumber});
    if(!r.error && Array.isArray(r.data))return r.data;

    // Compatibility fallback if a public aggregate view already exists.
    const v=await s.from('public_gb_order_totals')
      .select('gb_number,product_id,variant_id,total_qty')
      .eq('gb_number',gbNumber);
    if(!v.error && Array.isArray(v.data))return v.data;

    console.warn('PEPMOSA TOTAL ORDERED unavailable:',r.error?.message||v.error?.message||'No aggregate source');
    return null;
  }

  function applyTotals(){
    const gb=window.currentGB;
    if(!gb||String(gb.status).toUpperCase()!=='OPEN'){
      document.querySelectorAll('.pepTotalOrdered').forEach(x=>x.remove());
      return;
    }

    document.querySelectorAll('#productGrid .pepStoreCard').forEach(card=>{
      const pid=String(card.dataset.productId||'');
      if(!pid)return;

      const old=card.querySelector('.pepTotalOrdered');
      if(old)old.remove();

      if(!totalsByProduct.has(pid))return;
      const qty=Math.max(0,Number(totalsByProduct.get(pid)||0));

      const body=card.querySelector('.pepStoreBody');
      const bottom=body?.querySelector('.pepStoreBottom');
      if(!body||!bottom)return;

      const panel=document.createElement('div');
      panel.className='pepTotalOrdered';
      panel.innerHTML=
        '<div class="pepTotalOrderedTop"><span class="pepTotalOrderedIcon">🛒</span><span>TOTAL ORDERED</span></div>'+
        '<div class="pepTotalOrderedValueRow"><span class="pepTotalOrderedValue">'+esc(qty.toLocaleString('en-PH'))+'</span><span class="pepTotalOrderedUnit">PCS</span></div>'+
        '<div class="pepTotalOrderedNote">Total quantity ordered for this product</div>';

      bottom.parentNode.insertBefore(panel,bottom);
      card.classList.add('pepHasTotalOrdered');
    });
  }

  async function refresh(){
    const gb=window.currentGB;
    if(!gb||String(gb.status).toUpperCase()!=='OPEN')return;
    const gbNumber=String(gb.gb_number||'');
    if(!gbNumber||loading)return;

    loading=true;
    try{
      const rows=await getTotals(gbNumber);
      if(!rows)return;

      const next=new Map();
      rows.forEach(row=>{
        const pid=String(row.product_id||'');
        if(!pid)return;
        next.set(pid,(next.get(pid)||0)+Math.max(0,Number(row.total_qty??row.qty??0)));
      });

      totalsByProduct=next;
      lastGB=gbNumber;
      applyTotals();
    }finally{
      loading=false;
    }
  }

  function boot(){
    injectStyles();

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const gb=window.currentGB;
      if(gb&&$('productGrid')){
        clearInterval(timer);
        refresh();
      }
      if(tries>180)clearInterval(timer);
    },250);

    // Main storefront re-renders product cards after async loads.
    const grid=$('productGrid');
    if(grid){
      new MutationObserver(()=>applyTotals()).observe(grid,{childList:true,subtree:true});
    }

    // Refresh the live total periodically while the Open Group Buy is on screen.
    setInterval(()=>{
      const gb=window.currentGB;
      if(gb&&String(gb.status).toUpperCase()==='OPEN')refresh();
    },30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();