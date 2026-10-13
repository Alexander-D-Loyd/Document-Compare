import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(x=>[x,JSON.parse(fs.readFileSync(new URL('../app/data/'+x+'-reference.json',import.meta.url)))]));
const cases=[
 [3,'descendant','A descendent of the testator is eligible.','descendent','descendant'],
 [4,'ordnance (military supplies, including weapons)','The military ordinance is stored.','ordinance','ordnance'],
 [4,'physicians and surgeons','The physicians-and-surgeons are licensed.','physicians-and-surgeons','physicians and surgeons'],
 [5,'stationary (fixed)','The stationery vehicle is parked.','stationery','stationary'],
 [5,'therefor (making an appropriation therefor)','The agency is making an appropriation therefore.','therefore','therefor'],
 [12,'non-civil service','The position is non-civil-service.','non-civil-service','non-civil service'],
 [12,'one-time (one action; u.m.)','The onetime payment is paid only once.','onetime','one-time'],
 [12,'onetime (formerly; u.m.)','The one-time mayor who formerly held that office applies.','one-time','onetime'],
 [9,'CD-ROM','The agency uses cd rom media.','cd rom','CD-ROM'],
 [9,'African American','The African-American is eligible.','African-American','African American'],
 [9,'Asian American','The Asian-American is eligible.','Asian-American','Asian American'],
 [12,'Mexican American','The Mexican-American is eligible.','Mexican-American','Mexican American'],
 [4,'forego (precede)','The forgoing provisions above apply.','forgoing','foregoing'],
 [9,'Conflict of Interest Code','The conflict of interest code applies.','conflict of interest code','Conflict of Interest Code'],
 [12,'offset','The agency shall off set the cost.','off set','offset']
];
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('printed lexical entries have explicit bounded production contexts and exact source selections',()=>{
 for(const[page,printed,text,variant,preferred]of cases){assert.ok(refs.lcb.pages[page-1].lexicalEntries.includes(printed),printed);const start=text.indexOf(variant),end=start+variant.length,i=check(text).find(x=>x.start===start&&x.end===end&&x.suggestion===preferred);assert.ok(i,text);assert.equal(text.slice(i.start,i.end),variant);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===page),printed);const good=text.slice(0,start)+preferred+text.slice(end);assert.ok(!check(good).some(x=>x.start<start+preferred.length&&x.end>start),good);}
});
test('bill-local quoted authority and source strikes protect the complete lexical selection and clear with a new bill',()=>{
 for(const[,printed,text,variant,preferred]of cases){const quoted='The term “'+variant+'” is defined. '+text;assert.ok(!check(quoted).some(i=>i.suggestion===preferred),printed);assert.ok(check(text).some(i=>i.suggestion===preferred),'authority leaked into another bill:'+printed);const doc=makeDocument([text],'Current'),start=text.indexOf(variant);doc.struck=[{start,end:start+variant.length}];assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.start<start+variant.length&&i.end>start),printed);}
});
test('complete lexical boundaries cannot select a word within a Unicode continuation',()=>{
 for(const[,printed,text,variant,preferred]of cases){const start=text.indexOf(variant),end=start+variant.length;for(const tail of['é','\u0301','7']){const damaged=text.slice(0,end)+tail+text.slice(end);assert.ok(!check(damaged).some(i=>i.start<end&&i.end>start&&i.suggestion===preferred),printed+tail);}}
});
