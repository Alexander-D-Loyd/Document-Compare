import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {lcbSpellingIssues} from '../app/style-lcb-spellings.mjs';import {contextualNameIssues} from '../app/style-lcb-contextual-names.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const cases=[['The diplomatic attaches are eligible.','attaches','attachés',3],['The provider shall inure the cremated remains.','inure','inurn',4],['The judicial preceding is pending.','preceding','proceeding',5],['The rule applies in both directions and vice-versa.','vice-versa','vice versa',14],['The rule applies in both directions and viceversa.','viceversa','vice versa',14],['The organization operates for-profit.','for-profit','for profit',10],['The activity is conducted for-profit under this section.','for-profit','for profit',10]];
test('remaining LCB usage forms require explicit domain or grammar evidence',()=>{
 for(const [bad,term,suggestion,page] of cases){const doc=makeDocument([bad],'Current'),i=wordChoiceIssues(doc,refs)[0];assert.equal(i.suggestion,suggestion,bad);assert.equal(doc.text.slice(i.start,i.end),term);assert.equal(wordChoiceIssues(makeDocument([bad.replace(term,suggestion)],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(x=>x.suggestion===suggestion),bad);assert.ok(refs.lcb.pages[page-1].text.includes(suggestion),suggestion);}
});
test('ordinary verbs, preceding modifiers, accrued benefits and literal phrases are protected',()=>{
 for(const bad of ['The applicant attaches a form.','The preceding hearing is continued.','The preceding court order is valid.','The trust shall inure to the benefit of the applicant.','The for-profit organization operates.','The operation is for-profit under the label.','The Vice-Versa Association is named.','The term “diplomatic attaches are” is literal.','The term "inure the cremated remains" is literal.','The term “and viceversa” is literal.'])assert.equal(wordChoiceIssues(makeDocument([bad],'Current'),refs).length,0,bad);
 for(const [bad] of cases){const doc=makeDocument([bad],'Current'),i=wordChoiceIssues(doc,refs)[0];doc.struck=[{start:i.start,end:i.end}];assert.equal(wordChoiceIssues(doc,refs).length,0,bad);}
});
test('papier mache listed spelling agrees with GPO and protects quoted foreign language',()=>{
 assert.ok(refs.gpo.pages[101].text.includes('papier mache'));
 for(const bad of ['papier-mache','papier-mâché','papier mâché']){const text='The '+bad+' model is displayed.',doc=makeDocument([text],'Current'),i=lcbSpellingIssues(doc,refs)[0];assert.equal(i.suggestion,'papier mache');assert.equal(doc.text.slice(i.start,i.end),bad);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='papier mache'));}
 for(const text of ['The papier mache model is displayed.','The term “papier mâché” is literal.','The Papier Mâché Institute is named.'])assert.equal(lcbSpellingIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('Cosumnes capitalization requires the guide’s explicit River or College name head',()=>{
 for(const head of ['River','College']){const text='The cosumnes '+head+' is named.',i=contextualNameIssues(makeDocument([text],'Current'),refs)[0];assert.equal(i.suggestion,'Cosumnes');assert.equal(text.slice(i.start,i.end),'cosumnes');assert.equal(contextualNameIssues(makeDocument([text.replace('cosumnes','Cosumnes')],'Current'),refs).length,0);}
 for(const text of ['The cosumnes software is used.','The term “cosumnes River” is literal.','The Cosumnes River Association is named.'])assert.equal(contextualNameIssues(makeDocument([text],'Current'),refs).length,0,text);
 const rows=styleRuleInventory(refs);assert.equal(rows.find(r=>r.id==='lcb-entry-3-cosumnes-river-or-college').status,'Partially automated');
});
