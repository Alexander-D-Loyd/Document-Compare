import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {customStyleIssues,loadStyleTerms,saveStyleTerms,searchStyleTerms} from '../app/custom-style.mjs';
test('custom terms persist, remain case sensitive, use word boundaries and keep source offsets across margin lines',()=>{
  const rows=[{term:'Data sharing',replacement:'Data-sharing'},{term:'data sharing',replacement:'data-sharing'}];
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  saveStyleTerms(storage,rows);assert.deepEqual(loadStyleTerms(storage),rows);
  assert.deepEqual(searchStyleTerms(rows,'Data'),[rows[0]]);assert.equal(searchStyleTerms(rows,'DATA').length,0);
  const doc=makeDocument(['line 1 Data sharing and data\nline 2 sharing. Metadata sharing. DATA SHARING.'],'Current');
  const issues=customStyleIssues(doc,rows);assert.equal(issues.length,2);assert.equal(issues[1].text,'data sharing');assert.match(doc.text.slice(issues[1].start,issues[1].end),/data\nline 2 sharing/);
  doc.struck=[{start:issues[0].start,end:issues[0].end}];assert.equal(customStyleIssues(doc,rows).length,1);
  saveStyleTerms(storage,[rows[1]]);assert.equal(loadStyleTerms(storage).length,1);
});
