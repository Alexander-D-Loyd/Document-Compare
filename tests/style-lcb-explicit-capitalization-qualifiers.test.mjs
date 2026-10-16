import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';import{lcbExplicitCapitalizationQualifierIssues,restoreExplicitCapitalizationEvidence,LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE}from '../app/style-lcb-explicit-capitalization-qualifiers.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current'),check=d=>lcbExplicitCapitalizationQualifierIssues(d,refs);
const cases=[['The state supreme court shall act.','supreme court','Supreme Court',20],['The supreme court of this state shall act.','supreme court','Supreme Court',20],['The supreme court of that state has jurisdiction.','supreme court','Supreme Court',20],['The persons of the white race are eligible.','white','White',20],['The residents of the black race are included.','black','Black',18],['The applicant identified their race as white.','white','White',20],['The person reports his race as black.','black','Black',18]];

test('only complete source-stated state-court and explicit human-race qualifiers authorize capitalization',()=>{
 for(const [text,term,wanted,page]of cases){const doc=make(text),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,text);const i=found[0],e=i.explicitCapitalizationEvidence;assert.equal(i.text,term);assert.equal(i.suggestion,wanted);assert.equal(i.guidePage,page);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(refs.lcb.pages[page-1].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(e.sourceText,doc.text.slice(e.start,e.end));assert.equal(JSON.stringify(doc),saved);assert.equal(check(make(text.replace(term,wanted))).length,0);}
 assert.match(LCB_EXPLICIT_CAPITALIZATION_QUALIFIER_SCOPE,/Race alone is not interpreted/);
});

test('unknown jurisdiction ordinary colors contests named entities and incomplete roles remain quiet',()=>{
 for(const text of ['The supreme court shall act.','The supreme court of Canada shall act.','The supreme court of Nevada shall act.','The California supreme court shall act.','The state supreme court program applies.','The supreme court of this state Program shall act.','The state supreme court shall action.','The state supreme court shall act/key.','The state supreme court shall act.2 applies.','The Northern state supreme court shall act.','The white race is described.','The black race is described.','The white paint is used.','The persons of the white race program apply.','The applicant identified their race as white paper.','The applicant described the white race.','The applicant identified the contest as white.','The black residents are included.','The applicant identified their race as WHITE.','The persons of the WHITE race are eligible.'])assert.equal(check(make(text)).length,0,text);
});

test('technical and original Unicode boundaries are protected on all rule-specific cues',()=>{
 for(const text of ['identifier/state supreme court shall act.','The state/supreme court shall act.','The state supreme court of/x shall act.','The state supreme court shall act/label.','The state supreme court shall act.2 applies.','The xstate supreme court shall act.','The state supreme courtz shall act.','The state supreme court\u0301 shall act.','αThe applicant identified their race as white.','The applicant identified their race as whitex.','The applicant identified their race as white\u0301.','The persons of the white racez are eligible.'])assert.equal(check(make(text)).length,0,text);
});

test('capitalized qualifier or predicate words do not turn an unfamiliar title into ordinary state-court prose',()=>{
 for(const text of ['The State supreme court Shall Act applies.','The state supreme court Shall Act applies.','The supreme court of This State Shall Act applies.'])assert.equal(check(make(text)).length,0,text);
});

test('every complete cue and bridge character is source evidence rather than masked whitespace',()=>{
 for(const [text]of cases){const doc=make(text),issue=check(doc)[0];for(const field of ['struck','excluded'])for(let at=issue.evidenceStart;at<issue.evidenceEnd;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,text+' '+field+' '+at);}}
});

test('original struck prefix suffix and extended-name words cannot create eligible source roles',()=>{
 for(const [text,remove]of [['The state supreme courtz shall act.','z'],['The state supreme court shall actz.','z'],['The Northern state supreme court shall act.','Northern'],['The applicant identified their race as whitez.','z'],['The persons of the white racez are eligible.','z']])for(const field of ['struck','excluded']){const doc=make(text),at=doc.text.indexOf(remove);doc[field].push({start:at,end:at+remove.length});assert.equal(check(doc).length,0,text+' '+field);}
});

test('literal enclosures bill-local forms and original damaged quote endpoints remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const [text,term]of cases){assert.equal(check(make('The instruction states '+open+text+close)).length,0);assert.equal(check(make(open+term+close+' means the term. '+text)).length,0);for(const field of ['struck','excluded'])for(const side of ['open','close']){const doc=make('The instruction states '+open+text+close),at=side==='open'?doc.text.indexOf(open):doc.text.lastIndexOf(close);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0);}}
 assert.equal(check(make(cases[0][0])).length,1);
});

test('actual table and heading context remains outside these qualifier checks',()=>{
 for(const [text]of cases){const doc=make(text);doc.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(doc).length,0);assert.equal(check(makeDocument([text+'\nThe people do enact as follows:\nOther text applies.'],'Current')).length,0);}
});

test('recognized physical page heads retain complete court and race evidence through source restoration',()=>{
 for(const pages of [['The people do enact as follows:\nline 1 The supreme court of this','AB 224 — 2 —\nline 1 state shall act.'],['The people do enact as follows:\nline 1 The applicant identified their race','AB 224 — 2 —\nline 1 as white.']]){const doc=makeDocument(pages,'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);const e=found[0].explicitCapitalizationEvidence,copy=JSON.stringify(e),restored=restoreExplicitCapitalizationEvidence(e,x=>x,doc.text);assert.equal(restored.sourceText,doc.text.slice(restored.start,restored.end));for(const r of [restored.selection,restored.qualifier])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.deepEqual(restored.sourceExample,e.sourceExample);assert.equal(JSON.stringify(doc),saved);assert.equal(JSON.stringify(e),copy);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(check(doc).length,0);}
});
