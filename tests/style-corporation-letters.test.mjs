import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {corporationLetterIssues,LCB_CORPORATION_LETTERS} from '../app/style-corporation-letters.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('independently quoted corporation classification letters retain quotes and noun',()=>{
 for(const r of LCB_CORPORATION_LETTERS)for(const [a,b] of [['“','”'],['"','"']]){
  const t='The '+a+r.letter.toLowerCase()+b+' corporation is registered.',i=check(t).find(i=>i.checkId==='corporation-letter');assert.ok(i,t);assert.equal(i.text,r.letter.toLowerCase());assert.equal(i.suggestion,r.letter);assert.equal(t.slice(i.start,i.end),i.text);assert.equal(check(t.slice(0,i.start)+r.letter+t.slice(i.end)).length,0);assert.ok(refs.lcb.pages[r.page-1].text.includes(r.preferred));
 }
 const rows=styleRuleInventory(refs);for(const r of LCB_CORPORATION_LETTERS)assert.equal(rows.find(x=>x.guide==='lcb'&&x.page===r.page&&x.text===r.preferred).status,'Partially automated');
});
test('enclosing source quotations, unknown classifications and strikeouts remain protected',()=>{
 for(const t of ['The term “the "c" corporation” is literal.','The term “the “c” corporation” is literal.','The term “c corporation” is literal.','The “x” corporation is named.','The C corporation is named.'])assert.equal(check(t).length,0,t);
 const doc=makeDocument(['The “c” corporation is registered.'],'Current');doc.struck=[{start:5,end:6}];assert.equal(corporationLetterIssues(doc,refs).length,0);
 assert.equal(check('The “c” corporation Institute is named.').length,0);
});
test('wrapped corporation labels retain exact letter-only source offsets',()=>{
 const doc=makeDocument(['line 1 The “s”\nline 2 corporation is registered.'],'Current'),i=corporationLetterIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'s');assert.equal(i.suggestion,'S');
});
