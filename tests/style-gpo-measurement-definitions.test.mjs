import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {measurementDefinitionIssues,GPO_MEASUREMENT_DEFINITIONS,GPO_MEASUREMENT_DEFINITION_SCOPE} from '../app/style-measurement-definitions.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const doc=text=>makeDocument([text],'Current');
const run=input=>{const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d),issues=measurementDefinitionIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.guideId,'gpo');assert.ok(i.measurementDefinitionEvidence);assert.equal(i.guidePage===251||i.guidePage===252,true);}return issues;};

test('finite explicit definitions record only the 23 bare, 14 metric and four English printed powers',()=>{
 assert.equal(GPO_MEASUREMENT_DEFINITIONS.length,41);assert.ok(Object.isFrozen(GPO_MEASUREMENT_DEFINITIONS)&&GPO_MEASUREMENT_DEFINITIONS.every(Object.isFrozen));
 assert.deepEqual(GPO_MEASUREMENT_DEFINITIONS.filter(r=>r.power&&r.rule==='9.58').map(r=>r.symbol+r.power),['in2','in3','mi2','ft3']);
 assert.ok(GPO_MEASUREMENT_DEFINITIONS.some(r=>r.names.includes('square decameter')));assert.ok(GPO_MEASUREMENT_DEFINITIONS.some(r=>r.names.includes('cubic dekameter')));assert.ok(!GPO_MEASUREMENT_DEFINITIONS.some(r=>r.names.includes('square dekameter')||r.names.includes('cubic decameter')));
 assert.match(GPO_MEASUREMENT_DEFINITION_SCOPE,/finite|Finite/u);assert.match(GPO_MEASUREMENT_DEFINITION_SCOPE,/manual/u);
});

test('every printed name establishes its same-family symbol case punctuation and plural comparison',()=>{
 for(const r of GPO_MEASUREMENT_DEFINITIONS)for(const name of r.names){const wrong=[...r.symbol.toUpperCase()].join('.')+'.'+(r.power?(r.power===2?'3':'2'):'')+'S',wanted=r.symbol+(r.power?String(r.power):'');const found=run('Use 25 '+name+' ('+wrong+').');assert.equal(found.length,1,name+' '+wrong);assert.equal(found[0].text,wrong);assert.equal(found[0].suggestion,wanted);assert.equal(found[0].rule,r.rule);assert.equal(found[0].guidePage,r.page);}
});

test('plain and superscript powers remain accepted without treating PDF flattening as a font error',()=>{
 for(const r of GPO_MEASUREMENT_DEFINITIONS){for(const power of r.power?[String(r.power),r.power===2?'²':'³']:[''])assert.deepEqual(run('Use 25 '+r.names[0]+' ('+r.symbol+power+').'),[],r.names[0]+' '+power);}
 assert.equal(run('Use 25 square meters (M ³S).')[0].suggestion,'m²');assert.equal(run('Use 25 cubic feet (F.T.²).')[0].suggestion,'ft³');
});

test('full names disambiguate ds hs and Ts while unrelated or missing-power symbols stay manual',()=>{
 for(const [text,wanted]of [['Use 25 days (ds).','d'],['Use 25 hours (hs).','h'],['Use 25 metric tons (Ts).','t'],['Use 25 seconds (SS).','s']])assert.equal(run(text)[0].suggestion,wanted);
 for(const text of ['Use 25 ds and 25 hs and 25 Ts.','Use 25 square meters (M).','Use 25 square meters (km3).','Use 25 inches (ft).','Use 25 cubic centimeters (cc).','Use 25 cubic centimeters (cc) when requested.','Use 25 tons (T).','Use 25 feet².','Use 25 square feet (FT2).','Use 25 square dekameters (DAM2).','Use 25 cubic decameters (DAM3).'])assert.deepEqual(run(text),[],text);
});

test('complete finite measurement cues establish a definition but bare names and identifiers do not',()=>{
 for(const cue of ['measured in','expressed in','specified in','reported in','calculated in','area of','volume in','length of','weight in','mass of','duration in','capacity of'])assert.equal(run('The quantity is '+cue+' square meters (M3).')[0].suggestion,'m2',cue);
 for(const text of ['The Square Meters (M3) shall act.','The inches (INS) are listed.','Cite Form 25 inches (INS).','Cite Section 25 square meters (M3).','Use Figure 25 pounds (LBS).','The 25 inches (INS) Program is created.','The 25 inches (INS) is hereby established.'])assert.deepEqual(run(text),[],text);
});

