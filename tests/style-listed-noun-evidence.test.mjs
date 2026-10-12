import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {listedNounIssues,LISTED_NOUN_RULES} from '../app/style-listed-nouns.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>listedNounIssues(d,refs);
test('every listed noun variant retains complete original matched-word boundaries',()=>{
 for(const r of LISTED_NOUN_RULES){const text='The '+r.variant+(r.selectedPlural?' are':' is')+' required.';assert.equal(check(make(text)).length,1,r.variant);
  for(const edge of ['before','after'])for(const character of ['α','\u0301'])for(const masked of [false,true]){const at=text.indexOf(r.variant)+(edge==='after'?r.variant.length:0),d=make(text.slice(0,at)+character+text.slice(at));if(masked)d.excluded.push({start:at,end:at+character.length});assert.equal(check(d).length,0,r.variant+' '+edge+' '+character+' '+masked);}
 }
});
test('complete nominal continuations and heads protect original combining-mark boundaries',()=>{
 for(const [text,word]of [['The home owners are available.','are'],['The agency offers child care program.','program'],['The report describes infra structure program.','program'],['An overview of planned activities and time lines for the project.','for']])for(const masked of [false,true]){const at=text.lastIndexOf(word)+word.length,d=make(text.slice(0,at)+'\u0301'+text.slice(at));if(masked)d.excluded.push({start:at,end:at+1});assert.equal(check(d).length,0,text+' '+masked);}
});
test('masked body words cannot create article or modifier evidence',()=>{
 for(const text of ['The unknown child care.','The agency offers child care unknown program.','The home owners unknown are available.','The report describes infra structure unknown program.','Operate 175 unknown school days and report attendance.']){const d=make(text),at=text.indexOf('unknown');d.excluded.push({start:at,end:at+7});assert.equal(check(d).length,0,text);assert.ok(!jointStylisticIssues(d,refs).some(i=>i.checkId==='listed-nouns'),text+' combined');}
});
test('struck connecting spaces and table cues cannot establish noun roles',()=>{
 for(const [text,term,side]of [['The child care.','child care','before'],['The agency offers child care program.','child care','after'],['The home owners are available.','home owners','before'],['Operate 175 school days and report attendance.','school days','before']]){const at=text.indexOf(term)+(side==='after'?term.length:0),d=make(text);d.struck=[{start:side==='after'?at:at-1,end:side==='after'?at+1:at}];assert.equal(check(d).length,0,text+' connecting space');}
 const d=make('line 1 The\nline 2 child care.');d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0,'article evidence is in a table');
 const p=make('line 1 The agency offers child care\nline 2 program applies.');p.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(p).length,0,'head evidence is in a table');
});
test('wrapped quotations protect the whole noun and its evidence',()=>{
 for(const text of ['The title "The child\ncare" is literal.','The title "The home owners\nare available" is literal.','The title "The agency offers child care\nprogram" is literal.'])assert.equal(check(make(text)).length,0,text);
});
test('known physical heads preserve complete noun cues beyond the old45-character window',()=>{
 for(const [before,after,good]of [['The','child care.','childcare'],['Three','case workers are available.','caseworkers'],['Operate 175','school days and report attendance.','schooldays']]){const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+before,'AB 9999 — '+('recognized page label '.repeat(6))+'2 —\nline 1 '+after]),b=d.blocks.find(b=>b.page===2&&!b.margin);b.ignored=true;b.layoutLabel=true;b.formatting={headerParts:[{}]};d.excluded.push({start:b.start,end:b.end});const saved=JSON.stringify(d),r=check(d);assert.equal(r.length,1,after);assert.equal(r[0].suggestion,good);assert.equal(JSON.stringify(d),saved);}
});
test('independently intact noun cues survive unrelated uncertain evidence',()=>{
 const d=make('The child care unknown program.'),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});assert.equal(check(d).length,1,'intact article remains eligible');
 const p=make('The unknown child care program.'),n=p.text.indexOf('unknown');p.excluded.push({start:n,end:n+7});assert.equal(check(p).length,1,'intact head remains eligible');
 const table=make('Unrelated table........100\nThe home owners are available.');assert.equal(check(table).length,1);
});
test('whole count tokens establish nominal time units without suffix-only numeric evidence',()=>{
 for(const count of ['175','1,234','three'])assert.equal(check(make('Operate '+count+' school days and report attendance.')).length,1,count);
 for(const count of ['2.5','2/3','-175'])assert.equal(check(make('Operate '+count+' school days and report attendance.')).length,1,count+' complete quantity');
 for(const count of ['12,34','2.5.3','2/3/4'])assert.equal(check(make('Operate '+count+' school days and report attendance.')).length,0,count+' malformed quantity');
});
test('listed noun scope records complete evidence and remaining finite semantics',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete listed noun evidence');assert.ok(row);for(const term of ['Reverse lexical','200 characters','combining-mark','independent','whole-rule'])assert.ok(row.text.includes(term),term);
 const record=styleRuleInventory(refs).find(r=>r.guide==='lcb'&&r.text?.includes('childcare')&&/every establishing noun cue/.test(r.scope));assert.ok(record);assert.equal(record.status,'Partially automated');
});
