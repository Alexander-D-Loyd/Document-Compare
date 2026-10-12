import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {lcbExpressionIssues} from '../app/style-lcb-expressions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>lcbExpressionIssues(d,refs);
const cases=[['The court crossexamines the witness.','crossexamines','cross-examines',10],['The court has crossexamined the witness.','crossexamined','cross-examined',10],['The court is crossexamining the witness.','crossexamining','cross-examining',10],['Before crossexamining the witness, the court acts.','crossexamining','cross-examining',10],['The person loan sharks the borrower.','loan sharks','loan-sharks',11],['The person loansharks the borrower.','loansharks','loan-sharks',11],['The person has loan sharked the borrower.','loan sharked','loan-sharked',11],['The person has loansharked the borrower.','loansharked','loan-sharked',11],['The person is loan sharking the borrower.','loan sharking','loan-sharking',11],['The person is loansharking the borrower.','loansharking','loan-sharking',11],['The agencies shall loanshark the person.','loanshark','loan-shark',11],['The courts cross examine the witness.','cross examine','cross-examine',10],['The agencies co locate the offices.','co locate','colocate',9],['The boards re elect the officer.','re elect','reelect',13],['The persons loan shark the borrower.','loan shark','loan-shark',11],['The courts cross examined the witness.','cross examined','cross-examined',10],['The agencies co-located the offices.','co-located','colocated',9],['The boards re-elected the officer.','re-elected','reelected',13],['The persons loan sharked the borrower.','loan sharked','loan-sharked',11]];
test('all four listed verb families reach missing regular inflections and explicit plural-subject roles',()=>{
 for(const [text,term,good,page]of cases){const d=make(text),r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.equal(r[0].guidePage,page);assert.equal(d.text.slice(r[0].start,r[0].end),term);assert.equal(check(make(text.replace(term,good))).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion===good),text+' final');}
});
test('plural subject words require original complete boundaries and a complete object',()=>{
 for(const subject of ['courts','agencies','boards','persons','they','we','you']){const text='The '+subject+' cross examine the witness.',d=make(text);assert.equal(check(d).length,1,text);
 for(const suffix of ['α','\u0301']){const at=text.indexOf(subject)+subject.length,u=make(text.slice(0,at)+suffix+text.slice(at));u.excluded.push({start:at,end:at+suffix.length});assert.equal(check(u).length,0,text+suffix);}
 const at=text.indexOf(subject)+1;d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0,text+' struck subject');
 }
 for(const text of ['The agencies cross examine.','The agencies cross examine an.','The agencies cross examine curious witnesses.','The entities cross examine the witness.'])assert.equal(check(make(text)).length,0,text);
});
test('source-listed verb scopes name the supported families without whole-rule certification',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete listed expression role evidence');for(const term of ['cross-examine','loan-shark','colocate','reelect','plural subject','Other inflections'])assert.ok(row.text.includes(term),term);
 const inventory=styleRuleInventory(refs),row2=inventory.find(r=>r.guide==='lcb'&&r.text?.includes('loan-shark')&&/complete original expression/.test(r.scope));assert.ok(row2);assert.match(row2.scope,/distinct loan shark noun sense/);assert.equal(row2.status,'Partially automated');
});
test('source noun senses and unencoded noun/verb positions stay protected',()=>{
 for(const text of ['The loan sharks are investigated.','The loan shark is convicted.','The loan sharks’ records are required.','The loan sharking program is discussed.','The agency has a cross examined witness.','The loan-sharking unit is named.','The Cross Examining Officers Association is named.','The title "loansharking" is literal.','The persons describe loan sharking.','The agencies co locate.'])assert.equal(check(make(text)).length,0,text);
 assert.match(refs.lcb.pages[10].text,/loan shark \(n\.\)/);assert.match(refs.lcb.pages[10].text,/loan-shark \(v\.\)/);
});
test('new inflected words retain complete original Unicode boundaries',()=>{
 for(const [text,term]of cases)for(const tail of ['α','\u0301'])for(const hidden of [false,true]){const at=text.indexOf(term)+term.length,d=make(text.slice(0,at)+tail+text.slice(at));if(hidden)d.excluded.push({start:at,end:at+tail.length});assert.equal(check(d).length,0,term+tail+' '+hidden);}
});
test('masked and struck subject/object evidence cannot manufacture new roles',()=>{
 for(const [text,term]of cases){const at=text.indexOf(term),d=make(text);d.struck=[{start:at-1,end:at}];assert.equal(check(d).length,0,text+' left space');const u=make(text.slice(0,at)+'unknown '+text.slice(at)),n=u.text.indexOf('unknown');u.excluded.push({start:n,end:n+7});assert.equal(check(u).length,0,text+' hidden left');}
 for(const text of ['The courts cross examine the witness.','The agencies co locate the offices.','The boards re elect the officer.','The persons loan shark the borrower.']){const d=make(text),word=text.match(/the (\w+)\.$/)[1],at=text.lastIndexOf(word)+1;d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0,text+' complete object');}
});
test('new family variants do not escape table rows or wrapped literal evidence',()=>{
 for(const [text,term]of cases){assert.equal(check(make('The title "'+text.replace(term,term+'\n')+'" is literal.')).length,0,term+' literal');const at=text.indexOf(term),d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0,term+' table cue');}
});
test('known physical page heads preserve the complete inflected source selection',()=>{
 for(const [text,term,good]of cases){const parts=term.includes(' ')?term.split(' '):[term.slice(0,5),term.slice(5)],before=text.slice(0,text.indexOf(term)),after=text.slice(text.indexOf(term)+term.length);
 // Only space-separated phrase divisions are supported here. Solid word
 // division belongs to the separately tested reader/word projection layer.
 if(!term.includes(' '))continue;const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+before+parts[0],'AB 9999 — 2 —\nline 1 '+parts.slice(1).join(' ')+after]);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const saved=JSON.stringify(d),r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.match(d.text.slice(r[0].start,r[0].end),/AB 9999/);assert.equal(JSON.stringify(d),saved);}
});
