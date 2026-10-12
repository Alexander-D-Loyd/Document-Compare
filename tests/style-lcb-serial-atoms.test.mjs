import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>serialCommaIssues(makeDocument([text],'Current'),refs);
test('LCB serial commas cover explicitly introduced letters, figures and written number atoms',()=>{
 for(const conjunction of ['and','or','nor'])for(const list of ['A, B '+conjunction+' C','a, b '+conjunction+' c','one, two '+conjunction+' three','10, 20 '+conjunction+' 30']){
  const text='The list includes '+list+'.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,', '+conjunction);assert.equal(text.slice(found[0].start,found[0].end),conjunction);
  assert.equal(check(text.replace(' '+conjunction+' ',', '+conjunction+' ')).length,0);
  assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>['serial-commas','punctuation'].includes(i.checkId)&&i.suggestion.includes(', '+conjunction)));
 }
 assert.equal(check('The required values are A, B and C.').length,1);
});
test('nested alternatives, two-item lists, references and literals remain protected',()=>{
 for(const text of ['The list includes one, two, three or four, and five.','The list includes A and B.','The list includes Sections 1, 2 and 3.','The list includes Alice, Bob and Carol.','The quote “includes A, B and C” is literal.','The list includes 1,000 and 2,000.','The list includes A, B and C........100'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The list includes A, B and C.'],'Current');doc.struck=[{start:18,end:27}];assert.equal(serialCommaIssues(doc,refs).length,0);
});
