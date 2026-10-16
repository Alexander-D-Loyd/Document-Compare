import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {modifierPositionIssues} from '../app/style-modifier-positions.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=(text,mask=null,mode='struck')=>{const doc=makeDocument([text],'Current');if(mask){const start=doc.text.indexOf(mask);assert.ok(start>=0,mask);doc[mode]=[{start,end:start+mask.length}];}return modifierPositionIssues(doc,refs);};

test('both exact source examples retain positive and compliant noun/predicate controls',()=>{
 for(const [text,expected]of [
  ['Use crystal clear water.','crystal-clear'],['Use fire tested materials.','fire-tested'],
  ['The water is crystal-clear.','crystal clear'],['The material is fire-tested.','fire tested'],
  ['The materials shall be very fire-tested.','fire tested'],
 ]){
  const issues=check(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,expected,text);
  assert.equal(issues[0].text,text.slice(issues[0].start,issues[0].end));
  assert.equal(issues[0].guideId,'lcb');assert.equal(issues[0].guidePage,8);
  assert.ok(issues[0].references.some(r=>r.guideId==='gpo'&&r.rule==='7.7'));
 }
 for(const text of ['Use crystal-clear water.','Use fire-tested material.','The water is crystal clear.','The material is fire tested.','The water is a crystal-clear substance.','The material is a fire-tested product.'])assert.equal(check(text).length,0,text);
});

test('original technical copula and explicit noun attachments never manufacture the printed role',()=>{
 for(const [text,mask]of [
  ['The water is-code crystal-clear.','-code'],['The water-code is crystal-clear.','-code'],
  ['The wastewater is crystal-clear.','waste'],['The material-code is fire-tested.','-code'],
  ['The water is/key crystal-clear.','/key'],['The water\u0301 is crystal-clear.','\u0301'],
 ])for(const mode of ['struck','excluded']){assert.equal(check(text).length,0,text);assert.equal(check(text,mask,mode).length,0,text+' '+mode);}
});

test('original closing words and suffixes cannot manufacture a predicate ending',()=>{
 for(const [text,mask]of [
  ['The water is crystal-clear-coated.','-coated'],['The water is crystal-clear glass.','glass'],
  ['The material is fire-tested-coated.','-coated'],['The material is fire-tested product.','product'],
 ])for(const mode of ['struck','excluded']){assert.equal(check(text).length,0,text);assert.equal(check(text,mask,mode).length,0,text+' '+mode);}
});

test('unit-modifier noun is complete evidence, including original suffix and Unicode boundaries',()=>{
 for(const [text,mask]of [
  ['Use crystal clear water-code.','-code'],['Use crystal clear watermarked.','marked'],
  ['Use fire tested material-code.','-code'],['Use fire tested materials/key.','/key'],
  ['Use crystal clear water\u0301.','\u0301'],['Use fire tested materials\u{10400}.','\u{10400}'],
 ])for(const mode of ['struck','excluded']){assert.equal(check(text).length,0,text);assert.equal(check(text,mask,mode).length,0,text+' '+mode);}
});

test('each supporting noun/copula/closing character is validated against original masks',()=>{
 for(const text of ['The water is crystal-clear.','Use crystal clear water.','The material is fire-tested.','Use fire tested material.']){
  const source=makeDocument([text],'Current'),base=modifierPositionIssues(source,refs);assert.equal(base.length,1,text);const issue=base[0];
  for(let index=issue.evidenceStart;index<issue.evidenceEnd;index++)for(const mode of ['struck','excluded']){
   const doc=makeDocument([text],'Current');doc[mode]=[{start:index,end:index+1}];
   assert.equal(modifierPositionIssues(doc,refs).length,0,text+' '+mode+' @ '+index);
  }
 }
});

test('predicate proof contains complete physical noun and closing evidence while selection remains narrow',()=>{
 const text='The materials shall be very fire-tested.',doc=makeDocument([text],'Current'),before=structuredClone(doc),[issue]=modifierPositionIssues(doc,refs);
 assert.equal(issue.text,'fire-tested');assert.equal(issue.evidenceStart,text.indexOf('materials'));
 assert.equal(issue.predicateContextEvidence.kind,'copula-and-closing-role');
 assert.equal(issue.predicateContextEvidence.start,issue.evidenceStart);assert.equal(issue.predicateContextEvidence.end,issue.evidenceEnd);
 assert.equal(issue.predicateContextEvidence.sourceText,text.slice(issue.evidenceStart,issue.evidenceEnd));
 assert.ok(issue.evidenceEnd>=text.indexOf('fire-tested')+'fire-tested'.length);
 assert.deepEqual(doc,before);
});

test('intact and damaged original literal quotation evidence stays quiet',()=>{
 for(const text of ['The instruction says “The water is crystal-clear.”','The instruction says "Use crystal clear water."']){
  assert.equal(check(text).length,0,text);const quote=text.includes('“')?'“':'"';
  for(const mode of ['struck','excluded'])assert.equal(check(text,quote,mode).length,0,text+' '+mode);
 }
 for(const text of ['Crystal Clear Water District acts.','The Crystal Clear Water District acts.','Use FIRE TESTED MATERIAL.'])assert.equal(check(text).length,0,text);
});

test('all four original quote forms protect selected terms and full noun/support evidence after either boundary is removed',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const text of [
  `The instruction says ${open}The water is crystal-clear.${close}`,
  `Use ${open}crystal clear${close} water.`,
  `The ${open}water${close} is crystal-clear.`,
  `Use crystal clear ${open}water${close}.`,
 ]){
  assert.equal(check(text).length,0,text);
  const first=text.indexOf(open),last=text.lastIndexOf(close);assert.ok(last>first);
  for(const mode of ['struck','excluded'])for(const ranges of [[{start:first,end:first+1}],[{start:last,end:last+1}],[{start:first,end:first+1},{start:last,end:last+1}]]){
   const doc=makeDocument([text],'Current');doc[mode]=ranges;assert.equal(modifierPositionIssues(doc,refs).length,0,text+' '+mode+' '+JSON.stringify(ranges));
  }
 }
 // An ordinary possessive outside the proof remains ordinary narrative text.
 for(const text of ["The agency's water is crystal-clear.",'The agencies’ water is crystal-clear.'])assert.equal(check(text).length,1,text);
});

test('unrelated source masks outside complete evidence do not suppress a real discrepancy',()=>{
 for(const mode of ['struck','excluded'])for(const text of ['The water is crystal-clear. unrelated','Use fire tested material. unrelated'])assert.equal(check(text,'unrelated',mode).length,1,text+' '+mode);
});

test('recognized margins retain physical evidence and page coordinates without source mutation',()=>{
 const doc=makeDocument(['line 1 The water is crystal-\nline 2 clear.'],'Current'),before=structuredClone(doc);
 // This direct helper deliberately does not invent a word-division reading.
 // Exact open modifier divided only by a recognized printed margin is supported.
 const open=makeDocument(['line 1 Use crystal\nline 2 clear water.'],'Current'),openBefore=structuredClone(open),issues=modifierPositionIssues(open,refs);
 assert.equal(issues.length,1);assert.equal(issues[0].text,open.text.slice(issues[0].start,issues[0].end));
 assert.equal(issues[0].evidenceStart,open.text.indexOf('crystal'));assert.equal(issues[0].evidenceEnd,open.text.indexOf('water')+5);
 assert.deepEqual(open,openBefore);modifierPositionIssues(doc,refs);assert.deepEqual(doc,before);
});
