import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
import {workerWords} from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const words=await workerWords();

test('desktop reader review integrates unfamiliar whole lists without changing precise-only API',()=>{
 const doc=makeDocument(['The office receives accident reports, signed declarations and supporting photographs.'],'Current'),saved=JSON.stringify(doc);
 assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-series-punctuation-review').length,0);
 const findings=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-series-punctuation-review');
 assert.equal(findings.length,1);
 assert.equal(doc.text.slice(findings[0].start,findings[0].end),'accident reports, signed declarations and supporting photographs');
 assert.equal(findings[0].suggestion,null);
 assert.equal(findings[0].reviewSuggested,true);
 assert.deepEqual(findings[0].references.map(r=>r.guideId),['lcb','gpo']);
 assert.equal(JSON.stringify(doc),saved);
 assert.ok(CHECK_COVERAGE.some(c=>c.title==='Unfamiliar series punctuation'&&c.page===6&&c.text.includes('reader-review')));
});
test('desktop entity identity review preserves the complete local registry witness',()=>{
 const doc=makeDocument(['The State Board of the Education shall administer the program.'],'Current');
 assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-entity-identity-review').length,0);
 const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-entity-identity-review');
 assert.equal(found.length,1);assert.equal(found[0].text,'State Board of the Education');assert.equal(found[0].suggestion,null);assert.ok(found[0].entityMatches.some(m=>m.name==='State Board of Education'&&m.citation));
});
test('source-created title guard prevents a generic prefix spelling change and offers full-title review',()=>{
 const doc=makeDocument(['The Medi-Cal anti-fraud special deposit fund is hereby created in the State Treasury.'],'Current');
 for(const includeReviewSuggestions of [false,true]){
  const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions});assert.ok(!found.some(i=>i.checkId==='lcb-prefixes'&&i.suggestion==='antifraud'));
  const titles=found.filter(i=>i.checkId==='lcb-created-official-title-review');assert.equal(titles.length,Number(includeReviewSuggestions));if(titles.length){assert.equal(titles[0].text,'Medi-Cal anti-fraud special deposit fund');assert.equal(titles[0].suggestion,null);}
 }
});
test('suffix review preserves a whole divided compound and remains reader-only',()=>{
 const doc=makeDocument(['The applicant receives citi-\nzen-ship-based assistance.'],'Current',[],[],words),saved=JSON.stringify(doc);
 assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-suffix-boundary-review').length,0);
 const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-suffix-boundary-review');
 assert.equal(found.length,1);assert.equal(found[0].text,'citi-\nzen-ship-based');assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);
 assert.deepEqual(found[0].references.map(r=>r.guideId),['lcb','gpo']);assert.equal(JSON.stringify(doc),saved);
 const divided=makeDocument(['The applicant receives citizen-\nship assistance.'],'Current',[],[],words);
 assert.equal(jointStylisticIssues(divided,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-suffix-boundary-review').length,0);
 assert.ok(CHECK_COVERAGE.some(c=>c.title==='Selected suffix boundaries'&&c.page===8));
});
test('unknown separated-letter article review is conditional and preserves existing precise checks',()=>{
 const doc=makeDocument(['The agency requires a X.D.R. assessment and a F.C.C. report.'],'Current');
 const precise=jointStylisticIssues(doc,refs);assert.ok(!precise.some(i=>i.checkId==='lcb-initialism-article-review'));assert.ok(precise.some(i=>i.text==='a F.C.C.'&&i.suggestion==='an F.C.C.'));
 const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}),review=found.filter(i=>i.checkId==='lcb-initialism-article-review');assert.equal(review.length,1);assert.equal(review[0].text,'a X.D.R.');assert.equal(review[0].suggestion,null);assert.ok(found.some(i=>i.text==='a F.C.C.'&&i.suggestion==='an F.C.C.'));assert.ok(CHECK_COVERAGE.some(c=>c.title==='Unfamiliar initialism articles'&&c.page===2));
});
test('fresh-definition quote review retains full divided literal and supporting predicate offsets',()=>{
 const doc=makeDocument(['“Eligible appli-\ncant;” means an individual who satisfies this section.'],'Current',[],[],words),saved=JSON.stringify(doc);
 assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-fresh-quote-ownership-review').length,0);
 const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-quote-ownership-review');assert.equal(found.length,1);assert.equal(found[0].text,'“Eligible appli-\ncant;”');assert.equal(found[0].suggestion,null);
 const e=found[0].quoteEvidence;assert.equal(doc.text.slice(e.punctuationStart,e.punctuationEnd),';');assert.equal(doc.text.slice(e.definitionVerb.start,e.definitionVerb.end),'means');assert.equal(JSON.stringify(doc),saved);
 for(const text of ['“Eligible applicant;” means the literal text on the form.','Insert “Eligible applicant;” means an individual.','“Apply now!” means the caption used on the application.'])assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-quote-ownership-review').length,0,text);
 assert.ok(CHECK_COVERAGE.some(c=>c.title==='Fresh-definition quotation punctuation'&&c.page===6));
});
test('nested quote evidence restores original coordinates after earlier body word divisions',()=>{
 for(const text of ['The Elig-\nible applicant shall apply. “participant;” means an individual who registers.','The Elig-\nible applicant shall apply. “Eligible appli-\ncant;” means an individual who registers.','The Elig-\nible applicant shall apply. “participant;” me-\nans an individual who registers.']){
  const doc=makeDocument([text],'Current',[],[],words),saved=JSON.stringify(doc),found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-quote-ownership-review');assert.equal(found.length,1,text);
  const i=found[0],e=i.quoteEvidence;assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(doc.text.slice(e.punctuationStart,e.punctuationEnd),';');assert.equal(doc.text.slice(e.definitionVerb.start,e.definitionVerb.end),e.definitionVerb.text);assert.equal(e.definitionVerb.text.replace(/-\s*\n\s*/g,''),'means');
  for(const w of i.sourceWordDivisions||[]){assert.equal(w.spans.map(s=>doc.text.slice(s.start,s.end)).join(''),w.word);assert.equal(w.start,w.spans[0].start);assert.equal(w.end,w.spans.at(-1).end);}
  assert.equal(JSON.stringify(doc),saved);
 }
});
test('later title review restores its full reference and creation witness after earlier word divisions',()=>{
 for(const text of ['The Elig-\nible applicant shall apply. The Community Transportation Accountability Fund is hereby created in the State Treasury. Money shall be deposited in the community transportation accountability fund.','The Elig-\nible applicant shall apply. The Community Transpor-\ntation Accountability Fund is hereby created in the State Treasury. Money shall be deposited in the community transpor-\ntation accountability fund.']){
  const doc=makeDocument([text],'Current',[],[],words),saved=JSON.stringify(doc);
  assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-created-title-reference-review').length,0);
  const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-created-title-reference-review');assert.equal(found.length,1,text);
  const i=found[0],w=i.titleWitness;assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(doc.text.slice(w.start,w.end),w.text);assert.equal(doc.text.slice(w.evidenceStart,w.evidenceEnd),w.declarationText);assert.equal(w.name,'Community Transportation Accountability Fund');assert.ok(w.evidenceText.includes('created in the State Treasury'));
  for(const component of i.titleCaseEvidence)assert.equal(doc.text.slice(component.start,component.end).replace(/-\s*\n\s*/g,''),component.actual);
  for(const division of i.sourceWordDivisions||[])assert.equal(division.spans.map(s=>doc.text.slice(s.start,s.end)).join(''),division.word);
  assert.equal(JSON.stringify(doc),saved);
 }
 assert.ok(CHECK_COVERAGE.some(c=>c.title==='Later references to created fund and account titles'&&c.page===17));
});
test('later source-created titles protect listed spelling while preserving independent precise capitalization',()=>{
 const creation='The Medi-Cal Anti-Fraud Special Deposit Fund is hereby created in the State Treasury. ';
 for(const includeReviewSuggestions of [false,true]){
  const doc=makeDocument([creation+'Money shall be deposited in the medi-cal anti-fraud special Deposit Fund.'],'Current'),found=jointStylisticIssues(doc,refs,{includeReviewSuggestions});
  assert.ok(found.some(i=>i.text==='medi-cal'&&i.suggestion==='Medi-Cal'));assert.ok(!found.some(i=>i.checkId==='lcb-prefixes'&&i.suggestion==='antifraud'));
  const review=found.filter(i=>i.checkId==='lcb-created-title-reference-review');assert.equal(review.length,Number(includeReviewSuggestions));if(review.length){assert.equal(review[0].text,'medi-cal anti-fraud special Deposit Fund');assert.ok(review[0].titleCaseEvidence.some(c=>c.actual==='special'));assert.ok(!review[0].titleCaseEvidence.some(c=>c.actual==='medi'));}
 }
 const onlyCase=jointStylisticIssues(makeDocument([creation+'Money shall be deposited in the medi-cal Anti-Fraud Special Deposit Fund.'],'Current'),refs,{includeReviewSuggestions:true});assert.ok(onlyCase.some(i=>i.suggestion==='Medi-Cal'));assert.ok(!onlyCase.some(i=>i.checkId==='lcb-created-title-reference-review'));
});
test('internal title identity review detects a valid-word substitution with complete original source provenance',()=>{
 for(const text of ['The Community Transportation Rebate Fund is hereby created in the State Treasury. Money shall be deposited in the Community Transportation Relate Fund.','The Elig-\nible applicant shall apply. The Community Transpor-\ntation Rebate Fund is hereby created in the State Treasury. Money shall be deposited in the Community Transpor-\ntation Rel-\nate Fund.']){
  const doc=makeDocument([text],'Current',[],[],words),saved=JSON.stringify(doc);assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-created-title-identity-review').length,0);
  const found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-created-title-identity-review');assert.equal(found.length,1,text);const i=found[0],w=i.titleWitness,c=i.titleIdentityEvidence;
  assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(w.name,'Community Transportation Rebate Fund');assert.equal(doc.text.slice(w.start,w.end),w.text);assert.equal(doc.text.slice(w.evidenceStart,w.evidenceEnd),w.declarationText);assert.equal(c.canonical,'Rebate');assert.equal(c.actual,'Relate');assert.equal(doc.text.slice(c.start,c.end).replace(/-\s*\n\s*/g,''),'Relate');assert.equal(c.sourceText,doc.text.slice(c.start,c.end));assert.equal(JSON.stringify(doc),saved);
 }
 assert.ok(CHECK_COVERAGE.some(c=>c.title==='Near-matching source-created fund and account titles'&&c.page===17&&c.status==='Contextual title identity review'));
});
test('near-title identity uncertainty preserves an unchanged source-established hyphen without altering the typo',()=>{
 for(const includeReviewSuggestions of [false,true]){
  const doc=makeDocument(['The Medi-Cal Anti-Fraud Special Deposit Fund is hereby created in the State Treasury. Money shall be deposited in the Medi-Cal anti-fraud Special Depostt Fund.'],'Current'),saved=JSON.stringify(doc),found=jointStylisticIssues(doc,refs,{includeReviewSuggestions});
  assert.ok(!found.some(i=>i.checkId==='lcb-prefixes'&&i.suggestion==='antifraud'));const identity=found.filter(i=>i.checkId==='lcb-created-title-identity-review');assert.equal(identity.length,Number(includeReviewSuggestions));if(identity.length){assert.equal(identity[0].suggestion,null);assert.equal(identity[0].text,'Medi-Cal anti-fraud Special Depostt Fund');assert.equal(identity[0].titleIdentityEvidence.sourceText,'Depostt');}assert.equal(JSON.stringify(doc),saved);
 }
 const ordinary=jointStylisticIssues(makeDocument(['An anti-fraud program shall provide assistance.'],'Current'),refs);assert.ok(ordinary.some(i=>i.checkId==='lcb-prefixes'&&i.suggestion==='antifraud'));
});

