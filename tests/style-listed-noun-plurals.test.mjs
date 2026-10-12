import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {listedNounIssues,LISTED_NOUN_RULES} from '../app/style-listed-nouns.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const selected=LISTED_NOUN_RULES.filter(r=>r.selectedPlural),raw=t=>listedNounIssues(makeDocument([t],'Current'),refs),joint=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('all twelve selected regular plurals preserve exact source-form references in nominal subjects and objects',()=>{
 assert.equal(selected.length,12);for(const r of selected){assert.ok(refs.lcb.pages[r.page-1].text.includes(r.sourceForm),r.sourceForm);}for(const r of selected)for(const role of ['The TERM are available.','Review the TERM.','The TERM program applies.']){
  const text=role.replace('TERM',r.variant),found=joint(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[r.variant,r.preferred]],text);assert.equal(found[0].guidePage,r.page);assert.match(found[0].message,new RegExp('lists “'+r.sourceForm+'”'));assert.equal(text.slice(found[0].start,found[0].end),r.variant);assert.equal(joint(role.replace('TERM',r.preferred)).length,0,r.preferred);
 }
});
test('selected plural nominal subjects require complete role evidence rather than a plural suffix alone',()=>{
 for(const text of ['The text books appointments.','The time frames changes.','The case workers unfamiliar continuation.','The home owners suddenly changed.','Workers home owners continue.'])assert.equal(raw(text).length,0,text);
 for(const text of ['Review the text books.','The time frames are specified.','The case workers shall act.'])assert.equal(raw(text).length,1,text);
});
test('explicit counts and plural quantifiers supply a noun cue while independent numeral checks remain visible',()=>{
 for(const cue of ['two','three','several','many','both'])assert.deepEqual(raw('Appoint '+cue+' case workers.').map(i=>i.suggestion),['caseworkers'],cue);
 const text='Appoint 3 case workers.',found=joint(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three'],['case workers','caseworkers']]);
});
test('complete and partially hyphenated plural variants retain one whole correction',()=>{
 for(const r of selected){const variant=r.variant.replaceAll(' ','-'),found=joint('Review the '+variant+'.');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[variant,r.preferred]],variant);}
});
test('quoted, all-cap and complete title forms remain literal',()=>{
 for(const r of selected)for(const text of ['Review the “'+r.variant+'”.','Review the '+r.variant.toUpperCase()+'.','The '+r.variant.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')+' Association applies.'])assert.equal(raw(text).length,0,text);
});
test('source strikeouts and headings cannot create plural compound suggestions',()=>{
 const text='Review the home owners.',doc=makeDocument([text],'Current');doc.struck=[{start:11,end:22}];assert.equal(listedNounIssues(doc,refs).length,0);
 assert.equal(raw('The home owners are available.\nThe people do enact as follows:').length,0);
});
test('a genuine end-of-line hyphen remains a source division rather than an erroneous compound form',()=>{
 for(const r of selected.filter(r=>r.variant.includes(' '))){const variant=r.variant.replace(' ','-\nline 2 ');assert.equal(raw('Review the '+variant+'.').length,0,variant);}
});
test('a complete plural noun split across pages keeps its full selection while ignoring margin and page labels',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Review the home\n97','AB 121 — 2 —\nline 1 owners.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'homeowners');assert.equal(found[0].start,doc.text.indexOf('home'));assert.equal(found[0].end,doc.text.indexOf('owners')+6);
});

test('selected bare plural subjects require an explicit finite predicate at a complete clause opening',()=>{
 for(const r of selected)for(const verb of ['are available','shall act','receive support']){
  const variant=r.variant[0].toUpperCase()+r.variant.slice(1),preferred=r.preferred[0].toUpperCase()+r.preferred.slice(1),bad=variant+' '+verb+'.',good=preferred+' '+verb+'.';
  assert.deepEqual(joint(bad).map(i=>[i.text,i.suggestion]),[[variant,preferred]],bad);assert.equal(joint(good).length,0,good);
 }
});

test('explicit clause punctuation and lettered paragraphs supply selected bare-subject boundaries',()=>{
 for(const prefix of ['(a) ','The report applies; ','The following applies: '])assert.deepEqual(raw(prefix+'home owners shall act.').map(i=>i.suggestion),['homeowners'],prefix);
 for(const text of ['Workers home owners are available.','Consider home owners are available.','The term home owners are available.','Home owners suddenly changed.','Text books appointments.','Time frames changes.'])assert.equal(raw(text).length,0,text);
});

