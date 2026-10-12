import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {lexicalSuffixCandidates,LEXICAL_SUFFIX_FAMILIES}from '../app/style-lexical-suffixes.mjs';import {lcbSuffixBoundaryReviewIssues}from '../app/style-lcb-review-affix-boundaries.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=text=>makeDocument([text],'Current');
test('lexical word witnesses broaden roots without asserting a spelling authority or edit',()=>{
 for(const [word,base,closed]of [['scholar-ly','scholar','scholarly'],['righteous-ness','righteous','righteousness'],['danger-ous','danger','dangerous'],['alcohol-ism','alcohol','alcoholism'],['organ-ist','organ','organist'],['attend-ance','attend','attendance'],['invent-ion','invent','invention'],['comfort-able','comfort','comfortable'],['ornament-al','ornament','ornamental'],['employ-ed','employ','employed'],['employ-ing','employ','employing'],['plank-s','plank','planks']]){const text='The '+word+' requirement applies.',d=doc(text),before=JSON.stringify(d),[i]=lcbSuffixBoundaryReviewIssues(d,refs);assert.ok(i,word);assert.equal(i.text,word);assert.equal(i.affixEvidence.lexicalWitness.base,base);assert.equal(i.affixEvidence.lexicalWitness.closedWord,closed);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.ok(i.message.includes('only lexical review evidence'));assert.ok(i.references.every(r=>r.preferred===null));assert.equal(JSON.stringify(d),before);}
});
test('selected altered bases remain explicit potential witnesses rather than spelling corrections',()=>{
 for(const [word,base,relation]of [['supervis-ory','supervise','Potential final-e base'],['happi-ness','happy','Potential final-y base'],['plann-ed','plan','Potential doubled-consonant base'],['fitt-est','fit','Potential doubled-consonant base']]){const [i]=lcbSuffixBoundaryReviewIssues(doc('The '+word+' provision applies.'),refs);assert.ok(i,word);assert.equal(i.affixEvidence.lexicalWitness.base,base);assert.equal(i.affixEvidence.lexicalWitness.relation,relation);assert.equal(i.suggestion,null);}
});
test('both a base and the complete closed word are required and unknown morphology remains unresolved',()=>{
 for(const word of ['unknownroot-ness','scholar-unfamiliar','zygote-ness','ex-governor','quasi-judicial','self-hood','bell-like','Scotland-like','cargo-ship'])assert.equal(lexicalSuffixCandidates('The '+word+' provision applies.').length,0,word);
 assert.equal(new Set(LEXICAL_SUFFIX_FAMILIES).size,LEXICAL_SUFFIX_FAMILIES.length);
});
test('the entire compound is selected while separate grammatical tail hyphens are preserved',()=>{
 const word='scholar-ly-based-required',text='The '+word+' policy applies.',[i]=lcbSuffixBoundaryReviewIssues(doc(text),refs);assert.ok(i);assert.equal(i.text,word);assert.equal(i.affixEvidence.compoundTail,'-based-required');assert.equal(i.affixEvidence.lexicalWitness.closedWord,'scholarly');assert.equal(text.slice(i.start,i.end),word);
 for(const word of ['scholar-ly-unfamiliar','pre-scholar-ly','scholar-ly-based-unfamiliar'])assert.equal(lcbSuffixBoundaryReviewIssues(doc('The '+word+' provision applies.'),refs).length,0,word);
});
test('one finite candidate retains precedence over a duplicate lexical candidate',()=>{
 const [i]=lcbSuffixBoundaryReviewIssues(doc('The citizen-ship provision applies.'),refs);assert.ok(i);assert.equal(i.affixEvidence.lexicalWitness,undefined);assert.equal(lcbSuffixBoundaryReviewIssues(doc('The citizen-ship provision applies.'),refs).length,1);
 const d=doc('The scholar-ly provision applies.'),start=d.text.indexOf('scholar-ly');assert.equal(lcbSuffixBoundaryReviewIssues(d,refs,{existingIssues:[{start,end:start+10,suggestion:'scholarly'}]}).length,0);
});
test('source glyphs divisions compound coordination and every character retain evidence guards',()=>{
 for(const text of ['The scholar-\nly provision applies.','The scholar-ly\n-based provision applies.','The pre- scholar-ly field applies.','The scholar-ly - based field applies.','The scholar—ly field applies.','The scholar–ly field applies.','The scholar- and teacher-ly contexts apply.','The αscholar-ly field applies.','The scholar-lyα field applies.','The scholar-ly2 field applies.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
 const text='The scholar-ly field applies.';for(const property of ['struck','excluded'])for(const fragment of ['scholar','-','ly']){const d=doc(text),start=text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(lcbSuffixBoundaryReviewIssues(d,refs).length,0,property+fragment);}
 const [i]=lcbSuffixBoundaryReviewIssues(doc('The scholar‐ly field applies.'),refs);assert.equal(i.text,'scholar‐ly');assert.equal(i.affixEvidence.separator,'‐');
});
test('names quotations tables identifiers and higher priority style findings remain protected',()=>{
 for(const text of ['The Scholar-ly Fund applies.','The term “scholar-ly” applies.','The term \'scholar-ly\' applies.','The value scholar-ly................30 applies.','Use https://example.org/scholar-ly.','The key records/scholar-ly applies.','Email scholar-ly@example.org.'])assert.equal(lcbSuffixBoundaryReviewIssues(doc(text),refs).length,0,text);
 assert.equal(lcbSuffixBoundaryReviewIssues(doc('Scholar-ly evidence is required.'),refs).length,1);
});
test('desktop reader integration retains precise-only API and fresh definition context',()=>{
 const text='The scholar-ly requirement applies.',d=doc(text);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-suffix-boundary-review').length,0);const [i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-suffix-boundary-review');assert.ok(i);assert.equal(i.affixEvidence.lexicalWitness.closedWord,'scholarly');
 const defined=jointStylisticIssues(doc('“scholar-ly” means a requirement imposed by this section.'),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-definition-term-review');assert.equal(defined.length,1);assert.equal(defined[0].suggestion,null);assert.equal(defined[0].affixEvidence.lexicalWitness.base,'scholar');
});
test('a controlled baseline disables only the new lexical branch, including definition analysis',()=>{
 const text='The citizen-ship and scholar-ly provisions apply.',found=jointStylisticIssues(doc(text),refs,{includeReviewSuggestions:true,includeLexicalSuffixReview:false}).filter(i=>i.checkId==='lcb-suffix-boundary-review');assert.deepEqual(found.map(i=>i.text),['citizen-ship']);
 const text2='“scholar-ly” means a requirement imposed by this section.';assert.equal(jointStylisticIssues(doc(text2),refs,{includeReviewSuggestions:true,includeLexicalSuffixReview:false}).filter(i=>i.checkId==='lcb-fresh-definition-term-review').length,0);
});
test('LCB-listed words with unmatched suffix hyphens receive review and retain their source-listed witness',()=>{
 const text='The bus-es requirement applies.',d=doc(text),[i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-suffix-boundary-review');assert.ok(i);assert.equal(i.text,'bus-es');assert.equal(i.suggestion,null);assert.deepEqual(i.affixEvidence.lexicalWitness.lcbListedForm,{word:'buses',page:3,sourceEntry:'buses'});assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeLexicalSuffixReview:false}).filter(i=>i.checkId==='lcb-suffix-boundary-review').length,0);
 const start=text.indexOf('bus-es');assert.equal(lcbSuffixBoundaryReviewIssues(d,refs,{existingIssues:[{start,end:start+6,suggestion:'buses',checkId:'source-specific'}]}).length,0);
});
