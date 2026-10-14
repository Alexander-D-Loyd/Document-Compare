import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {styleContext} from '../app/style-context.mjs';
import {styleFindingPolicy} from '../app/style-finding-policy.mjs';
const reference={guideId:'lcb',guidePage:8,rule:'Hyphenation, item 1'};
const finding=(doc,text)=>{const start=doc.text.lastIndexOf(text);return {start,end:start+text.length,text,references:[reference],checkId:'listed-modifier'};};
const policy=doc=>styleFindingPolicy(doc,{context:styleContext(doc)});
test('shared policy accepts a source-backed active selection and rejects missing authority or damaged source',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The agency uses a cost effective plan.'],'Current'),issue=finding(doc,'cost effective'),saved=JSON.stringify(doc);
 assert.equal(policy(doc)(issue),true);assert.equal(policy(doc)({...issue,references:[]}),false);assert.equal(policy(doc)({...issue,references:[{...reference,guideId:'unknown'}]}),false);
 doc.struck.push({start:issue.start+5,end:issue.start+6});assert.equal(policy(doc)(issue),false);doc.struck.pop();assert.equal(JSON.stringify(doc),saved);
});
test('quoted terms preserve initial-case variants within one bill and never transfer authority',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 “Student only health center” means a facility.\nline 2 A student only health center may qualify.'],'Current'),issue=finding(doc,'student only health center');
 assert.equal(policy(doc)(issue),false);
 const next=makeDocument(['The people do enact as follows:\nline 1 A student only health center may qualify.'],'Next');assert.equal(policy(next)(finding(next,'student only health center')),true);
 const changed=makeDocument(['The people do enact as follows:\nline 1 “Student only health center” means a facility.\nline 2 A student only Health center may qualify.'],'Current');assert.equal(policy(changed)(finding(changed,'student only Health center')),true,'Interior case is not the authorized initial-letter exception');
});
test('central guide disagreement and exact-name protections preserve prior policy',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The agency uses a cost effective plan.'],'Current'),issue=finding(doc,'cost effective'),context=styleContext(doc),range={start:issue.start,end:issue.end};
 assert.equal(styleFindingPolicy(doc,{context,conflictRanges:[range]})(issue),false);
 assert.equal(styleFindingPolicy(doc,{context,names:[range]})(issue),false);
 assert.equal(styleFindingPolicy(doc,{context,names:[range],conflictRanges:[range]})({...issue,checkId:'california-entities'}),true,'Exact entity capitalization has its separate source-backed authority');
 assert.equal(policy(doc)({...issue,conflict:true}),false);
});
test('removed original quote boundaries cannot expose lexical payloads while quote punctuation retains its detector',()=>{
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const mode of ['struck','excluded']){
  const doc=makeDocument(['The people do enact as follows:\nline 1 The instruction inserts '+open+'cost effective'+close+'.'],'Current'),issue=finding(doc,'cost effective'),index=doc.text.indexOf(open);
  doc[mode].push({start:index,end:index+1});assert.equal(policy(doc)(issue),false,mode+open);
  assert.equal(policy(doc)({...issue,rule:'Punctuation: Quotation Marks'}),true,'Quotation punctuation owns its separate source proof');
 }
});
