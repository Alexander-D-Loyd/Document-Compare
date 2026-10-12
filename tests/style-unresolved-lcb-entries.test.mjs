import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('unresolved source-listed senses do not receive speculative spelling or capitalization changes',()=>{
 for(const t of ['The assigner is identified.','An aural examination is required.','The preemptory preference applies.','The reviver is eligible.','The quarter horse race is scheduled.','The bay area is described.','The Budget Bill applies.','The budget bill is described.','The central valley is described.','The commerce clause applies.','The Controller shall act.','The court of appeals shall act.','The east Los Angeles area is described.','The county general fund is described.','The General Fund is described.','The Member shall act.','The regular session of the Legislature is described.','The state shall retain records.','The Subchapter is described.','The Treasurer shall act.']){
  const found=jointStylisticIssues(makeDocument([t],'Current'),refs);assert.equal(found.length,0,t+' '+JSON.stringify(found.map(i=>[i.text,i.suggestion])));
 }
});
test('an unfamiliar unit modifier does not become known simply because it resembles a guide entry',()=>{
 for(const t of ['The aural processing method is described.','The reviver application process is described.','The assigner notification system is described.'])assert.equal(jointStylisticIssues(makeDocument([t],'Current'),refs).length,0,t);
});
