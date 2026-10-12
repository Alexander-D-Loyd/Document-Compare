import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues} from '../app/lcb-contextual.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>lcbContextualIssues(doc,refs).filter(i=>i.category==='Articles before initials');
const forms=[['BLS','a','compilation'],['GAO','a','limitation'],['WWW','a','search'],['CIO','a','finding'],['UFO','a','sighting'],['AEC','an','report'],['NSC','an','proclamation'],['RFC','an','loan']];
test('eight added letter-by-letter forms are explicitly printed in the source article examples',()=>{
 const text=refs.gpo.pages[107].flowText||refs.gpo.pages[107].text;
 for(const [form,article]of forms){assert.ok(text.includes(form));const bad='Use '+(article==='a'?'an':'a')+' '+form+' example.',found=check(makeDocument([bad],'Current'));assert.equal(found.length,1,bad);assert.equal(found[0].suggestion,article+' '+form);assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===2));assert.ok(found[0].references.some(r=>r.guideId==='gpo'&&r.rule===(article==='an'?'5.18':'5.17')));assert.equal(check(makeDocument(['Use '+article+' '+form+' example.'],'Current')).length,0);}
});
test('source article forms preserve dotted initials, sentence case and exact document ranges',()=>{
 for(const [form,article,head]of forms){const dotted=form.split('').join('.')+'.',bad=(article==='a'?'An':'A')+' '+dotted+' '+head+' applies.',found=check(makeDocument([bad],'Current'));assert.equal(found.length,1,bad);assert.equal(found[0].suggestion,(article==='an'?'An':'A')+' '+dotted);assert.equal(bad.slice(found[0].start,found[0].end),found[0].text);}
});
test('explicit H-U-D uses its spelled letters while pronounceable HUD remains protected',()=>{
 const source=refs.gpo.pages[107].flowText||refs.gpo.pages[107].text;assert.ok(source.includes('an H-U-D directive'));assert.ok(source.includes('a HUD directive'));
 const issue=check(makeDocument(['A H-U-D directive applies.'],'Current'))[0];assert.equal(issue.suggestion,'An H-U-D');assert.ok(issue.references.some(r=>r.guideId==='gpo'&&r.rule==='5.16'&&r.guidePage===108));
 assert.equal(check(makeDocument(['An H-U-D directive applies. A HUD directive applies.'],'Current')).length,0);
 for(const text of ['A NASA program applies.','A N.A.S.A. program applies.','A HUD directive applies.','An HUD acronym is discussed.','A H U D phrase is ambiguous.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('initialism article evidence cannot bridge unknown ignored content, struck words or table rows',()=>{
 const unknown=makeDocument(['A\nunknown marker\nAEC report applies.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded.push({start:b.start,end:b.end});assert.equal(check(unknown).length,0);
 const struck=makeDocument(['A former AEC report applies.'],'Current'),start=struck.text.indexOf('former');struck.struck=[{start,end:start+6}];assert.equal(check(struck).length,0);
 const table=makeDocument(['A\nAEC report........ 100'],'Current');assert.equal(check(table).length,0);
 assert.equal(check(makeDocument(['A'+ ' '.repeat(5000)+'AEC report applies.'],'Current')).length,0);
});
test('complete initialism article selections bridge known page heads with no source mutation',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 A A.','AB 9999 — 2 —\nline 1 E.C. report applies.'],'Current'),head=d.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};const before=d.text,tokens=JSON.stringify(d.tokens),found=check(d);assert.equal(found.length,1);assert.equal(found[0].suggestion,'An A. E.C.');assert.match(d.text.slice(found[0].start,found[0].end),/AB 9999/);assert.equal(d.text,before);assert.equal(JSON.stringify(d.tokens),tokens);
});
test('lettered references, literals, unknown initials and independent counts preserve their separate meanings',()=>{
 for(const text of ['Part A AEC material applies.','Section A NSC material applies.','Exhibit A RFC material applies.','Cal Grant A AEC material applies.','A AECX program applies.','A lowercase aec program applies.','The literal "A AEC report" is preserved.','The literal "A\nAEC report" is preserved.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const issues=jointStylisticIssues(makeDocument(['A AEC report covers 1 claimant.'],'Current'),refs);assert.ok(issues.some(i=>i.suggestion==='An AEC'));assert.ok(issues.some(i=>i.suggestion==='one'));
});
