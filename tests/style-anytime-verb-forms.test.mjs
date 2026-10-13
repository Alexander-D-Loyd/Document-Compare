import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {wordChoiceIssues} from '../app/style-word-choice.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs).filter(i=>i.rule==='Spelling and usage: anytime-adverb');
const forms=[['apply','applies','applied','applying'],['resign','resigns','resigned','resigning'],['withdraw','withdraws','withdrew','withdrawing','withdrawn'],['call','calls','called','calling']];
test('LCB anytime adverbs support explicit finite, perfect and participle roles',()=>{
 for(const [base,third,past,participle,perfect=past] of forms)for(const [prefix,form] of [['The applicant may ',base],['The applicants ',base],['The applicant ',third],['The applicant ',past],['The applicant has already ',perfect],['The applicant is ',participle],['The applicant acts by ',participle]]){
  const text=prefix+form+' any time after the deadline.',d=makeDocument([text],'Current'),issues=check(d);
  assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,'anytime',text);assert.equal(d.text.slice(issues[0].start,issues[0].end),'any time',text);
  assert.equal(issues[0].guidePage,3);assert.ok(issues[0].evidenceStart<issues[0].start);
  assert.equal(check(makeDocument([text.replace('any time','anytime')],'Current')).length,0,text);
  assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='anytime'),text);
 }
 assert.equal(check(makeDocument(['Apply any time.'],'Current')).length,1);
});
test('time nouns, application modifiers and unstated verb roles retain their forms',()=>{
 for(const text of ['The applicant applies at any time.','The applicant has withdrawn at any time.','The applicant shall use any time remaining.','Applied any time periods are recorded.','The applied any time period is recorded.','The withdrawn any time option is available.','The calling any time service is named.','The applicant applies any time remaining.','The applicant applies any time periods to the schedule.','The system applies any time after the deadline.','The applicant has withdrew any time after the deadline.','The applicant withdrawn any time after the deadline.','The applicant is withdrew any time after the deadline.','The applicant has applying any time after the deadline.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('complete verb and timing evidence must survive original strikes and source exclusions',()=>{
 for(const [text,target] of [['The applicant has applied any time after the deadline.','has'],['The applicant has applied any time after the deadline.','applied'],['The applicant acts by applying any time after the deadline.','by'],['The applicant former applies any time after the deadline.','former'],['The applicant applies any time former after the deadline.','former'],['The applicant applies any time period.','period'],['The applicant applies any time after the deadline.','after']]){
  const d=makeDocument([text],'Current'),start=d.text.indexOf(target);d.struck=[{start,end:start+target.length}];assert.equal(check(d).length,0,text);
 }
 const d=makeDocument(['The applicant\nunknown marker\napplies any time after the deadline.'],'Current'),b=d.blocks[1];b.ignored=true;d.excluded=[{start:b.start,end:b.end}];assert.equal(check(d).length,0);
 const table=makeDocument(['The applicant\napplies any time after the deadline.'],'Current');table.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(table).length,0);
});
test('physical margins and pages retain selected phrase offsets and quoted clauses stay literal',()=>{
 const d=makeDocument(['line 1 The applicant has\nline 2 applied any','line 1 time after the deadline.'],'Current'),issues=check(d);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'anytime');assert.equal(d.text.slice(issues[0].start,issues[0].end),issues[0].text);assert.equal(issues[0].text,'any\nline 1 time');assert.equal(d.tokens.filter(t=>t.start>=issues[0].start&&t.end<=issues[0].end).map(t=>t.value).join(' '),'any time');
 for(const text of ['The phrase “the applicant applies any time” is literal.','The phrase "the applicant has\napplied any time" is literal.','The Applicant Applies Any Time Program is named.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('intact finite cues cross layout whitespace without inventing a sentence-opening command',()=>{
 const gap=' '.repeat(180);
 assert.equal(check(makeDocument(['The applicant'+gap+'applies any time.'],'Current')).length,1);
 assert.equal(check(makeDocument(['The applicant has'+gap+'withdrawn any time.'],'Current')).length,1);
 assert.equal(check(makeDocument(['The nominal applied'+gap+'any time period is available.'],'Current')).length,0);
 assert.equal(check(makeDocument(['A category'+gap+'applies any time.'],'Current')).length,0);
});
