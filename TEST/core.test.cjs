const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const XLSX = require('../vendor/xlsx.full.min.js');
const base={name:'测试联系人',company:'测试组织',role:'开发',group:'工作',favorite:true,notes:'备注第一行\n备注第二行',methods:[{type:'手机',value:'测试号码 A'},{type:'手机',value:'测试号码 B'},{type:'邮箱',value:'qa@example.com'},{type:'自定义:类型',value:'分号；冒号:换行\n第二行'},{type:'地址',value:'楼层\n房间'}]};
test('校验：必填姓名、至少一项联系方式、邮箱格式及长度限制',()=>{
 assert.equal(C.validate({}).valid,false);assert.equal(C.validate({name:'张某'}).valid,false);
 assert.equal(C.validate({...base,methods:[{type:'邮箱',value:'invalid'}]}).valid,false);
 assert.equal(C.validate(base).valid,true);assert.equal(C.validate({...base,name:'字'.repeat(81)}).valid,false);
});
test('Excel 实际二进制导出再读入，多号码、自定义类型、分隔符、换行、收藏完全保留',()=>{
 const original=C.normalize(base),ws=XLSX.utils.json_to_sheet(C.toRows([original]),{header:C.BASE}),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'联系人');
 const buffer=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});assert.equal(buffer[0],0x50);assert.equal(buffer[1],0x4b);
 const read=XLSX.read(buffer,{type:'buffer'}),rows=XLSX.utils.sheet_to_json(read.Sheets.联系人,{defval:''}),result=C.parseRows(rows);
 assert.equal(result.invalid.length,0);assert.equal(result.accepted.length,1);assert.equal(C.signature(result.accepted[0]),C.signature(original));
});
test('空通讯录仍导出标准表头，可作为模板',()=>{const ws=XLSX.utils.json_to_sheet([],{header:C.BASE});assert.equal(ws.A1.v,'Name');assert.equal(ws.M1.v,'Contact methods JSON');});
test('导入外部标准表：重复行跳过，同名不同信息保留，错误行记录准确行号',()=>{
 const existing=C.normalize(base);const rows=[...C.toRows([existing]),{姓名:'同名',手机:'号码1；号码2',邮箱:'a@example.com',收藏:'是'}, {姓名:'同名',手机:'不同号码'}, {姓名:'',手机:'无姓名'}, {姓名:'坏邮箱',邮箱:'bad'}];
 const result=C.parseRows(rows,[existing]);assert.equal(result.duplicates.length,1);assert.equal(result.accepted.length,2);assert.equal(result.accepted[0].methods.length,3);assert.equal(result.accepted[0].favorite,true);assert.deepEqual(result.invalid.map(x=>x.row),[5,6]);
});
test('损坏的元数据行失败，不会静默丢失联系方式',()=>{const r=C.parseRows([{姓名:'A',手机:'B',联系方式JSON:'{broken'}]);assert.equal(r.accepted.length,0);assert.equal(r.invalid[0].row,2);});
test('搜索、收藏和分组可以组合；搜索覆盖自定义方法和备注',()=>{
 const data=[C.normalize(base),C.normalize({...base,name:'B',group:'朋友',favorite:false}),C.normalize({...base,name:'C',favorite:false})];
 assert.equal(C.filter(data,{q:'测试 第二行',view:'favorites',group:'工作'}).length,1);assert.equal(C.filter(data,{q:'自定义:类型'}).length,3);assert.equal(C.filter(data,{q:'不存在'}).length,0);
});
test('同一文件内重复数据仅保留一行，不改变原数组',()=>{const rows=C.toRows([base,base]);const previous=[];const r=C.parseRows(rows,previous);assert.equal(r.accepted.length,1);assert.equal(r.duplicates.length,1);assert.deepEqual(previous,[]);});
test('表格文本以字符串导出，公式形文本不成为公式',()=>{const ws=XLSX.utils.json_to_sheet(C.toRows([{...base,name:'=1+1',notes:'@SUM(A1)'}]),{header:C.BASE});assert.equal(ws.A2.t,'s');assert.equal(ws.A2.f,undefined);assert.equal(ws.L2.t,'s');});
test('输入不能通过修改原对象破坏标准化数据',()=>{const x=structuredClone(base),c=C.normalize(x);x.methods[0].value='变更';assert.equal(c.methods[0].value,'测试号码 A');});
test('英语表头、大小写及空格可导入，导出使用英语列名和收藏值',()=>{
 const r=C.parseRows([{' name ':'Alex',phone:'Demo 1',EMAIL:'alex@example.com',Group:'work',Favorite:'YES'}]);
 assert.equal(r.invalid.length,0);assert.equal(r.accepted[0].group,'Work');assert.equal(r.accepted[0].favorite,true);
 const row=C.toRows(r.accepted)[0];assert.equal(row.Name,'Alex');assert.equal(row.Favorite,'Yes');assert.deepEqual(Object.keys(row),C.BASE);
});
test('原中文存储转为英语分组和标准类型，姓名、ID、自定义类型和内容不丢失',()=>{
 const old={...base,id:'original-id',name:'孙同学',methods:[{type:'手机',value:'原号码'},{type:'邮箱',value:'old@example.com'},{type:'课程账号',value:'中文内容'},{type:'constructor',value:'custom'}]};
 const c=C.normalize(old);assert.equal(c.id,old.id);assert.equal(c.name,old.name);assert.equal(c.group,'Work');assert.deepEqual(c.methods.map(m=>m.type),['Phone','Email','课程账号','constructor']);assert.deepEqual(c.methods.map(m=>m.value),old.methods.map(m=>m.value));
 assert.equal(C.signature(C.parseRows(C.toRows([c])).accepted[0]),C.signature(old));
});
test('中英文等价记录不会被重复导入',()=>{
 const existing=C.normalize(base),rows=C.toRows([existing]);const result=C.parseRows(rows,[base]);assert.equal(result.duplicates.length,1);assert.equal(result.accepted.length,0);
});
test('同一 Excel 同时含中英文列时，空英语单元格不遮蔽中文有效值',()=>{
 const rows=[...C.toRows([base]),{姓名:'旧表新增',手机:'旧号码',分组:'朋友',收藏:'是'}],ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Contacts');
 const buffer=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}),read=XLSX.read(buffer,{type:'buffer'}),actual=XLSX.utils.sheet_to_json(read.Sheets.Contacts,{defval:''});
 const result=C.parseRows(actual);assert.equal(result.invalid.length,0);assert.equal(result.accepted.length,2);assert.equal(result.accepted[1].name,'旧表新增');assert.equal(result.accepted[1].group,'Friends');
});
