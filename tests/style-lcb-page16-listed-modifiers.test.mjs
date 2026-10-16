import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbPage16ListedModifierIssues,restorePage16ModifierEvidence,LCB_PAGE16_LISTED_MODIFIER_SCOPE} from '../app/style-lcb-page16-listed-modifiers.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),forms=['state-adopted','board-approved','state-approved','community-based','school-based','child-related','work-related'];
const make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current'),check=doc=>lcbPage16ListedModifierIssues(doc,refs);
test('seven printed source forms cover the selected textbook and instructional-materials role gap',()=>{
 for(const form of forms)for(const head of ['textbook','textbooks','instructional materials']){const open=form.replace('-',' '),doc=make('The '+open+' '+head+' is required.'),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,form+' '+head);const i=issues[0];assert.equal(i.text,open);assert.equal(i.suggestion,form);assert.equal(i.guidePage,16);assert.equal(i.page16ModifierEvidence.head.text,head);assert.equal(doc.text.slice(i.start,i.end),open);assert.equal(refs.lcb.pages[15].text.slice(i.references[0].sourcePassage.start,i.references[0].sourcePassage.end),form);assert.equal(JSON.stringify(doc),before);assert.equal(check(make('The '+form+' '+head+' is required.')).length,0);}
 assert.match(LCB_PAGE16_LISTED_MODIFIER_SCOPE,/No unlisted root/);
});
test('independent nominal cues are required and finite adopted/approved clauses remain untouched',()=>{
 for(const body of ['The state adopted textbooks.','The state approved textbooks.','The board approved textbooks.','The state adopted instructional materials.','The agency adopted textbook is required.','The region based textbook is required.','The state adopted curriculum is required.'])assert.equal(check(make(body)).length,0,body);
 for(const body of ['The agency uses a state adopted textbook.','The textbook is a state adopted textbook.','The provision concerns a state adopted textbook.','The agency works with state adopted textbooks.'])assert.equal(check(make(body)).length,1,body);
});
test('every original modifier noun role and connecting character must remain intact',()=>{
 for(const phrase of ['state adopted textbook is','uses a state adopted textbook']){const doc=make(phrase.startsWith('uses')?'The agency '+phrase+'.':'The '+phrase+' required.'),start=doc.text.indexOf(phrase),end=start+phrase.length;assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+phrase+' '+at);}}
});
test('quoted wording original damaged enclosures and bill-local quoted aliases remain protected',()=>{
 for(const [open,close] of [['“','”'],['"','"'],["'","'"]]){const doc=make('The instruction states '+open+'The state adopted textbook is required.'+close);assert.equal(check(doc).length,0);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+open);}}
 assert.equal(check(make('“state adopted” means the stated form. The state adopted textbook is required.')).length,0);assert.equal(check(make('The state adopted textbook is required.')).length,1);
});
test('titles tables headings identifiers Unicode fragments and source dashes cannot invent roles',()=>{
 for(const body of ['The State Adopted Textbook Act applies.','The state adopted textbook Act applies.','The state adopted textbook/key is required.','The state adopted textbook’s role is required.','The state adopted textbook.2 is required.','The state adopted textbookα is required.','The state adopted textbook\u0301 is required.','The state adoptedα textbook is required.','The agency 𐐀uses a state adopted textbook.','The state—adopted textbook is required.','The state–adopted textbook is required.','Use Model state adopted textbook is required.'])assert.equal(check(make(body)).length,0,body);
 for(const field of ['struck','excluded']){const doc=make('The state adopted textbook Act applies.'),at=doc.text.indexOf('Act');doc[field].push({start:at,end:at+3});assert.equal(check(doc).length,0,field);}
 const table=make('The state adopted textbook is required.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.equal(check(table).length,0);
 const heading=makeDocument(['The state adopted textbook is required.\nThe people do enact as follows:\nThe program applies.'],'Current');assert.equal(check(heading).length,0);
});
test('existing owners are retained and physical page margins restore exact evidence',()=>{
 const doc=make('The state adopted textbook is required.'),i=check(doc)[0];assert.equal(lcbPage16ListedModifierIssues(doc,refs,{existingIssues:[{start:i.start,end:i.end}]}).length,0);
 const paged=makeDocument(['line 1 The people do enact as follows:\nline 2 The state','line 1 adopted textbook is required.'],'Current'),before=JSON.stringify(paged),issue=check(paged)[0];assert.ok(issue);assert.match(issue.text,/state\nline 1 adopted/u);const e=restorePage16ModifierEvidence(issue.page16ModifierEvidence,n=>n,paged.text);assert.equal(e.sourceText,paged.text.slice(e.start,e.end));assert.equal(e.modifier.text,paged.text.slice(issue.start,issue.end));assert.equal(e.head.text,'textbook');assert.equal(JSON.stringify(paged),before);
});
