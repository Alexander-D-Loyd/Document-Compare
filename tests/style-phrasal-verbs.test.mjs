import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {NOMINAL_COMPOUNDS} from '../app/style-compounds.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.checkId==='phrasal-verbs');
test('every encoded LCB noun/verb distinction uses its separate verb after a modal',()=>{
 for(const [open,solid,page] of NOMINAL_COMPOUNDS){
  assert.ok(refs.lcb.pages[page-1].text.includes(solid),solid);
  const text='The agency shall '+solid+' the process.';
  const found=check(text);assert.equal(found.length,1,solid);assert.equal(found[0].suggestion,open);assert.equal(text.slice(found[0].start,found[0].end),solid);
  assert.equal(check('The agency shall '+open+' the process.').length,0,open);
 }
});
test('modal variants and source wrapping preserve highlight offsets',()=>{
 for(const modal of ['shall','must','should','will','would','could','can','may'])assert.equal(check('The agency '+modal+' cleanup the site.')[0]?.suggestion,'clean up');
 const doc=makeDocument(['line 1 The agency shall\nline 2 cleanup the site.'],'Current');const i=check(doc)[0];assert.equal(i.suggestion,'clean up');assert.equal(doc.text.slice(i.start,i.end),i.text);
});
test('nominal contexts, quoted copy, titles, table rows and removed text stay protected',()=>{
 for(const text of ['The cleanup costs apply.','Access to backup equipment is required.','The startup shall qualify.','The agency may provide cleanup services.','The agency shall use the backup.','The agency shall Backup Equipment.','The label “shall cleanup” is literal.','The label "must startup" is literal.','Budget Act of 2026\nshall cleanup.................. 1000','SHALL CLEANUP'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The agency shall cleanup the site.'],'Current');const i=check(doc)[0];doc.struck=[{start:i.start,end:i.end}];assert.equal(check(doc).length,0);
});
