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


/* PEPMOSA isolated GB minimum repair — only touches the GB Category Minimum section. */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const S = () => window.sb || window.__sb;
  const esc2 = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function msg(text,type){
    if(typeof window.showMessage==='function') window.showMessage(text,type||'success');
    else alert(text);
  }
  async function fetchProductsAndVariants(){
    const s=S(); if(!s) throw new Error('Supabase is not initialized.');
    let r=await s.from('products').select('product_id,product_name,category,active,product_variants!product_variants_product_id_fkey(variant_id,strength,active)').eq('active',true).order('product_name');
    if(!r.error) return r.data||[];
    const pr=await s.from('products').select('product_id,product_name,category,active').eq('active',true).order('product_name');
    if(pr.error) throw pr.error;
    const ids=(pr.data||[]).map(x=>x.product_id);
    if(!ids.length) return [];
    const vr=await s.from('product_variants').select('variant_id,product_id,strength,active').in('product_id',ids).eq('active',true);
    if(vr.error) throw vr.error;
    const by=new Map();
    for(const v of vr.data||[]){ if(!by.has(v.product_id)) by.set(v.product_id,[]); by.get(v.product_id).push(v); }
    return (pr.data||[]).map(p=>({...p,product_variants:by.get(p.product_id)||[]}));
  }
  async function allowedCategories(gb){
    const s=S();
    const r=await s.from('gb_categories').select('category_name').eq('gb_number',gb);
    if(r.error) return null;
    const set=new Set((r.data||[]).map(x=>x.category_name).filter(Boolean));
    return set.size ? set : null;
  }
  async function loadMinimums(){
    const select=$('minimumGB'), box=$('minimumList');
    if(!select||!box) return;
    const gb=String(select.value||'').trim();
    if(!gb){ box.textContent='Select a Group Buy.'; return; }
    box.innerHTML='<div class="small">Loading category minimums…</div>';
    try{
      const products=await fetchProductsAndVariants();
      const catsFilter=await allowedCategories(gb);
      const {data:mins,error}=await S().from('gb_minimum_quantities').select('product_id,variant_id,minimum_qty').eq('gb_number',gb);
      if(error) throw error;
      const minMap=new Map((mins||[]).map(x=>[x.product_id+'::'+x.variant_id,Number(x.minimum_qty||1)]));
      const catMap=new Map();
      for(const p of products){
        const cat=String(p.category||'').trim();
        if(!cat || (catsFilter && !catsFilter.has(cat))) continue;
        const variants=(p.product_variants||[]).filter(v=>v.active!==false);
        if(!catMap.has(cat)) catMap.set(cat,[]);
        for(const v of variants) catMap.get(cat).push({product_id:p.product_id,variant_id:v.variant_id,strength:v.strength||''});
      }
      const cats=[...catMap.keys()].sort((a,b)=>a.localeCompare(b));
      if(!cats.length){ box.innerHTML='<div class="empty">No active product variants found for this Group Buy.</div>'; return; }
      box.innerHTML=cats.map(cat=>{
        const vars=catMap.get(cat)||[];
        const values=vars.map(v=>minMap.get(v.product_id+'::'+v.variant_id)).filter(v=>Number.isFinite(v));
        const value=values.length?Math.max(1,values[0]):1;
        return '<div class="categoryLine"><div><b>'+esc2(cat)+'</b><div class="small">'+vars.length+' active variant(s) in this Group Buy</div></div><input class="categoryMinimum" data-category="'+esc2(cat)+'" type="number" min="1" step="1" value="'+value+'"></div>';
      }).join('');
    }catch(e){ console.error('GB minimum load error',e); box.innerHTML='<div class="notice error">'+esc2(e.message||'Unable to load category minimums.')+'</div>'; }
  }
  async function saveMinimums(){
    const select=$('minimumGB'); const gb=String(select?.value||'').trim();
    if(!gb){ msg('Select a Group Buy first.','error'); return; }
    const inputs=[...document.querySelectorAll('#minimumList .categoryMinimum')];
    if(!inputs.length){ msg('No category minimums are loaded yet.','error'); return; }
    try{
      const products=await fetchProductsAndVariants();
      const catValues=new Map(inputs.map(i=>[String(i.dataset.category||''),Math.max(1,Math.floor(Number(i.value||1)))]));
      const rows=[];
      for(const p of products){
        const qty=catValues.get(String(p.category||''));
        if(!qty) continue;
        for(const v of (p.product_variants||[]).filter(v=>v.active!==false)) rows.push({gb_number:gb,product_id:p.product_id,variant_id:v.variant_id,minimum_qty:qty});
      }
      if(!rows.length){ msg('No active variants found to save.','error'); return; }
      const {error}=await S().from('gb_minimum_quantities').upsert(rows,{onConflict:'gb_number,product_id,variant_id'});
      if(error) throw error;
      await loadMinimums();
      msg('Category minimums saved successfully.','success');
    }catch(e){ console.error('GB minimum save error',e); msg(e.message||'Unable to save minimums.','error'); }
  }
  function hook(){
    const select=$('minimumGB'); if(!select||!$('minimumList')) return false;
    if(!select.dataset.pepMinimumHook){
      select.dataset.pepMinimumHook='1';
      select.addEventListener('change',loadMinimums);
      select.addEventListener('input',loadMinimums);
    }
    window.loadCategoryMinimums=loadMinimums;
    window.saveCategoryMinimums=saveMinimums;
    if(select.value) loadMinimums();
    return true;
  }
  let tries=0; const timer=setInterval(()=>{ if(hook()||++tries>200) clearInterval(timer); },100);
})();