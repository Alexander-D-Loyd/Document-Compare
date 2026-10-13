import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {workerWords}from './helpers/spelling-worker.mjs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {freshDefinitionTermIssues}from '../app/style-fresh-definition-terms.mjs';
const words=await workerWords();
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=text=>makeDocument([text],'Current',[],[],words),provider=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeDefinitionReview:false}),review=text=>freshDefinitionTermIssues(doc(text),refs,{candidateProvider:provider});
const base='“data processing agreement” means an agreement between two public agencies.';
test('an intact fresh defined modifier receives null reader review with original term and clause evidence',()=>{
 const [i]=review(base);assert.ok(i);assert.equal(i.text,'data processing');assert.equal(i.suggestion,null);assert.equal(i.definitionEvidence.term,'data processing agreement');assert.equal(i.definitionEvidence.candidateForm,'data-processing');assert.equal(base.slice(i.start,i.end),i.text);const e=i.definitionEvidence;assert.equal(base.slice(e.start,e.end),e.text);assert.equal(base.slice(e.evidenceStart,e.evidenceEnd),e.clauseText);assert.equal(base.slice(e.definitionVerb.start,e.definitionVerb.end),'means');assert.ok(i.references.some(r=>r.guideId==='lcb'));assert.ok(i.references.every(r=>r.preferred===null));assert.equal(i.confidence,'Review Suggested');
});
test('curly straight double and single quotation delimiters retain equivalent definition evidence',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text=open+'data processing agreement'+close+' means an agreement between public agencies.',[i]=review(text);assert.ok(i,text);assert.equal(i.definitionEvidence.clauseText,text);assert.equal(i.text,'data processing');}
});
test('additional defining predicates and initial capital do not invent a replacement',()=>{
 for(const verb of ['shall mean','includes','is defined as']){const text='“data processing agreement” '+verb+' an agreement between public agencies.',[i]=review(text);assert.ok(i,text);assert.equal(text.slice(i.definitionEvidence.definitionVerb.start,i.definitionEvidence.definitionVerb.end),verb);}
 const [i]=review('“Data processing agreement” means an agreement between public agencies.');assert.ok(i);assert.equal(i.suggestion,null);
});
test('fresh listed lexical forms and meaning distinctions cite existing LCB rules',()=>{
 for(const [term,match,form]of [['audio-video communication','audio-video','audiovideo'],['principal','principal',null]]){const text='“'+term+'” means an individual service provided under this section.',[i]=review(text);assert.ok(i,text);assert.equal(i.text,match);assert.equal(i.definitionEvidence.candidateForm,form);assert.equal(i.suggestion,null);assert.ok(i.references.some(r=>r.guideId==='lcb'));if(term==='principal')assert.ok(i.meaningWitnesses.some(w=>w.sourceEntry==='principle (rule)'));}
 assert.equal(review('“citizen-ship” means an individual service provided under this section.').length,0,'Unlisted suffix segmentation is no longer a production candidate');
});
test('correct simple defined terms remain quiet while existing ordinary prose checks remain active',()=>{
 for(const term of ['eligible applicant','data-processing agreement','audiovideo communication'])assert.equal(review('“'+term+'” means an agreement between public agencies.').length,0,term);
 const text=base+' A data processing agreement is required. The advisor acts.',precise=jointStylisticIssues(doc(text),refs);assert.equal(precise.filter(i=>i.suggestion==='data-processing').length,0);assert.ok(precise.some(i=>i.suggestion==='adviser'));assert.equal(review(text).length,1);assert.ok(precise.every(i=>i.checkId!=='lcb-fresh-definition-term-review'));
 const all=jointStylisticIssues(doc(text),refs,{includeReviewSuggestions:true});assert.ok(!all.some(i=>i.checkId==='lcb-fresh-definition-term-review'));assert.equal(all.filter(i=>i.suggestion==='data-processing').length,0);assert.ok(all.some(i=>i.suggestion==='adviser'));
});
test('copied historical nested literal and amendment directions remain protected',()=>{
 for(const text of ['The old statute states '+base,'The previous law defines '+base,'The report quotes “'+base+'”','The report states: '+base,'Insert '+base,'Strike out '+base,'The term “data processing agreement” has the same meaning as provided in Section 2.','The term “data processing agreement” is defined.'])assert.equal(review(text).length,0,text);
});
test('literal title code name string and character definitions cannot establish lexical review',()=>{
 for(const description of ['the literal text printed on the form','a title printed on a document','a code used by the computer','the name of an organization','the word printed on the form','a string containing specified characters'])assert.equal(review('“data processing agreement” means '+description+'.').length,0,description);
 for(const term of ['Community Data Processing Act','Public Health Fund','California Healthcare Access Department'])assert.equal(review('“'+term+'” means an agreement between public agencies.').length,0,term);
});
test('internal defined-term candidates use LCB forms while actual bill quotation authority stays protected',()=>{
 for(const [term,preferred]of [['healthcare','health care'],['horse-race','horse race'],['before-and-after-school program','before and after school'],['ground water','groundwater']]){const text='“'+term+'” means a service provided by public agencies.',candidates=review(text);assert.ok(candidates.some(i=>i.definitionEvidence.candidateForm===preferred&&i.suggestion===null),term);assert.equal(jointStylisticIssues(doc(text),refs).length,0,'The actual quoted bill form remains authority: '+term);}
});
test('every original character of the term predicate and description must remain intact',()=>{
 for(const property of ['struck','excluded'])for(const fragment of ['data',' sharing ','means','between','agencies']){const d=doc(base),start=d.text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(freshDefinitionTermIssues(d,refs,{candidateProvider:provider}).length,0,property+' '+fragment);}
});
test('incomplete unfamiliar descriptions damaged words and nonbill contexts are not positive evidence',()=>{
 for(const text of ['“data processing agreement” means an agreement between.','“data processing agreement” means an αgreement between agencies.','“data processing agreement” means an agreement with','LEGISLATIVE COUNSEL’S DIGEST\n'+base+'\nThe people do enact as follows:\nA rule applies.'])assert.equal(review(text).length,0,text.slice(0,100));
 const d=doc(base);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(freshDefinitionTermIssues(d,refs,{candidateProvider:provider}).length,0);
});
test('one definition can retain independent rule findings without scanning unrelated description candidates',()=>{
 const text='“principal data processing agreement” means a data processing agreement required by an agency.',found=review(text);assert.ok(found.some(i=>i.text==='principal'));assert.ok(found.some(i=>i.text==='data processing'));assert.ok(found.every(i=>i.end<=text.indexOf('”')));assert.ok(found.every(i=>i.suggestion===null));
});
test('existing precise ownership and source mutation checks never retain stale definition evidence',()=>{
 const d=doc(base),start=d.text.indexOf('data'),end=start+'data processing'.length;assert.equal(freshDefinitionTermIssues(d,refs,{candidateProvider:provider,existingIssues:[{start,end}]}).length,0);const snapshot=JSON.stringify(d);assert.equal(freshDefinitionTermIssues(d,refs,{candidateProvider:provider}).length,1);assert.equal(JSON.stringify(d),snapshot);d.struck=[{start:d.text.indexOf('means'),end:d.text.indexOf('means')+5}];assert.equal(freshDefinitionTermIssues(d,refs,{candidateProvider:provider}).length,0);
});
test('multiline terms retain complete original offsets through all coordinate mapping layers',()=>{
 const text='An unrelated require-\nment applies.\n“data proces-\nsing agreement” means an agreement between public agencies.',d=doc(text),snapshot=JSON.stringify(d),found=freshDefinitionTermIssues(d,refs,{candidateProvider:provider});assert.equal(found.length,1);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-definition-term-review').length,0);const [i]=found,e=i.definitionEvidence;assert.equal(i.text,'data proces-\nsing');assert.equal(text.slice(i.start,i.end),i.text);assert.equal(text.slice(e.start,e.end),e.text);assert.equal(text.slice(e.evidenceStart,e.evidenceEnd),e.clauseText);assert.equal(text.slice(e.definitionVerb.start,e.definitionVerb.end),'means');assert.equal(e.term,'data processing agreement');assert.equal(JSON.stringify(d),snapshot);
});



