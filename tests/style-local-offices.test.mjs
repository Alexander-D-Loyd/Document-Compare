import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('an explicit generic local-office qualifier and predicate identify lowercase titles',()=>{
 for(const title of ['Controller','Treasurer'])for(const place of ['city','county','municipal','district']){
  const t='The '+place+' '+title+' shall retain records.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,title.toLowerCase());assert.equal(check(t.replace(title,title.toLowerCase())).length,0);
 }
 for(const title of ['Controller','Treasurer'])assert.equal(check('The '+title+' of the county shall retain records.')[0].suggestion,title.toLowerCase());
});
test('only a nondefinite generic standalone court and predicate select the lowercase court rule',()=>{
 for(const determiner of ['A','Any','Each','Every']){const t=determiner+' Court shall retain records.';assert.equal(check(t)[0].suggestion,'court');assert.equal(check(t.replace('Court','court')).length,0);}
});
test('state officers, names, court short titles, quotations and sentence beginnings remain protected',()=>{
 for(const t of ['The State Controller shall act.','The Treasurer shall act.','The county Controller John Smith shall act.','The County Controller Office is named.','The Court shall retain records.','The Supreme Court shall act.','Court shall retain records.','The term “county Controller shall retain records” is literal.','The term “Each Court shall retain records” is literal.'])assert.equal(check(t).length,0,t);
});
test('a congressional Representative needs an explicit body rather than a generic country qualifier',()=>{
 for(const qualifier of ['of the United States Congress','in the United States House of Representatives','of the U.S. Congress']){
  const t='The representative '+qualifier+' shall act.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,'Representative');assert.equal(check(t.replace('representative','Representative')).length,0);
 }
 assert.equal(check('The United States congressional representative shall act.')[0].suggestion,'Representative');
 for(const t of ['The representative shall act.','The United States representative shall act.','The representative of California shall act.','The term “representative of the United States Congress” is literal.'])assert.equal(check(t).length,0,t);
});
test('new mappings cover only the stated local and generic entries',()=>{
 const rows=styleRuleInventory(refs);for(const entry of ['controller (local)','treasurer (local)','court (appearing alone)'])assert.equal(rows.find(r=>r.guide==='lcb'&&r.text===entry).status,'Partially automated');
 for(const entry of ['Controller, the (state)','Treasurer, the (state)']){const row=rows.find(r=>r.guide==='lcb'&&r.text===entry);assert.equal(row.status,'Partially automated');assert.match(row.scope,/California State jurisdiction and an adjoining personal name/);assert.match(row.scope,/Unresolved standalone titles remain manual/);}
});
test('line-numbered local title findings preserve offsets and removed language is excluded',()=>{
 const doc=makeDocument(['line 1 The county Controller\nline 2 shall retain records.'],'Current'),found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'Controller');doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
