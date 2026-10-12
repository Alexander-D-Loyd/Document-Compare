import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleContext,withStyleContext} from '../app/style-context.mjs';import {CAPITALIZATION_NAMES} from '../app/style-capitalization.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('literal quotes protect ratio, measurement, capitalization and data-sharing wording',()=>{
 for(const quote of [['“','”'],['"','"']])for(const term of ['ratio of one to five','5kg','3:00 a.m.','3 o’clock a.m.','5 ° C','calworks Program','Vitamin c','data sharing agreement','The Legislative analyst’s office']){
  const text='The term '+quote[0]+term+quote[1]+' is literal.';assert.equal(check(text).length,0,text);
 }
 for(const text of ['The ratio of one to five applies.','Use 5kg of material.','The calworks Program applies.','A data sharing agreement applies.'])assert.ok(check(text).length,text);
});
test('specific manual-listed names are checked without external entity assumptions',()=>{
 for(const [page,name] of CAPITALIZATION_NAMES.filter(([page,name])=>/Vallejo|Riverside|Homeland|Analyst|United States Constitutions/.test(name))){
  assert.ok(refs.lcb.pages[page-1].text.replace(/\s+/g,' ').includes(name));
  const text='The document refers to '+name.toLowerCase()+'.';assert.ok(check(text).some(i=>i.suggestion===name),name);assert.equal(check(text.replace(name.toLowerCase(),name)).length,0,name);
 }
 for(const text of ['The name “city of vallejo” is literal.','The city of an unfamiliar place is discussed.','The Governor’s office applies.'])assert.equal(check(text).length,0,text);
});
test('shared literal context stays transient and refreshes after source replacement',()=>{
 const doc=makeDocument(['The “5kg” term applies.'],'Current');const first=styleContext(doc);assert.ok(first.literalAt(5,8));
 withStyleContext(doc,()=>assert.equal(styleContext(doc).literalRanges.length,1));
 doc.text=doc.text.replace('“',' ').replace('”',' ');assert.equal(styleContext(doc).literalRanges.length,0);
});
