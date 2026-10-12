import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbUnknownMoneyReviewIssues} from '../app/style-lcb-review-money-context.mjs';
import {moneyFormIssues} from '../app/style-money-forms.mjs';import {monetaryPairIssues} from '../app/style-money.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const unknown=body=>'The people of the State of California do enact as follows:\nSEC. 1. '+body;
const codified=body=>'The people of the State of California do enact as follows:\nSECTION 1. Section 123 of the Government Code is amended to read:\n123. '+body;
const check=text=>lcbUnknownMoneyReviewIssues(makeDocument([text],'Current'),refs);

test('unresolved operative money receives reader review where the existing checker is silent',()=>{
 const text=unknown('The department shall charge $5 or five dollars.'),doc=makeDocument([text],'Current');
 assert.equal(moneyFormIssues(doc,refs).length,0);
 const found=check(text);assert.deepEqual(found.map(i=>i.matchText),['$5','five dollars']);
 for(const issue of found){assert.equal(issue.suggestion,null);assert.equal(issue.reviewSuggested,true);assert.equal(issue.confidence,'Review Suggested');assert.equal(issue.context,'Bill');assert.equal(issue.sectionContext.kind,'Unknown');assert.equal(text.slice(issue.start,issue.end),issue.text);assert.deepEqual(issue.references.map(r=>r.guidePage),[23,21]);assert.match(issue.message,/Confirm which context applies/);}
});

test('known codified, findings, digest and resolution contexts retain their established checks',()=>{
 for(const text of [codified('Pay $5 or five dollars.'),'LEGISLATIVE COUNSEL’S DIGEST\nThe amount is five dollars.',unknown('The Legislature finds and declares all of the following:\nThe cost is five dollars.'),'ASSEMBLY CONCURRENT RESOLUTION No. 1\nThe cost is five dollars.'])assert.equal(check(text).length,0,text);
 assert.equal(moneyFormIssues(makeDocument([codified('Pay $5.')],'Current'),refs).length,1);
 assert.equal(check('ASSEMBLY BILL\nFive dollars\nLEGISLATIVE COUNSEL’S DIGEST\nThe measure imposes $5.').length,0);
});

test('whole dollar-and-cent expressions and monetary modifiers retain their complete selections',()=>{
 const found=check(unknown('Pay four hundred fifty-seven dollars and forty-two cents, a two-hundred-dollar minimum, or two mills.'));
 assert.deepEqual(found.map(i=>i.matchText),['four hundred fifty-seven dollars and forty-two cents','two-hundred-dollar','two mills']);
 assert.equal(found.length,3);assert.ok(found.every(i=>i.suggestion===null));
});

test('precise pair-disagreement findings outrank broad monetary context review',()=>{
 const doc=makeDocument([unknown('Pay five dollars ($6), ten dollars ($10), or $25.')],'Current'),existing=monetaryPairIssues(doc,refs);
 assert.equal(existing.length,1);assert.match(existing[0].message,/disagree/);
 assert.deepEqual(lcbUnknownMoneyReviewIssues(doc,refs,{existingIssues:existing}).map(i=>i.matchText),['$25']);
 assert.equal(existing[0].suggestion,'five dollars ($5)');
});

test('complete grouped, scaled, decimal and signed figures stay intact without an asserted value',()=>{
 assert.deepEqual(check(unknown('Pay $2,045, $457.42, $200 million, or $-5.')).map(i=>i.matchText),['$2,045','$457.42','$200 million','$-5']);
 assert.equal(check(unknown('The identifier is $5ABC.')).length,0);
 assert.equal(check(unknown('The product contains five milligrams and ten milliliters.')).length,0);
});

test('unknown exclusions and source strikes cannot create a suffix amount',()=>{
 const doc=makeDocument([unknown('Pay $1,234.56 or twenty dollars.')],'Current'),start=doc.text.indexOf(',');
 doc.excluded.push({start,end:start+1});
 assert.deepEqual(lcbUnknownMoneyReviewIssues(doc,refs).map(i=>i.matchText),['twenty dollars']);
 doc.excluded=doc.excluded.filter(r=>r.start!==start);const dollars=doc.text.indexOf('dollars');doc.struck=[{start:dollars+2,end:dollars+3}];
 assert.deepEqual(lcbUnknownMoneyReviewIssues(doc,refs).map(i=>i.matchText),['$1,234.56']);
 const words=makeDocument([unknown('Pay one hundred dollars.')],'Current'),one=words.text.indexOf('one');words.struck=[{start:one,end:one+3}];
 assert.equal(lcbUnknownMoneyReviewIssues(words,refs).length,0,'A masked leading count cannot leave an independent hundred-dollar review');
});