test('complete quantity evidence preserves digits and rejects scientific fractional and malformed suffixes',()=>{
 for(const n of ['9007199254740993','12,345.0001','0030','25.00'])assert.equal(run('Use '+n+' square meters (M3).')[0].suggestion,'m2');
 for(const n of ['1.2.3','1,23','1e3','1e+3','1e + 3','1 / 3','1⁄3','1∕3','1 * 10**3','1 × 10^3','1 ÷ 3','±3','-3','+3','1, 000','1. 000'])assert.deepEqual(run('Use '+n+' square meters (M3).'),[],n);
 for(const property of ['struck','excluded'])for(const text of ['Use 1e+3 square meters (M3).','Use 1 / 3 square meters (M3).']){const d=doc(text),at=text.includes('e')?text.indexOf('e'):text.indexOf('/');d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}
});

test('original spaced numeric punctuation and exterior operators cannot expose a partial definition',()=>{
 for(const text of ['Use 1 . 005 square meters (M²).','Use 1 , 005 square meters (M²).','Use 25 square meters (M²)^3.','Use 25 square meters (M²)*3.','Use 25 square meters (M²)+3.']){assert.deepEqual(run(text),[],text);const at=/[.,*^+]/u.exec(text)?.index;if(at!==undefined)for(const property of ['struck','excluded']){const d=doc(text);d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}}
});

test('every cue name parenthesis symbol power and bridge character is original required evidence',()=>{
 for(const phrase of ['25 square meters (M3)','measured in cubic feet (F.T.2)','25 hours (HS)'])for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const d=doc('Use '+phrase+'.');d[property].push({start:4+n,end:5+n});assert.deepEqual(run(d),[],property+' '+phrase+' '+n);}
 for(const property of ['struck','excluded'])for(const text of ['Use 25 old square meters (M3).','Use 25 square meters old (M3).','Use 25 square meters (Mold3).']){const d=doc(text),at=text.indexOf('old');d[property].push({start:at,end:at+3});assert.deepEqual(run(d),[],property+' '+text);}
});

test('Unicode technical and original removed boundaries cannot expose shorter quantity or unit tokens',()=>{
 for(const [prefix,suffix]of [['é',''],['𐐀',''],['path/',''],['pre-',''],['','.field'],['','_field'],['','/field'],['','é'],['','\u0301']]){const phrase='25 square meters (M3)',text='Use '+prefix+phrase+suffix+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=doc(text),at=prefix?4:4+phrase.length;d[property].push({start:at,end:at+(prefix||suffix).length});assert.deepEqual(run(d),[],property+' '+text);}}
});

test('quotations bill-local definitions tables and complete source-created names remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const text='The form is '+open+'25 square meters (M3)'+close+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const d=doc(text);d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}}
 assert.deepEqual(run('The term “25 inches (INS)” is defined. Use 25 inches (INS).'),[]);
 const table=doc('Use 25 square meters (M3).');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
 for(const property of ['struck','excluded']){const text='The 25 inches (INS) Program is hereby established.',d=doc(text),at=text.indexOf('Program');d[property].push({start:at,end:at+7});assert.deepEqual(run(d),[],property);}
 for(const suffix of [', Inc., is hereby established.',', Corp., is hereby created.',', Incorporated is designated.']){const text='The 5 Square Meters (M²)'+suffix;assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(let n=text.indexOf(',');n<text.length-1;n++){const d=doc(text);d[property].push({start:n,end:n+1});assert.deepEqual(run(d),[],property+' '+n);}}
});

test('angle and currency meanings remain original negative evidence for seconds and pounds',()=>{
 for(const text of ['The angle is 25 seconds (SS).','Use 25 seconds (SS) of arc.','Use 25 pounds (LBS) sterling.','The currency is 25 pounds (LBS).']){assert.deepEqual(run(text),[],text);const needle=/angle|arc|sterling|currency/u.exec(text)[0];for(const property of ['struck','excluded']){const d=doc(text),at=text.indexOf(needle);d[property].push({start:at,end:at+needle.length});assert.deepEqual(run(d),[],property+' '+text);}}
 assert.equal(run('Wait 25 seconds (SS).')[0].suggestion,'s');assert.equal(run('Use 25 pounds (LBS) of material.')[0].suggestion,'lb');
});

test('physical wraps margins page heads and discretionary divisions keep exact source selections',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 Use 25 square','AB 999 — 2 —\nline 1 meters (M3).'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.equal(i.text,'M3');assert.equal(i.suggestion,'m2');
 const unknown=structuredClone(d),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;assert.deepEqual(run(unknown),[]);
 assert.equal(run('line 1 Use 25 square centi-\nline 2 meters (CM3).')[0].suggestion,'cm2');
 for(const dash of ['–','—'])assert.deepEqual(run('line 1 Use 25 square centi'+dash+'\nline 2 meters (CM3).'),[],dash);
});
