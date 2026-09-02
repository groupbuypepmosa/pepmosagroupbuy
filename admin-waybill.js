(function(){
  'use strict';

  function esc(v){
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function peso(v){
    return '₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function css(){
    if(document.getElementById('pepmosa-waybill-v2-style')) return;
    const s=document.createElement('style');
    s.id='pepmosa-waybill-v2-style';
    s.textContent=`
      .waybillPreviewCard{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
      .pepmosaPrintWaybill{background:#fff;border:2px solid #d98ab3;border-radius:22px;color:#2f2a2e;overflow:hidden;box-shadow:0 12px 35px rgba(135,55,98,.10);font-family:Inter,Arial,sans-serif}
      .pwTop{padding:18px 24px 12px;text-align:center;border-bottom:1px solid #f0dce7;background:linear-gradient(180deg,#fff,#fff9fc)}
      .pwTop img{width:56px;height:56px;object-fit:contain;border-radius:50%;display:block;margin:0 auto 7px}
      .pwBrand{font-size:31px;font-weight:950;letter-spacing:.22em;color:#b51f61;margin-left:.22em}
      .pwSub{font-size:10px;font-weight:900;letter-spacing:.18em;color:#8d6178;margin-top:5px}
      .pwBody{padding:18px 22px 22px}
      .pwLabel{font-size:10px;font-weight:950;letter-spacing:.14em;color:#87506a;text-transform:uppercase}
      .pwWaybillBar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #efd7e4;border-radius:15px;padding:14px 16px;background:#fffafd;margin-bottom:12px}
      .pwWaybillNo{font-size:21px;font-weight:950;word-break:break-word;color:#2d2830;margin-top:4px}
      .pwCustomerEmail{text-align:right;font-size:13px;color:#5c5057}
      .pwGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
      .pwField{border:1px solid #efdce7;border-radius:13px;padding:11px 12px;background:#fff}
      .pwField.full{grid-column:1/-1}
      .pwField b{display:block;font-size:13px;color:#2f2930;margin-top:5px;line-height:1.35}
      .pwField div:last-child{font-size:13px;color:#2f2930;margin-top:5px;line-height:1.45;white-space:pre-wrap}
      .pwTable{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      .pwTable th,.pwTable td{border:1px solid #efd7e4;padding:8px 9px;text-align:left}
      .pwTable th{background:#fff2f8;color:#7d4961;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
      .pwTable td.num,.pwTable th.num{text-align:right}
      .pwTotals{margin-left:auto;margin-top:13px;width:min(420px,100%);border-top:2px solid #d98ab3;padding-top:8px}
      .pwTotalRow{display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:13px}
      .pwGrand{font-size:22px;font-weight:950;color:#b51f61;padding-top:6px}
      .pwStatus{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:16px;padding:12px 0;border-top:1px solid #efdce7;font-size:11px;font-weight:900}
      .pwStatus b{color:#b51f61}
      .pwFooter{padding:12px 22px;border-top:1px solid #f0dce7;text-align:center;font-size:10px;color:#8d7480;background:#fffafd}
      @media(max-width:620px){.pwGrid{grid-template-columns:1fr}.pwCustomerEmail{text-align:left}.pwWaybillBar{grid-template-columns:1fr}.pwBrand{font-size:25px}.pwBody{padding:14px}.pwTable{font-size:10px}.pwTable th,.pwTable td{padding:6px}}
    `;
    document.head.appendChild(s);
  }

  function logoSrc(){
    return 'pepmosa-logo.png';
  }

  function currentRow(){
    try{
      return typeof getSelectedWaybill==='function' ? getSelectedWaybill() : null;
    }catch(_){ return null; }
  }

  function renderV2(){
    const box=document.getElementById('waybillPreview');
    if(!box) return;
    const r=currentRow();
    if(!r){
      box.innerHTML='<div class="waybillEmpty">Select a buyer to preview the ready-to-print consolidated waybill.</div>';
      return;
    }
    const email=String(r.email||'').toLowerCase();
    const slug=(email.split('@')[0]||'CUSTOMER').replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,18)||'CUSTOMER';
    const orderIds=(r.orders||[]).map(o=>o.order_id).filter(Boolean);
    const waybillNo=r.waybill_number||('WB-PEPMOSA-'+slug);
    const shippingFee=Number(r.shipping||0);
    const total=Number(r.total||0);
    const consolidatedTotal=total;
    const status=r.shipment_status||'PAYMENT CONFIRMED';
    const productRows=(r.products||[]).map(p=>{
      const qty=Number(p.qty||0);
      const line=Number(p.line_total||0);
      return '<tr><td>'+esc(p.product_name||'Product')+'</td><td>'+esc(p.strength||'—')+'</td><td class="num">'+qty+'</td><td class="num">'+peso(line)+'</td></tr>';
    }).join('') || '<tr><td colspan="4">No product details available.</td></tr>';

    box.innerHTML=
      '<div id="printWaybillArea" class="pepmosaPrintWaybill">'+
        '<div class="pwTop">'+
          '<img src="'+logoSrc()+'" alt="PEPMOSA" onerror="this.style.display=\'none\'">'+
          '<div class="pwBrand">PEPMOSA</div>'+
          '<div class="pwSub">GROUP BUY • CONSOLIDATED WAYBILL</div>'+
        '</div>'+
        '<div class="pwBody">'+
          '<div class="pwWaybillBar">'+
            '<div><div class="pwLabel">Waybill</div><div class="pwWaybillNo">'+esc(waybillNo)+'</div></div>'+
            '<div class="pwCustomerEmail"><div class="pwLabel">Customer Email</div><b>'+esc(email||'—')+'</b></div>'+
          '</div>'+
          '<div class="pwGrid">'+
            '<div class="pwField"><div class="pwLabel">Customer</div><b>'+esc(r.customer_name||email||'—')+'</b></div>'+
            '<div class="pwField"><div class="pwLabel">Contact</div><b>'+esc(r.contact||'Not set')+'</b></div>'+
            '<div class="pwField"><div class="pwLabel">Email</div><b>'+esc(email||'—')+'</b></div>'+
            '<div class="pwField"><div class="pwLabel">GB / Orders</div><b>'+esc(String((r.orders||[]).length||0))+' consolidated order(s)</b></div>'+
            '<div class="pwField full"><div class="pwLabel">Delivery Address</div><div>'+esc(r.address||'Address not set')+'</div></div>'+
            '<div class="pwField"><div class="pwLabel">Shipping</div><b>'+esc(r.shipping_method||r.courier||'To be assigned')+'</b></div>'+
            '<div class="pwField"><div class="pwLabel">Tracking No.</div><b>'+esc(r.tracking_number||'—')+'</b></div>'+
          '</div>'+
          '<table class="pwTable"><thead><tr><th>Product</th><th>Strength / Variant</th><th class="num">Qty</th><th class="num">Total</th></tr></thead><tbody>'+productRows+'</tbody></table>'+
          '<div class="pwTotals">'+
            '<div class="pwTotalRow"><span>SHIPPING</span><b>'+peso(shippingFee)+'</b></div>'+
            '<div class="pwTotalRow pwGrand"><span>CONSOLIDATED TOTAL</span><span>'+peso(consolidatedTotal)+'</span></div>'+
          '</div>'+
          '<div class="pwStatus"><span>ORDER STATUS</span><b>'+esc(status==='READY TO PRINT'?'PAYMENT CONFIRMED':status)+'</b></div>'+
        '</div>'+
        '<div class="pwFooter">PEPMOSA • One email = one consolidated packing reference • Orders: '+esc(orderIds.join(', ')||'—')+'</div>'+
      '</div>';
  }

  function printV2(){
    const area=document.getElementById('printWaybillArea');
    const r=currentRow();
    if(!area||!r){
      if(typeof showMessage==='function') showMessage('Select a buyer first.','error');
      return;
    }
    const w=window.open('','_blank','width=900,height=1100');
    if(!w){
      if(typeof showMessage==='function') showMessage('Please allow pop-ups to print the waybill.','error');
      return;
    }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>PEPMOSA Waybill</title><style>'+
      'body{margin:0;padding:18px;font-family:Arial,sans-serif;color:#2f2a2e}*{box-sizing:border-box}.pepmosaPrintWaybill{background:#fff;border:2px solid #d98ab3;border-radius:22px;overflow:hidden}.pwTop{padding:18px 24px 12px;text-align:center;border-bottom:1px solid #f0dce7}.pwTop img{width:56px;height:56px;object-fit:contain;border-radius:50%;display:block;margin:0 auto 7px}.pwBrand{font-size:31px;font-weight:950;letter-spacing:.22em;color:#b51f61;margin-left:.22em}.pwSub{font-size:10px;font-weight:900;letter-spacing:.18em;color:#8d6178;margin-top:5px}.pwBody{padding:18px 22px}.pwLabel{font-size:10px;font-weight:950;letter-spacing:.14em;color:#87506a;text-transform:uppercase}.pwWaybillBar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #efd7e4;border-radius:15px;padding:14px 16px;background:#fffafd;margin-bottom:12px}.pwWaybillNo{font-size:21px;font-weight:950;word-break:break-word;color:#2d2830;margin-top:4px}.pwCustomerEmail{text-align:right;font-size:13px;color:#5c5057}.pwGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.pwField{border:1px solid #efdce7;border-radius:13px;padding:11px 12px;background:#fff}.pwField.full{grid-column:1/-1}.pwField b{display:block;font-size:13px;color:#2f2930;margin-top:5px;line-height:1.35}.pwField div:last-child{font-size:13px;color:#2f2930;margin-top:5px;line-height:1.45;white-space:pre-wrap}.pwTable{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}.pwTable th,.pwTable td{border:1px solid #efd7e4;padding:8px 9px;text-align:left}.pwTable th{background:#fff2f8;color:#7d4961;font-size:10px;letter-spacing:.06em;text-transform:uppercase}.pwTable td.num,.pwTable th.num{text-align:right}.pwTotals{margin-left:auto;margin-top:13px;width:min(420px,100%);border-top:2px solid #d98ab3;padding-top:8px}.pwTotalRow{display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:13px}.pwGrand{font-size:22px;font-weight:950;color:#b51f61;padding-top:6px}.pwStatus{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:16px;padding:12px 0;border-top:1px solid #efdce7;font-size:11px;font-weight:900}.pwStatus b{color:#b51f61}.pwFooter{padding:12px 22px;border-top:1px solid #f0dce7;text-align:center;font-size:10px;color:#8d7480;background:#fffafd}@media print{body{padding:0}}'+
      '</style></head><body>'+area.outerHTML+'</body></html>');
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(),350);
  }

  function install(){
    css();
    if(typeof window.renderSelectedWaybill==='function'){
      window.renderSelectedWaybill=renderV2;
      window.printSelectedWaybill=printV2;
      const oldLoad=window.loadWaybillCenter;
      if(typeof oldLoad==='function' && !oldLoad.__pepmosaV2){
        const wrapped=async function(){
          const out=await oldLoad.apply(this,arguments);
          renderV2();
          return out;
        };
        wrapped.__pepmosaV2=true;
        window.loadWaybillCenter=wrapped;
      }
      renderV2();
      return true;
    }
    return false;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>80) clearInterval(timer);
  },100);
})();