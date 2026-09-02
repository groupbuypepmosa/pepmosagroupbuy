(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₱'+(Number(v)||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});

const style=document.createElement('style');
style.textContent=`
.pepCleanCard{padding:0!important;overflow:hidden;border-radius:24px!important}.pepCleanCard .productImg{height:210px!important;margin:0!important;border:0!important;border-radius:0!important}.pepCleanBody{padding:16px}.pepCleanFoot{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px dashed #ead8e3;padding-top:13px}.pepStart{font-size:10px;color:#8d7580}.pepStart b{display:block;font-size:15px;color:#3a2933}.pepProductModal{position:fixed;inset:0;z-index:100200;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(48,25,40,.64);backdrop-filter:blur(8px)}.pepProductModal.open{display:flex}.pepProductModalBox{width:min(680px,100%);max-height:92vh;overflow:auto;position:relative;border-radius:28px;background:linear-gradient(145deg,#fff,#fff9fc 58%,#f8efff);border:1px solid #efd5e4;box-shadow:0 30px 100px rgba(55,18,43,.34);padding:28px}.pepProductClose{position:absolute;right:16px;top:14px;width:38px;height:38px;border-radius:50%;border:1px solid #edd3df;background:#fff;font-size:24px;cursor:pointer}.pepHero{display:grid;grid-template-columns:145px 1fr;gap:20px;align-items:center;padding-right:36px}.pepHeroImg{height:145px;border-radius:20px;overflow:hidden;background:#fff1f7}.pepHeroImg img{width:100%;height:100%;object-fit:cover}.pepHero h2{margin:5px 0 8px;font-size:29px}.pepTitle{margin:23px 0 10px;font-size:10px;letter-spacing:.12em;font-weight:950;color:#a04b78}.pepChoices{display:grid;gap:9px}.pepChoice{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;border:1px solid #ead8e3;background:#fff;border-radius:16px;padding:14px 16px;cursor:pointer;color:#35252e}.pepChoice span{display:flex;flex-direction:column;gap:3px}.pepChoice small,.pepHint{font-size:10px;color:#8b7780}.pepChoice.selected{border-color:#d9509b;background:#fff1f7;box-shadow:0 0 0 3px rgba(217,80,155,.08)}.pepQtyRow{margin-top:16px;padding:16px;border-radius:18px;background:#fff;border:1px solid #eedce6;display:flex;justify-content:space-between;align-items:center;gap:16px}.pepStepper{display:grid;grid-template-columns:40px 70px 40px}.pepStepper button,.pepStepper input{height:42px;border:1px solid #ead5e0;text-align:center}.pepStepper button{background:#fff7fb;color:#b3347a;font-size:22px;font-weight:900;cursor:pointer}.pepSub{display:flex;justify-content:space-between;margin-top:16px;padding:16px 2px;border-top:1px solid #efdee7}.pepSub b{font-size:22px;color:#c52e7d}.pepAdd{width:100%;min-height:52px;border-radius:16px!important}@media(max-width:620px){.pepCleanCard .productImg{height:225px!important}.pepProductModal{align-items:flex-end;padding:8px}.pepProductModalBox{padding:22px 18px 20px;border-radius:26px 26px 18px 18px;max-height:94vh}.pepHero{grid-template-columns:95px 1fr;gap:13px}.pepHeroImg{height:95px}.pepHero h2{font-size:23px}.pepQtyRow{align-items:flex-start;flex-direction:column}.pepStepper{width:100%;grid-template-columns:1fr 72px 1fr}.pepStepper input{width:72px}}
`;
document.head.appendChild(style);

function getProductData(card){
  const name=card.querySelector('h3')?.textContent.trim()||'Product';
  const desc=card.querySelector('.muted')?.textContent.trim()||'';
  const img=card.querySelector('.productImg img')?.src||'';
  const rows=[...card.querySelectorAll('button[onclick*="ToCart"]')].map(button=>{
    const row=button.parentElement;
    const raw=button.getAttribute('onclick')||'';
    const m=raw.match(/(?:pep)?AddToCart\(\s*'([^']+)'\s*,\s*'([^']+)'/i);
    if(!m)return null;
    const strength=row.querySelector('b')?.textContent.trim()||'';
    const text=row.textContent||'';
    const price=Number(((text.match(/₱\s*([\d,]+(?:\.\d+)?)/)||[])[1]||'0').replace(/,/g,''));
    const input=row.querySelector('input');
    const min=Math.max(1,Number(input?.min||input?.value||1));
    return {pid:m[1],vid:m[2],strength,price,min};
  }).filter(Boolean);
  return {name,desc,img,rows};
}

function openPicker(data){
  let modal=$('pepProductModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='pepProductModal';
    modal.className='pepProductModal';
    modal.innerHTML='<div class="pepProductModalBox"><button class="pepProductClose" type="button">×</button><div id="pepModalBody"></div></div>';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
    document.body.appendChild(modal);
    modal.querySelector('.pepProductClose').onclick=()=>modal.classList.remove('open');
  }

  let variant=data.rows[0],qty=variant.min;
  const body=$('pepModalBody');

  const render=()=>{
    qty=Math.max(variant.min,Number(qty)||variant.min);
    body.innerHTML='<div class="pepHero"><div class="pepHeroImg">'+(data.img?'<img src="'+esc(data.img)+'">':'')+'</div><div><div class="eyebrow">PEPMOSA GROUP BUY</div><h2>'+esc(data.name)+'</h2><p class="muted">'+esc(data.desc||'Choose your variant and quantity.')+'</p></div></div><div class="pepTitle">CHOOSE VARIANT</div><div class="pepChoices">'+data.rows.map(x=>'<button class="pepChoice '+(x.vid===variant.vid?'selected':'')+'" data-v="'+esc(x.vid)+'" type="button"><span><b>'+esc(x.strength)+'</b><small>Minimum '+x.min+' pc</small></span><strong>'+money(x.price)+'</strong></button>').join('')+'</div><div class="pepQtyRow"><div><div class="pepTitle" style="margin:0 0 4px">QUANTITY</div><div class="pepHint">Minimum '+variant.min+' pc for this variant</div></div><div class="pepStepper"><button id="pepMinus" type="button">−</button><input id="pepModalQty" type="number" min="'+variant.min+'" value="'+qty+'"><button id="pepPlus" type="button">+</button></div></div><div class="pepSub"><span>SUBTOTAL</span><b id="pepSubtotal">'+money(variant.price*qty)+'</b></div><button id="pepModalAdd" class="pepFeeBtn pepAdd" type="button">ADD TO CART</button>';

    body.querySelectorAll('.pepChoice').forEach(b=>b.onclick=()=>{
      variant=data.rows.find(x=>x.vid===b.dataset.v)||data.rows[0];
      qty=variant.min;
      render();
    });

    const input=$('pepModalQty');
    const sync=()=>{
      qty=Math.max(variant.min,Number(input.value)||variant.min);
      input.value=qty;
      $('pepSubtotal').textContent=money(variant.price*qty);
    };
    $('pepMinus').onclick=()=>{qty=Math.max(variant.min,qty-1);input.value=qty;sync()};
    $('pepPlus').onclick=()=>{qty++;input.value=qty;sync()};
    input.oninput=sync;

    $('pepModalAdd').onclick=()=>{
      sync();
      let hidden=$('pepQty_'+variant.vid);
      if(!hidden){
        hidden=document.createElement('input');
        hidden.type='hidden';
        hidden.id='pepQty_'+variant.vid;
        document.body.appendChild(hidden);
      }
      hidden.value=qty;
      const add=window.pepAddToCart||window.addToCart;
      if(typeof add==='function')add(variant.pid,variant.vid);
      modal.classList.remove('open');
    };
  };

  render();
  modal.classList.add('open');
}

function clean(){
  const grid=$('productGrid');
  if(!grid||grid.dataset.pepClean==='1')return;
  const cards=[...grid.querySelectorAll('.card')];
  if(!cards.some(card=>card.querySelector('button[onclick*="ToCart"]')))return;

  cards.forEach(card=>{
    const data=getProductData(card);
    if(!data.rows.length)return;
    const low=Math.min(...data.rows.map(x=>x.price));
    card.classList.add('pepCleanCard');
    card.innerHTML='<div class="productImg">'+(data.img?'<img src="'+esc(data.img)+'">':'')+'</div><div class="pepCleanBody"><h3>'+esc(data.name)+'</h3><div class="muted">'+esc(data.desc)+'</div><div class="pepCleanFoot"><div class="pepStart">Starting at <b>'+money(low)+'</b></div><button class="pepFeeBtn pepSelect" type="button">SELECT VARIANT</button></div></div>';
    card.querySelector('.pepSelect').onclick=()=>openPicker(data);
  });
  grid.dataset.pepClean='1';
}

function watch(){clean();requestAnimationFrame(watch)}
watch();
})();