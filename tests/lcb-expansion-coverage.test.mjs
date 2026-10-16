import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {styleRuleInventory,searchRuleInventory} from '../app/style-rule-inventory.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument([text],'Current');
test('new explicit checks retain actual LCB source offsets and distinct limited scopes',()=>{
 const rows=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-explicit-'));assert.equal(rows.length,43);
 for(const row of rows){const source=refs.lcb.pages.find(p=>p.page===row.page).text;assert.equal(source.slice(row.sourceStart,row.sourceEnd),row.text);assert.equal(row.status,'Partially automated');const method=CHECK_COVERAGE.find(r=>r.id===row.id);assert.equal(method.text,row.scope);assert.equal(method.page,row.page);}
 const agreement=searchRuleInventory(refs,'data sharing agreement').find(r=>r.id==='lcb-explicit-data-sharing-agreement');assert.ok(agreement);assert.match(agreement.scope,/not a phrase claimed to be printed/);assert.match(agreement.text,/Generally/);
 assert.match(rows.find(r=>r.id==='lcb-explicit-inclusive-range').scope,/No inclusive intent/);
 const bifurcation=rows.find(r=>r.id==='lcb-explicit-listed-bifurcation');assert.equal(bifurcation.text,'bifurcation');assert.equal(bifurcation.page,3);assert.match(bifurcation.scope,/noun/i);
});
test('public coverage states LCB priority and separates bounded agreement checks from disabled parser guesses',()=>{
 const priority=CHECK_COVERAGE.find(r=>r.title==='Conflicting guide rules');assert.equal(priority.status,'LCB takes priority');assert.match(priority.text,/Compliant LCB wording stays quiet/);assert.doesNotMatch(priority.text,/regardless of which guide/);
 const parser=CHECK_COVERAGE.find(r=>r.title==='Offline language engines');assert.match(parser.text,/75 exact printed/);assert.match(parser.text,/separate application check/i);assert.match(parser.text,/Generic data-sharing parser candidates/);
});

test('coverage describes the explicit Opinion choice and one selected local entity authority without certifying complete authority',()=>{
 const rows=styleRuleInventory(refs),opinion=rows.find(r=>r.id==='lcb-21-opinions-and-cover-letters-source'),entity=rows.find(r=>r.id==='lcb-17-7');
 assert.equal(opinion.status,'Partially automated');assert.match(opinion.scope,/explicit/i);assert.match(opinion.scope,/money/i);assert.doesNotMatch(opinion.scope,/does not classify/);
 assert.match(entity.scope,/one authorized local export/);assert.match(entity.scope,/not silently merged/);assert.match(entity.scope,/quoted-term exceptions remain local/);assert.match(entity.scope,/do not certify freshness/);assert.match(entity.scope,/Absence from the selected list is not an error/);
});
test('listed open-noun aliases retain single production ownership exact source citations and modifier exceptions',()=>{
 for(const [bad,good,page] of [['The bill-room is required.','bill room',9],['The floor-plan is required.','floor plan',10],['A home-buyer is eligible.','home buyer',11],['A motor-home is a vehicle.','motor home',12],['The school-year begins in August.','school year',13]]){
  const text='The people do enact as follows:\nline 1 '+bad,doc=make(text);const issues=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-listed-open-noun-aliases');assert.equal(issues.length,1,bad);const i=issues[0];assert.equal(i.suggestion,good);assert.equal(text.slice(i.start,i.end),good.replace(' ','-'));assert.equal(i.openNounAliasEvidence.sourceText,text.slice(i.evidenceStart,i.evidenceEnd));assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===page&&r.sourcePassage?.text===good));assert.equal(doc.text,text);
  const accepted=make(text.replace(good.replace(' ','-'),good));assert.equal(jointStylisticIssues(accepted,refs).filter(i=>i.checkId==='lcb-listed-open-noun-aliases').length,0);
 }
 for(const body of ['The school-year calendar applies.','The floor-plan review applies.','The instruction shall insert “The bill-room is required.”'])assert.equal(jointStylisticIssues(make(body),refs).filter(i=>i.checkId==='lcb-listed-open-noun-aliases').length,0,body);
});
