import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{makeDocument}from'../app/core.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(x=>[x,JSON.parse(fs.readFileSync(new URL('../app/data/'+x+'-reference.json',import.meta.url)))])),check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
const forms=[['ex officio',3],['bona fide',9],['per capita',12],['per diem',12],['de minimis',3],['inter vivos',4]];
test('existing foreign-phrase findings retainLCB8 and their exact printed lexical source',()=>{
 for(const[form,page]of forms){assert.ok(refs.lcb.pages[page-1].lexicalEntries.some(e=>e.split(' (')[0]===form),form);const variant=form.replaceAll(' ','-'),text='The '+variant+' program applies.',i=check(text).find(i=>i.suggestion===form);assert.ok(i,text);assert.equal(text.slice(i.start,i.end),variant);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===8),form);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===page&&r.sourcePassage.kind==='Printed source example'),form);assert.ok(!check(text.replace(variant,form)).some(i=>i.suggestion===form),form);}
 const i=check('The prima-facie program applies.').find(i=>i.suggestion==='prima facie');assert.ok(i);assert.deepEqual(i.references.filter(r=>r.guideId==='lcb').map(r=>r.guidePage),[8],'no fabricated separate lexical page forprima facie');
});
test('foreign source attribution respects bill-local quoted terms and whole source damage',()=>{
 for(const[form]of forms){const variant=form.replaceAll(' ','-'),text='The term “'+variant+'” is defined. The '+variant+' program applies.';assert.ok(!check(text).some(i=>i.suggestion===form),form);const doc=makeDocument(['The '+variant+' program applies.'],'Current'),start=doc.text.indexOf(variant);doc.struck=[{start,end:start+variant.length}];assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.suggestion===form),form);}
});
