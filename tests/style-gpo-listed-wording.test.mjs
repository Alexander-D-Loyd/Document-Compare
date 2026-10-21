import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoListedWordingIssues,GPO_LISTED_WORDING_SCOPE} from '../app/style-gpo-listed-wording.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const run=input=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),found=gpoListedWordingIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of found){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.listedWordingEvidence.sourceText);}return found;};
const prefixes=[['The agency shall reredirect the payment.','reredirect','re-redirect'],['The subsubcommittee is appointed.','subsubcommittee','sub-subcommittee'],['This is a supersuperlative description.','supersuperlative','super-superlative']];

test('only the three printed duplicated-prefix words receive finite full-role comparisons',()=>{
 assert.match(refs.gpo.pages[118].text,/re-redirect sub-subcommittee super-superlative/u);assert.match(GPO_LISTED_WORDING_SCOPE,/rereferred/u);
 for(const [text,term,wanted]of prefixes)for(const separator of ['',' ',' - ']){const first=wanted.indexOf('-'),variant=wanted.slice(0,first)+separator+wanted.slice(first+1),[i]=run(text.replace(term,variant));assert.ok(i,variant);assert.equal(i.text,variant);assert.equal(i.suggestion,wanted);assert.equal(i.rule,'6.33');assert.equal(i.guidePage,119);assert.equal(i.guidePrintedPage,'105');}
 for(const [text,term,wanted]of prefixes)assert.deepEqual(run(text.replace(term,wanted)),[]);
 for(const text of ['The agency shall rereferred the payment.','The agency shall rereviewed the report.','The subcommittee is appointed.','The agency shall reredirecting the payment.','The subsubcommitteeish is appointed.','This is a supersuperlative adjective.','A superlative description.','The agency shall rerecreate the report.','Use reredirect.','Use subsubcommittee.','Use supersuperlative.'])assert.deepEqual(run(text),[],text);
});

test('four exact for-sake phrases compare only the printed apostrophe without changing number or words',()=>{
 assert.match(refs.gpo.pages[210].text,/for goodness’ sake for acquaintance’ sake/u);assert.match(refs.gpo.pages[210].text,/for conscience’ sake/u);assert.match(refs.gpo.pages[210].text,/for old times’ sake/u);
 for(const noun of ['goodness','conscience','acquaintance','old times'])for(const mark of ['',"'s",'’s']){const phrase='for '+noun+mark+' sake',[i]=run('They acted '+phrase+'.');assert.ok(i,phrase);assert.equal(i.suggestion,'for '+noun+(mark.startsWith("'")?"'":'’')+' sake');assert.equal(i.text,phrase);assert.equal(i.rule,'8.16');assert.equal(i.guidePage,211);assert.equal(i.guidePrintedPage,'197');}
 for(const noun of ['goodness','conscience','acquaintance','old times'])for(const mark of ["'",'’'])assert.deepEqual(run('They acted for '+noun+mark+' sake.'),[]);
 assert.equal(run('For goodness sake.')[0].suggestion,'For goodness’ sake');
 for(const text of ["They acted for old time's sake.","Mr. Hughes's service.",'They acted for kindness sake.','They acted for goodness sake Program.','They acted for goodness sake today.','They acted for Goodness sake.'])assert.deepEqual(run(text),[],text);
});

test('every original role cue word connector and continuation character is required',()=>{
 for(const text of [...prefixes.map(p=>p[0]),'They acted for old times’s sake.']){const d=make(text),[i]=run(d);assert.ok(i);for(const property of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const x=structuredClone(d);x[property].push({start:at,end:at+1});assert.deepEqual(run(x),[],property+' '+text+' '+at);}}
 for(const [text,needle]of [['The agency shall old reredirect the payment.','old'],['The sub old subcommittee is appointed.','old'],['They acted for old nonsense times’s sake.','nonsense'],['The subsubcommittee isé appointed.','é']])for(const property of ['struck','excluded']){const d=make(text),at=d.text.indexOf(needle);d[property].push({start:at,end:at+needle.length});assert.deepEqual(run(d),[],property+' '+text);}
});

test('original wrapped quotations bill-local words technical endpoints and title continuations stay protected',()=>{
 for(const [text,term]of [...prefixes,['They acted for goodness sake.','for goodness sake']]){
  for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const d=make(open+text+close);assert.deepEqual(run(d),[]);for(const property of ['struck','excluded'])for(const at of [d.text.indexOf(open),d.text.lastIndexOf(close)]){const x=structuredClone(d);x[property].push({start:at,end:at+1});assert.deepEqual(run(x),[]);}}
  assert.deepEqual(run('“'+term+'” is the term. '+text),[]);
  for(const attachment of ['é','\u0301','_key','/key','.key','-key'])for(const side of ['before','after']){const d=make(text.replace(term,side==='before'?attachment+term:term+attachment));assert.deepEqual(run(d),[],side+' '+attachment);for(const property of ['struck','excluded']){const x=structuredClone(d),at=x.text.indexOf(attachment);x[property].push({start:at,end:at+attachment.length});assert.deepEqual(run(x),[],property+' '+side+' '+attachment);}}
 }
 for(const text of ['The subsubcommittee Program is appointed.','This is a supersuperlative Description Program.','They acted for goodness sake, Inc., is hereby established.']){assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=make(text),at=d.text.indexOf(text.includes('Inc.')?'Inc.':'Program');d[property].push({start:at,end:at+(text.includes('Inc.')?4:7)});assert.deepEqual(run(d),[],property+' '+text);}}
 for(const text of ['The agency shall re—redirect the payment.','The sub—subcommittee is appointed.','This is a super—superlative description.'])assert.deepEqual(run(text),[],text);
});

