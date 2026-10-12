import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('holder nouns keep LCB compounds without joining transitive verbs to their objects',()=>{
 for(const root of ['permit','license','bond'])for(const modal of ['shall','may','must','can','could','should','will','would'])assert.ok(!check('The agency '+modal+' '+root+' holders to perform services.').some(i=>i.suggestion===root+'holders'),root+' '+modal);
 for(const root of ['permit','license','bond'])assert.ok(!check('The agency is authorized to '+root+' holders to perform services.').some(i=>i.suggestion===root+'holders'));
 for(const root of ['permit','license','bond'])for(const prefix of ['The ','A notice to ','The agency shall protect ']){const i=check(prefix+root+' holders are eligible.').find(i=>i.suggestion===root+'holders');assert.ok(i,prefix+root);}
});
test('literal holder titles and source strikeouts remain protected',()=>{
 for(const t of ['The Permit Holder Institute is named.','The term “permit holders” is literal.'])assert.equal(check(t).length,0,t);
 const doc=makeDocument(['The permit holders are eligible.'],'Current');doc.struck=[{start:4,end:18}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
