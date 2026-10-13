import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contractionIssues}from '../app/style-contractions.mjs';import {lcbPrefixIssues}from '../app/style-lcb-prefixes.mjs';import {lcbSpellingIssues}from '../app/style-lcb-spellings.mjs';import {ratioIssues}from '../app/style-ratios.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('original supplementary-plane letters cannot become contraction boundaries when masked',()=>{
 for(const astral of ['𐐀','𐐨','𝒜'])for(const form of ['can’t','who’ve','this’d’ve',"'tis"])for(const edge of ['before','after'])for(const kind of ['struck','excluded']){
  const value=edge==='before'?astral+form:form+astral,text='The '+value+' expression applies.',doc=makeDocument([text],'Current'),start=4+(edge==='before'?0:form.length);doc[kind]=[...(doc[kind]||[]),{start,end:start+astral.length}];assert.equal(contractionIssues(doc,refs).length,0,JSON.stringify({astral,form,edge,kind}));
 }
});
test('ordinary whitespace remains a contraction boundary beside a supplementary-plane word',()=>{
 for(const text of ['𐐀 can’t apply.','The 𐐨 who’ve applied are eligible.'])assert.equal(contractionIssues(makeDocument([text],'Current'),refs).length,1,text);
});
test('finite prefix and spelling guards preserve full original supplementary-plane token edges',()=>{
 for(const [check,form]of [[lcbPrefixIssues,'non-negotiable'],[lcbSpellingIssues,'cemetary']])for(const edge of ['before','after']){
  const text='The '+(edge==='before'?'𐐀'+form:form+'𐐀')+' applies.',doc=makeDocument([text],'Current'),start=4+(edge==='before'?0:form.length);doc.struck=[{start,end:start+2}];assert.equal(check(doc,refs).length,0,form+' '+edge);
 }
});
test('ratio introduction cannot gain a source boundary by hiding a supplementary-plane letter',()=>{
 const text='Use a 𐐀ratio of one to five.',doc=makeDocument([text],'Current'),start=text.indexOf('𐐀');doc.excluded=[...(doc.excluded||[]),{start,end:start+2}];assert.equal(ratioIssues(doc,refs).length,0);
});
