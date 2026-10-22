import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {californiaCitationReview} from '../app/style-california-citations.mjs';
import {CALIFORNIA_CITATION_PROVISION_TASKS as tasks,citationProvisionChecks} from '../app/style-california-citation-reader-tasks.mjs';
import {CALIFORNIA_CITATION_REVIEW_CATALOG as catalog} from '../app/style-california-citation-review-catalog.mjs';
import {lcbReviewReadiness} from '../app/lcb-review-readiness.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>californiaCitationReview({...makeDocument([text],'Current'),styleDocumentType:'opinion'},refs,{includeContextReview:true}).issues;
test('every numbered citation provision has its own source page and actual reader duties rather than just a counted family route',()=>{
 const expected=[...Array.from({length:37},(_,n)=>'1:'+(n+1)),...Array.from({length:50},(_,n)=>'2:'+(n+1)),...Array.from({length:15},(_,n)=>'3:'+(n+1))];
 assert.deepEqual(Object.keys(tasks),expected);
 for(const [section,r]of Object.entries(tasks)){assert.ok(r.tasks.length,section);assert.ok(r.tasks.every(t=>typeof t==='string'&&t.trim().length>10),section);assert.ok(r.printedPage>=4&&r.printedPage<=109,section);assert.equal(r.pdfPage,r.printedPage+26,section);}
 for(const f of catalog)assert.deepEqual(citationProvisionChecks(f).map(p=>p.section),f.sections.map(n=>f.chapter+':'+n));
 const readiness=lcbReviewReadiness(refs);assert.equal(readiness.supplementaryCitationAuthority.explicitProvisionRows,102);assert.equal(readiness.supplementaryCitationAuthority.recognizesEveryPossibleCitation,false);assert.equal(readiness.wholeRuleCertification,false);
});
test('case and enactment tasks explicitly identify the unresolved support chain ordering and version requirements',()=>{
 const cases=check('Alpha v. Beta (1998) 12 Cal.4th 186.'),provisions=cases.flatMap(i=>i.citationContextReview||[]).flatMap(f=>f.provisionChecks||[]);
 const text=n=>provisions.find(p=>p.section===n)?.tasks.join(' ');
 assert.match(text('1:2'),/intervening authority/);assert.match(text('1:3'),/docket/);assert.match(text('1:4'),/actual opinion/);assert.match(text('1:5'),/pertinence/);assert.match(text('1:8'),/footnote/);assert.match(text('1:10'),/majority/);assert.match(text('1:11'),/current records/);
 const code=check('(Civ. Code, § 51.)').flatMap(i=>i.citationContextReview||[]).flatMap(f=>f.provisionChecks||[]);
 assert.match(code.find(p=>p.section==='2:5').tasks.join(' '),/omitted/);assert.match(code.find(p=>p.section==='2:14').tasks.join(' '),/amend|version|effective/iu);
});
test('secondary tasks retain edition supplement source authority and medium-specific verification requirements',()=>{
 for(const [n,pattern]of [['3:1',/supplement/iu],['3:2',/publisher/iu],['3:4',/column/iu],['3:6',/draft/iu],['3:8',/Comment/iu],['3:11',/professional/iu],['3:15',/access|update|medium|CD-ROM/iu]])assert.match(tasks[n].tasks.join(' '),pattern,n);
});
test('overlapping observable requirements keep their additional rule reasons and source links',()=>{
 const issues=check('(Exec. Order No. 12832, 58 Fed.Reg. 5905.)');
 const source=issues.flatMap(i=>[i.supplementarySource,...(i.citationFormChecks||[])]);assert.ok(source.some(c=>c.section==='§2:44'));assert.ok(source.some(c=>c.section==='§2:48'));
 assert.ok(source.every(c=>c.reason&&Number.isInteger(c.pdfPage)));assert.ok(issues.some(i=>i.additionalReviewSuggested));
 assert.ok(issues.some(i=>i.citationContextReview?.some(f=>f.provisionChecks?.some(p=>p.section==='2:48'))),'The printed No. form retains executive-source duties alongside register duties.');
});
