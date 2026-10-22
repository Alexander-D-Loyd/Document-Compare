import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {lcbTableCellIssues} from '../app/style-lcb-review-table-cells.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const table=(term,header='Quantity')=>{const d=makeDocument(['District             '+header+'             Unit\nNorth                '+term+'              units'],'Current');for(const b of d.blocks)b.formatting={headerGaps:[{},{}]};return d;};
const check=d=>reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).filter(i=>i.checkId==='lcb-table-expression-review');
test('noninteger and unresolved table values receive complete-cell questions under the explicit figure rule',()=>{
 for(const term of ['first','twenty-first','three-quarters','seven fifty-ninths','two point five','three and one-half','one hundred and and two','third (estimated)']){const doc=table(term),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].suggestion,null);assert.equal(found[0].guidePage,21);assert.equal(found[0].tableHeaderRole,'numeric');assert.equal(JSON.stringify(doc),saved);assert.ok(!lcbTableCellIssues(doc,refs).some(i=>i.checkId==='lcb-table-expression-review'),'Precise API retains its established contract.');}
});
test('literal columns figures unknown words and existing cardinal owners are preserved',()=>{
 for(const term of ['First Aid','Three Rivers','2⅝','3/4','21st','None','threeα','three'])assert.deepEqual(check(table(term,term==='three'?'Quantity':'Name')),[],term);
 for(const term of ['2⅝','3/4','21st','None','threeα','three'])assert.deepEqual(check(table(term)),[],term);
 assert.deepEqual(check(table('“third”')),[]);assert.deepEqual(check(table('third','Alpha')).map(i=>i.tableHeaderRole),['unresolved']);
});
test('every original cell and header character is evidence including removed quote or ordinal prefixes',()=>{
 for(const term of ['third','three-quarters','two point five']){const doc=table(term),at=doc.text.indexOf(term),header=doc.text.indexOf('Quantity');for(const field of ['struck','excluded'])for(const [start,end]of [[at,at+term.length],[header,header+8]])for(let p=start;p<end;p++){const d=structuredClone(doc);d[field].push({start:p,end:p+1});assert.deepEqual(check(d),[],field+' '+term+' '+p);}}
 for(const field of ['struck','excluded']){const d=table('second third'),at=d.text.indexOf('second');d[field].push({start:at,end:at+6});assert.deepEqual(check(d),[]);const q=table('“third”'),quote=q.text.indexOf('“');q[field].push({start:quote,end:quote+1});assert.deepEqual(check(q),[]);}
});
