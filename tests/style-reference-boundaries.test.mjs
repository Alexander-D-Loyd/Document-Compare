import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {referenceIssues} from '../app/style-references.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),check=text=>referenceIssues(makeDocument([text],'Current'),refs);

test('a malformed prefix is corrected without closing a valid shared-alternative gap',()=>{
 for(const join of ['and','or','nor']){
  const bad='See section 9 (a) (1) '+join+' (2).',good='See section 9(a) (1) '+join+' (2).';assert.deepEqual(check(bad).map(i=>i.suggestion),['section 9(a) (1)']);assert.equal(check(good).length,0);assert.equal(check('See section 9(a)(1) '+join+' (2).').length,0,'Do not infer a missing shared gap');
 }
 assert.deepEqual(check('See paragraph (a) (2) (i) and (ii).').map(i=>i.suggestion),['paragraph (a)(2) (i)']);
});

test('permitted divisions after complete parenthetical elements do not become spacing errors',()=>{
 for(const text of ['See section 7(a)\n(1).','See section 9(a)\n(1) and (2).','See paragraph (a)\n(2).'])assert.equal(check(text).length,0,text);
 assert.deepEqual(check('See section 7\n(a).').map(i=>i.suggestion),['section 7(a)']);
 assert.deepEqual(check('See section 7 (a)\n(1).').map(i=>i.suggestion),['section 7(a)(1)']);
});

test('a printed hyphen at a permitted reference division selects the complete chain',()=>{
 const text='See section 7(a)-\n(1) (ii).',found=check(text);assert.deepEqual(found.map(i=>i.suggestion),['section 7(a)(1)(ii)']);assert.equal(text.slice(found[0].start,found[0].end),'section 7(a)-\n(1) (ii)');
 assert.equal(check('See section 7(a)-(1).').length,0,'An unclassified inline operation is outside the division check');
});

test('cross-page reference highlights cover every body element through trusted running heads',()=>{
 const doc=makeDocument(['line 1 See Section 1917 (c)(2)','AB 1 — 2 —\nline 1 (C)(ii) of the act.'],'Current'),head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='legal-references');assert.equal(found.length,1);assert.equal(found[0].suggestion,'Section 1917(c)(2)(C)(ii)');assert.equal(found[0].start,doc.text.indexOf('Section'));assert.equal(found[0].end,doc.text.indexOf('(ii)')+4);head.formatting={};assert.equal(jointStylisticIssues(doc,refs).some(i=>i.checkId==='legal-references'),false);
});

test('complete shared-prefix evidence remains protected when struck, quoted or tabulated',()=>{
 for(const text of ['The term “section 9 (a) (1) and (2)” is literal.','The term "section 9 (a)\n(1) and (2)" is literal.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['See section 9 (a) (1) and (2).'],'Current');doc.struck=[{start:doc.text.indexOf('and'),end:doc.text.indexOf('and')+3}];assert.equal(referenceIssues(doc,refs).length,0,'Removed alternative context cannot justify preserving its gap');
 const table=makeDocument(['See section 9 (a) (1)\nand (2).'],'Current');table.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(referenceIssues(table,refs).length,0);
});

test('original bill reference corrections remain precise and independent of capitalization conflicts',()=>{
 for(const [bad,good,term,suggestion]of [['Pursuant to Section 1917 (c)(2)(C)(ii) of the federal act.','Pursuant to Section 1917(c)(2)(C)(ii) of the federal act.','Section 1917 (c)(2)(C)(ii)','Section 1917(c)(2)(C)(ii)'],['Under Section 147 (G) of the Internal Revenue Code.','Under Section 147(G) of the Internal Revenue Code.','Section 147 (G)','Section 147(G)']]){const found=jointStylisticIssues(makeDocument([bad],'Current'),refs).filter(i=>i.checkId==='legal-references');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[term,suggestion]]);assert.equal(found[0].references[0].rule,'2.25');assert.equal(found[0].references[0].guidePage,27);assert.equal(jointStylisticIssues(makeDocument([good],'Current'),refs).length,0);}
});
