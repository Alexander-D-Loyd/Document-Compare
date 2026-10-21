import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {measurementIssues} from '../app/style-measures.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {GPO_ENGLISH_ABBREVIATIONS,englishUnitAbbreviationIssues} from '../app/style-english-abbreviations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),check=d=>englishUnitAbbreviationIssues(typeof d==='string'?doc(d):d,refs),selected=d=>measurementIssues(d,refs).filter(i=>i.rule==='9.58');
test('finite source table records every bare English/time symbol and its actual table page',()=>{
 assert.equal(GPO_ENGLISH_ABBREVIATIONS.length,23);assert.equal(new Set(GPO_ENGLISH_ABBREVIATIONS.map(r=>r.symbol)).size,23);assert.ok(Object.isFrozen(GPO_ENGLISH_ABBREVIATIONS)&&GPO_ENGLISH_ABBREVIATIONS.every(Object.isFrozen));
 assert.deepEqual(GPO_ENGLISH_ABBREVIATIONS.filter(r=>!r.checkPlural).map(r=>r.symbol),['d','h']);
 assert.match(refs.gpo.pages[249].text,/T tera/u);assert.match(refs.gpo.pages[249].text,/h hecto/u);assert.match(refs.gpo.pages[249].text,/d deci/u);
 for(const r of GPO_ENGLISH_ABBREVIATIONS)assert.ok(refs.gpo.pages[r.page-1].text.replace(/\s+/gu,' ').includes(r.symbol+' '+r.name),r.symbol);
 assert.match(refs.gpo.pages[251].text,/gill \(not abbreviated\)/u);assert.match(refs.gpo.pages[251].text,/ton\(s\) \(not abbreviated\)/u);
});
test('all 21 unambiguous appended-s variants receive exact table-backed source comparisons',()=>{
 for(const r of GPO_ENGLISH_ABBREVIATIONS.filter(r=>r.checkPlural)){
  const d=doc('Use 25 '+r.pluralVariant+'.'),before=JSON.stringify(d);for(const run of [check,selected]){const found=run(d);assert.equal(found.length,1,r.symbol);const [i]=found;assert.equal(i.suggestion,'25 '+r.symbol);assert.equal(i.rule,'9.58');assert.equal(i.guidePage,r.page);assert.equal(i.englishUnitEvidence.symbol,r.symbol);assert.ok(i.references.some(c=>c.guidePage===251&&c.rule==='9.58'));if(r.page===252)assert.ok(i.references.some(c=>c.guidePage===252));assert.equal(d.text.slice(i.start,i.end),i.text);}assert.equal(JSON.stringify(d),before);
 }
});
test('all accepted singular/plural symbols retain source spelling and ambiguous seconds stay protected',()=>{
 for(const r of GPO_ENGLISH_ABBREVIATIONS)for(const n of ['1','25'])assert.deepEqual(check('Use '+n+' '+r.symbol+'.'),[],r.symbol+' '+n);
 for(const text of ['Use 25 gill and 25 gills.','Use 1 ton and 25 tons.','Use 25 ds, 25 hs and 25 Ts.','Use 25 ms, 25 ns and 25 ps.','Use 25 ft3 and 25 in².','Use 25 in³s and 25 ft3s.','Use 25 t and 25 s.'])assert.deepEqual(check(text),[],text);
});
test('figures and existing zero-space/unit separation are preserved without number conversion',()=>{
 for(const [text,wanted]of [['Use 9007199254740993 bbls.','9007199254740993 bbl'],['Use 12,345.0001 qts.','12,345.0001 qt'],['Use 0030lbs.','0030lb'],['Use 25.00 pts.','25.00 pt']]){const d=doc(text),before=JSON.stringify(d),[i]=check(d);assert.ok(i,text);assert.equal(i.suggestion,wanted);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);}
 for(const text of ['Use 1.2.3 lbs.','Use 1,23 lbs.','Use 1e3 lbs.','Use 3/4 lbs.','Use -3 lbs.'])assert.deepEqual(check(text),[],text);
});
test('positive exponents and removed scientific separators cannot expose a shorter quantity suffix',()=>{
 for(const text of ['Use 1e+3 gals.','Use 1.2e+3 gals.','Use 1E+03 gals.','Use 1e + 3 gals.','Use 1e−3 gals.','Use 1e-3 gals.','Use +3 gals.','Use + 3 gals.']){
  const d=doc(text);assert.deepEqual(check(d),[],text);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='9.58').length,0,text);
 }
 const original=doc('Use 1.2e+3 gals.'),at=original.text.indexOf('e');
 for(const property of ['struck','excluded'])for(const [start,end]of [[at,at+1],[at+1,at+2],[at,at+2]]){const d=structuredClone(original);d[property].push({start,end});assert.deepEqual(check(d),[],property+' '+start);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='9.58').length,0,property+' '+start);}
});
test('power fraction and broken numerical punctuation contexts do not expose a partial quantity suffix',()=>{
 const examples=[['Use 1 × 10^3 gals.','^'],['Use 1 * 10**3 gals.','**'],['Use 1 / 3 gals.','/'],['Use 1⁄3 gals.','⁄'],['Use 1∕3 gals.','∕'],['Use 1⁄ 3 gals.','⁄'],['Use 1 ÷ 3 gals.','÷'],['Use ±3 gals.','±'],['Use 1 ± 3 gals.','±'],['Use 1±3 gals.','±'],['Use 1, 000 gals.',','],['Use 1. 000 gals.','.']];
 for(const [text,mark]of examples){const d=doc(text);assert.deepEqual(check(d),[],text);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='9.58').length,0,text);const start=text.indexOf(mark);
  for(const property of ['struck','excluded']){const x=structuredClone(d);x[property].push({start,end:start+mark.length});assert.deepEqual(check(x),[],property+' '+text);assert.equal(jointStylisticIssues(x,refs).filter(i=>i.rule==='9.58').length,0,property+' '+text);}
 }
 assert.equal(check('Use 1.000 gals.')[0].suggestion,'1.000 gal');assert.equal(check('Use 1,000 gals.')[0].suggestion,'1,000 gal');
});
test('every numeric unit and separator character is required and masked words cannot form a unit bridge',()=>{
 for(const phrase of ['25 bbls','25 ins','25 ss']){const text='Use '+phrase+'.',start=text.indexOf(phrase);for(const property of ['struck','excluded'])for(let n=start;n<start+phrase.length;n++){const d=doc(text);d[property].push({start:n,end:n+1});assert.deepEqual(check(d),[],property+' '+phrase+' '+n);}}
 for(const property of ['struck','excluded']){const d=doc('Use 25 old bbls.'),start=d.text.indexOf('old');d[property].push({start,end:start+3});assert.deepEqual(check(d),[],property);}
});
test('Unicode scientific and technical source boundaries cannot manufacture eligible quantities',()=>{
 for(const [prefix,suffix]of [['é',''],['𐐀',''],['path/',''],['x',''],['','.item'],['','_item'],['','/key'],['','é'],['','\u0301']]){
  const text='Use '+prefix+'25 bbls'+suffix+'.',d=doc(text);assert.deepEqual(check(d),[],text);
  for(const property of ['struck','excluded']){const x=structuredClone(d),start=prefix?4:4+'25 bbls'.length;x[property].push({start,end:start+(prefix||suffix).length});assert.deepEqual(check(x),[],property+' '+text);}
 }
 for(const text of ['Cite Form 25 bbls.','Cite Section 25 lbs.','Use 25 bbls/kg.','The code is https://example.org/25bbls.'])assert.deepEqual(check(text),[],text);
});
test('literal original and bill-local quoted unit forms remain protected in direct and joint review',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const d=doc('The form is '+open+'25 bbls'+close+'.');assert.deepEqual(check(d),[]);for(const property of ['struck','excluded'])for(const at of [d.text.indexOf(open),d.text.lastIndexOf(close)]){const x=structuredClone(d);x[property].push({start:at,end:at+1});assert.deepEqual(check(x),[],property+' '+open);}}
 const local=doc('The term “25 bbls” is defined. Use 25 bbls.');assert.deepEqual(check(local),[]);assert.equal(jointStylisticIssues(local,refs).filter(i=>i.rule==='9.58').length,0);assert.equal(check('Use 25 bbls.').length,1);
});
test('complete original name continuations remain protected even after title masking',()=>{
 for(const title of ['Program','West Foundation','Company','New Records Center']){const d=doc('The 25 bbls '+title+' is hereby established.');assert.deepEqual(check(d),[],title);for(const property of ['struck','excluded']){const start=d.text.indexOf(title),x=structuredClone(d);x[property].push({start,end:start+title.length});assert.deepEqual(check(x),[],property+' '+title);}}
 assert.equal(check('Use 25 bbls for storage.').length,1);
});
test('headings tables and unknown bridges stay protected while recognized page heads retain exact offsets',()=>{
 const table=doc('Use 25 bbls.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(check(table),[]);
 assert.deepEqual(check('Use 25 bbls.\nThe people do enact as follows:\nUse 25 bbl.'),[]);
 const d=makeDocument(['The people do enact as follows:\nline 1 Use 25','AB 999 — 2 —\nline 1 bbls.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(d),[i]=check(d);assert.ok(i);assert.equal(i.suggestion,'25 bbl');assert.match(i.text,/AB 999/);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
 const unknown=structuredClone(d),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;assert.deepEqual(check(unknown),[]);
});
test('new table checks coexist with LCB priority and leave the existing metric/time detectors active',()=>{
 const d=doc('Use 25 bbls. The healthcare is provided. Meet at 10:00 A.M. Use 30 kgs.'),before=JSON.stringify(d),issues=jointStylisticIssues(d,refs);
 assert.ok(issues.some(i=>i.rule==='9.58'&&i.suggestion==='25 bbl'));assert.ok(issues.some(i=>i.guideId==='lcb'&&i.suggestion==='health care'));assert.ok(issues.some(i=>i.rule==='9.54'&&i.suggestion==='10 a.m.'));assert.ok(issues.some(i=>i.rule==='9.56'&&i.suggestion==='30 kg'));assert.ok(!issues.some(i=>i.conflict));for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
});