test('quotes, table cells, foreign currency and source compound boundaries are protected',()=>{
 for(const body of ['The terms “five dollars” and \'$5\' are quoted.','five dollars...........$5','Pay CAD $5 or AU $10.','The five-dollar-based limit applies.'])assert.equal(check(unknown(body)).length,0,body);
});

test('printed margins and identified interior heads retain the whole amount span',()=>{
 const doc=makeDocument([unknown('Pay ten'),'AB 192 — 2 —\nline 1 dollars.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 192 — 2 —');
 assert.ok(head);head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbUnknownMoneyReviewIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.ok(found[0].text.includes(head.text));
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(lcbUnknownMoneyReviewIssues(doc,refs).length,0);
});

test('recognized money-unit word divisions and original overlap selections survive page breaks',()=>{
 const doc=makeDocument([unknown('Pay five dol-'),'line 1 lars.'],'Current',[],[],new Set(['dollars']));
 const found=lcbUnknownMoneyReviewIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].matchText,'five dollars');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 assert.equal(lcbUnknownMoneyReviewIssues(doc,refs,{existingIssues:[{start:found[0].start,end:found[0].end}]}).length,0);
});

test('matching complete pairs and Budget Act financial contexts retain their dedicated existing checks',()=>{
 assert.equal(check(unknown('Pay ten dollars ($10), one cent ($0.01), and three million dollars ($3 million).')).length,0);
 const budget=makeDocument([unknown('This act shall be known and may be cited as the “Budget Act of 2026.” Pay $5 and five dollars ($6).')],'Current');
 assert.equal(lcbUnknownMoneyReviewIssues(budget,refs).length,0);
 assert.equal(monetaryPairIssues(budget,refs).length,1,'Budget amount disagreement must remain flagged by the existing precise check');
});

test('references to another Budget Act do not suppress unrelated operative monetary review',()=>{
 const doc=makeDocument([unknown('The department refers to the Budget Act of 2026. The fee is $5.')],'Current');
 assert.deepEqual(lcbUnknownMoneyReviewIssues(doc,refs).map(i=>i.matchText),['$5']);
 const quoted=makeDocument([unknown('The example “This act shall be known and may be cited as the Budget Act of 2026” appears here. The fee is $5.')],'Current');
 assert.deepEqual(lcbUnknownMoneyReviewIssues(quoted,refs).map(i=>i.matchText),['$5']);
 const struck=makeDocument([unknown('This act shall be known and may be cited as the “Budget Act of 2026.” The fee is $5.')],'Current'),term=struck.text.indexOf('known');
 struck.struck=[{start:term,end:term+5}];assert.deepEqual(lcbUnknownMoneyReviewIssues(struck,refs).map(i=>i.matchText),['$5']);
});

test('explicit Budget Act item amendment scope ends at the next section and retains pair disagreement checks',()=>{
 const text=unknown('Item 6100-001-0001 of Section 2.00 of the Budget Act of 2021, as amended by Section 122 of Chapter 240 of the Statutes of 2021, is amended to read:\n1. Pay $206,000 or five dollars ($6).\nSEC. 2. The fee is $5.'),doc=makeDocument([text],'Current');
 assert.deepEqual(lcbUnknownMoneyReviewIssues(doc,refs).map(i=>i.matchText),['$5']);
 assert.equal(monetaryPairIssues(doc,refs).length,1);
 const mentioned=unknown('The department refers to Item 6100-001-0001 of Section 2.00 of the Budget Act of 2021. The fee is $5.');
 assert.deepEqual(check(mentioned).map(i=>i.matchText),['$5']);
 const removed=makeDocument([text],'Current'),start=removed.text.indexOf('is amended');removed.struck=[{start,end:start+2}];
 assert.ok(lcbUnknownMoneyReviewIssues(removed,refs).some(i=>i.matchText==='$206,000'),'Removed directive evidence cannot manufacture a Budget Act item exemption');
});
