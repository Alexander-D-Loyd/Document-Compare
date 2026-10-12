import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {exactIntegerParts,exceedsSafeInteger,groupIntegerDigits,exactOrdinalSuffix,exactFigureOrdinal}from '../app/style-exact-integer-digits.mjs';import {largeIntegerOpeningReviewIssues}from '../app/style-large-integer-openings.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),raw='9007199254740993',grouped='9,007,199,254,740,993',make=text=>makeDocument([text],'Current',[],[],words),check=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),opening=i=>i.checkId==='lcb-large-integer-opening-review'||i.hasLargeIntegerOpeningReview;
const evidence=(d,i)=>{assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.openingClauseText);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.rule==='Numerals, general item 1'&&r.preferred===null));assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.rule==='12.16'&&r.preferred===null));if(i.quantitySeparatorEvidence){const e=i.quantitySeparatorEvidence;assert.equal(d.text.slice(e.start,e.end),e.text);}};
test('whole integer parts and magnitude use exact digit strings around the safe-value boundary',()=>{
 assert.equal(exceedsSafeInteger('9007199254740991'),false);assert.equal(exceedsSafeInteger('9007199254740992'),true);assert.equal(exceedsSafeInteger(raw),true);assert.deepEqual(exactIntegerParts(grouped+'rd'),{digits:raw,suffix:'rd'});for(const text of ['0123','1,23','1234,567','1.5','1/2','-123','+123','1e30','123α','123rdα'])assert.equal(exactIntegerParts(text),null,text);
});
test('exact ordinal formatting preserves every source digit and uses the real last digits',()=>{
 for(const [digits,suffix]of [[raw,'rd'],['9007199254740992','nd'],['9007199254740991','st'],['9007199254741011','th'],['9007199254741012','th'],['9007199254741013','th'],['9007199254741021','st']]){assert.equal(exactOrdinalSuffix(digits),suffix);const result=exactFigureOrdinal(digits+'th');assert.equal(result.replace(/(?:st|nd|rd|th)$/u,'').replaceAll(',',''),digits);assert.ok(result.endsWith(suffix));}assert.equal(exactFigureOrdinal(raw+'rd'),grouped+'rd');assert.equal(exactFigureOrdinal(grouped+'nd'),grouped+'rd');
});
test('grouping handles very long strings in linear groups without scientific notation or rounding',()=>{
 const digits='1'+'234567890'.repeat(500),result=groupIntegerDigits(digits);assert.equal(result.replaceAll(',',''),digits);const chunks=result.split(',');assert.ok(chunks[0].length>=1&&chunks[0].length<=3);assert.ok(chunks.slice(1).every(c=>c.length===3));assert.equal(groupIntegerDigits('0123'),null);
});
test('all original cardinal reproductions preserve value and provide opening guidance as one stop',()=>{
 for(const number of [raw,grouped]){const d=make(number+' workers are required.'),before=JSON.stringify(d),found=check(d),same=found.filter(i=>i.start===0&&i.end===number.length);assert.equal(same.length,1);const i=same[0];assert.ok(opening(i));assert.equal(i.exactSourceInteger,raw);assert.equal(i.suggestion,number===raw?grouped:null);assert.equal(i.openingEvidenceKind,'selected-finite-clause');evidence(d,i);assert.equal(JSON.stringify(d),before);assert.ok(!found.some(i=>i.suggestion?.includes('ninety-two')));}
});
test('huge integer and ordinal openings use conditional exact-value evidence instead of invented words',()=>{
 for(const number of [raw+'rd',grouped+'rd','1'+'0'.repeat(400)+'th']){const d=make(number+' person is required.'),[i]=check(d).filter(opening);assert.ok(i,number);assert.equal(i.suggestion,null);assert.equal(i.exactSourceInteger,number.replace(/(?:st|nd|rd|th)$/u,'').replaceAll(',',''));assert.equal(i.checkId,'lcb-large-integer-opening-review');assert.equal(i.expectedOrdinalSuffix,i.sourceOrdinalSuffix);evidence(d,i);}
});
test('an exact ordinal owner after a source digest header retains the independent opening question as one stop',()=>{
 const d=make('legislative counsel’s digest\n'+raw+'rd person is required.'),start=d.text.indexOf(raw),found=check(d).filter(i=>i.start===start);assert.equal(found.length,1);const i=found[0];assert.equal(i.checkId,'numerals');assert.equal(i.suggestion,grouped+'rd');assert.ok(i.hasLargeIntegerOpeningReview);assert.equal(i.exactSourceInteger,raw);assert.equal(i.context,'Digest');evidence(d,i);
});

