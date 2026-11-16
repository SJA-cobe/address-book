/* Pure contact model. English export with Chinese data compatibility. */
(function(global){
'use strict';
const GROUPS=['Work','Friends','Family','Ungrouped'];
const TYPES=['Phone','Email','WeChat','QQ','Address','Other'];
const BASE=['Name','Company','Job title','Group','Favorite','Phone','Email','WeChat','QQ','Address','Other contact methods','Notes','Contact methods JSON'];
const GROUP_ALIASES={'工作':'Work','朋友':'Friends','家人':'Family','未分组':'Ungrouped'};
const TYPE_ALIASES={'手机':'Phone','邮箱':'Email','微信':'WeChat','地址':'Address','其他':'Other'};
const HEADERS={Name:['姓名'],Company:['公司'],'Job title':['职位','Role'],Group:['分组'],Favorite:['收藏'],Phone:['手机','Mobile'],Email:['邮箱'],WeChat:['微信'],QQ:[],Address:['地址'],'Other contact methods':['其他联系方式'],Notes:['备注'],'Contact methods JSON':['联系方式JSON']};
function count(n,noun){return `${n.toLocaleString('en-US')} ${noun}${n===1?'':'s'}`;}
function canonical(value,choices,aliases){const text=String(value||'').trim();return (Object.hasOwn(aliases,text)?aliases[text]:null)||choices.find(x=>x.toLowerCase()===text.toLowerCase())||text;}
function uid(){return global.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);}
function normalize(input){
 const group=canonical(input.group,GROUPS,GROUP_ALIASES);
 return {id:String(input.id||uid()),name:String(input.name||'').trim(),company:String(input.company||'').trim(),role:String(input.role||'').trim(),group:GROUPS.includes(group)?group:'Ungrouped',favorite:input.favorite===true,notes:String(input.notes||'').trim(),methods:(Array.isArray(input.methods)?input.methods:[]).map(m=>({type:canonical(m.type,TYPES,TYPE_ALIASES)||'Other',value:String(m.value??'').trim()})).filter(m=>m.value),updatedAt:input.updatedAt||new Date().toISOString()};
}
function validate(input){
 const c=normalize(input),errors={};
 if(!c.name)errors.name='Enter a contact name.';else if(c.name.length>80)errors.name='Keep the name within 80 characters.';
 if(!c.methods.length)errors.methods='Add at least one contact method.';
 if(c.methods.length>50)errors.methods='Each contact can have up to 50 contact methods.';
 if(c.methods.some(m=>m.type==='Email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.value)))errors.methods='Enter a valid email address, such as name@example.com.';
 if(c.methods.some(m=>m.value.length>2000||m.type.length>40))errors.methods='Use up to 2,000 characters for a contact detail and 40 for its type.';
 if(c.notes.length>10000)errors.notes='Keep notes within 10,000 characters.';
 return {contact:c,errors,valid:!Object.keys(errors).length};
}
function signature(input){const c=normalize(input);return JSON.stringify([c.name,c.company,c.role,c.group,c.favorite,c.notes,c.methods.map(m=>[m.type,m.value]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);}
function toRows(contacts){return contacts.map(input=>{
 const c=normalize(input),row={Name:c.name,Company:c.company,'Job title':c.role,Group:c.group,Favorite:c.favorite?'Yes':'No'};
 for(const type of ['Phone','Email','WeChat','QQ','Address'])row[type]=c.methods.filter(m=>m.type===type).map(m=>m.value).join('\n');
 row['Other contact methods']=c.methods.filter(m=>!['Phone','Email','WeChat','QQ','Address'].includes(m.type)).map(m=>m.type+': '+m.value).join('\n');
 row.Notes=c.notes;row['Contact methods JSON']=JSON.stringify(c.methods);return row;
});}
function headerKey(value){return String(value).replace(/^\uFEFF/,'').trim().toLowerCase();}
function readCell(row,name){for(const label of [name,...(HEADERS[name]||[])]){const key=Object.keys(row).find(k=>headerKey(k)===headerKey(label));if(key!==undefined&&row[key]!=null&&String(row[key]).trim()!=='')return row[key];}return '';}
function isNameHeader(header){return [BASE[0],...HEADERS.Name].some(x=>headerKey(x)===headerKey(header));}
function parseRows(rows,existing=[]){
 const seen=new Set(existing.map(signature)),accepted=[],duplicates=[],invalid=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(!Object.values(row).some(x=>String(x??'').trim()))continue;
  const methods=[];
  try{
   const metadata=String(readCell(row,'Contact methods JSON')||'').trim();
   if(metadata){
    const parsed=JSON.parse(metadata);
    if(!Array.isArray(parsed)||parsed.some(m=>!m||typeof m!=='object'||typeof m.type!=='string'||typeof m.value!=='string'))throw new Error('Contact methods JSON must be an array of type/value objects.');
    methods.push(...parsed);
   }else{
    for(const type of ['Phone','Email','WeChat','QQ','Address']){const values=String(readCell(row,type)??'').split(/\r?\n|；/).map(x=>x.trim()).filter(Boolean);methods.push(...values.map(value=>({type,value})));}
    for(const text of String(readCell(row,'Other contact methods')||'').split(/\r?\n/).filter(Boolean)){const match=text.match(/^([^:：]+)[:：]([\s\S]*)$/);methods.push(match?{type:match[1],value:match[2]}:{type:'Other',value:text});}
   }
   const checked=validate({name:readCell(row,'Name'),company:readCell(row,'Company'),role:readCell(row,'Job title'),group:readCell(row,'Group'),favorite:['yes','true','1','是'].includes(String(readCell(row,'Favorite')).trim().toLowerCase()),notes:readCell(row,'Notes'),methods});
   if(!checked.valid)throw new Error(Object.values(checked.errors).join(' '));
   const key=signature(checked.contact);if(seen.has(key))duplicates.push(i+2);else{seen.add(key);accepted.push(checked.contact);}
  }catch(error){invalid.push({row:i+2,reason:error instanceof SyntaxError?'Contact methods JSON is invalid. Clear or repair this cell and retry.':error.message});}
 }
 return {accepted,duplicates,invalid};
}
function filter(contacts,{q='',view='all',group='all',sort='name'}={}){
 const terms=q.toLocaleLowerCase('en-US').trim().split(/\s+/).filter(Boolean),selectedGroup=canonical(group,GROUPS,GROUP_ALIASES);
 return contacts.filter(c=>(view!=='favorites'||c.favorite)&&(group==='all'||c.group===selectedGroup)&&terms.every(term=>[c.name,c.company,c.role,c.group,c.notes,...c.methods.map(m=>m.type+' '+m.value)].join(' ').toLocaleLowerCase('en-US').includes(term))).sort((a,b)=>sort==='recent'?b.updatedAt.localeCompare(a.updatedAt):a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}));
}
const api={GROUPS,TYPES,BASE,uid,normalize,validate,signature,toRows,parseRows,filter,isNameHeader,count};global.ContactCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
