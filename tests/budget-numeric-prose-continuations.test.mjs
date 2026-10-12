import test from 'node:test';import assert from 'node:assert/strict';import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';import {prepareOfflineLanguage}from '../app/offline-language.mjs';
test('standalone date and citation years remain in budget analysis through source strikeouts and recognized page heads',()=>{
 for(const [prefix,old,current]of [['Funds remain available until June 30,','2026.','2028.'],['The appropriation is provided in Chapter 44 of the Statutes of',null,'2021.']])for(const cross of [false,true]){
  const pages=cross?['Budget Act of 2024.\nline 40 '+prefix,'SB 100 — 3 —\nline 1 '+(old?old+' ':'')+current]:['Budget Act of 2024.\nline 4 '+prefix+'\nline 5 '+(old?old+' ':'')+current],strikes=pages.map(p=>old&&p.includes(old)?[{start:p.indexOf(old),end:p.indexOf(old)+old.length}]:[]),doc=makeDocument(pages,'Current',strikes);
  if(cross){const head=doc.blocks.find(b=>b.text==='SB 100 — 3 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};}
  const block=doc.blocks.at(-1),ctx=styleContext(doc);assert.equal(ctx.tableAt(block.start),false);assert.ok(prepareOfflineLanguage(doc).text.includes(current));
 }
});
test('actual amount columns and date-shaped table labels remain masked as table evidence',()=>{
 for(const [prefix,value]of [['For support of Senate................','19,800,000'],['Amount','2028.'],['June 30,','2028.'],['The payment is due by June 30,','4.'],['Item Amount','$2028.']]){
  const doc=makeDocument(['Budget Act of 2024.\nline 1 '+prefix+'\nline 2 '+value],'Current'),b=doc.blocks.at(-1),plan=prepareOfflineLanguage(doc);assert.equal(styleContext(doc).tableAt(b.start),true,prefix);const mapped=[...plan.text.matchAll(/\S/gu)].filter(m=>{const r=plan.range(m.index,m.index+1);return r&&r.start<b.end&&r.end>b.start+b.margin.length;});assert.equal(mapped.length,0,prefix);
 }
});
test('a completely struck standalone old year can bridge its live replacement but unknown excluded years cannot',()=>{
 const source='Budget Act of 2024.\nline 1 Funds remain available until June 30,\nline 2 2026.\nline 3 2028.',start=source.indexOf('2026.');
 const doc=makeDocument([source],'Current',[[{start,end:start+5}]]),block=doc.blocks.at(-1);
 assert.equal(styleContext(doc).tableAt(block.start),false);
 assert.ok(prepareOfflineLanguage(doc).text.includes('2028.'));
 const unknown=makeDocument([source],'Current');unknown.excluded.push({start,end:start+5});
 assert.equal(styleContext(unknown).tableAt(unknown.blocks.at(-1).start),true);
 const partial=makeDocument([source],'Current',[[{start,end:start+4}]]);
 assert.equal(styleContext(partial).tableAt(partial.blocks.at(-1).start),true);
});
