import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';
import {jointStylisticIssues}from '../app/joint-style.mjs';
import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';
import {GENERAL_MODIFIER_REVIEW_RULE}from '../app/offline-rules.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const legacy={includeReviewSuggestions:true,includeNounSequenceReview:true,includeQualifiedNounPrefixReview:true,includeParsedPredicateReview:true,includeProductiveLikeReview:true,includeLexicalSuffixReview:true,includeCreatedEntityNameReview:true,includeCreatedTitleNameReview:true};
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs,legacy);
const unsupported=new Set(['lcb-general-unit-modifier-review','spacy-data-sharing','lcb-entity-identity-review','lcb-created-entity-name-consistency-review','lcb-created-title-name-consistency-review','lcb-created-title-identity-review','lcb-parsed-number-relation-review','lcb-repeated-count-phrase-review','lcb-coordinated-number-relation-review','lcb-mixed-count-list-review','lcb-parsed-predicate-compound-review','lcb-postnominal-compound-review','lcb-suffix-boundary-review','lcb-internal-bill-reference-review','entry-modifier','participle-modifiers']);
const assertNoUnsupported=found=>assert.deepEqual(found.filter(i=>unsupported.has(i.checkId)),[]);

test('generic modifier variants and unsupported data-sharing engine rules cannot be revived by legacy options',()=>{
 const text='The office supports resident service policy rules.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),start=text.indexOf('resident'),end=text.indexOf(' rules'),headStart=text.indexOf('rules');
 for(const reviewVariant of ['open-modifier','ly-hyphen','noun-sequence','qualified-noun-prefix']){
  const candidate={start,end,text:text.slice(start,end),matchText:text.slice(start,end),head:'rules',headStart,headEnd:headStart+5,engine:'spaCy',engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewVariant,reviewSuggested:true,suggestion:null};
  const original=JSON.stringify(candidate),found=jointStylisticIssues(doc,refs,{...legacy,engineIssues:[candidate]});assertNoUnsupported(found);assert.equal(JSON.stringify(candidate),original);assert.equal(JSON.stringify(doc),before);
 }
 const sharing=makeDocument(['A data sharing agreement applies.'],'Current'),at=sharing.text.indexOf('data'),issue={start:at,end:at+12,text:'data sharing',matchText:'data sharing',head:'agreement',engineRule:'LCB_DATA_SHARING_MODIFIER',engine:'spaCy',suggestion:'data-sharing'};
 const sharingFound=jointStylisticIssues(sharing,refs,{...legacy,engineIssues:[issue]});assert.deepEqual(sharingFound.map(i=>[i.suggestion,i.checkId]),[]);assertNoUnsupported(sharingFound);
});

test('unsupported guesses cannot displace an exact printed modifier finding',()=>{
 const text='The office uses a data processing system.',doc=makeDocument([text],'Current'),start=text.indexOf('data'),headStart=text.indexOf('system'),candidate={start,end:headStart-1,text:'data processing',matchText:'data processing',head:'system',headStart,headEnd:headStart+6,engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewVariant:'qualified-noun-prefix',reviewSuggested:true,suggestion:null};
 const found=jointStylisticIssues(doc,refs,{...legacy,engineIssues:[candidate]});assert.deepEqual(found.map(i=>i.suggestion),['data-processing']);assert.equal(found[0].guidePage,10);assertNoUnsupported(found);
});

test('fuzzy identity and missing-target heuristics are absent from production style',()=>{
 const inputs=['The Department of Community Affairs shall act.','The Regional Transportation Accountability Council is hereby established. The Regional Transportation Council shall act.','The Regional Safety Climate Account is hereby created in the State Treasury. The Regional Safety Account shall receive funds.','The Community Transportation Accountability Fund is created in the State Treasury. Revenue enters the Community Transportation Accountabilty Fund.','The people do enact as follows:\nSECTION 1. This act applies.\nSEC. 2. Section 9 of this bill shall become operative.'];
 for(const text of inputs){const doc=makeDocument([text],'Current'),before=JSON.stringify(doc);assertNoUnsupported(jointStylisticIssues(doc,refs,legacy));assert.equal(JSON.stringify(doc),before);}
});

