import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {metricDefinitionIssues} from '../app/style-metric-definitions.mjs';import {LCB_LISTED_UNIT_DEFINITIONS} from '../app/metric-units.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB explicit unit names resolve symbol case with precise symbol-only findings',()=>{
 for(const r of LCB_LISTED_UNIT_DEFINITIONS)for(const name of [r.name,r.name+'s'])for(const wrong of ['g',r.symbol.toLowerCase(),r.symbol.toUpperCase()].filter(s=>s!==r.symbol)){
  const text='Use '+name+' ('+wrong+') of capacity.',doc=makeDocument([text],'Current'),i=metricDefinitionIssues(doc,refs)[0];assert.equal(i.suggestion,r.symbol);assert.equal(i.guideId,'lcb');assert.equal(text.slice(i.start,i.end),wrong);assert.equal(metricDefinitionIssues(makeDocument([text.replace('('+wrong+')','('+r.symbol+')')],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===r.symbol),text);assert.ok(refs.lcb.pages[18].text.includes(r.name+' ('+r.symbol+')'));
 }
 assert.ok(refs.gpo.pages[263].text.includes('MB—megabyte'));
});
test('megabyte definitions resolve byte/bit case without rewriting isolated ambiguous symbols',()=>{
 assert.equal(metricDefinitionIssues(makeDocument(['Use megabytes (Mb) of storage.'],'Current'),refs)[0].suggestion,'MB');
 for(const text of ['Use 5 Mb of capacity.','Use 5 MB of storage.','Use megabytes (PDF) of storage.','The term “megabytes (Mb)” is literal.','The Megabyte Institute is named.'])assert.equal(metricDefinitionIssues(makeDocument([text],'Current'),refs).length,0,text);
 assert.equal(jointStylisticIssues(makeDocument(['Use 5 MB of storage.'],'Current'),refs).length,0);
 for(const text of ['Use 5 Mb of capacity.','Use 5 mW of capacity.','Use 5 kw of capacity.'])assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('sentence-opening megabytes and megawatts expand the recognized abbreviation with the number',()=>{
 for(const [text,wanted] of [['5 MB are required.','Five megabytes'],['1 MB is required.','One megabyte'],['5 MW are allocated.','Five megawatts']])assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===wanted),text);
});
test('unit definitions preserve source wrapping, quotation and strikeout boundaries',()=>{
 const doc=makeDocument(['line 1 Use megabytes\nline 2 (Mb) of storage.'],'Current'),i=metricDefinitionIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'Mb');doc.struck=[{start:i.start,end:i.end}];assert.equal(metricDefinitionIssues(doc,refs).length,0);
});
