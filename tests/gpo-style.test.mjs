import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {stylisticIssues,searchGuide,findRuleReference,STYLE_RULES} from '../app/gpo-style.mjs';
const guide=JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url),'utf8'));
const check=text=>stylisticIssues(makeDocument([text],'Current'),guide);
test('style flags supported close variants with exact offsets and real GPO rule references',()=>{
 const text='The cancelled catalogue shows acknowledgement of twenty one requests. The wholly-owned subsidiary employs attorney generals.';
 const issues=check(text);assert.equal(issues.length,6);
 for(const issue of issues){assert.equal(text.slice(issue.start,issue.end),issue.text);assert.ok(issue.guidePage>0);assert.notEqual(issue.text.toLowerCase(),issue.suggestion.toLowerCase());assert.ok(findRuleReference(guide,issue.rule));}
 assert.deepEqual(issues.map(i=>i.suggestion),['canceled','catalog','acknowledgment','twenty-one','wholly owned','attorneys general']);
});
test('preferred wording is not flagged; no arbitrary fuzzy match of legitimate nearby words',()=>{
 assert.deepEqual(check('The canceled catalog shows acknowledgment of twenty-one requests. The wholly owned subsidiary employs attorneys general. The parties analyseD the evidence.' ).map(i=>i.suggestion),['analyzed']);
 assert.equal(check('advice adviser exercise realiseD statute statue center centers gray judgment right-of-way wholly owned family-owned property').length,1);
 assert.equal(check('The long-term loan funds a large-scale project. Vice president. United States. UNITED STATES.').length,0);
 assert.equal(check('Vice-President-elect.').length,0);
 assert.deepEqual(check('The attorneygeneral exercised selfcontrol.').map(i=>i.suggestion),['attorney general','self-control']);
 assert.deepEqual(check('A wholly‑owned subsidiary offers a long‑term loan.').map(i=>i.suggestion),['wholly owned']);
});
test('unit-modifier checks require matching noun context; proper-name case discrepancy is separate',()=>{
 assert.equal(check('The program will operate in the long term. The housing is low cost.').length,0);
 assert.deepEqual(check('A long term loan funds low cost housing in the united states.').map(i=>i.suggestion),['long-term','low-cost','United States']);
 assert.equal(check('An early-career worker joins a family-owned company.').length,0);
});
test('source strikeouts and margin labels are excluded, but a multiword variant may cross numbered lines',()=>{
 const doc=makeDocument(['line 1 A wholly-owned company.\nline 2 attorney\nline 3 generals perform duties.'],'Current');
 const a=doc.text.indexOf('wholly-owned');doc.struck=[{start:a,end:a+12}];
 const issues=stylisticIssues(doc,guide);assert.equal(issues.length,1);assert.equal(issues[0].text,'attorney generals');assert.equal(issues[0].suggestion,'attorneys general');
 assert.equal(doc.text.slice(issues[0].start,issues[0].end),'attorney\nline 3 generals');
});
test('guide search includes the complete manual, exact rule queries, phrases, and chapters',()=>{
 assert.equal(guide.pages.length,475);assert.ok(searchGuide(guide,'6.20').some(p=>p.page===116));
 assert.ok(searchGuide(guide,'"wholly owned"').some(p=>p.page===116));
 assert.ok(searchGuide(guide,'Datelines').some(p=>p.chapter==='Datelines, Addresses, and Signatures'));
 assert.ok(searchGuide(guide,'currency').length>0);assert.ok(searchGuide(guide,'').length>=20);
 assert.equal(searchGuide(guide,'zzzzzzzznoresults').length,0);
 for(const rule of STYLE_RULES)assert.ok(findRuleReference(guide,rule.rule),rule.rule);
});