test('known physical page heads preserve full selections while tables headings and unknown bridges cannot supply roles',()=>{
 for(const [text]of prefixes){const d=make(text);d.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(d),[]);}
 assert.deepEqual(run(makeDocument(['The subsubcommittee is appointed.\nThe people do enact as follows:'],'Current')),[]);
 const d=makeDocument(['The people do enact as follows:\nline 1 The sub','AB 999 — 2 —\nline 1 subcommittee is appointed.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.equal(i.suggestion,'sub-subcommittee');assert.match(i.text,/AB 999/u);head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(run(d),[]);
});

test('production keeps each whole printed phrase and preserves LCB exceptions without overlap',()=>{
 const joint=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-listed-wording');
 for(const [text,term,wanted]of [...prefixes,['They acted for goodness’s sake.','for goodness’s sake','for goodness’ sake'],['They acted for old times sake.','for old times sake','for old times’ sake']]){const d=make(text),before=JSON.stringify(d),all=jointStylisticIssues(d,refs),start=d.text.indexOf(term),found=all.filter(i=>i.start<start+term.length&&i.end>start);assert.equal(found.length,1,text);const [i]=found;assert.equal(i.text,term);assert.equal(i.suggestion,wanted);assert.equal(i.conflict,false);assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.sourcePassage?.text));assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.listedWordingEvidence.sourceText);assert.equal(JSON.stringify(d),before);}
 for(const text of ['The subcommittee is appointed.','The agency shall rereferred the payment.','The agency shall rereviewed the report.','“reredirect” is the term. The agency shall reredirect the payment.','They acted for goodness sake, Inc., is hereby established.'])assert.deepEqual(joint(make(text)),[],text);
 const d=make('The agency shall old reredirect the payment.'),at=d.text.indexOf('old');for(const property of ['struck','excluded']){const x=structuredClone(d);x[property].push({start:at,end:at+3});assert.deepEqual(joint(x),[]);}
});

test('production restores wording evidence after an earlier recognized word division and through physical heads',()=>{
 for(const text of ['The subsubcommittee is appointed.','They acted for conscience’s sake.']){const d=makeDocument(['The people do enact as follows:\nThe qual-\nity remains. '+text],'Current',[],[],new Set(['quality'])),before=JSON.stringify(d),[i]=jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-listed-wording');assert.ok(d.wrappedWords.some(w=>w.word==='quality'&&w.recognized));assert.ok(i);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.listedWordingEvidence.start,i.evidenceStart);assert.equal(i.listedWordingEvidence.end,i.evidenceEnd);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.listedWordingEvidence.sourceText);assert.equal(i.start,d.text.indexOf(text.startsWith('They')?'for conscience':'subsubcommittee'));assert.equal(JSON.stringify(d),before);}
 const d=makeDocument(['The people do enact as follows:\nline 1 They acted for old','AB 999 — 2 —\nline 1 times’s sake.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-listed-wording');assert.ok(i);assert.match(i.listedWordingEvidence.sourceText,/AB 999/u);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.listedWordingEvidence.sourceText);assert.equal(d.text.slice(i.start,i.end),i.text);
});

test('original name tails after the complete role noun stay protected without crossing a closed sentence',()=>{
 const checks=[run,d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-listed-wording')];
 for(const [text,tail]of [['The super superlative description Program is hereby established.','Program is hereby established'],['The super superlative description program is hereby established.','program is hereby established'],['The super superlative description West Foundation is hereby established.','West Foundation is hereby established'],['The shall reredirect the payment, Inc., is hereby established.',', Inc., is hereby established'],['The shall reredirect the payment , Inc., is hereby established.',' , Inc., is hereby established']]){const d=make(text);for(const check of checks)assert.deepEqual(check(d),[],text);const at=d.text.indexOf(tail);for(const property of ['struck','excluded'])for(let n=0;n<tail.length;n++){const x=structuredClone(d);x[property].push({start:at+n,end:at+n+1});for(const check of checks)assert.deepEqual(check(x),[],property+' '+text+' '+n);}}
 for(const check of checks)for(const text of ['This is a super superlative description. Program administration begins.','The agency shall reredirect the payment. The Program is hereby established.','They acted for goodness sake. Program administration begins.'])assert.equal(check(make(text)).length,1,text);
});
