import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>jointStylisticIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>i.category==='Modifier hyphenation');
test('actual SB79 entry-level wording remains quiet while printed owner-occupied remains checkable',()=>{
 const text='Sites should be considered for attached entry level owner occupied housing development opportunities.';
 const found=check(text);assert.deepEqual(found.map(i=>i.suggestion),['owner-occupied']);
 assert.equal(found[0].text,'owner occupied');assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===12));
 for(const i of found)assert.equal(text.slice(i.start,i.end),i.text);
 assert.equal(check('Sites should be considered for attached entry-level owner-occupied housing development opportunities.').length,0);
});
test('source-listed modifiers can precede other source-listed modifiers with one terminal noun',()=>{
 assert.deepEqual(check('The agency provides high quality community based programs.').map(i=>i.suggestion),['high-quality','community-based']);
 assert.deepEqual(check('The agency provides high quality mixed use residential projects.').map(i=>i.suggestion),['high-quality','mixed-use']);
 assert.equal(check('The agency provides high-quality community-based programs.').length,0);
});
test('unlisted entry-level guesses remain disabled across plausible noun roles',()=>{
 for(const text of ['The agency provides entry level positions.','The entry level training applies.','Funds pay for entry level jobs.']){const d=makeDocument([text],'Current'),before=JSON.stringify(d);assert.equal(check(d).filter(i=>i.suggestion==='entry-level').length,0,text);assert.equal(JSON.stringify(d),before);}
 for(const text of ['The entry level is recorded.','The worker serves at entry level.','An entry level position.','The entry level owner occupied housing.','The agency provides entry level unfamiliar work.','The agency provides entry level owner.'])assert.equal(check(text).filter(i=>i.suggestion==='entry-level').length,0,text);
});
test('chains cannot infer roles across source strikes or a protected noun',()=>{
 for(const text of ['Funds pay for former entry level owner occupied housing.','Funds pay for attached entry level former owner occupied housing.','Funds pay for entry level owner occupied former housing.','The agency provides high quality mixed use former housing.']){
  const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.ok(!check(d).some(i=>['entry-level','high-quality'].includes(i.suggestion)),text);
 }
});
test('chains preserve literal names, open exceptions, unfamiliar modifiers and finite verbs',()=>{
 for(const text of ['The Entry Level Owner Occupied Housing Program applies.','The literal "Funds pay for entry level owner occupied housing" remains.','Funds pay for high quality unfamiliar housing.','The agency provides high quality very low income housing.'])assert.equal(check(text).filter(i=>['entry-level','high-quality'].includes(i.suggestion)).length,0,text);
});
test('printed chains bridge known page heads while unknown evidence cannot establish a modifier',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 10 The agency provides high','AB 9999 — 2 —\nline 1 quality mixed use residential projects.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};
 const before=JSON.stringify(d),found=check(d);assert.deepEqual(found.map(i=>i.suggestion),['high-quality','mixed-use']);assert.ok(found[0].text.includes('AB 9999'));assert.ok(found[0].end<d.text.indexOf('mixed'));for(const i of found)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
 const unknown=makeDocument(['The agency provides high quality\nunknown marker\nmixed use residential projects.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.ok(!check(unknown).some(i=>i.suggestion==='high-quality'));
});
test('whole contextual cues and chains are protected against tables and wrapped literals',()=>{
 for(const [rows,index] of [[['The agency provides high','quality mixed use residential projects.'],0],[['The agency provides high quality','mixed use residential projects.'],1]]){const d=makeDocument([rows.join('\n')],'Current');assert.ok(check(d).some(i=>i.suggestion==='high-quality'));d.blocks[index].formatting={headerGaps:[1,2]};assert.ok(!check(d).some(i=>i.suggestion==='high-quality'));}
 assert.ok(!check('The literal "The agency provides high quality\nmixed use residential projects" remains.').some(i=>i.suggestion==='high-quality'));
});
test('chain matching is bounded and recomputes changed metadata',()=>{
 assert.ok(!check('The agency provides high quality mixed use part time full time programs.').some(i=>i.suggestion==='high-quality'));
 const d=makeDocument(['The agency provides high quality\nmixed use residential projects.'],'Current');assert.ok(check(d).some(i=>i.suggestion==='high-quality'));d.blocks[1].formatting={headerGaps:[1,2]};assert.ok(!check(d).some(i=>i.suggestion==='high-quality'));delete d.blocks[1].formatting;assert.ok(check(d).some(i=>i.suggestion==='high-quality'));
});
