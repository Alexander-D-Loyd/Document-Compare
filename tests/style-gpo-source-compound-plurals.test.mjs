import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {COMPOUND_PLURAL_RULES,compoundPluralIssues,GPO_COMPOUND_PLURAL_SCOPE} from '../app/style-compound-plurals.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const examples=['comings-in','fillers-in','goings-on','hangers-on','listeners-in','lookers-on','markers-up','passers-by','swearers-in'];
const added=[['coming-ins','comings-in'],['going-ons','goings-on'],['swearer-ins','swearers-in']];
function check(d){const before=JSON.stringify(d),issues=compoundPluralIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd>=i.end);}return issues;}
test('all nine 5.6 plural forms are exact examples in the original GPO rule',()=>{
 const page=refs.gpo.pages[102],source=page.flowText||page.text,section=source.slice(source.indexOf('5.6.'),source.indexOf('5.7.'));
 assert.equal(page.page,103);assert.equal(String(page.printedPage),'89');
 const rows=COMPOUND_PLURAL_RULES.filter(r=>r.rule==='5.6');assert.equal(rows.length,9);assert.deepEqual(rows.map(r=>r.preferred).sort(),examples.toSorted());
 assert.match(GPO_COMPOUND_PLURAL_SCOPE,/nine exact printed GPO 5\.6/);assert.match(GPO_COMPOUND_PLURAL_SCOPE,/manual review/);
 for(const form of examples){assert.ok(section.includes(form),form);assert.equal(check(doc('The '+form+' are recorded.')).length,0,form);}
});
test('the three previously missing source examples correct only their controlled malformed plural',()=>{
 for(const [bad,good]of added){for(const [variant,expected]of [[bad,good],[bad[0].toUpperCase()+bad.slice(1),good[0].toUpperCase()+good.slice(1)]]){
  const d=doc('The '+variant+' are recorded.'),[i]=check(d);assert.ok(i,variant);assert.equal(i.text,variant);assert.equal(i.suggestion,expected);assert.equal(i.rule,'5.6');assert.equal(i.guideId,'gpo');assert.equal(i.guidePage,103);
  assert.equal(check(doc('The '+expected+' are recorded.')).length,0,expected);
  const integrated=jointStylisticIssues(d,refs).filter(i=>i.checkId==='compound-plurals');assert.equal(integrated.length,1);assert.equal(integrated[0].suggestion,expected);assert.ok(integrated[0].references.some(r=>r.guideId==='gpo'&&r.rule==='5.6'&&r.sourcePassage.text.includes(good)));
 }}
});
test('the finite source list does not generate a general movement of plural endings',()=>{
 for(const text of ['The joining-ins are recorded.','The stepping-ons are recorded.','The going-on remains recorded.','The higher-ups, go-betweens, run-ins and come-ons are recorded.'])assert.equal(check(doc(text)).length,0,text);
});
test('names quotation typography and ordinary accepted forms retain source fidelity',()=>{
 for(const [bad]of added)for(const text of ['The term “'+bad+'” is quoted.','The term "'+bad+'" is quoted.','The term ‘'+bad+'’ is quoted.','The '+bad[0].toUpperCase()+bad.slice(1)+' Council shall meet.','The '+bad.toUpperCase()+' are a label.','The Coming-Ins are a title.'])assert.equal(check(doc(text)).length,0,text);
 for(const text of ['The coming—ins are recorded.','The going–ons are recorded.','The coming-\nins are recorded.'])assert.equal(check(doc(text)).length,0,text);
});
test('every matched source character and unknown interior gap remains essential',()=>{
 for(const [bad]of added){const original=doc('The '+bad+' are recorded.'),start=original.text.indexOf(bad);assert.equal(check(original).length,1);
  for(const field of ['struck','excluded'])for(let at=start;at<start+bad.length;at++){const d=structuredClone(original);d[field].push({start:at,end:at+1});assert.equal(check(d).length,0,field+' '+bad+' '+at);}
 }
 for(const field of ['struck','excluded']){const d=doc('The coming unknown ins are recorded.'),start=d.text.indexOf('unknown');d[field].push({start,end:start+7});assert.equal(check(d).length,0,field);}
});
test('Unicode and technical endpoints survive negative original evidence masking',()=>{
 for(const [bad]of added)for(const [prefix,suffix]of [['é',''],['𐐀',''],['','é'],['','\u0301'],['pre-',''],['path/',''],['','.item'],['','_item'],['','/item']]){
  const d=doc('The '+prefix+bad+suffix+' are recorded.');assert.equal(check(d).length,0,prefix+bad+suffix);
  for(const field of ['struck','excluded']){const x=structuredClone(d),start=prefix?4:4+bad.length;x[field].push({start,end:start+(prefix||suffix).length});assert.equal(check(x).length,0,field+' '+prefix+bad+suffix);}
 }
});
test('literal name continuations and quote boundaries cannot be removed to expose a plural correction',()=>{
 for(const field of ['struck','excluded']){
  const named=doc('The Coming-ins Board shall act.'),title=named.text.indexOf('Board');named[field].push({start:title,end:title+5});assert.equal(check(named).length,0,field+' title');
  const quoted=doc('The term “coming-ins” is quoted.'),quote=quoted.text.indexOf('“');quoted[field].push({start:quote,end:quote+1});assert.equal(check(quoted).length,0,field+' quotation');
 }
});
test('headings tables and unknown cross-page bridges remain protected',()=>{
 const heading=doc('The coming-ins are named.\nLEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.\nThe people do enact as follows:');assert.equal(check(heading).length,0);
 const table=doc('The coming-ins are recorded.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(check(table).length,0);
 const bridge=makeDocument(['line 1 The coming','Unknown page content\nline 1 ins are recorded.'],'Current'),block=bridge.blocks.find(b=>b.text==='Unknown page content');block.ignored=true;bridge.excluded.push({start:block.start,end:block.end});assert.equal(check(bridge).length,0);
});
test('recognized physical page heads preserve exact original source and full highlight ranges',()=>{
 const d=makeDocument(['line 1 The coming','AB 999 — 2 —\nline 1 ins are recorded.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const [i]=check(d);assert.ok(i);assert.equal(i.suggestion,'comings-in');assert.match(i.text,/AB 999/);assert.match(i.text,/line 1 ins/);
});
test('plural-role witnesses need complete source while an independent intact count remains usable',()=>{
 const base=doc('The chief of staffs are appointed.'),verb=base.text.indexOf('are');assert.equal(check(base).length,1);
 for(const field of ['struck','excluded']){const d=structuredClone(base);d[field].push({start:verb,end:verb+3});assert.equal(check(d).length,0,field);}
 for(const field of ['struck','excluded']){const d=doc('Several chief of staffs are appointed.'),start=d.text.indexOf('are');d[field].push({start,end:start+3});const [i]=check(d);assert.ok(i);assert.equal(i.evidenceStart,0);assert.equal(i.suggestion,'chiefs of staff');}
 for(const field of ['struck','excluded'])for(const [text,damage]of [['The chief of staffs arex appointed.','x'],['pretwo chief of staffs acts.','pre']]){const d=doc(text),start=d.text.indexOf(damage);d[field].push({start,end:start+damage.length});assert.equal(check(d).length,0,field+' '+text);}
});
test('joint review respects bill-local quoted variants and independent LCB priority',()=>{
 const protectedDoc=doc('The term “coming-ins” is defined. The coming-ins are recorded.');assert.equal(jointStylisticIssues(protectedDoc,refs).filter(i=>i.checkId==='compound-plurals').length,0);
 const d=doc('The coming-ins are recorded. The healthcare is provided.'),issues=jointStylisticIssues(d,refs);assert.equal(issues.filter(i=>i.checkId==='compound-plurals').length,1);assert.ok(issues.some(i=>i.guideId==='lcb'&&i.suggestion==='health care'));assert.ok(issues.filter(i=>i.checkId==='compound-plurals').every(i=>i.guideId==='gpo'&&!i.conflict));
});
