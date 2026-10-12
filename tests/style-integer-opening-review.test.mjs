import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {integerOpeningReviewIssues}from '../app/style-integer-opening-review.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),header='legislative counsel’s digest\n',make=text=>makeDocument([text],'Current',[],[],words),check=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),opening=i=>i.checkId==='lcb-integer-opening-review'||i.hasIntegerOpeningReview;
const exact=(d,i)=>{assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.openingClauseText);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.rule==='Numerals, general item 1'&&r.preferred===null));assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.rule==='12.16'&&r.preferred===null));};

test('ordinary first Digest integer and ordinal sentences no longer disappear behind their source heading',()=>{
 for(const number of ['0','1','3','10','99','1,200','3rd','10th']){const d=make(header+number+' workers are required.'),before=JSON.stringify(d),found=check(d).filter(opening);assert.equal(found.length,1,number);const i=found[0];assert.equal(i.text,number);assert.equal(i.suggestion,number==='1'?'one':null);assert.equal(i.context,'Digest');assert.equal(i.openingEvidenceKind,'selected-finite-clause');exact(d,i);assert.equal(JSON.stringify(d),before);}
});
test('unfamiliar verbs relative clauses and capitalized prose retain an explicitly conditional opening role',()=>{
 for(const tail of [' workers testified yesterday.',' persons who qualify receive aid.',' Applicants were selected.',' workers are']){const d=make(header+'3'+tail),[i]=check(d).filter(opening);assert.ok(i,tail);assert.equal(i.suggestion,null);assert.equal(i.openingEvidenceKind,'unresolved-opening-role');assert.match(i.message,/role remains unresolved/);assert.equal(i.openingClauseText,'3 '+tail.trim().split(' ')[0]);exact(d,i);}
});
test('an established precise sentence-opening correction remains the sole owner',()=>{
 for(const text of ['3 workers are required.','The program ends. (a) 3 workers are required.','3 applicants testified yesterday.']){const d=make(text),prior=jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeIntegerOpeningReview:false}),current=check(d);assert.equal(current.filter(opening).length,0);assert.deepEqual(current,prior);assert.equal(current.find(i=>i.text==='3').suggestion,'Three');}
});
test('exact grouping and nonopening ordinal ownership keep one stop and their original correction',()=>{
 for(const [number,noun,checkId,suggestion]of [['1200','workers','quantity-separators','1,200'],['1200th','person','numerals','1,200th']]){const d=make(header+number+' '+noun+' is required.'),found=check(d).filter(i=>i.start===header.length);assert.equal(found.length,1);const i=found[0];assert.equal(i.checkId,checkId);assert.equal(i.suggestion,suggestion);assert.ok(i.hasIntegerOpeningReview);assert.equal(i.exactSourceInteger,'1200');exact(d,i);if(i.quantitySeparatorEvidence){const e=i.quantitySeparatorEvidence;assert.equal(d.text.slice(e.start,e.end),e.text);}}
});
test('complete legal abbreviations cannot manufacture a sentence opening at a citation figure',()=>{
 for(const prefix of ['Ch.','Chs.','Stats.','H.R.','S.R.','U.S.C.','C.F.R.']){const d=make('Pursuant to '+prefix+' 3 workers are required.');assert.equal(integerOpeningReviewIssues(d,refs).length,0,prefix);const start=d.text.indexOf(prefix);d.struck=[{start,end:start+prefix.length}];assert.equal(integerOpeningReviewIssues(d,refs).length,0,'masked '+prefix);}
});
test('statutory Article Chapter Division Part and Title captions remain layout while SECTION prose remains eligible',()=>{
 for(const label of ['Article','Chapter','Division','Part','Title']){const d=make(label+' 8. 2026 University Capital Outlay Bond Act');assert.equal(integerOpeningReviewIssues(d,refs).length,0,label);const start=d.text.indexOf(label);d.excluded=[{start,end:start+label.length}];assert.equal(integerOpeningReviewIssues(d,refs).length,0,'masked '+label);}
 const d=make('SECTION 1. 3 workers are required.'),found=check(d);assert.equal(found.filter(opening).length,0);assert.equal(found.find(i=>i.text==='3').suggestion,'Three');
});
test('whole source prefixes prevent an erased body word from creating a new opening',()=>{
 const d=make(header+'The 3 workers are required.'),start=d.text.indexOf('The');for(const kind of ['struck','excluded']){const altered=structuredClone(d);altered[kind]=[{start,end:start+3}];assert.equal(integerOpeningReviewIssues(altered,refs).length,0,kind);}
});
test('local source label guards retain arbitrarily wide whitespace and do not search an earlier unrelated citation',()=>{
 const space=' \n\t'.repeat(5000);for(const prefix of ['Pursuant to Chs.','Pursuant to H.R.','Article'+space+'8.'])assert.equal(integerOpeningReviewIssues(make(prefix+space+'3 workers are required.'),refs).length,0,prefix.slice(0,20));const d=make('The prior citation is Chs. 3 and 4.\n'+('Unrelated prose continues.\n'.repeat(200))+'3 workers are required.'),found=integerOpeningReviewIssues(d,refs);assert.ok(found.some(i=>i.start===d.text.lastIndexOf('3 workers')));
});
test('every original numeral first word and internal bridge character is required evidence',()=>{
 const d=make(header+'33 workers are required.'),start=header.length,end=d.text.indexOf(' are');for(const kind of ['struck','excluded'])for(let n=start;n<end;n++){const altered=structuredClone(d);altered[kind]=[{start:n,end:n+1}];assert.equal(integerOpeningReviewIssues(altered,refs).length,0,kind+' '+n);}
});
test('damaged or incomplete predicate evidence falls back to intact opening words without claiming a clause',()=>{
 const d=make(header+'3 workers are required.'),at=d.text.indexOf('required');for(const kind of ['struck','excluded']){const altered=structuredClone(d);altered[kind]=[{start:at+3,end:at+4}];const [i]=integerOpeningReviewIssues(altered,refs);assert.ok(i);assert.equal(i.openingEvidenceKind,'unresolved-opening-role');assert.equal(i.openingClauseText,'3 workers');exact(altered,i);}
 for(const suffix of ['α','_code','-by','2']){const altered=make(header+'3 workers are required'+suffix+'.'),[i]=integerOpeningReviewIssues(altered,refs);assert.ok(i);assert.equal(i.openingEvidenceKind,'unresolved-opening-role');}
});
test('balanced and source-damaged quotations tables and unknown ignored rows remain protected',()=>{
 for(const quote of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const d=make(header+quote[0]+'3 workers are required.'+quote[1]);assert.equal(integerOpeningReviewIssues(d,refs).length,0);const at=d.text.indexOf(quote[0]);d.excluded=[{start:at,end:at+1}];assert.equal(integerOpeningReviewIssues(d,refs).length,0,'masked delimiter');}
 for(const kind of ['table','ignored']){const d=make(header+'3 workers are required.'),b=d.blocks.find(b=>b.text.startsWith('3'));if(kind==='table')b.formatting={headerGaps:[1,2]};else b.ignored=true;assert.equal(integerOpeningReviewIssues(d,refs).length,0,kind);}
});
test('whole numeric expressions signs identifiers headings and noncanonical numbers stay protected',()=>{
 for(const text of ['-3 workers are required.','+3 workers are required.','3.5 workers are required.','.5 workers are required.','3/4 workers are required.','3e4 workers are required.','03 workers are required.','3-4 workers are required.','3 Section workers are required.','Section 3 workers are required.','Article 3 workers are required.'])assert.equal(integerOpeningReviewIssues(make(header+text),refs).length,0,text);
 const d=make('3 workers are required.\n'+header+'Existing law applies.');assert.equal(integerOpeningReviewIssues(d,refs).length,0,'pre-Digest Heading');
});
test('unresolved percentages remain with their dedicated methods while a finite opening is reviewable',()=>{
 for(const text of ['(b) 20 percent for the appropriations.','(a) 20 percent to the employees.'])assert.equal(integerOpeningReviewIssues(make(text),refs).length,0,text);
 const d=make(header+'3 percent is required.'),direct=integerOpeningReviewIssues(d,refs);assert.equal(direct.length,1);assert.equal(direct[0].openingEvidenceKind,'selected-finite-clause');assert.equal(check(d).filter(opening).length,0,'existing precise opening percentage owns');assert.ok(check(d).some(i=>i.checkId==='opening-percentages'));
});
test('a protected source name range prevents an apparent opening from becoming a quantity question',()=>{
 const d=make(header+'3 Applicants were selected.'),start=header.length,end=start+'3 Applicants'.length;assert.equal(integerOpeningReviewIssues(d,refs,{protectedRanges:[{start,end}]}).length,0);assert.equal(integerOpeningReviewIssues(d,refs).length,1);
});
test('body numeral disagreements stay suppressed and cannot suppress the separate agreeing general opening question',()=>{
 const d=make(header+'3 workers are required.'),[i]=check(d).filter(opening);assert.ok(i);assert.equal(i.conflict,false);assert.equal(i.suggestion,null);assert.ok(i.references.every(r=>r.preferred===null));assert.ok(!i.references.some(r=>r.rule==='12.23'||r.rule==='Numerals: Digest, item 1'));const body=make(header+'The program has 3 workers.');assert.equal(check(body).filter(opening).length,0);assert.equal(check(body).length,0);
});
test('recognized word and page divisions restore exact selection and complete opening evidence',()=>{
 const d=make(header+'3 work-\ners are re-\nquired.'),blocks=d.blocks.filter(b=>!b.text.startsWith('legislative'));blocks[1].page=2;blocks[2].page=2;d.pages=2;const [i]=check(d).filter(opening);assert.ok(i);assert.equal(i.text,'3');assert.equal(i.openingEvidenceKind,'selected-finite-clause');assert.equal(i.openingClauseText,'3 work-\ners are re-\nquired');exact(d,i);
});
test('a later unrelated quotation does not suppress intact unresolved opening words',()=>{
 const d=make(header+'3 workers testified about “the proposal.”'),[i]=check(d).filter(opening);assert.ok(i);assert.equal(i.openingClauseText,'3 workers');assert.equal(i.openingEvidenceKind,'unresolved-opening-role');exact(d,i);
});
test('review toggles keep ordinary and large integer methods independent without changing precise mode',()=>{
 const d=make(header+'3 workers are required.');assert.equal(jointStylisticIssues(d,refs).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeIntegerOpeningReview:false}).filter(opening).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeLargeIntegerOpeningReview:false}).filter(opening).length,1);const large=make('9007199254740993 workers are required.');assert.equal(check(large).filter(opening).length,0);assert.ok(jointStylisticIssues(large,refs,{includeReviewSuggestions:true,includeIntegerOpeningReview:false}).some(i=>i.hasLargeIntegerOpeningReview));
});
