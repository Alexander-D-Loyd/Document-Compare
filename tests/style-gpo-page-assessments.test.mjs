import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {gpoPageAssessment,GPO_PAGE_AUDIT_COUNT} from '../app/style-gpo-page-assessments.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('all273 audited pages preserve source identity and distinguish mapping backlog from automation',()=>{
 assert.equal(GPO_PAGE_AUDIT_COUNT,273);const counts={};let pages=0;
 for(const p of refs.gpo.pages){const a=gpoPageAssessment(p);if(!a)continue;pages++;
  const text=p.text.replace(/\s+/gu,' ').trim();assert.equal(crypto.createHash('sha256').update(text).digest('hex'),a.sourceAssessment.sourceTextSHA256);
  counts[a.status]=(counts[a.status]||0)+1;
  assert.match(a.scope,/does not establish whole-page automation/);
  if(a.status==='Assessed — mapping incomplete')assert.match(a.scope,/checker mapping remains incomplete/);
  assert.equal(gpoPageAssessment({...p,text:p.text+' changed source'}),null,'Changed source falls back to an unassessed page');
 }
 assert.equal(pages,273);assert.deepEqual(counts,{'Not applicable to legislative prose':71,'Assessed — mapping incomplete':147,'Manual review required':55});
});
test('inventory retains full source text and exposes page assessments separately from numbered rules',()=>{
 const rows=styleRuleInventory(refs),pages=rows.filter(r=>r.sourceAssessment);assert.equal(pages.length,273);
 for(const r of pages){assert.match(r.id,/^gpo-page-/u);assert.equal(r.text,refs.gpo.pages.find(p=>p.page===r.page).text.replace(/\s+/gu,' ').trim());}
 assert.ok(rows.filter(r=>/^gpo-\d+\./u.test(r.id)).every(r=>!r.sourceAssessment));
 assert.equal(rows.find(r=>r.id==='gpo-page-59').status,'Assessed — mapping incomplete');
 assert.ok(!rows.some(r=>r.guide==='gpo'&&r.status==='Not yet assessed'));
});
