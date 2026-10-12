import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.category==='Modifier hyphenation');

test('source-listed modifiers recognize independently observed professional and residential noun phrases',()=>{
 const source='A mixed use residential project meets the requirements. The entity provides high quality professional learning and high quality professional training.';
 const found=check(source);
 assert.deepEqual(found.map(i=>i.suggestion),['mixed-use','high-quality','high-quality']);
 for(const i of found)assert.equal(source.slice(i.start,i.end),i.text);
 assert.deepEqual(found.map(i=>i.references[0].guidePage),[12,11,11]);
 assert.equal(check('A mixed-use residential project provides high-quality professional learning.').length,0);
});

test('workloads and adjustments supply selected noun roles without claiming a spelling authority',()=>{
 const found=check('Funds provide for the data processing workload and cost of living adjustments. A high quality learning program applies.');
 assert.deepEqual(found.map(i=>i.suggestion),['data-processing','cost-of-living','high-quality']);
 assert.equal(found[0].references[0].guidePage,10);
 assert.equal(found[1].references[0].guidePage,10);
});

test('the same words in predicates and prepositions do not acquire attributive corrections',()=>{
 for(const s of ['The professional learning is high quality.','The residential project is mixed use.','Funds pay the cost of living in California.','Allocate funds for the calendar year in state low-income housing tax credits.','The worker serves full time in the professional learning program.','The tenant works part time at the residential project.'])assert.equal(check(s).length,0,s);
});

test('known protected names, literals, unknown qualifiers and declined income forms remain excluded',()=>{
 for(const s of ['The High Quality Professional Learning Program applies.','"high quality professional learning" is defined.','“mixed use residential project” is defined.','A high quality unfamiliar learning method applies.','A mixed use exotic project applies.','The very low income residential project applies.','A publicly owned residential project applies.','A federally funded professional training program applies.'])assert.equal(check(s).length,0,s);
});

test('whole source modifiers cross printed lines and identified page heads without including their noun',()=>{
 const doc=makeDocument(['line 39 An entity provides high\nline 40 quality','AB 121 — 120 —\nline 1 professional learning to educators.'],'Current');
 const head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};
 const found=jointStylisticIssues(doc,refs).filter(i=>i.category==='Modifier hyphenation');
 assert.equal(found.length,1);assert.equal(found[0].suggestion,'high-quality');
 assert.match(found[0].text,/high[\s\S]+quality$/);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 assert.ok(found[0].end<doc.text.indexOf('professional'));
});

test('removed modifiers and unknown page-head boundaries stay protected',()=>{
 const doc=makeDocument(['A high quality professional learning program applies.'],'Current');
 const [first]=jointStylisticIssues(doc,refs).filter(i=>i.category==='Modifier hyphenation');
 doc.struck=[{start:first.start,end:first.end}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.category==='Modifier hyphenation').length,0);
 const broken=makeDocument(['A high quality\nunknown ignored marker\nprofessional learning applies.'],'Current');
 const row=broken.blocks.find(b=>b.text.includes('unknown ignored'));row.ignored=true;broken.excluded=[{start:row.start,end:row.end}];
 assert.equal(jointStylisticIssues(broken,refs).filter(i=>i.category==='Modifier hyphenation').length,0);
 const quoted=makeDocument(['A high quality "professional learning" program applies.'],'Current');
 assert.equal(jointStylisticIssues(quoted,refs).filter(i=>i.category==='Modifier hyphenation').length,0);
 const table=makeDocument(['A high quality\nprofessional learning applies.'],'Current');table.blocks[1].formatting={headerGaps:[{},{}]};
 assert.equal(jointStylisticIssues(table,refs).filter(i=>i.category==='Modifier hyphenation').length,0);
});