test('bare subject role evidence preserves quoted titles, all-cap headings and source strikeouts',()=>{
 for(const text of ['“Home owners are available.”','HOME OWNERS ARE AVAILABLE.','Home Owners are available.','The Home Owners Association shall act.'])assert.equal(raw(text).length,0,text);
 const doc=makeDocument(['Home owners are available.'],'Current');doc.struck=[{start:0,end:11}];assert.equal(listedNounIssues(doc,refs).length,0);
 assert.equal(raw('Home owners are available.\nThe people do enact as follows:').length,0);
});

test('a bare selected plural subject across pages preserves complete offsets and source labels',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Home\n97','AB 121 — 2 —\nline 1 owners shall act.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['Homeowners']);assert.equal(found[0].start,doc.text.indexOf('Home'));assert.equal(found[0].end,doc.text.indexOf('owners')+6);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});

test('AB 121 counted schoolday units retain their nominal role before a following coordinated action',()=>{
 for(const variant of ['school days','school-days']){
  const text='Charter schools operate a minimum of 175 '+variant+' and report at least 75 percent of attendance.',found=joint(text);
  assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[variant,'schooldays']]);assert.equal(text.slice(found[0].start,found[0].end),variant);assert.equal(found[0].guidePage,13);assert.match(found[0].message,/lists “schoolday”/);
 }
 assert.equal(joint('Charter schools operate a minimum of 175 schooldays and report at least 75 percent of attendance.').length,0);
});

test('schoolday spelling preserves the duration numeral conflict and ordinary day expressions',()=>{
 const found=joint('Operate 3 school days and report attendance.');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['school days','schooldays']]);
 assert.deepEqual(raw('Operate three school days and report attendance.').map(i=>i.suggestion),['schooldays']);
 for(const text of ['Operate 3 schooldays and report attendance.','Operate three schooldays and report attendance.','Operate 3, 4, or 5 schooldays.']){assert.equal(joint(text).length,0,text);const issues=numeralIssues(makeDocument([text],'Current'),refs);assert.ok(issues.length);assert.ok(issues.every(i=>i.conflict),'Both numeral forms retain their existing LCB/GPO duration disagreement.');}
 assert.equal(raw('Operate 175 calendar days and report attendance.').length,0);
 assert.equal(raw('A school days unfamiliar continuation.').length,0,'No quantity or complete nominal boundary supplies the role.');
});

test('counted schoolday units preserve exact cross-page ranges and source-division/name protections',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Operate 175 school\n97','AB 121 — 2 —\nline 1 days and report attendance.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['schooldays']);assert.equal(found[0].start,doc.text.indexOf('school'));assert.equal(found[0].end,doc.text.indexOf('days')+4);
 for(const text of ['Operate 175 “school days” and report attendance.','The School Days Association operates.','Operate 175 school-\nline 2 days and report attendance.'])assert.equal(raw(text).length,0,text);
 const struck=makeDocument(['Operate 175 school days and report attendance.'],'Current');struck.struck=[{start:12,end:23}];assert.equal(listedNounIssues(struck,refs).length,0);
});

test('AB 109 timeline plurals and selected shared prepositional noun coordinations retain source spelling',()=>{
 const text='Provide an overview of planned activities and time lines for the upcoming quarter.',found=joint(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['time lines','timelines']]);assert.equal(found[0].guidePage,13);assert.match(found[0].message,/lists “timeline”/);assert.equal(joint(text.replace('time lines','timelines')).length,0);
 for(const r of selected)for(const lead of ['An overview of planned activities and ','Review records of reports or ','Act with the records and ']){const found=raw(lead+r.variant+' for the project.');assert.deepEqual(found.map(i=>i.suggestion),[r.preferred],lead+r.variant);assert.equal(raw(lead+r.preferred+' for the project.').length,0);}
 assert.equal(raw('The time lines are specified.')[0].suggestion,'timelines');assert.equal(raw('Time lines shall apply.')[0].suggestion,'Timelines');
});

test('coordinated plural checks require a shared preposition and a known noun with complete continuation',()=>{
 for(const t of ['Activities and time lines for the project.','The agency plans and time lines for the project.','An overview of unknown items and time lines for the project.','An overview of activities and time lines unfamiliar words.','An overview of activities and text books appointments.','The term “activities and time lines” is literal.','An overview of planned activities and Time Lines for Projects is required.','An overview of planned activities and time-\nline 2 lines for the project.'])assert.equal(raw(t).length,0,t);
});

test('listed noun ranges reject unclassified ignored bridges while recognized running heads retain whole selections',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 An overview of planned activities and time\n97','AB 121 — 2 —\nline 1 lines for the project.'],'Current');assert.equal(listedNounIssues(doc,refs).length,0);for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=listedNounIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('time'));assert.equal(found[0].end,doc.text.indexOf('lines')+5);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].suggestion,'timelines');doc.struck=[{start:found[0].start,end:found[0].start+1}];assert.equal(listedNounIssues(doc,refs).length,0);
});