test('whole source-listed corrections and explicit conditional meaning review remain active',()=>{
 for(const [text,preferred,page]of [['The advisor shall act.','adviser',2],['It is a cost effective plan.','cost-effective',10],['A data processing system applies.','data-processing',10],['The department of consumer affairs shall act.','Department of Consumer Affairs',17]]){const found=check(text),issue=found.find(i=>i.suggestion===preferred);assert.ok(issue,text);assert.equal(issue.guidePage,page);assert.equal(text.slice(issue.start,issue.end),issue.text);}
 const meanings=check('The agency ensures compliance.');assert.ok(meanings.some(i=>i.checkId==='lcb-semantic-review:ensure-insure'&&i.reviewSuggested&&i.suggestion===null));
});

test('same-expression contiguous count review survives while separated-clause and mixed-head inference is absent',()=>{
 const exact=check('The laboratory receives three zygotes, four zygotes, and 10 zygotes.').filter(i=>i.checkId==='lcb-number-relation-review');assert.deepEqual(exact.map(i=>i.text),['three','four']);assert.ok(exact.every(i=>i.reviewSuggested&&i.suggestion===null&&i.relationshipEvidence.head==='zygotes'));
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/coordinated-count-model.json',import.meta.url)));for(const row of fixture.rows.slice(0,6)){const doc=makeDocument([row.text],'Current'),plan=prepareOfflineLanguage(doc),mapped=mapOfflineIssues(doc,plan,structuredClone(row.issues),'style');assertNoUnsupported(jointStylisticIssues(doc,refs,{...legacy,engineIssues:mapped}));}
 assertNoUnsupported(check('The laboratory receives three eligible zygotes from each office and 12 eligible zygotes from the department.'));
 assertNoUnsupported(check('The office receives three unfamiliar long nominal phrases and 10 unfamiliar long nominal phrases.'));
});

test('broad suffix and finite invented entry/participle families stay disabled',()=>{
 for(const text of ['The invoice-like requirement applies.','The office supports entry level service.','The office supports invoice related records.'])assertNoUnsupported(check(text));
 const suffix=check('The document has a referrence.');assert.ok(suffix.some(i=>i.checkId==='suffix-spelling'&&i.suggestion==='reference'&&i.guidePage===108));
});

test('quoted bill authority and source exclusions stay independent of LCB guide priority',()=>{
 assert.equal(check('The term “data processing” is defined. A data processing system applies.').filter(i=>i.suggestion==='data-processing').length,0);
 assert.deepEqual(check('The federal government supplies healthcare.').map(i=>i.suggestion),['health care']);assert.equal(check('The term “healthcare” is defined. The federal government supplies healthcare.').length,0);
 const doc=makeDocument(['The advisor shall act.'],'Current'),at=doc.text.indexOf('advisor');doc.struck=[{start:at,end:at+7}];assert.equal(jointStylisticIssues(doc,refs,legacy).length,0);
});

test('retired noun predicate postnominal identity and suffix prototypes have production quiet negatives',()=>{
 const texts=['The office uses resident service policy rules.','The system supports data retention workflow management.','The records are machine-validated.','The records laboratory-tested by officials shall be retained.','The records that are machine-validated by officials shall be retained.','The invoice-like requirement applies.','The Department of Community Affairs shall act.','The Community Transportation Accountability Fund is created in the State Treasury. Revenue enters the Community Transportation Accountabilty Fund.'];
 for(const text of texts){const doc=makeDocument([text],'Current'),before=JSON.stringify(doc);assert.deepEqual(jointStylisticIssues(doc,refs,legacy),[],text);assert.equal(JSON.stringify(doc),before);}
});

test('retired parser families and malformed witness variants cannot become a production finding',()=>{
 const text='The records are machine-validated.',doc=makeDocument([text],'Current'),start=text.indexOf('machine'),end=start+'machine-validated'.length,before=JSON.stringify(doc);
 for(const engineRule of ['LCB_PARSED_PREDICATE_COMPOUND_REVIEW','LCB_POSTNOMINAL_COMPOUND_REVIEW','LCB_PARSED_NUMBER_RELATION_REVIEW','LCB_COORDINATED_NUMBER_RELATION_REVIEW','LCB_MIXED_COUNT_LIST_REVIEW'])for(const metadata of [{},{start:-1},{end:doc.text.length+1},{relationshipEvidence:{members:[]}},{predicateRoleEvidence:{members:[]}},{postnominalRoleEvidence:null}]){
  const issue={start,end,text:text.slice(start,end),matchText:text.slice(start,end),engineRule,engine:'spaCy',reviewSuggested:true,suggestion:null,...metadata},snapshot=JSON.stringify(issue);
  assert.deepEqual(jointStylisticIssues(doc,refs,{...legacy,engineIssues:[issue]}),[]);assert.equal(JSON.stringify(issue),snapshot);assert.equal(JSON.stringify(doc),before);
 }
});

