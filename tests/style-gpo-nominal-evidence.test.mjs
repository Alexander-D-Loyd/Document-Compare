import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {gpoNominalIssues} from '../app/style-gpo-nominals.mjs';import {GPO_NOMINAL_FORMS} from '../app/gpo-nominal-forms.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>gpoNominalIssues(d,refs);
test('all encoded GPO noun continuations reject table evidence outside the selected term',()=>{
 for(const r of GPO_NOMINAL_FORMS){const d=make('The '+r.variant+'\nis required.............100');assert.equal(check(d).length,0,r.variant);}
});
test('GPO nominal evidence protects source strikes in determiner and continuation gaps',()=>{
 const text='The check up is required.';for(const start of [3,12]){const d=make(text);d.struck=[{start,end:start+1}];assert.equal(check(d).length,0,String(start));}
});
test('GPO nominal evidence cannot bridge unknown ignored or excluded source fragments',()=>{
 for(const text of ['The\nunknown marker\ncheck up is required.','The check up\nunknown marker\nis required.']){const d=make(text),b=d.blocks.find(b=>b.text==='unknown marker');b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(check(d).length,0,text);}
});
test('GPO determiner and predicate cues require whole original Unicode words including clipped context',()=>{
 for(const text of ['The follow-up isα required.','The check up is2 required.','αThe check up is required.','𐐀The check up is required.','xThe'+' '.repeat(32)+'check up is required.'])assert.equal(check(make(text)).length,0,text);
});
test('known interior page heads retain exact GPO compound ranges without source mutation',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The check','AB 9999 — 2 —\nline 1 up is required.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=check(d);assert.equal(r.length,1);assert.equal(r[0].end,d.text.indexOf('up is')+2);assert.equal(JSON.stringify(d),before);
});
test('GPO nominal coverage records complete evidence without semantic or whole-rule certification',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Compound nouns and phrasal verbs');assert.match(row.text,/Complete determiner/);assert.match(row.text,/35-character/);const records=styleRuleInventory(refs).filter(r=>r.id.startsWith('gpo-nominal-'));assert.equal(records.length,461);assert.ok(records.every(r=>r.status==='Partially automated'&&/Complete determiner/.test(r.scope)&&/semantic ambiguities/.test(r.scope)));
});
