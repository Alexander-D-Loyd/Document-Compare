import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs),struck=(text,word)=>{const d=makeDocument([text],'Current'),start=d.text.indexOf(word);assert.ok(start>=0);d.struck=[{start,end:start+word.length}];return d;};
test('complete contextual noun evidence cannot bridge a struck intervening word',()=>{
 for(const [text,word]of [['A principle former investigator acts.','former'],['Use stationary obsolete supplies.','obsolete'],['The perspective former applicants apply.','former'],['The agency may adopt an former ordnance.','former']])assert.equal(check(struck(text,word)).length,0,text);
 for(const text of ['A principle investigator acts.','Use stationary supplies.','The perspective applicants apply.','The agency may adopt an ordnance.'])assert.ok(check(makeDocument([text],'Current')).length,text);
});
test('meaning-dependent active verbs require intact object evidence',()=>{
 for(const [text,word]of [['The agency shall insure former accuracy.','former'],['The agency shall guaranty former payment.','former'],['The agency shall forego former the right to appeal.','former']])assert.equal(check(struck(text,word)).length,0,text);
 assert.equal(check(makeDocument(['The agency shall insure accuracy.'],'Current'))[0].suggestion,'ensure');
});
test('finite verb subject and auxiliary evidence cannot bridge a source strike',()=>{
 for(const [text,word]of [['The agency former insures accuracy.','former'],['The agency has former insured accuracy.','former'],['The agency is former insuring accuracy.','former']])assert.equal(check(struck(text,word)).length,0,text);
 for(const text of ['The agency insures accuracy.','The agency has insured accuracy.','The agency is insuring accuracy.'])assert.equal(check(makeDocument([text],'Current')).length,1,text);
});
test('a table context on another row cannot supply a noun, passive subject or finite verb subject',()=>{
 const noun=makeDocument(['A principle\ninvestigator................ 100'],'Current');assert.equal(check(noun).length,0);
 const subject=makeDocument(['The agency\ninsures accuracy.'],'Current');subject.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(subject).length,0);
 const passive=makeDocument(['Accuracy is\ninsured.'],'Current');passive.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(passive).length,0);
});
test('unknown ignored evidence stays protected while identified interior running heads retain full word-choice ranges',()=>{
 const unknown=makeDocument(['A principle\nunknown marker\ninvestigator acts.'],'Current');const b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(check(unknown).length,0);
 const known=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 A principle','AB 9999 — 2 —\nline 1 investigator acts.'],'Current');known.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};assert.equal(check(known).length,1);assert.equal(check(known)[0].suggestion,'principal');
 const phrase=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 The agency shall assure','AB 9999 — 2 —\nline 1 compliance.'],'Current');phrase.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};assert.equal(check(phrase).length,1);
});
test('wrapped literal word-choice evidence is protected in direct and combined reviews',()=>{
 const d=makeDocument(['The literal "The agency shall\ninsure accuracy" is preserved. Funds support 1 claimant.'],'Current');assert.equal(check(d).length,0);const issues=jointStylisticIssues(d,refs);assert.ok(issues.some(i=>i.suggestion==='one'));assert.ok(!issues.some(i=>i.checkId==='word-choice'));
});
test('the matched evidence range excludes unrelated earlier deleted words and supports explicit sentence-opening verbs',()=>{
 const d=struck('The former provision ends; the agency shall insure accuracy.','former');assert.equal(check(d).length,1);assert.equal(check(d)[0].suggestion,'ensure');
 assert.equal(check(makeDocument(['Insure accuracy.'],'Current'))[0].suggestion,'Ensure');
 const correct=makeDocument(['The agency shall ensure accuracy.'],'Current');assert.equal(check(correct).length,0);
});
test('contextual word-choice evidence refreshes after strikeout and ignored-block changes',()=>{
 const d=makeDocument(['The agency former insures accuracy.'],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(check(d).length,0);d.struck=[];assert.equal(check(d).length,0);
 const valid=makeDocument(['A principle\ninvestigator acts.'],'Current');assert.equal(check(valid).length,1);valid.blocks[1].formatting={headerGaps:[1,2]};assert.equal(check(valid).length,0);delete valid.blocks[1].formatting;assert.equal(check(valid).length,1);
});
