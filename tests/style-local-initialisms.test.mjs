import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {localInitialismExpansions}from '../app/style-local-initialisms.mjs';import {lcbInitialismArticleReviewIssues}from '../app/style-lcb-review-initialism-articles.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const words=await workerWords(),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=text=>makeDocument([text],'Current',[],[],words),base='The office requires a Xeno Delivery Review (XDR). ';
test('matching parenthetical expansions retain complete source names and establishing ranges',()=>{
 for(const [text,name,initials]of [[base,'Xeno Delivery Review','XDR'],['The Department of Regional Services (DRS) shall apply.','Department of Regional Services','DRS'],['The low-income home energy assistance program (LIHEAP) applies.','low-income home energy assistance program','LIHEAP'],['The real-time information system (RIS) applies.','real-time information system','RIS']]){const d=doc(text),[r]=localInitialismExpansions(d);assert.ok(r,text);assert.equal(r.initials,initials);assert.ok(r.expansion.endsWith(name));assert.equal(text.slice(r.start,r.end),r.text);assert.equal(text.slice(r.evidenceStart,r.evidenceEnd),r.clauseText);assert.equal(r.kind,'Parenthetical source expansion');}
});
test('direct matching abbreviation definitions retain original quoted establishing clauses',()=>{
 for(const quote of ['“XDR”','"XDR"']){const text=quote+' means the Xeno Delivery Review.',[r]=localInitialismExpansions(doc(text));assert.ok(r,text);assert.equal(r.initials,'XDR');assert.equal(r.kind,'Direct abbreviation definition');assert.equal(text.slice(r.evidenceStart,r.evidenceEnd),r.clauseText);assert.equal(r.expansion,'the Xeno Delivery Review');}
 for(const text of ['“XDR” means an extended delivery review.','“XDR” has the same meaning as provided in Section 2.','k“XDR” means Xeno Delivery Review.','α“XDR” means Xeno Delivery Review.'])assert.equal(localInitialismExpansions(doc(text)).length,0,text);
});
test('unknown later solid initials receive conditional article review with source expansion but no edit',()=>{
 const text=base+'The office requires a XDR assessment.',d=doc(text),[i]=lcbInitialismArticleReviewIssues(d,refs);assert.ok(i);assert.equal(i.text,'a XDR');assert.equal(i.suggestion,null);assert.equal(i.pronunciationEvidence.articleIfLettersSpoken,'an');assert.equal(i.pronunciationEvidence.sourceExpansion.expansion,'Xeno Delivery Review');assert.ok(i.message.includes('does not establish pronunciation or legal scope'));assert.ok(i.references.every(r=>r.preferred===null));
 const all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(x=>x.checkId==='lcb-initialism-article-review'&&x.start===i.start&&x.end===i.end));assert.equal(jointStylisticIssues(d,refs).filter(x=>x.checkId==='lcb-initialism-article-review').length,0);
});
test('correct article unexpanded and future expansions remain clear',()=>{
 for(const text of [base+'The office requires an XDR assessment.','The office requires a XDR assessment.', 'The office requires a XDR assessment. '+base,base+'The office requires a XDS assessment.'])assert.equal(lcbInitialismArticleReviewIssues(doc(text),refs).length,0,text);
 const text='The Budget Delivery Review (BDR) applies. The office requires an BDR notice.',[i]=lcbInitialismArticleReviewIssues(doc(text),refs);assert.equal(i.text,'an BDR');assert.equal(i.pronunciationEvidence.articleIfLettersSpoken,'a');
});
test('known word-pronounced acronyms and existing precise findings retain priority',()=>{
 for(const [expansion,group,article]of [['National Aeronautics and Space Administration','NASA','a'],['Federal Emergency Management Agency','FEMA','a'],['Housing and Urban Development','HUD','an']])assert.equal(lcbInitialismArticleReviewIssues(doc(expansion+' ('+group+') applies. The office requires '+article+' '+group+' notice.'),refs).length,0,group);
 const text='Federal Communications Commission (FCC) applies. The office requires a FCC ruling.',d=doc(text),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(i=>i.text==='a FCC'&&i.suggestion==='an FCC'));assert.equal(all.filter(i=>i.checkId==='lcb-initialism-article-review').length,0);
});
test('full source support is required for expansion name group delimiter and later article',()=>{
 const text=base+'The office requires a XDR assessment.';for(const property of ['struck','excluded'])for(const fragment of ['Xeno',' Delivery ','Review','(','XDR)',')','a XDR']){const d=doc(text),start=text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(lcbInitialismArticleReviewIssues(d,refs).length,0,property+' '+fragment);}
});
test('historical quoted table and heading names cannot establish an expansion',()=>{
 for(const text of ['The old statute defines Xeno Delivery Review (XDR). ','The report quotes “Xeno Delivery Review (XDR).” ','The report quotes \'Xeno Delivery Review (XDR).\' ','Xeno Delivery Review (XDR).................20\n','XENO DELIVERY REVIEW (XDR)\nLEGISLATIVE COUNSEL’S DIGEST\nA bill.\nThe people do enact as follows:\n'])assert.equal(lcbInitialismArticleReviewIssues(doc(text+'The office requires a XDR assessment.'),refs).length,0,text);
 const d=doc(base+'The office requires a XDR assessment.');d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(lcbInitialismArticleReviewIssues(d,refs).length,0);
});
test('source initial-letter disagreement unsupported shapes and incomplete name boundaries remain clear',()=>{
 for(const text of ['Xeno Delivery Review (XDS). ','Xeno Delivery Review (XD2). ','Xeno Delivery Review (XdR). ','Xeno Delivery Review (X.D.R.). ','αXeno Delivery Review (XDR). '])assert.equal(lcbInitialismArticleReviewIssues(doc(text+'The office requires a XDR assessment.'),refs).length,0,text);
});
test('labels units identifiers literals and malformed later groups are outside the review context',()=>{
 for(const tail of ['Type A XDR applies.','Section A XDR applies.','The office uses a XDR-12 identifier.','The office uses a XDR/2 code.','The office reads a XDR measurement.','The report says “a XDR assessment”.','The office uses a XDR.A code.','The office uses a XDRα assessment.','A XDR ASSESSMENT'])assert.equal(lcbInitialismArticleReviewIssues(doc(base+'\n'+tail),refs).length,0,tail);
});
test('solid initials at ordinary sentence punctuation retain their complete article selection',()=>{
 const text=base+'The office requires a XDR. A rule applies.',[i]=lcbInitialismArticleReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.text,'a XDR');assert.equal(text.slice(i.start,i.end),i.text);
});
test('nearest earlier source expansion is shown without claiming a legal alias hierarchy',()=>{
 const text=base+'Xeno Drafting Report (XDR) applies. The office requires a XDR assessment.',[i]=lcbInitialismArticleReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.pronunciationEvidence.sourceExpansion.expansion,'Xeno Drafting Report');assert.equal(i.suggestion,null);
});
test('source witnesses restore all nested original ranges after word divisions',()=>{
 const text='A require-\nment applies. Xeno De-\nlivery Review (XDR) applies. The office requires a XDR assessment.',d=doc(text),before=JSON.stringify(d),[i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-initialism-article-review');assert.ok(i);assert.equal(i.text,'a XDR');const r=i.pronunciationEvidence.sourceExpansion;assert.equal(r.expansion,'Xeno Delivery Review');assert.equal(text.slice(r.start,r.end),r.text);assert.equal(text.slice(r.evidenceStart,r.evidenceEnd),r.clauseText);assert.ok(r.text.includes('De-\nlivery'));assert.equal(JSON.stringify(d),before);
});
test('a comparison baseline can disable only source-local expansion support',()=>{
 const text=base+'The office requires a XDR assessment and a X.D.R. check.',found=lcbInitialismArticleReviewIssues(doc(text),refs,{includeLocalExpansions:false});assert.deepEqual(found.map(i=>i.text),['a X.D.R.']);
 const all=jointStylisticIssues(doc(text),refs,{includeReviewSuggestions:true,includeLocalInitialismReview:false}).filter(i=>i.checkId==='lcb-initialism-article-review');assert.deepEqual(all.map(i=>i.text),['a X.D.R.']);
});