test('title provenance retains grammatical hyphens in creation and later references after body word divisions',()=>{
 const source='An Elig-\nible applicant shall apply. The Medi-Cal Anti-\nFraud Special Deposit Fund is hereby created in the State Treasury. Money shall be deposited in the medi-cal anti-\nfraud special Deposit Fund. Money shall be deposited in the Medi-Cal anti-\nfraud Special Depostt Fund.';
 const doc=makeDocument([source],'Current',[],[],words),saved=JSON.stringify(doc),findings=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true});
 for(const checkId of ['lcb-created-title-reference-review','lcb-created-title-identity-review']){
  const items=findings.filter(i=>i.checkId===checkId);assert.equal(items.length,1,checkId);const i=items[0],w=i.titleWitness;
  assert.equal(w.name,'Medi-Cal Anti-Fraud Special Deposit Fund');assert.equal(doc.text.slice(w.start,w.end),w.text);assert.equal(doc.text.slice(w.evidenceStart,w.evidenceEnd),w.declarationText);assert.ok(w.text.includes('Anti-\nFraud'));assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('anti-\nfraud'));assert.equal(i.suggestion,null);
  for(const c of i.titleCaseEvidence||[])assert.equal(doc.text.slice(c.start,c.end).replace(/-\s*\n\s*/g,'-'),c.actual);
  if(i.titleIdentityEvidence){const c=i.titleIdentityEvidence;assert.equal(c.actual,'Depostt');assert.equal(doc.text.slice(c.start,c.end),c.sourceText);}
 }
 assert.ok(findings.some(i=>i.text==='medi-cal'&&i.suggestion==='Medi-Cal'));assert.ok(!findings.some(i=>i.checkId==='lcb-prefixes'&&i.suggestion==='antifraud'));assert.equal(JSON.stringify(doc),saved);
});
