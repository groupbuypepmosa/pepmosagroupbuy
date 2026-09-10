(function(){
  'use strict';

  const STYLE_ID='pepmosa-tracking-consolidated-ui-v1';
  const CARD_CLASS='__pepmosaTrackingPolished';

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .trackingConsolidatedNote{
        margin:0 0 14px;
        padding:14px 16px;
        border:1px solid #efd1df;
        border-radius:17px;
        background:linear-gradient(135deg,#fff7fb,#fff);
        color:#6f6068;
        font-size:12px;
        line-height:1.55;
      }
      .trackingConsolidatedNote strong{color:#a53171}
      .checkoutDetails{
        margin-top:12px;
        border:1px solid #ead7e1;
        border-radius:19px;
        background:#fff;
        overflow:hidden;
      }
      .checkoutDetails>summary{
        list-style:none;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:14px 16px;
        background:#fff9fc;
        color:#a53171;
        font-size:11px;
        font-weight:950;
        letter-spacing:.05em;
      }
      .checkoutDetails>summary::-webkit-details-marker{display:none}
      .checkoutDetails>summary:after{content:'+';font-size:20px;line-height:1;color:#c23a82}
      .checkoutDetails[open]>summary:after{content:'−'}
      .checkoutDetails .orderCard{margin:0;border:0;border-top:1px solid #f1e0e8;border-radius:0}
      .checkoutDetails .orderCard:first-of-type{border-top:1px solid #f1e0e8}
      @media(max-width:760px){
        .trackingConsolidatedNote{font-size:11px;padding:12px 14px}
        .checkoutDetails>summary{font-size:10px;padding:13px 14px}
      }
    `;
    document.head.appendChild(s);
  }

  function polish(){
    const out=document.getElementById('out');
    if(!out) return;
    const section=out.querySelector('.orders');
    if(!section || section.dataset.pepmosaConsolidated==='1') return;
    const cards=Array.from(section.querySelectorAll(':scope > .orderCard'));
    const summary=section.querySelector(':scope > .summaryCard');
    if(!summary || !cards.length) return;

    section.dataset.pepmosaConsolidated='1';
    addStyles();

    const head=section.querySelector(':scope > .sectionHead');
    const count=head?.querySelector('.count');
    let checkoutCount=cards.length;
    if(count){
      const m=(count.textContent||'').match(/(\d+)\s+ORDERS?/i);
      if(m) checkoutCount=Number(m[1])||cards.length;
      count.textContent=(checkoutCount===1?'1 CHECKOUT':' '+checkoutCount+' CHECKOUTS').trim() +
        ((count.textContent||'').match(/•\s*[^•]+$/)?.[0]||'');
    }

    const h2=head?.querySelector('h2');
    const p=head?.querySelector('p');
    if(h2) h2.textContent='Your consolidated order';
    if(p) p.textContent='All checkouts in this Group Buy are combined here.';

    const summaryTitle=summary.querySelector('.summaryHead b');
    const summarySub=summary.querySelector('.summaryHead span');
    if(summaryTitle) summaryTitle.textContent='CONSOLIDATED ORDER SUMMARY';
    if(summarySub) summarySub.textContent='All products from your checkouts in '+(window.__PEPMOSA_TRACK_GB||'this Group Buy')+'.';

    const note=document.createElement('div');
    note.className='trackingConsolidatedNote';
    note.innerHTML='<strong>♡ ONE CONSOLIDATED GROUP BUY ORDER</strong><br>You have '+checkoutCount+' checkout'+(checkoutCount===1?'':'s')+' in this Group Buy. We combined them into one order view, so you can see your total quantities without it looking like separate orders.';
    head?.after(note);

    const details=document.createElement('details');
    details.className='checkoutDetails';
    const label=checkoutCount===1?'VIEW YOUR CHECKOUT':'VIEW YOUR '+checkoutCount+' INDIVIDUAL CHECKOUTS';
    details.innerHTML='<summary>'+label+'</summary>';
    cards.forEach(c=>details.appendChild(c));
    summary.after(details);
  }

  function init(){
    const out=document.getElementById('out');
    if(!out) return;
    const observer=new MutationObserver(function(){
      try{polish()}catch(e){console.warn('Tracking UI polish:',e)}
    });
    observer.observe(out,{childList:true,subtree:true});
    polish();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
