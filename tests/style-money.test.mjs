import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {monetaryPairIssues,writtenMoneyNumber,moneyRangeBlocked} from '../app/style-money.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>monetaryPairIssues(makeDocument([text],'Current'),refs);
test('LCB monetary examples keep matching dollars, cents, mills and large amounts intact',()=>{
 const examples=['two mills ($0.002)','one cent ($0.01)','fifty cents ($0.50)','ten dollars ($10)','two thousand forty-five dollars ($2,045)','four hundred fifty-seven dollars and forty-two cents ($457.42)','three million dollars ($3,000,000)','two hundred billion dollars ($200,000,000,000)'];
 for(const example of examples)assert.equal(check('Pay '+example+'.').length,0,example);
 assert.equal(writtenMoneyNumber('four hundred fifty-seven'),457);assert.equal(writtenMoneyNumber('one two'),null);
});
test('disagreeing written and parenthetical amounts produce one whole-expression finding',()=>{
 const text='Pay four hundred fifty-seven dollars and forty-two cents ($457.24).';
 const found=check(text);assert.equal(found.length,1);assert.equal(found[0].suggestion,'four hundred fifty-seven dollars and forty-two cents ($457.42)');assert.match(found[0].message,/confirm which amount/i);
 const doc=makeDocument(['line 1 Pay ten dollars\nline 2 ($20).'],'Current');const issue=monetaryPairIssues(doc,refs)[0];assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(issue.suggestion,'ten dollars ($10)');
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(monetaryPairIssues(doc,refs).length,0);
});

test('hyphenated monetary modifiers compare the whole amount and digest pairs use figures alone',()=>{
 assert.equal(check('Use a two-hundred-dollar ($200) minimum.').length,0);
 assert.equal(check('Use a two-hundred-dollar ($250) minimum.')[0].suggestion,'two-hundred-dollar ($200)');
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nThis bill requires ten dollars ($10) and fifty cents ($0.50).\nThe people of the State of California do enact as follows:\nPay ten dollars ($10).';
 assert.deepEqual(check(digest).map(i=>i.suggestion),['$10','$0.50']);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThis bill requires $10.\nThe people of the State of California do enact as follows:\nPay ten dollars ($10).').length,0);
});

test('explicit singular monetary units compare complete units and figures without inventing an extra one',()=>{
 for(const good of ['each dollar ($1)','every cent ($0.01)','per mill ($0.001)'])assert.equal(check('Pay one dollar ($1) for '+good+' received.').length,0,good);
 for(const [bad,good] of [['each dollar ($2)','each dollar ($1)'],['every cent ($0.10)','every cent ($0.01)'],['per mill ($0.002)','per mill ($0.001)']]){
  const doc=makeDocument(['line 1 Pay one dollar ($1) for '+bad+' received.'],'Current'),found=monetaryPairIssues(doc,refs);
  assert.equal(found.length,1,bad);assert.equal(found[0].text,bad);assert.equal(doc.text.slice(found[0].start,found[0].end),bad);assert.equal(found[0].suggestion,good);assert.match(found[0].message,/confirm which amount/i);
 }
});

test('singular unit agreement preserves quoted, struck, unfamiliar and plural contexts',()=>{
 for(const text of ['Read “each dollar ($2)” as printed.','Read "every cent ($2)" as printed.','Pay per dollar unit ($2).','Pay for each dollar bill ($2).','Pay for every dollars ($2).','Pay per milligram ($2).'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['line 1 Pay for each dollar\nline 2 ($2).'],'Current'),found=monetaryPairIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].suggestion,'each dollar ($1)');
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(monetaryPairIssues(doc,refs).length,0);
});

test('reader-identified running heads cannot discard a complete cross-page monetary pair',()=>{
 for(const words of ['each dollar','ten dollars']){
  const doc=makeDocument(['line 1 Pay for '+words,'AB 121 — 2 —\nline 1 ($2) received.'],'Current');
  const head=doc.blocks.find(b=>b.text==='AB 121 — 2 —');assert.ok(head?.ignored);head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
  const [issue]=monetaryPairIssues(doc,refs);assert.ok(issue);assert.equal(issue.start,doc.text.indexOf(words));assert.equal(issue.end,doc.text.indexOf('($2)')+4);assert.equal(issue.suggestion,words+' ($'+(words==='each dollar'?'1':'10')+')');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
  assert.equal(moneyRangeBlocked(doc,issue.start,issue.end),false);assert.equal(moneyRangeBlocked(doc,head.start,issue.end),true);head.formatting={};assert.equal(monetaryPairIssues(doc,refs).length,0,'Unclassified ignored content is not silently bridged.');
 }
});

test('quoted ordinary monetary pairs remain literal copy while an outside mismatch stays reviewable',()=>{
 assert.equal(check('Read “ten dollars ($20)” as printed.').length,0);
 assert.equal(check('Read "ten dollars ($20)" as printed.').length,0);
 const issues=check('Read “ten dollars ($20)” as printed. Pay ten dollars ($20).');assert.equal(issues.length,1);assert.equal(issues[0].text,'ten dollars ($20)');assert.equal(issues[0].suggestion,'ten dollars ($10)');
});