test('ordinary large figure ordinals retain exact grouping and suffix correction in bills and digests',()=>{
 for(const prefix of ['The ','LEGISLATIVE COUNSEL’S DIGEST\nThe '])for(const suffix of ['rd','nd']){const d=make(prefix+raw+suffix+' person is required.'),i=check(d).find(i=>i.checkId==='numerals');assert.ok(i);assert.equal(i.suggestion,grouped+'rd');assert.equal(i.text,raw+suffix);assert.equal(i.suggestion.replace(/(?:st|nd|rd|th)$/u,'').replaceAll(',',''),raw);}
 assert.equal(check(make('The '+grouped+'rd person is required.')).length,0);
});
test('ordinary huge cardinal figures receive exact grouping without a changed magnitude or exponent',()=>{
 for(const digits of [raw,'100000000000000000000001','1'+'0'.repeat(400)]){const d=make('The program requires '+digits+' workers.'),i=check(d).find(i=>i.checkId==='quantity-separators');assert.ok(i);assert.equal(i.suggestion.replaceAll(',',''),digits);assert.ok(!i.suggestion.includes('e'));assert.equal(check(make('The program requires '+i.suggestion+' workers.')).length,0);}
});
test('unfamiliar finite verbs relative clauses and capitalized prose words keep an explicit unresolved opening question',()=>{
 for(const clause of [' workers testified yesterday.',' persons who meet the requirements receive aid.',' Applicants were selected.',' workers are']){const d=make(grouped+clause),[i]=check(d).filter(opening);assert.ok(i,clause);assert.equal(i.suggestion,null);assert.equal(i.openingEvidenceKind,'unresolved-opening-role');assert.match(i.message,/role remains unresolved/);assert.equal(i.openingClauseText,grouped+' '+clause.trim().split(' ')[0]);evidence(d,i);}
});
test('source-safe opening evidence can precede an unrelated quotation without asserting its grammar',()=>{
 const d=make(grouped+' workers testified about “the proposal.”'),[i]=check(d).filter(opening);assert.ok(i);assert.equal(i.openingEvidenceKind,'unresolved-opening-role');assert.equal(i.openingClauseText,grouped+' workers');evidence(d,i);
});
test('whole-dollar openings retain the original amount and general source guidance without a word guess',()=>{
 const d=make('$'+raw+' is available.'),found=check(d).filter(opening);assert.equal(found.length,1);const i=found[0];assert.equal(i.exactSourceInteger,raw);assert.equal(i.suggestion,null);assert.ok(i.text.includes(raw));evidence(d,i);assert.equal(check(make('$'+raw+'rd is available.')).filter(opening).length,0);
});
test('small related counts retain a large peer as magnitude evidence without rounding its emitted text',()=>{
 const found=check(make('The program has 2 workers and '+raw+' workers.'));assert.ok(found.every(i=>i.text!== '2'||i.suggestion!=='two'));assert.ok(found.every(i=>!i.suggestion||!i.suggestion.includes('9007199254740992')));assert.ok(found.some(i=>i.checkId==='quantity-separators'&&i.suggestion===grouped));
});
test('signed decimal fraction exponent range identifier heading and numeric-only expressions remain protected',()=>{
 for(const text of ['-'+raw+' workers are required.','+ '+raw+' workers are required.',raw+'/2 workers are required.',raw+'–'+raw+' workers are required.',raw+'.5 workers are required.',raw+'e3 workers are required.','Model '+raw+' workers are required.','Section '+raw+' workers are required.',raw+' Section 1 applies.',raw,raw+' Budget Act Citation........1', 'CALIFORNIA LEGISLATURE\n'+raw+' Workers\nLEGISLATIVE COUNSEL’S DIGEST\nA bill.'])assert.equal(check(make(text)).filter(opening).length,0,text);
});
test('original prefix removal and every opening number or word character reject invented evidence',()=>{
 const text=grouped+' workers testified yesterday.';for(const property of ['struck','excluded'])for(let at=0;at<(grouped+' workers').length;at++){const d=make(text);d[property].push({start:at,end:at+1});assert.equal(largeIntegerOpeningReviewIssues(d,refs).length,0,property+' '+at);}
 for(const property of ['struck','excluded']){const prefix='The program requires ',d=make(prefix+grouped+' workers testified yesterday.');d[property].push({start:0,end:prefix.length});assert.equal(largeIntegerOpeningReviewIssues(d,refs).length,0);}
});
test('quotes including damaged single-quote delimiters tables and unknown ignored rows remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"],['‘','’']]){const text=open+raw+' workers are required.'+close;assert.equal(check(make(text)).filter(opening).length,0);for(const property of ['struck','excluded']){const d=make(text);d[property].push({start:0,end:1});d[property].push({start:text.length-1,end:text.length});assert.equal(check(d).filter(opening).length,0,property+' '+text);}}
 const d=make(raw+' workers are required.');d.blocks[0].ignored=true;assert.equal(check(d).filter(opening).length,0);const table=make(raw+' workers are required.');table.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(table).filter(opening).length,0);
});
test('word/page divisions restore both opening evidence and the independent grouping witness',()=>{
 const d=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\n'+raw+' work-','ers are re-','quired.'],'Current',[],[],words),before=JSON.stringify(d),[i]=check(d).filter(opening);assert.ok(i);assert.equal(i.suggestion,grouped);assert.equal(i.checkId,'quantity-separators');assert.ok(i.openingClauseText.includes('\n'));assert.ok(i.quantitySeparatorEvidence.text.includes('work-'));evidence(d,i);assert.equal(JSON.stringify(d),before);
});
test('review toggles preserve safe-boundary behavior and exact source corrections independently',()=>{
 const safe=check(make('9007199254740991 workers are required.'));assert.ok(safe.some(i=>i.checkId==='numerals'&&i.suggestion.endsWith('ninety-one')));const d=make(grouped+' workers are required.');assert.equal(jointStylisticIssues(d,refs).filter(opening).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeLargeIntegerOpeningReview:false}).filter(opening).length,0);assert.equal(check(d).filter(opening).length,1);assert.equal(largeIntegerOpeningReviewIssues(d,{lcb:refs.lcb}).length,0);
});