test('a retained printed modifier rejects damage to every selected word head and connecting character',()=>{
 const text='The office uses a data processing system.',base=makeDocument([text],'Current'),start=text.indexOf('data'),end=text.indexOf('system')+6;assert.ok(jointStylisticIssues(base,refs,legacy).some(i=>i.suggestion==='data-processing'));
 for(const property of ['struck','excluded'])for(let at=start;at<end;at++){
  const doc=makeDocument([text],'Current');doc[property].push({start:at,end:at+1});const before=JSON.stringify(doc);assert.equal(jointStylisticIssues(doc,refs,legacy).some(i=>i.suggestion==='data-processing'),false,property+' '+at);assert.equal(JSON.stringify(doc),before);
 }
 for(const text of ['The office uses édata processing systems.','The office uses data processingé systems.','The office uses data processing systemé.','The label “data processing system” applies.'])assert.equal(check(text).some(i=>i.suggestion==='data-processing'),false,text);
});

test('retained printed modifier physical selections survive only identified layout bridges',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 1\nThe people do enact as follows:\nline 1 The office uses a data\n97','AB 1 — 2 —\nline 1 processing system.'],'Current'),head=doc.blocks.find(b=>b.ignored&&b.text.includes('AB 1'));for(const layout of doc.blocks.filter(b=>b.ignored))layout.formatting={headerParts:[{text:layout.text}]};
 const before=JSON.stringify(doc),found=jointStylisticIssues(doc,refs,legacy).filter(i=>i.suggestion==='data-processing');assert.equal(found.length,1);assert.equal(found[0].text,doc.text.slice(found[0].start,found[0].end));assert.ok(found[0].text.includes('\n'));assert.equal(JSON.stringify(doc),before);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(jointStylisticIssues(doc,refs,legacy).some(i=>i.suggestion==='data-processing'),false);
});

test('same-expression exact large counts preserve source digits without inferred rounded metadata',()=>{
 const peer='9007199254740993',text='The laboratory receives three zygotes and '+peer+' zygotes.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),[issue]=jointStylisticIssues(doc,refs,legacy).filter(i=>i.checkId==='lcb-number-relation-review');assert.ok(issue);const large=issue.relationshipEvidence.members.find(m=>m.exactSourceInteger);assert.equal(large.exactSourceInteger,peer);assert.equal(large.value,null);assert.equal(doc.text.slice(large.start,large.end),peer);assert.equal(JSON.stringify(doc),before);
 for(const peer of ['09007199254740993','9,007,19,254,740,993','9007199254740993α','9007199254740993.5','-9007199254740993','9007199254740993/2'])assert.equal(check('The laboratory receives three zygotes and '+peer+' zygotes.').some(i=>i.checkId==='lcb-number-relation-review'),false,peer);
});

test('explicit same-expression count evidence retains source gaps literal and different-expression safeguards',()=>{
 const text='The laboratory receives three zygotes and 10 zygotes.',start=text.indexOf('three'),end=text.lastIndexOf('zygotes')+7;assert.ok(check(text).some(i=>i.checkId==='lcb-number-relation-review'));
 for(const property of ['struck','excluded'])for(let at=start;at<end;at++){const doc=makeDocument([text],'Current');doc[property].push({start:at,end:at+1});assert.equal(jointStylisticIssues(doc,refs,legacy).some(i=>i.checkId==='lcb-number-relation-review'),false,property+' '+at);}
 for(const text of ['The phrase “three zygotes and 10 zygotes” is literal.','The program lasts two years and 10 months.','The office receives three zygotes per day and 10 zygotes per month.'])assert.equal(check(text).some(i=>i.checkId==='lcb-number-relation-review'),false,text);
});
