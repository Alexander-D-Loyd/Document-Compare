import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';import {searchCoverage} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('percent representation depends on digest/bill context; time possessives and plural decades are targeted',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.\nThe people do enact as follows:\nThe rate is 5%. Provide 30 days notice. The 1990’s were different.';
 const doc=makeDocument([text],'Current'),found=contextualPunctuationIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['1990s','30 days’ notice','5%','5 percent']);assert.ok(found.every(i=>doc.text.slice(i.start,i.end)===i.text));
 assert.equal(contextualPunctuationIssues(makeDocument(['The 1990’s culture changed. Give one week’s notice. The rate is 5 percent.'],'Current'),refs).length,0);
 doc.struck=[{start:text.indexOf('5%'),end:text.indexOf('5%')+2}];assert.equal(contextualPunctuationIssues(doc,refs).some(i=>i.suggestion==='5 percent'),false);
});
test('coverage searches include contextual rules and explicit manual-review limitations',()=>{assert.equal(searchCoverage('identifiers')[0].page,22);assert.ok(searchCoverage('meaning').some(i=>i.status==='Manual review required'));assert.ok(searchCoverage('dollar').some(i=>/still require manual review/.test(i.text)));});
test('quoted commas and periods, complete dates and listed possessives follow LCB examples',()=>{
 const text='The term “provider”, means an entity. The word is "covered". On January 1, 2027 the rule applies. In April, 2001 it changed. Workers compensation and a drivers license apply.';
 const found=contextualPunctuationIssues(makeDocument([text],'Current'),refs);
 assert.deepEqual(found.map(i=>i.suggestion),[',”','."','January 1, 2027,','April 2001','Workers’ compensation','driver’s license']);
 assert.equal(contextualPunctuationIssues(makeDocument(['The term “provider,” applies on January 1, 2027, and in April 2001. Workers’ compensation applies. The board measures 6".'],'Current'),refs).length,0);
});
test('simple serial lists are distinguished from two-item and clause sequences',()=>{
 assert.deepEqual(contextualPunctuationIssues(makeDocument(['The list includes apples, pears and bananas. It comprises books and papers. If applicable, review and approve the plan.'],'Current'),refs).map(i=>i.suggestion),['includes apples, pears, and bananas']);
});
test('official fund and appropriation program names are not renamed as ordinary possessive phrases',()=>{
 const doc=makeDocument(['The Contractors License Fund pays the board.\nline 1 (5) 1426045-Distributed DCA Workers\nline 2 Compensation.'],'Current');
 assert.equal(contextualPunctuationIssues(doc,refs).length,0);
});
test('tabulated budget percentages retain symbols while prose uses bill formatting',()=>{
 const doc=makeDocument(['Budget Act of 2026\nline 1 Contribution........................... 31.30%\nline 2 31.60%\nline 3 The rate is 5%.'],'Current');
 assert.deepEqual(contextualPunctuationIssues(doc,refs).map(i=>i.suggestion),['5 percent']);
});
test('time possessives and malformed possessive pronouns retain correct guide attribution',()=>{
 const doc=makeDocument(['Provide two weeks pay and three years experience. The property is your’s and its’ use is limited.'],'Current');
 const found=contextualPunctuationIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['two weeks’ pay','three years’ experience','yours','its']);
 assert.equal(found[2].references[0].guideId,'gpo');assert.equal(found[2].references[0].rule,'8.8');assert.equal(found[2].guidePage,208);
 assert.equal(contextualPunctuationIssues(makeDocument(['Provide two weeks’ pay and three years’ experience. The property is yours and its use is limited.'],'Current'),refs).length,0);
});

test('fixed parenthetic LCB phrases and existing-law introductions preserve literal quotations',()=>{
 const text='Under existing law the board acts. The list includes, but is not limited to apples. It covers persons including but not limited to providers. The phrase “including but not limited to” is quoted.';
 const found=contextualPunctuationIssues(makeDocument([text],'Current'),refs);
 assert.deepEqual(found.map(i=>i.suggestion),['including, but not limited to,','includes, but is not limited to,','Under existing law,']);
 assert.equal(contextualPunctuationIssues(makeDocument(['Under existing law, the board acts. The list includes, but is not limited to, apples. Persons including, but not limited to, providers qualify.'],'Current'),refs).length,0);
});
test('indefinite pronoun possessives require a possessed noun rather than an object pronoun',()=>{
 const doc=makeDocument(['Protect someone privacy and each other rights. Consider everyones consent. Help someone and contact everybody. Someone’s property and each other’s books are protected.'],'Current');
 const found=contextualPunctuationIssues(doc,refs);
 assert.deepEqual(found.map(i=>i.suggestion),['someone’s privacy','each other’s rights','everyone’s consent']);
 assert.ok(found.every(i=>i.rule==='8.9'&&doc.text.slice(i.start,i.end)===i.text));
 assert.equal(contextualPunctuationIssues(makeDocument(['The term “someone privacy” is quoted.'],'Current'),refs).length,0);
});
test('initialism plural apostrophes are distinguished from possessive and literal forms',()=>{
 const doc=makeDocument(["The NGO’s are eligible. PDFs are available. The NGO’s budget applies. The term “NGO’s are” is quoted. The ATMs remain open."],'Current');
 assert.deepEqual(contextualPunctuationIssues(doc,refs).map(i=>i.suggestion),['NGOs']);
});
test('from/between full-year ranges require their corresponding conjunction',()=>{
 const doc=makeDocument(['The program ran from 2001–2004 and between 2010—2012. The years 2001–2004 are listed. See Sections 2001–2004. The phrase “from 2001–2004” is quoted.'],'Current');
 const found=contextualPunctuationIssues(doc,refs);
 assert.deepEqual(found.map(i=>[i.suggestion,i.rule]),[['from 2001 to 2004','8.78'],['between 2010 and 2012','8.79']]);
 assert.equal(contextualPunctuationIssues(makeDocument(['The program ran from 2001 to 2004 and between 2010 and 2012.'],'Current'),refs).length,0);
 doc.struck=[{start:doc.text.indexOf('from'),end:doc.text.indexOf('and')}];
 assert.equal(contextualPunctuationIssues(doc,refs).some(i=>i.rule==='8.78'),false);
});

test('possessive noun cues do not rewrite interrogative pronouns before ambiguous verbs',()=>{
 assert.equal(contextualPunctuationIssues(makeDocument(['Can anyone account for the cost? Does someone consent to this?'],'Current'),refs).length,0);
});
test('amendment quotation punctuation conflicts are ignored and redundant outside periods checked',()=>{
 const found=contextualPunctuationIssues(makeDocument(['Insert the words “eligible provider”, after the phrase. Strike out the word “eligible”. She said “It applies.”.'],'Current'),refs);
 assert.deepEqual(found.map(i=>[i.suggestion,i.rule]),[['.”','8.120']]);
 assert.equal(contextualPunctuationIssues(makeDocument(['She said “It applies.” The extract ends “waiting...”. The board measures 6".'],'Current'),refs).length,0);
});

test('mechanic liens follow the listed singular possessive without rewriting literal wording',()=>{
 assert.deepEqual(contextualPunctuationIssues(makeDocument(['The mechanics liens apply. The phrase “mechanics liens” is quoted.'],'Current'),refs).map(i=>i.suggestion),['mechanic’s liens']);
 assert.equal(contextualPunctuationIssues(makeDocument(['The mechanic’s liens apply.'],'Current'),refs).length,0);
});
