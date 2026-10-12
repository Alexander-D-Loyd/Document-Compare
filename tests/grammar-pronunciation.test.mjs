import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {grammarIssues} from '../app/grammar.mjs';
test('articles use explicit silent-h and consonant-sound exceptions',()=>{
 const doc=makeDocument(['A hour is enough. An university is open. An uniform is required. An union may respond. An user has access. A honest report is required. A heir may apply. A honorary title is granted.'],'Current');
 const issues=grammarIssues(doc);assert.equal(issues.length,8);assert.deepEqual(issues.map(i=>i.suggestion),['An hour','A university','A uniform','A union','A user','An honest','An heir','An honorary']);
 for(const i of issues)assert.ok(doc.text.slice(i.start,i.end));
});
test('un- words with a vowel sound are not swallowed by a universal uni- exception',()=>{
 const doc=makeDocument(['A uninsured person made a unimportant claim. A uninformed person filed a unimpressive report.'],'Current');
 assert.deepEqual(grammarIssues(doc).map(i=>i.suggestion),['An uninsured','an unimportant','An uninformed','an unimpressive']);
});
test('correct exception articles, uncertain pronunciations and acronyms remain unflagged',()=>{
 const doc=makeDocument(['An hour. An honest answer. An heir. A university. A unit. A unique rule. A union. A European agency. A once-in-a-lifetime review. An uninformed person. A herb. An herb. An habitual traffic offender. A habitual traffic offender. An ADS. A USB.'],'Current');assert.deepEqual(grammarIssues(doc),[]);
});
test('actual bill lettered references and divided-word fragments do not become article or repetition errors',()=>{
 const pages=['line 1 Section 1112 of Part A of Title I. Part A and Part B of Medicare.\nline 2 All Cal Grant A award recipients qualify.\nline 3 Fund-A Administrative Committee Fund.\nline 4 The warrant is is-\nline 5 sued by the Controller. An an-\nline 6 nuitant may apply. I m m u n i z a t i o n.','line 1 Appendix A of the federal guidance.'];
 assert.deepEqual(grammarIssues(makeDocument(pages,'Current')),[]);
 const real=grammarIssues(makeDocument(['An award is is made. An report is required.'],'Current'));
 assert.deepEqual(real.map(i=>i.suggestion),['is','A report']);
});
test('article suggestions keep capitalization and ignore divided fragments and crossed-out language',()=>{
 const source='AN uniform. an honest answer. A univer-\nline 2 sity. A hour.';
 const doc=makeDocument([source],'Current',[[{start:source.lastIndexOf('A hour'),end:source.length}]]);
 assert.deepEqual(grammarIssues(doc).map(i=>i.suggestion),['A uniform']);
});
