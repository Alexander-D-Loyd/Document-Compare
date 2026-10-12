import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {lcbPrefixIssues} from '../app/style-lcb-prefixes.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {LCB_PREFIX_LEXICON_SCOPE} from '../app/lcb-prefix-candidates.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
import {workerSpell} from './helpers/spelling-worker.mjs';
const root=new URL('../app/',import.meta.url),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('data/'+id+'-reference.json',root)))]));
const check=text=>lcbPrefixIssues(makeDocument([text],'Current'),refs);

test('lexical prefix index preserves its offline source provenance and does not claim dictionary approval',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('data/lcb-prefix-roots.json',root)));
 for(const s of data.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(s.file,root))).digest('hex'),s.sha256);
 assert.ok(data.commonRoots.includes('negotiable'));assert.ok(data.commonRoots.includes('steering'));assert.ok(data.properRoots.includes('English'));
 assert.ok(!data.commonRoots.includes('English'));assert.ok(!data.commonRoots.includes('frumpk'));
 assert.ok(refs.lcb.pages[8].text.includes('anti-Semitism'));assert.ok(LCB_PREFIX_LEXICON_SCOPE.scope.includes('must not automatically approve'));
 for(const prefix of ['anti','bi','multi','non']){const entry=styleRuleInventory(refs).find(r=>r.guide==='lcb'&&r.title.endsWith(' · '+prefix));assert.equal(entry.status,'Partially automated');assert.match(entry.scope,/offline lexical index/);assert.match(entry.scope,/manual/);}
 const proper=styleRuleInventory(refs).find(r=>r.id==='gpo-6.35');assert.equal(proper.status,'Partially automated');assert.match(proper.scope,/Other prefixes.*remain manual/);
});

test('LCB general prefix rules cover complete recognized roots and inflections beyond the original shortlist',()=>{
 for(const [bad,good] of [['non-negotiable','nonnegotiable'],['non service','nonservice'],['non-fungible','nonfungible'],['non satisfactions','nonsatisfactions'],['multi-member','multimember'],['multi payer','multipayer'],['bi-directional','bidirectional'],['bi modal','bimodal'],['anti-steering','antisteering']]){
  const text='The '+bad+' program applies.',issues=check(text);assert.equal(issues.length,1,bad);assert.equal(issues[0].suggestion,good);assert.equal(text.slice(issues[0].start,issues[0].end),bad);assert.equal(check(text.replace(bad,good)).length,0,good);
  assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===good),bad);
 }
});

test('anti repeated-i boundaries retain the source hyphen rather than joining a doubled vowel',()=>{
 for(const bad of ['anti individual','antiindividual','anti-individual','anti irradiation','antiirradiation','anti-irradiation']){
  const good=bad.includes('individual')?'anti-individual':'anti-irradiation',issues=check('The '+bad+' program applies.');
  assert.equal(issues.length,bad===good?0:1,bad);if(issues.length)assert.equal(issues[0].suggestion,good);
 }
});

test('anti proper nouns follow LCB and GPO hyphen rules while literal organization names remain protected',()=>{
 for(const [bad,good] of [['antiSemitism','anti-Semitism'],['anti Semitism','anti-Semitism'],['antiEnglish','anti-English'],['anti Italian','anti-Italian']]){
  const doc=makeDocument(['The '+bad+' policy applies.'],'Current'),issues=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-prefixes');assert.equal(issues.length,1,bad);assert.equal(issues[0].suggestion,good);assert.ok(issues[0].references.some(r=>r.guideId==='gpo'&&r.rule==='6.35'));assert.equal(check('The '+good+' policy applies.').length,0);
 }
 for(const text of ['The AntiSemitism Council is named.','The Multi Payer Institute is named.','The antiFrumpk rule applies.','The non English rule applies.'])assert.equal(check(text).length,0,text);
});

test('Latin expressions, multi-ply conflicts, duplicated prefixes and compound bases avoid false joining',()=>{
 for(const text of ['The anti-money laundering controls apply.','The anti money laundering controls apply.','The non civil service employees apply.','The anti hog cholera serum applies.','The non tumor bearing tissue applies.'])assert.equal(check(text).length,0,text);
 for(const text of ['The anti multi racial policy applies.','The non anti inflammatory rule applies.','The multi non negotiable policies apply.'])assert.ok(!check(text).some(i=>['antimulti','nonanti','multinon'].includes(i.suggestion)),text);
 for(const text of ['The response is a non sequitur.','The responses are non sequiturs.','The person is non compos mentis.','A non-sequitur response applies.','The multi-ply paper applies.','The multi ply paper applies.','The multi-plies apply.','The non-nonprofit program applies.','The non nonpartisan rule applies.','The non-tumor-bearing tissue applies.','The non-life-threatening injury applies.','The anti-hog-cholera serum applies.','The multi-word-root phrase applies.','The non-frumpk rule applies.','The non-serviceabilityx applies.'])assert.equal(check(text).length,0,text);
});

test('quotes, source strikeouts, heading/table context and actual end-of-line divisions remain protected',()=>{
 for(const text of ['The term “non-negotiable” is literal.','The term "multi payer" is literal.','The NON-NEGOTIABLE clause applies.','The anti-steering........100','The non-\nline 2 negotiable program applies.','The phrase non—negotiable is written.','The phrase non–negotiable is written.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The non-negotiable program applies.'],'Current');doc.struck=[{start:4,end:18}];assert.equal(lcbPrefixIssues(doc,refs).length,0);
 assert.equal(check('ASSEMBLY BILL No. 577\nNON-NEGOTIABLE\nThe people of the State of California do enact as follows:\nThe program applies.').length,0);
});

test('open prefix wraps preserve whole source ranges and identify only the prefix/root text across margins and pages',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nline 1 The people of the State of California do enact as follows:\nline 2 The non\n94','AB 577 — 2 —\nline 1 negotiable program applies.'],'Current'),issue=jointStylisticIssues(doc,refs).find(i=>i.suggestion==='nonnegotiable');
 assert.ok(issue);assert.equal(issue.start,doc.text.indexOf('non\n'));assert.equal(issue.end,doc.text.indexOf('negotiable')+'negotiable'.length);assert.equal(issue.matchText,'non negotiable');
 assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
});

test('recognizing a root for a style suggestion does not silently approve an unknown compound in spelling',async()=>{
 assert.ok((await workerSpell([{word:'nonfrumpk',start:0,end:9}])).length);
 assert.ok((await workerSpell([{word:'biwinter',start:0,end:8}])).length,'Root winter alone is not whole-word spelling authority');
});
