import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {productiveLikeCandidates}from '../app/style-productive-like-suffixes.mjs';import {isCommonLexicalRoot}from '../app/lcb-prefix-candidates.mjs';import {lcbSuffixBoundaryReviewIssues}from '../app/style-lcb-review-affix-boundaries.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=text=>makeDocument([text],'Current'),reviews=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.affixEvidence?.productiveWitness);
test('source rule can identify unlisted like compounds without a closed-word dictionary witness',()=>{
 for(const root of ['invoice','statute','database','contract','budget']){assert.ok(isCommonLexicalRoot(root),root);assert.equal(isCommonLexicalRoot(root+'like'),false,root);const text='The '+root+'-like requirement applies.',d=make(text),before=JSON.stringify(d),[i]=reviews(d);assert.ok(i,root);assert.equal(i.text,root+'-like');assert.equal(i.suggestion,null);assert.equal(i.affixEvidence.productiveWitness.base,root);assert.equal(i.affixEvidence.productiveWitness.closedWordInIndex,false);assert.equal(i.affixEvidence.lexicalWitness,undefined);assert.deepEqual(i.references.map(r=>r.rule),['Hyphenation, item 5','6.30','6.31']);assert.ok(i.references.every(r=>r.preferred===null));assert.ok(i.message.includes('not a valid-word or dictionary preference'));assert.equal(JSON.stringify(d),before);}
});
test('triple consonants proper-name bases unknown roots and larger lexical units cannot establish this path',()=>{
 for(const word of ['ball-like','bell-like','doll-like','shell-like','well-like','firewall-like','Scotland-like','McArtor-like','CALIFORNIA-like','unknownroot-like','pre-invoice-like','invoice-likes','invoice-like-unfamiliar','invoice-likeα','αinvoice-like','invoice-like2'])assert.equal(reviews(make('The '+word+' requirement applies.')).length,0,word);
});
test('existing closed-word witnesses retain their previous method and no duplicate productive question',()=>{
 const d=make('The child-like requirement applies.'),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.equal(productiveLikeCandidates(d.text,refs).length,0);const [i]=all.filter(i=>i.checkId==='lcb-suffix-boundary-review');assert.ok(i);assert.equal(i.affixEvidence.lexicalWitness.closedWord,'childlike');assert.equal(i.affixEvidence.productiveWitness,undefined);
});
test('complete supported tails are selected without treating their grammatical hyphens as suffix errors',()=>{
 const word='invoice-like-based-required',[i]=reviews(make('The '+word+' requirement applies.'));assert.ok(i);assert.equal(i.text,word);assert.equal(i.affixEvidence.compoundTail,'-based-required');assert.equal(i.affixEvidence.productiveWitness.closedWord,'invoicelike');assert.equal(i.suggestion,null);
});
test('every original selected character including separators and spaces retains strike/exclusion protection',()=>{
 const text='The invoice-like-based requirement applies.',start=text.indexOf('invoice'),end=start+'invoice-like-based'.length;for(const key of ['struck','excluded'])for(let at=start;at<end;at++){const d=make(text);d[key].push({start:at,end:at+1});assert.equal(reviews(d).length,0,key+at);}
});
test('source divisions rhetorical dashes compound coordination and identifiers stay protected',()=>{
 for(const text of ['The invoice-\nlike requirement applies.','The invoice-like\n-based requirement applies.','The invoice—like requirement applies.','The invoice–like requirement applies.','The pre- invoice-like requirement applies.','The invoice- and statute-like requirements apply.','Use https://example.org/invoice-like.','Use records/invoice-like.','Email invoice-like@example.org.'])assert.equal(reviews(make(text)).length,0,text);const [i]=reviews(make('The invoice‐like requirement applies.'));assert.ok(i);assert.equal(i.text,'invoice‐like');assert.equal(i.affixEvidence.separator,'‐');
});
test('literal names tables headings and source names remain protected',()=>{
 for(const text of ['The Invoice-like Fund applies.','The invoice-like Agency applies.','The term “invoice-like” applies.','The term \'invoice-like\' applies.','The invoice-like...........30 applies.','INVOICE-LIKE'])assert.equal(reviews(make(text)).length,0,text);assert.equal(reviews(make('Invoice-like evidence is required.')).length,1);
});
test('more specific findings reader mode and the baseline flag keep their established priority',()=>{
 const d=make('The invoice-like requirement applies.'),start=d.text.indexOf('invoice');assert.equal(jointStylisticIssues(d,refs).filter(i=>i.affixEvidence?.productiveWitness).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeProductiveLikeReview:false}).filter(i=>i.affixEvidence?.productiveWitness).length,0);assert.equal(lcbSuffixBoundaryReviewIssues(d,refs,{existingIssues:[{start,end:start+12,suggestion:'specific'}]}).length,0);
});
test('a fresh definition retains original term evidence while old quotations stay protected',()=>{
 const d=make('“invoice-like” means a requirement imposed by this section.'),[i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-definition-term-review');assert.ok(i);assert.equal(i.text,'invoice-like');assert.equal(i.suggestion,null);assert.equal(i.affixEvidence.productiveWitness.base,'invoice');assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeProductiveLikeReview:false}).filter(i=>i.affixEvidence?.productiveWitness).length,0);
});
test('productive candidates require the supplied complete LCB and GPO normative source records',()=>{
 const bad=structuredClone(refs);bad.gpo.pages[118].text='Unrelated page';bad.gpo.pages[118].flowText='Unrelated page';assert.equal(productiveLikeCandidates('invoice-like',bad).length,0);const missing=structuredClone(refs);missing.lcb.pages[7].text='Unrelated page';assert.equal(productiveLikeCandidates('invoice-like',missing).length,0);
});
test('original compound boundaries also protect legacy lexical and finite suffix methods',()=>{
 for(const word of ['scholar-ly-based','citizen-ship-based']){const text='The '+word+' requirement applies.',start=text.indexOf(word);for(const key of ['struck','excluded'])for(let at=start;at<start+word.length;at++){const d=make(text);d[key].push({start:at,end:at+1});assert.equal(lcbSuffixBoundaryReviewIssues(d,refs).length,0,key+word+at);}}
});
