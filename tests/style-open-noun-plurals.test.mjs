import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>lcbRoleFormIssues(d,refs);
const cases=[['The loanshark is convicted.','loanshark','loan shark',11],['The agency shall investigate the loanshark.','loanshark','loan shark',11],['The loan-sharks are investigated.','loan-sharks','loan sharks',11],['The loansharks are investigated.','loansharks','loan sharks',11],['These councilmembers shall vote.','councilmembers','council members',10],['Those council-members shall vote.','council-members','council members',10],['The offramps are inspected.','offramps','off ramps',12],['The off-ramps are inspected.','off-ramps','off ramps',12],['The onramps are inspected.','onramps','on ramps',12],['The on-ramps are inspected.','on-ramps','on ramps',12],['The taskforces are established.','taskforces','task forces',13],['Their vicechairpersons shall vote.','vicechairpersons','vice chairpersons',14],['The vice-chairpersons shall vote.','vice-chairpersons','vice chairpersons',14],['Three councilmembers shall vote.','councilmembers','council members',10],['12 offramps are inspected.','offramps','off ramps',12]];
test('listed noun exceptions support selected whole regular plurals and the closed loan-shark noun',()=>{
 for(const [text,term,good,page]of cases){const d=make(text),r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.equal(r[0].guidePage,page);assert.equal(d.text.slice(r[0].start,r[0].end),term);assert.equal(check(make(text.replace(term,good))).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion===good),text+' final');}
});
test('plural noun additions preserve loan-shark finite verbs, gerunds and unknown noun positions',()=>{
 for(const text of ['The person loansharks the borrower.','The agencies shall loanshark the borrower.','The person is loan-sharking the borrower.','The loan-sharking program is discussed.','The councilmembers act together.','The title "The loan-sharks are investigated" is literal.','The Loan-Sharks Association is named.','The loansharks’ records are required.'])assert.equal(check(make(text)).length,0,text);
 assert.match(refs.lcb.pages[10].text,/loan shark \(n\.\)/);assert.match(refs.lcb.pages[11].text,/^off ramp\s*$/m);assert.match(refs.lcb.pages[11].text,/^on ramp\s*$/m);
});
test('whole selected noun words and role cues preserve original combining-mark boundaries',()=>{
 for(const [text,term]of cases){for(const tail of ['α','\u0301'])for(const masked of [false,true]){const at=text.indexOf(term)+term.length,d=make(text.slice(0,at)+tail+text.slice(at));if(masked)d.excluded.push({start:at,end:at+tail.length});assert.equal(check(d).length,0,term+tail+' '+masked);}}
 const d=make('The\u0301 loan-shark is convicted.');d.excluded.push({start:3,end:4});assert.equal(check(d).length,0,'masked determiner suffix');
 const p=make('The loan-shark is\u0301 convicted.');p.excluded.push({start:17,end:18});assert.equal(check(p).length,0,'masked continuation suffix');
});
test('whole plural noun evidence rejects struck connective spaces and hidden content',()=>{
 for(const [text,term]of cases){const d=make(text),at=text.indexOf(term);d.struck=[{start:at-1,end:at}];assert.equal(check(d).length,0,text+' left strike');const u=make(text.slice(0,at)+'unknown '+text.slice(at)),n=u.text.indexOf('unknown');u.excluded.push({start:n,end:n+7});assert.equal(check(u).length,0,text+' hidden cue');}
});
test('plural noun role evidence cannot bridge table rows or wrapped quotes',()=>{
 for(const [text,term]of cases){const at=text.indexOf(term),d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0,term+' table');assert.equal(check(make('The title "'+text.replace(term,term+'\n')+'" is literal.')).length,0,term+' quote');}
});
test('known page heads preserve plural nominal source spans without editing the bill',()=>{
 for(const [text,term,good]of cases){const at=text.indexOf(term),d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+text.slice(0,at),'AB 9999 — 2 —\nline 1 '+text.slice(at)]);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const saved=JSON.stringify(d),r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.equal(JSON.stringify(d),saved);}
});
test('selected noun scope retains explicit source forms and bounded grammar',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Selected listed noun plurals');assert.ok(row);for(const term of ['council member','loan shark','off ramp','on ramp','task force','vice chairperson','100 characters','possessives'])assert.ok(row.text.includes(term),term);
 const inventory=styleRuleInventory(refs),record=inventory.find(r=>r.guide==='lcb'&&r.text?.includes('loan shark')&&/Selected regular plural/.test(r.scope));assert.ok(record);assert.equal(record.status,'Partially automated');assert.match(record.scope,/combining-mark/);
});
