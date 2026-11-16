(function () {
 'use strict';
 const C = ContactCore, $ = id => document.getElementById(id);
 const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon = (name,cls='') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
 const STORE = 'contacts-course-v1-', PREF = STORE+'space';
 let space = 'demo', contacts = [], selected = null, view='all', group='all', layout='list', pendingImport=null, deleting=null, undo=null, toastTimer, dirty=false, loadedSafely=true, excelPromise=null;
 function demoContacts() {
  return [
   {name:'Lin Xu',company:'Example Design Team',role:'Product designer',group:'Work',favorite:true,notes:'Fictional demo: a product design collaborator.\nSend a short introduction by email first.',methods:[{type:'Phone',value:'Demo phone 01'},{type:'Email',value:'lin.xu@example.com'},{type:'WeChat',value:'demo_linxu'}]},
   {name:'Chen He',company:'Example Engineering Team',role:'Frontend engineer',group:'Work',favorite:true,notes:'Fictional demo: a course project collaborator.',methods:[{type:'Email',value:'chen.he@example.com'},{type:'WeChat',value:'demo_chenhe'}]},
   {name:'Zhou Cheng',company:'Photography Club',role:'',group:'Friends',favorite:false,notes:'Fictional demo: met at a campus event.',methods:[{type:'WeChat',value:'demo_zhoucheng'},{type:'Email',value:'zhou.cheng@example.com'}]},
   {name:'Xu Wen',company:'Example Research Team',role:'Research assistant',group:'Work',favorite:false,notes:'Fictional demo: email is preferred.',methods:[{type:'Email',value:'xu.wen@example.com'},{type:'Phone',value:'Demo phone 04'}]},
   {name:'Wen Zhu',company:'',role:'',group:'Family',favorite:true,notes:'Fictional demo: catch up at the weekend.',methods:[{type:'Phone',value:'Demo phone 05'},{type:'Phone',value:'Demo phone 06'},{type:'WeChat',value:'demo_wenzhu'}]},
   {name:'Jiang Yu',company:'Book Club',role:'',group:'Friends',favorite:false,notes:'Fictional demo: a book club contact.',methods:[{type:'Email',value:'jiang.yu@example.com'},{type:'QQ',value:'demo_jiangyu'}]},
   {name:'Song Yao',company:'Example Studio',role:'Illustrator',group:'Work',favorite:false,notes:'Fictional demo: email to arrange a call.',methods:[{type:'Email',value:'song.yao@example.com'},{type:'Portfolio',value:'https://example.com/demo-portfolio'}]},
   {name:'Gu Ning',company:'',role:'',group:'Ungrouped',favorite:false,notes:'Fictional demo: a contact to organize later.',methods:[{type:'WeChat',value:'demo_guning'}]}
  ].map((c,i)=>C.normalize({...c,id:'demo-'+i,updatedAt:'2026-11-16T01:00:00.000Z'}));
 }
 function storageWarning(text) {$('storage-alert').hidden=false; $('storage-alert').textContent=text; $('save-state').textContent='Browser storage unavailable';}
 function load() {
  try {space = localStorage.getItem(PREF) === 'personal' ? 'personal' : 'demo';} catch {storageWarning('Browser storage is blocked. Allow storage for this site, or export an Excel backup of your current data.');}
  loadSpace();
 }
 function loadSpace() {
  loadedSafely = true;
  try {
   const raw = localStorage.getItem(STORE+space);
   if (raw === null) contacts = space === 'demo' ? demoContacts() : [];
   else {
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.some(c=>!c || typeof c!=='object' || !c.name || !Array.isArray(c.methods) || c.methods.some(m=>!m || typeof m!=='object'))) throw new Error('bad storage');
    contacts = data.map(C.normalize);
   }
  } catch {contacts = space === 'demo' ? demoContacts() : []; loadedSafely=false; storageWarning('Saved data could not be read. Changes are blocked to protect the original records. Back up your browser data before trying another browser.');}
  selected=contacts.some(c=>c.id==='demo-0')?'demo-0':contacts[0]?.id || null;
 }
 function commit(next) {
  if (!loadedSafely) {toast('The original data could not be read. No changes were saved.');return false;}
  try {localStorage.setItem(STORE+space, JSON.stringify(next));}
  catch {storageWarning('Could not save. Your data has not changed. Check browser storage permissions and available space, then export a backup.');return false;}
  contacts=next;
  $('save-state').innerHTML='<span class="status-dot"></span>Saved on this device';
  return true;
 }
 function avatar(c,large=false) {const color=[...c.name].reduce((n,x)=>n+x.codePointAt(0),0)%6;return `<span class="avatar color-${color}${large?' large':''}" aria-hidden="true">${esc(/\p{Script=Latin}/u.test(c.name) ? c.name.trim().split(/\s+/).map(part=>[...part][0]).slice(0,2).join('').toUpperCase() : [...c.name].slice(-2).join(''))}</span>`;}
 function star(c) {return `<button class="star-button" data-star="${esc(c.id)}" aria-label="${c.favorite?'Remove from favorites: ':'Add to favorites: '}${esc(c.name)}" aria-pressed="${c.favorite}" title="${c.favorite?'Remove from favorites':'Add to favorites'}">${icon('star')}</button>`;}
 function currentList() {return C.filter(contacts,{q:$('search').value,view,group,sort:$('sort').value});}
 function render() {
  $('space-label').textContent=space==='demo'?'Demo space':'My address book';
  $('demo-banner').hidden=space!=='demo'; $('demo-banner').style.display=space==='demo'?'flex':'none';
  $('switch-space').innerHTML=icon('arrow')+`<span>${space==='demo'?'My address book':'View demo space'}</span>`;
  $('footer-switch').textContent=space==='demo'?'My address book':'View demo space';
  $('count-all').textContent=contacts.length; $('count-favorites').textContent=contacts.filter(c=>c.favorite).length;
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view && group==='all';b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('groups').innerHTML=C.GROUPS.map((g,i)=>`<button data-group="${g}" class="${group===g?'active':''}" ${group===g?'aria-current="page"':''}><span class="group-dot g-${i}"></span>${g}<span class="nav-count">${contacts.filter(c=>c.group===g).length}</span></button>`).join('');
  const title=group!=='all'?group+' contacts':view==='favorites'?'Favorites':'All contacts';
  $('breadcrumb-current').textContent=title;
  const filtered=currentList();
  $('page-title').innerHTML=esc(title)+`<span id="total-badge">${filtered.length}</span>`;
  $('page-description').textContent=view==='favorites'?'Find your favorite people faster.':'Keep the people you contact within reach.';
  document.querySelectorAll('[data-mobile-view]').forEach(b=>{const active=b.dataset.mobileView===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('mobile-group').value=group;
  if (filtered.length && !filtered.some(c=>c.id===selected)) selected=filtered[0].id;
  if (!filtered.length) selected=null;
  renderList(filtered); renderDetail();
 }
 function renderList(list) {
  $('list-table').classList.toggle('grid-view',layout==='grid');
  $('view-list').classList.toggle('selected',layout==='list');$('view-list').setAttribute('aria-pressed',String(layout==='list'));
  $('view-grid').classList.toggle('selected',layout==='grid');$('view-grid').setAttribute('aria-pressed',String(layout==='grid'));
  if (!list.length) {
   const searching=$('search').value || group!=='all';
   const title=searching?'No matching contacts':view==='favorites'?'No favorites yet':'Add your first contact';
   const subtitle=searching?'Try another search, or clear your filters.':view==='favorites'?'Select a contact’s star to find them here.':'Add someone new, or import your address book from Excel.';
   $('contact-list').innerHTML=`<div class="empty"><div class="empty-icon">${icon(searching?'search':view==='favorites'?'star':'book')}</div><h2>${title}</h2><p>${subtitle}</p>${searching?'<button class="button secondary" data-clear>Clear filters</button>':view==='favorites'?'<button class="button secondary" data-show-all>View all contacts</button>':'<button class="button primary" data-new>New contact</button><button class="button secondary" data-import>Import Excel</button>'}</div>`;
  } else $('contact-list').innerHTML=list.map(c=>{
   const primary=c.methods.find(m=>m.type==='Email')||c.methods[0];
   return `<article class="contact-row ${selected===c.id?'is-selected':''}" aria-label="${esc(c.name)}"><button class="contact-open" data-open="${esc(c.id)}" aria-label="View ${esc(c.name)}’s details" aria-pressed="${selected===c.id}">${avatar(c)}<span class="person-text"><span class="person-name">${esc(c.name)}</span><span class="person-sub">${esc([c.company,c.role].filter(Boolean).join(' / ')||'No company or job title')}</span></span></button><div class="method-summary"><span>${esc(primary?.value||'No contact details')}</span><small>${C.count(c.methods.length,"contact method")}</small></div><span class="group-tag tag-${esc(c.group)}">${esc(c.group)}</span>${star(c)}</article>`;
  }).join('');
  $('result-count').textContent=$('search').value||view==='favorites'||group!=='all'?`${list.length} of ${C.count(contacts.length,"contact")}`:`${C.count(contacts.length,"contact")}`;
 }
 function methodIcon(type) {return ({Phone:'phone',Email:'mail',WeChat:'chat',QQ:'chat',Address:'pin'})[type] || 'book';}
 function renderDetail() {
  const pane=$('detail-pane'), c=contacts.find(x=>x.id===selected);
  if (!c) {closeDetail();pane.innerHTML=`<div class="detail-empty">${icon('book')}<p>Select a contact<br>to see their details here</p></div>`;return;}
  pane.innerHTML=`<div class="detail-top"><span>Contact details</span><div class="detail-top-right"><button class="icon-button" data-edit="${esc(c.id)}" aria-label="Edit ${esc(c.name)}" title="Edit contact">${icon('edit')}</button><button class="icon-button" data-delete="${esc(c.id)}" aria-label="Delete ${esc(c.name)}" title="Delete contact">${icon('trash')}</button><button class="icon-button detail-close" data-detail-close aria-label="Back to contacts">${icon('close')}</button></div></div><div class="detail-identity">${avatar(c,true)}<h2>${esc(c.name)}</h2><p>${esc([c.company,c.role].filter(Boolean).join(' / ')||'No company or job title')}</p><span class="group-tag tag-${esc(c.group)}">${esc(c.group)}</span></div><div class="detail-actions"><button class="button secondary" data-edit="${esc(c.id)}">${icon('edit')}Edit contact</button><button class="button secondary" data-star="${esc(c.id)}" aria-pressed="${c.favorite}">${icon('star')}${c.favorite?'Favorited':'Add to favorites'}</button></div><div class="detail-section"><h3>Contact methods <span>(${c.methods.length})</span></h3>${c.methods.map((m,i)=>`<div class="detail-method"><span class="method-icon">${icon(methodIcon(m.type))}</span><div class="method-value"><span>${esc(m.type)}</span><p>${m.type==='Email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.value)?`<a href="mailto:${esc(encodeURIComponent(m.value))}">${esc(m.value)}</a>`:m.type==='Phone'&&/^\+?[\d\s()-]{5,30}$/.test(m.value)?`<a href="tel:${esc(m.value.replace(/[^+\d]/g,''))}">${esc(m.value)}</a>`:esc(m.value)}</p></div><button class="copy-button" data-copy="${i}" aria-label="Copy ${esc(m.type)}" title="Copy ${esc(m.type)}">${icon('copy')}</button></div>`).join('')}</div><div class="detail-section"><h3>Notes</h3><p class="detail-notes">${esc(c.notes||'No notes yet')}</p></div><div class="detail-date">Updated ${esc(new Date(c.updatedAt).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}))}</div>`;
 }
 function toast(text,action) {
  clearTimeout(toastTimer); $('toast').textContent=text;
  if(action){const b=document.createElement('button');b.textContent=action.label;b.onclick=()=>{action.run();$('toast').classList.remove('show');};$('toast').appendChild(b);}
  $('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),action?10000:4200);
 }
 function closeDetail() {
  $('detail-pane').classList.remove('mobile-open');$('detail-pane').removeAttribute('role');$('detail-pane').removeAttribute('aria-modal');
  document.querySelectorAll('[data-detail-inert]').forEach(el=>{el.inert=false;el.removeAttribute('data-detail-inert');});
 }
 function showDetail() {
  $('detail-pane').classList.add('mobile-open');$('detail-pane').setAttribute('role','dialog');$('detail-pane').setAttribute('aria-modal','true');$('detail-pane').setAttribute('tabindex','-1');
  document.querySelectorAll('.sidebar,.topbar,.page-head,.demo-banner,.contacts-pane,.workspace-footer').forEach(el=>{el.inert=true;el.setAttribute('data-detail-inert','');});
  $('detail-pane').focus();
 }
 function setSpace(next) {
  try {localStorage.setItem(PREF,next);} catch {toast('Could not switch spaces. Allow this site to use browser storage.');return;}
  space=next;group='all';view='all';$('search').value='';undo=null;pendingImport=null;
  closeDetail();loadSpace();render();toast(next==='personal'?'Switched to your address book':'Switched to the fictional demo space');
 }
 function addMethod(type='Phone',value='') {
  if($('method-rows').children.length>=50){toast('Each contact can have up to 50 contact methods.');return;}
  const row=document.createElement('div');row.className='method-row';
  const isCustom=!C.TYPES.includes(type);
  row.innerHTML=`<label class="sr-only">Contact method type</label><select class="method-type" aria-label="Contact method type">${C.TYPES.filter(t=>t!=='Other').concat('Custom').map(t=>`<option ${t===(isCustom||type==='Other'?'Custom':type)?'selected':''}>${t}</option>`).join('')}</select><label class="sr-only">Contact detail</label><input class="method-input" aria-label="Contact detail" maxlength="2000" value="${esc(value)}" placeholder="Enter contact detail"><button class="icon-button remove-method" type="button" aria-label="Remove contact method">${icon('close')}</button><input class="custom-type" aria-label="Custom contact method type" maxlength="40" placeholder="Type, such as Telegram or Work email" value="${esc(isCustom?type:type==='Other'?'Other':'')}" ${isCustom||type==='Other'?'':'hidden'}>`;
  $('method-rows').appendChild(row);updateRemoveButtons();
 }
 function updateRemoveButtons() {const only=$('method-rows').children.length===1;document.querySelectorAll('.remove-method').forEach(b=>{b.disabled=only;b.title=only?'Keep at least one contact method':'Remove contact method';});}
 function openEditor(id) {
  const c=contacts.find(x=>x.id===id);
  $('contact-form').reset();$('contact-id').value=c?.id||'';$('editor-title').textContent=c?'Edit contact':'New contact';
  for(const key of ['name','company','role','notes'])$(key).value=c?.[key]||'';
  $('group').value=c?.group||(group!=='all'?group:'Ungrouped');$('favorite').checked=c?.favorite||false;
  $('method-rows').innerHTML='';(c?.methods.length?c.methods:[{type:'Phone',value:''}]).forEach(m=>addMethod(m.type,m.value));
  ['name','methods','notes','save'].forEach(key=>$('error-'+key).textContent='');$('name').removeAttribute('aria-invalid');
  dirty=false;$('editor').showModal();$('name').focus();
 }
 function requestCloseEditor() {
  if(dirty && !window.confirm('Discard your unsaved changes?'))return;
  $('editor').close();dirty=false;
 }
 function saveContact(event) {
  event.preventDefault();
  const input={id:$('contact-id').value||undefined, name:$('name').value,company:$('company').value,role:$('role').value,group:$('group').value,notes:$('notes').value,favorite:$('favorite').checked,methods:[...$('method-rows').children].map(row=>({type:row.querySelector('.method-type').value==='Custom'?row.querySelector('.custom-type').value||'Other':row.querySelector('.method-type').value,value:row.querySelector('.method-input').value}))};
  const {contact,errors,valid}=C.validate(input);
  ['name','methods','notes','save'].forEach(key=>$('error-'+key).textContent=errors[key]||'');$('name').setAttribute('aria-invalid',String(Boolean(errors.name)));
  if(!valid){if(errors.name)$('name').focus();else $('method-rows').querySelector('input').focus();return;}
  const editing=Boolean($('contact-id').value),next=editing?contacts.map(c=>c.id===contact.id?contact:c):[...contacts,contact];
  if(!commit(next)){$('error-save').textContent='Could not save. Check browser storage permissions and available space.';return;}
  selected=contact.id;$('search').value='';group='all';view='all';dirty=false;$('editor').close();render();toast(editing?'Contact updated':'Contact added');
 }
 function toggleStar(id) {
  const c=contacts.find(x=>x.id===id);if(!c)return;
  const origin=document.activeElement?.closest('#detail-pane')?'detail-pane':'contact-list';
  if(commit(contacts.map(x=>x.id===id?{...x,favorite:!x.favorite,updatedAt:new Date().toISOString()}:x))){
   render();
   const candidates=[$(origin).querySelector(`[data-star="${CSS.escape(id)}"]`),$(origin).querySelector('[data-star]'),$('contact-list').querySelector('[data-star]'),$('contact-list').querySelector('[data-show-all],[data-clear],[data-new]'),document.querySelector(`[data-mobile-view="${view}"]`),$('nav-favorites'),$('add-btn')];
   const replacement=candidates.find(target=>target&&target.getClientRects().length&&!target.closest('[inert]'));
   replacement?.focus({preventScroll:true});
   toast(c.favorite?'Removed from favorites':'Added to favorites');
  }
 }
 function askDelete(id) {const c=contacts.find(x=>x.id===id);if(!c)return;deleting=id;$('confirm-text').textContent=`Delete ${c.name} and all their contact details? You can undo this in the notification.`;$('confirm-dialog').showModal();$('confirm-dialog').querySelector('[data-close]').focus();}
 function deleteContact() {
  const c=contacts.find(x=>x.id===deleting);if(!c)return;
  if(!commit(contacts.filter(x=>x.id!==deleting)))return;
  const deletedSpace=space;undo=c;$('confirm-dialog').close();closeDetail();render();
  toast('Deleted '+c.name,{label:'Undo delete',run:()=>{if(space!==deletedSpace){toast('Switch back to the space where this contact was deleted.');return;}if(undo&&commit([...contacts,undo])){selected=undo.id;undo=null;render();}}});
 }
 async function copyMethod(index) {
  const c=contacts.find(x=>x.id===selected),value=c?.methods[index]?.value;if(!value)return;
  try {
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
   else {const temp=document.createElement('textarea');temp.value=value;temp.style.position='fixed';temp.style.opacity='0';document.body.appendChild(temp);temp.select();const ok=document.execCommand('copy');temp.remove();if(!ok)throw Error('copy');}
   toast('Contact detail copied');
  } catch {toast('Could not copy. Select the contact detail and copy it manually.');}
 }
 async function ensureExcel() {
  if(window.XLSX)return true;
  if(!excelPromise)excelPromise=new Promise(resolve=>{
   const script=document.createElement('script');script.src='vendor/xlsx.full.min.js';
   script.onload=()=>resolve(Boolean(window.XLSX));
   script.onerror=()=>{excelPromise=null;script.remove();toast('Could not load Excel support. Check that the vendor folder is complete and try again.');resolve(false);};
   document.head.appendChild(script);
  });
  return excelPromise;
 }
 function workbookFor(list) {
  const ws=XLSX.utils.json_to_sheet(C.toRows(list),{header:C.BASE});
  ws['!cols']=C.BASE.map((name,i)=>({wch:i===11?38:i===12?20:i===0?14:24,hidden:name==='Contact methods JSON'}));
  ws['!autofilter']={ref:ws['!ref']||'A1:M1'};
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Contacts');
  return wb;
 }
 function timestamp() {const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
 async function exportExcel(template=false) {
  if(!await ensureExcel())return;
  if(!template&&!contacts.length){toast('Your address book is empty. Add a contact first.');return;}
  try {XLSX.writeFile(workbookFor(template?[]:contacts),template?'contacts-import-template.xlsx':`Contacts-${space==='demo'?'demo':'personal'}-${timestamp()}.xlsx`,{bookType:'xlsx',compression:true});toast(template?'Excel template downloaded':`Exported all ${C.count(contacts.length,"contact")}`);}catch{toast('Could not export. Check your browser download permissions.');}
 }
 function openImport() {$('import-preview').innerHTML='';$('confirm-import').disabled=true;$('excel-file').value='';pendingImport=null;$('import-dialog').showModal();ensureExcel();}
 async function readExcel(file) {
  pendingImport=null;$('confirm-import').disabled=true;
  if(!file)return;
  if(!/\.(xlsx|xls)$/i.test(file.name)){showImportError('Choose an Excel file in .xlsx or .xls format.');return;}
  if(file.size>5*1024*1024){showImportError('This file exceeds 5 MB. Split it into smaller files and retry.');return;}
  if(!await ensureExcel())return;
  $('import-preview').textContent='Reading file…';
  try {
   const buffer=await file.arrayBuffer();
   const bytes=new Uint8Array(buffer);
   if(!((bytes[0]===0x50&&bytes[1]===0x4b)||(bytes[0]===0xd0&&bytes[1]===0xcf)))throw Error('This is not a valid Excel workbook. Open it in Excel, save it again, and retry.');
   const wb=XLSX.read(buffer,{type:'array',sheetRows:10002,cellFormula:false,cellHTML:false});
   if(!wb.SheetNames.length)throw Error('This workbook has no readable worksheets.');
   const ws=wb.Sheets[wb.SheetNames[0]],range=XLSX.utils.decode_range(ws['!fullref']||ws['!ref']||'A1');
   if(range.e.r>10000||range.e.c>100)throw Error('The sheet is too large. Split it into files with up to 10,000 contacts and 101 columns.');
   const table=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
   const headers=(table[0]||[]).map(String);
   if(!headers.some(h=>C.isNameHeader(h)))throw Error('The Name column is missing. Download the template and keep its headers in the first row.');
   const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false,blankrows:true});
   const parsed=C.parseRows(rows,contacts);
   pendingImport=parsed;
   $('import-preview').innerHTML=`<div class="preview-summary"><div class="preview-name">${esc(file.name)} · Sheet: ${esc(wb.SheetNames[0])}</div><strong>${C.count(parsed.accepted.length,"contact")} ready to import</strong>, ${C.count(parsed.duplicates.length,"duplicate row")} skipped, ${C.count(parsed.invalid.length,"invalid row")}.<br>Valid contacts will be added. Existing records will stay unchanged.</div>${parsed.accepted.length?`<table class="preview-table"><thead><tr><th>Name</th><th>Group</th><th>Contact methods</th></tr></thead><tbody>${parsed.accepted.slice(0,5).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.group)}</td><td>${C.count(c.methods.length,"method")}</td></tr>`).join('')}</tbody></table>${parsed.accepted.length>5?'<p class="preview-name">Showing the first 5 contacts.</p>':''}`:''}${parsed.invalid.length?`<div class="import-errors">${parsed.invalid.slice(0,100).map(e=>`Row ${e.row}: ${esc(e.reason)}`).join('<br>')}</div>`:''}`;
   $('confirm-import').disabled=!parsed.accepted.length;$('confirm-import').textContent=parsed.accepted.length?`Import ${C.count(parsed.accepted.length,"contact")}`:'No contacts to import';
  } catch(error) {showImportError(error.message||'Could not read this workbook. Check that it is not damaged or password-protected.');}
 }
 function showImportError(text) {$('import-preview').innerHTML=`<p class="import-errors" role="alert">${esc(text)}</p>`;pendingImport=null;$('confirm-import').disabled=true;$('confirm-import').textContent='Confirm import';}
 function confirmImport() {
  if(!pendingImport?.accepted.length)return;
  // Revalidate against the current array in case another action changed it during parsing.
  const keys=new Set(contacts.map(C.signature));const fresh=pendingImport.accepted.filter(c=>{const k=C.signature(c);if(keys.has(k))return false;keys.add(k);return true;});
  if(commit([...contacts,...fresh])){selected=fresh[0]?.id||selected;view='all';group='all';$('search').value='';pendingImport=null;$('import-dialog').close();render();toast(`Imported ${C.count(fresh.length,"contact")}`);}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.view){view=b.dataset.view;group='all';render();}
  else if(b.dataset.group){const g=b.dataset.group;group=group===g?'all':g;view='all';render();document.querySelector(`[data-group="${CSS.escape(g)}"]`)?.focus({preventScroll:true});}
  else if(b.dataset.mobileView){view=b.dataset.mobileView;render();}
  else if(b.dataset.open){selected=b.dataset.open;render();if(matchMedia('(max-width:1279px)').matches)showDetail();else document.querySelector(`[data-open="${CSS.escape(selected)}"]`)?.focus({preventScroll:true});}
  else if(b.dataset.star){toggleStar(b.dataset.star);}
  else if(b.dataset.edit){openEditor(b.dataset.edit);}
  else if(b.dataset.delete){askDelete(b.dataset.delete);}
  else if(b.hasAttribute('data-copy'))copyMethod(Number(b.dataset.copy));
  else if(b.hasAttribute('data-detail-close')){closeDetail();document.querySelector(`[data-open="${CSS.escape(selected||'')}"]`)?.focus();}
  else if(b.dataset.close){if(b.dataset.close==='editor')requestCloseEditor();else $(b.dataset.close).close();}
  else if(b.hasAttribute('data-clear')){$('search').value='';view='all';group='all';render();$('search').focus();}
  else if(b.hasAttribute('data-show-all')){view='all';group='all';render();}
  else if(b.hasAttribute('data-new'))openEditor();
  else if(b.hasAttribute('data-import'))openImport();
 });
 $('add-btn').onclick=()=>openEditor();$('import-btn').onclick=openImport;$('export-btn').onclick=()=>exportExcel();$('template-btn').onclick=()=>exportExcel(true);
 $('start-own').onclick=()=>setSpace('personal');$('switch-space').onclick=()=>setSpace(space==='demo'?'personal':'demo');$('help-btn').onclick=()=>$('help-dialog').showModal();
 $('footer-switch').onclick=()=>setSpace(space==='demo'?'personal':'demo');$('footer-help').onclick=()=>$('help-dialog').showModal();
 $('search').oninput=render;$('sort').onchange=render;$('mobile-group').onchange=e=>{group=e.target.value;render();};
 $('view-list').onclick=()=>{layout='list';render();};$('view-grid').onclick=()=>{layout='grid';render();};
 $('contact-form').onsubmit=saveContact;$('contact-form').oninput=()=>{dirty=true;};
 $('add-method').onclick=()=>{addMethod();dirty=true;};
 $('method-rows').addEventListener('click',e=>{const b=e.target.closest('.remove-method');if(b&&!b.disabled){b.closest('.method-row').remove();dirty=true;updateRemoveButtons();}});
 $('method-rows').addEventListener('change',e=>{if(e.target.matches('.method-type')){e.target.closest('.method-row').querySelector('.custom-type').hidden=e.target.value!=='Custom';dirty=true;}});
 $('editor').addEventListener('cancel',e=>{e.preventDefault();requestCloseEditor();});
 $('confirm-delete').onclick=deleteContact;$('confirm-import').onclick=confirmImport;
 $('excel-file').onchange=e=>readExcel(e.target.files[0]);
 $('choose-file').onclick=()=>$('excel-file').click();
 const drop=$('file-drop');for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover');});for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover');});drop.addEventListener('drop',e=>readExcel(e.dataTransfer.files[0]));
 document.addEventListener('keydown',e=>{
    if (
    e.key === 'Escape' &&
    !e.isComposing &&
    document.activeElement === $('search') &&
    $('search').value &&
    !document.querySelector('dialog[open]') &&
    !$('detail-pane').classList.contains('mobile-open')
  ) {
    e.preventDefault();
    $('search').value = '';
    render();
    $('search').focus();
    return;
  }
  if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('search').focus();}
  if(e.key==='Escape'&&!document.querySelector('dialog[open]')){closeDetail();document.querySelector(`[data-open="${CSS.escape(selected||'')}"]`)?.focus();}
  if(e.key==='Tab'&&$('detail-pane').classList.contains('mobile-open')&&!document.querySelector('dialog[open]')){
   const items=[...$('detail-pane').querySelectorAll('button,a[href]')].filter(x=>x.getClientRects().length),first=items[0],last=items.at(-1);
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('detail-pane'))){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('detail-pane'))){e.preventDefault();first?.focus();}
  }
 });
 window.addEventListener('resize',()=>{if(!matchMedia('(max-width:1279px)').matches)closeDetail();});
 window.addEventListener('storage',e=>{if(e.key===STORE+space){if($('editor').open){toast('Another tab changed this address book. Close the editor and reload before saving.');loadedSafely=false;}else{loadSpace();render();toast('Changes from another browser tab have been loaded.');}}});
 window.addEventListener('beforeunload',e=>{if(dirty&&$('editor').open){e.preventDefault();e.returnValue='';}});
 load();render();
})();
