import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';import {listNounPhrase,punctuationListNounPhrase} from '../app/style-list-phrases.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const serial=t=>serialCommaIssues(makeDocument([t],'Current'),refs);
test('AB1502 actor phrases retain the final-comma requirement and exact agreeing citations',()=>{
 const text='The board includes veterinarians, registered veterinary technicians and members of the public.',issues=serial(text);assert.equal(issues.length,1);const i=issues[0];assert.equal(text.slice(i.start,i.end),'and');assert.equal(i.suggestion,', and');assert.deepEqual(i.references.map(r=>[r.guideId,r.guidePage,r.rule]),[['lcb',6,'Punctuation: Commas'],['gpo',216,'8.46']]);assert.equal(serial(text.slice(0,i.start)+i.suggestion+text.slice(i.end)).length,0);
});
test('one complete of or for noun complement can occupy any position in an explicit series',()=>{
 for(const items of [['reports of agencies','records','documents'],['reports','records for schools','documents'],['reports','records','documents for the public agencies'],['programs for a patient','plans for an organization','services for the schools'],['reports of state agencies','records for public schools','documents for private hospitals']])for(const join of ['and','or','nor']){
  const text='The list includes '+items[0]+', '+items[1]+' '+join+' '+items[2]+'.',issues=serial(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,', '+join);const i=issues[0];assert.equal(serial(text.slice(0,i.start)+i.suggestion+text.slice(i.end)).length,0,text);
 }
});
test('grouped noun-complement series require only the final semicolon',()=>{
 const text='The list includes reports of agencies, records for schools; documents, applications for permits and services for patients, programs for residents.',doc=makeDocument([text],'Current'),issues=semicolonSeriesIssues(doc,refs);assert.equal(issues.length,1);const i=issues[0];assert.equal(text.slice(i.start,i.end),'and');assert.equal(i.suggestion,'; and');assert.equal(semicolonSeriesIssues(makeDocument([text.slice(0,i.start)+i.suggestion+text.slice(i.end)],'Current'),refs).length,0);
});
test('noun complements do not broaden numerical-expression grouping',()=>{
 for(const t of ['members of the public','records for schools','reports of state agencies']){assert.equal(punctuationListNounPhrase(t,refs.lcb),true);assert.equal(listNounPhrase(t,refs.lcb),false);}
});
test('unknown names, nested alternatives, clauses, multiple complements and unattached adjuncts remain protected',()=>{
 for(const t of ['The list includes reports of Smith Institute, records and documents.','The list includes reports, records for schools and agencies and documents.','The list includes reports, records for schools that apply and documents.','The list includes reports for schools of agencies, records and documents.','The list includes reports, records and documents, for schools.','The list includes reports, records for inspection and documents.','The list includes reports, records and members for the public.','The term “reports, records and members of the public” is literal.'])assert.equal(serial(t).length,0,t);
});
test('recognized interior running heads retain a complete list; unknown ignored spans and strikes block inference',()=>{
 const doc=makeDocument(['The list includes reports of agencies,\nrecords for schools','AB 1 — 2 —\nand documents for patients.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.ok(head);head.formatting={headerParts:[{text:head.text}]};let issues=serialCommaIssues(doc,refs);assert.equal(issues.length,1);assert.equal(doc.text.slice(issues[0].start,issues[0].end),'and');head.formatting={};assert.equal(serialCommaIssues(doc,refs).length,0);head.formatting={headerParts:[{text:head.text}]};const at=doc.text.indexOf('records');doc.struck=[{start:at,end:at+7}];assert.equal(serialCommaIssues(doc,refs).length,0);
});
