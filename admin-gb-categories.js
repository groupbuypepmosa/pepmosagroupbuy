/* PEPMOSA Group Buy category selector repair */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const S=()=>window.sb||window.__sb;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let ready=false, originalSave=null, originalEdit=null, selectedForSave=[];

  function styles(){
    if($('pepGbCatStyle'))return;
    const s=document.createElement('style');s.id='pepGbCatStyle';
    s.textContent=`
      .pepGbCategories{margin-top:16px;border:1px solid #ead9e5;border-radius:16px;padding:16px;background:#fffafd}
      .pepGbCategoriesHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
      .pepGbCategoriesTitle{font-weight:950}.pepGbCategoriesSub{font-size:12px;color:#786d77;margin-top:4px}
      .pepGbCategoryList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .pepGbCategoryOption{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #ead9e5;border-radius:12px;background:#fff;cursor:pointer}
      .pepGbCategoryOption:hover{border-color:#d72b91}.pepGbCategoryOption input{accent-color:#d72b91;width:17px;height:17px}.pepGbCategoryOption span{font-weight:850}
      .pepGbSelected{font-size:11px;color:#d72b91;font-weight:850;margin-top:10px}
      @media(max-width:700px){.pepGbCategoryList{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function getCategories(){
    const s=S(); if(!s)return [];
    const r=await s.from('categories').select('category_name,active').eq('active',true).order('category_name');
    if(r.error){console.error('PEPMOSA categories',r.error);return []}
    return r.data||[];
  }

  function ensureUI(){
    if(!$('gbStatus')||$('pepGbCategories'))return;
    const statusField=$('gbStatus').closest('.field');
    const box=document.createElement('div');box.id='pepGbCategories';box.className='pepGbCategories';
    box.innerHTML=`<div class="pepGbCategoriesHead"><div><div class="pepGbCategoriesTitle">Categories for this Group Buy *</div><div class="pepGbCategoriesSub">Choose which product categories customers can see in this specific Group Buy.</div></div><button type="button" class="btn secondary" id="pepGbCatRefresh">REFRESH</button></div><div id="pepGbCategoryList" class="pepGbCategoryList"><div class="small">Loading categories…</div></div><div id="pepGbSelected" class="pepGbSelected"></div>`;
    const card=statusField?.parentElement?.parentElement;
    if(card)card.insertBefore(box,card.querySelector('hr')||null);else $('gbPanel')?.querySelector('.card')?.prepend(box);
    $('pepGbCatRefresh').onclick=renderCategories;
  }

  async function renderCategories(preselect){
    ensureUI();const list=$('pepGbCategoryList');if(!list)return;
    const cats=await getCategories();
    if(!cats.length){list.innerHTML='<div class="empty" style="grid-column:1/-1">No active categories. Add a category first in the CATEGORIES tab.</div>';return}
    const chosen=new Set(preselect||[...document.querySelectorAll('.pepGbCatCheck:checked')].map(x=>x.value));
    list.innerHTML=cats.map(c=>`<label class="pepGbCategoryOption"><input class="pepGbCatCheck" type="checkbox" value="${esc(c.category_name)}" ${chosen.has(c.category_name)?'checked':''}><span>${esc(c.category_name)}</span></label>`).join('');
    list.querySelectorAll('.pepGbCatCheck').forEach(x=>x.addEventListener('change',updateSelected));updateSelected();
  }
  function updateSelected(){const x=[...document.querySelectorAll('.pepGbCatCheck:checked')].map(i=>i.value);if($('pepGbSelected'))$('pepGbSelected').textContent=x.length?`${x.length} categor${x.length===1?'y':'ies'} selected: ${x.join(', ')}`:'No categories selected';}
  async function getGBNumberById(id){
    if(!id)return $('gbNumber')?.value?.trim();
    const s=S();const r=await s.from('group_buys').select('gb_number').eq('gb_id',id).maybeSingle();return r.data?.gb_number||$('gbNumber')?.value?.trim();
  }
  async function saveAssociations(gb, names){
    const s=S();if(!s||!gb)return;
    let r=await s.from('gb_categories').delete().eq('gb_number',gb);if(r.error)throw r.error;
    if(names.length){r=await s.from('gb_categories').insert(names.map(category_name=>({gb_number:gb,category_name})));if(r.error)throw r.error;}
  }
  async function loadSelected(gb){
    const s=S();if(!s||!gb)return;
    const r=await s.from('gb_categories').select('category_name').eq('gb_number',gb);if(r.error){console.error('PEPMOSA GB category load',r.error);return}
    await renderCategories((r.data||[]).map(x=>x.category_name));
  }
  function hook(){
    if(ready)return;
    if(typeof window.saveGroupBuy==='function'){
      originalSave=window.saveGroupBuy;
      window.saveGroupBuy=async function(){
        selectedForSave=[...document.querySelectorAll('.pepGbCatCheck:checked')].map(x=>x.value);
        if(!selectedForSave.length){if(typeof showMessage==='function')showMessage('Please select at least one category for this Group Buy.','error');return}
        const gbBefore=$('gbNumber')?.value?.trim();const idBefore=$('editingGBId')?.value;
        await originalSave();
        const gb=await getGBNumberById(idBefore)||gbBefore;
        if(gb)await saveAssociations(gb,selectedForSave);
        if(typeof showMessage==='function')showMessage('Group Buy categories saved.','success');
        selectedForSave=[];await renderCategories([]);
      };
    } else return;
    if(typeof window.editGroupBuy==='function'){
      originalEdit=window.editGroupBuy;
      window.editGroupBuy=function(n){
        const result=originalEdit(n);
        setTimeout(()=>loadSelected(n),50);
        return result;
      };
    }
    if(typeof window.clearGBForm==='function'){
      const oldClear=window.clearGBForm;
      window.clearGBForm=function(){oldClear();renderCategories([])};
    }
    ready=true;styles();ensureUI();renderCategories([]);
  }
  let tries=0;const t=setInterval(()=>{try{hook()}catch(e){console.error(e)}if(++tries>300)clearInterval(t)},100);
})();
