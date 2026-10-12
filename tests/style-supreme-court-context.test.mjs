import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {capitalizationIssues} from '../app/style-capitalization.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>capitalizationIssues(makeDocument([text],'Current'),refs).filter(i=>i.suggestion==='Supreme Court');
test('explicit United States Supreme Court references retain agreed whole-phrase case checking',()=>{
 for(const text of ['The U.S. supreme court shall act.','The United States supreme court shall act.','The supreme court of the United States shall act.','The supreme court (U.S.) shall act.']){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].text,'supreme court');assert.deepEqual(found[0].references.map(r=>[r.guideId,r.guidePage]),[['lcb',20],['gpo',90]]);assert.equal(check(text.replace('supreme court','Supreme Court')).length,0);}
});
test('source-supported California and Ohio full names retain agreement without approving other entities',()=>{
 for(const name of ['California','Ohio']){const found=check('The '+name+' supreme court shall act.');assert.equal(found.length,1);assert.equal(found[0].references[1].guidePage,name==='California'?70:90);}
 for(const text of ['The Georgia supreme court shall act.','The State of California supreme court shall act.','The Ohio supreme court association shall act.'])assert.equal(check(text).length,0,text);
});
test('short descriptive state references and unresolved jurisdictions are not corrected',()=>{
 for(const text of ['The supreme court of Virginia shall act.','The supreme court of California shall act.','The supreme court of this state shall act.','California’s supreme court shall act.','The supreme court shall act.','The supreme court of Georgia shall act.'])assert.equal(check(text).length,0,text);
});
test('conflicting adjacent national and state qualifiers remain manual',()=>{
 for(const text of ['The U.S. supreme court of California shall act.','The California supreme court of the United States shall act.','The United States supreme court of appeals shall act.'])assert.equal(check(text).length,0,text);
});
test('complete jurisdiction and Court phrase evidence cannot cross removed wording',()=>{
 for(const text of ['The United former States supreme court shall act.','The U.S. former supreme court shall act.','The supreme court of former the United States shall act.','The supreme former court of the United States shall act.']){const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court').length,0,text);}
});
test('qualifier quotes, tables and unknown bridges cannot supply Court jurisdiction',()=>{
 for(const text of ['The literal "United States\nsupreme court shall act" remains.','The literal “Ohio supreme court” remains.'])assert.equal(check(text).length,0,text);
 const d=makeDocument(['The United States\nsupreme court shall act.'],'Current');d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court').length,0);
 const u=makeDocument(['The U.S.\nunknown marker\nsupreme court shall act.'],'Current'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(capitalizationIssues(u,refs).filter(i=>i.suggestion==='Supreme Court').length,0);
});
test('identified interior heads retain whole Court wording across page breaks',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 The U.S. supreme','AB 9999 — 2 —\nline 1 court shall act.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court');assert.equal(found.length,1);assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.ok(found[0].text.startsWith('supreme')&&found[0].text.endsWith('court'));
});
test('rechecking fresh qualifier metadata and isolated uppercase source typography stays conservative',()=>{
 const d=makeDocument(['The United States\nsupreme court shall act.'],'Current');assert.equal(capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court').length,1);d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court').length,0);delete d.blocks[0].formatting;assert.equal(capitalizationIssues(d,refs).filter(i=>i.suggestion==='Supreme Court').length,1);assert.equal(check('The U.S. SUPREME COURT shall act.').length,0);
});
test('manual or conflicting Court case does not suppress an independent numeral',()=>{
 for(const text of ['The supreme court of California shall appoint 1 claimant.','The supreme court shall appoint 1 claimant.'])assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion==='one'),text);
});
