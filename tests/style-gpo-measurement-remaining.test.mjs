import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoRemainingMeasurementIssues,GPO_TEMPERATURE_GRAVITY_DEFINITIONS,GPO_TEMPERATURE_GRAVITY_DEFINITION_SCOPE} from '../app/style-gpo-measurement-remaining.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const doc=text=>makeDocument([text],'Current');
const run=input=>{const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d),issues=gpoRemainingMeasurementIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.checkId,'gpo-temperature-gravity-definitions');assert.equal(i.guidePage,250);assert.deepEqual(i.references.map(r=>r.guidePage),[249,250]);assert.ok(i.temperatureGravityEvidence);}return issues;};

test('six immutable rows preserve exactly the printed temperature and gravity name-symbol pairs',()=>{
 assert.deepEqual(GPO_TEMPERATURE_GRAVITY_DEFINITIONS.map(r=>[r.name,r.symbol]),[['degree Celsius','°C'],['degree Fahrenheit','°F'],['degree Rankine','°R'],['kelvin','K'],['Baumé','Bé'],['Twaddell','Twad']]);
 assert.ok(Object.isFrozen(GPO_TEMPERATURE_GRAVITY_DEFINITIONS));assert.ok(GPO_TEMPERATURE_GRAVITY_DEFINITIONS.every(r=>Object.isFrozen(r)&&Object.isFrozen(r.names)));
 const table=refs.gpo.pages[249].text;for(const term of ['Celsius','Fahrenheit','Rankine','kelvin','Baumé','Twaddell'])assert.ok(table.includes(term),term);
 assert.match(GPO_TEMPERATURE_GRAVITY_DEFINITION_SCOPE,/finite explicit definitions/u);assert.match(GPO_TEMPERATURE_GRAVITY_DEFINITION_SCOPE,/centigrade/u);assert.match(GPO_TEMPERATURE_GRAVITY_DEFINITION_SCOPE,/manual/u);
});

test('complete quantities and full names establish only same-family printed symbol corrections',()=>{
 for(const [name,actual,wanted]of [['degrees Celsius','c','°C'],['degree Fahrenheit','F.','°F'],['degrees Rankine','° r','°R'],['kelvins','°k','K'],['Baumé','B.E.','Bé'],['Twaddell','T . W . A . D .','Twad']]){const [i]=run('Use 25 '+name+' ('+actual+').');assert.ok(i,name);assert.equal(i.text,actual);assert.equal(i.suggestion,wanted);assert.equal(i.temperatureGravityEvidence.quantity,'25');}
 for(const r of GPO_TEMPERATURE_GRAVITY_DEFINITIONS)for(const name of r.names)assert.deepEqual(run('Use 25 '+name+' ('+r.symbol+').'),[],name);
});

test('finite meaning roles support Rankine kelvin and gravities while Celsius and Fahrenheit require figures',()=>{
 for(const [cue,name,actual,wanted]of [['The temperature is measured in','kelvin','k','K'],['The temperatures were expressed in','degrees Rankine','r','°R'],['The gravity is specified in','Baumé','BE','Bé'],['The density was reported in','Twaddell','twad','Twad'],['The density of','Baumé','be','Bé']])assert.equal(run(cue+' '+name+' ('+actual+').')[0].suggestion,wanted,cue);
 for(const text of ['The temperature is measured in degrees Celsius (c).','The temperature is measured in degrees Fahrenheit (f).','The Kelvin scale (k) is used.','The Baumé (be) shall act.','The Twaddell (twad) is listed.','The quantity is measured in Baumé (be).','The mass is measured in kelvin (k).'])assert.deepEqual(run(text),[],text);
});

test('isolated symbols unknown aliases cross-scale symbols and LCB centigrade remain manual',()=>{
 for(const text of ['Use 25 c and 25 k and 25 BE and 25 twad.','Use 25 degrees Centigrade (c).','Use 25 degrees Celsius (f).','Use 25 degrees Celsius (℉).','Use 25 degrees Celsius (ºc).','Use 25 degrees Celsius (CC).','Use 25 kelvins (KS).','Use 25 Baumé (B).','Use 25 Twaddell (TW).','Use 25 absolute (ABS).','Use 25 American Petroleum Institute (API).','Use 25 cubic centimeters (cc).'])assert.deepEqual(run(text),[],text);
});

test('exact quantity characters retain large grouped decimal values without parsing or exposing suffixes',()=>{
 for(const n of ['9007199254740993','12,345.0001','0030','25.00']){const [i]=run('Use '+n+' kelvins (°k).');assert.equal(i.suggestion,'K');assert.equal(i.temperatureGravityEvidence.quantity,n);}
 for(const n of ['1.2.3','1,23','1e3','1e+3','1e + 3','1 / 3','1⁄3','1∕3','1 * 10**3','1 × 10^3','1 ÷ 3','±3','-3','−3','+3','1, 000','1. 000','1 , 000','1 . 000','1 005','1\u2009005','1½ 3','1: 25'])assert.deepEqual(run('Use '+n+' kelvins (°k).'),[],n);
 for(const property of ['struck','excluded']){const d=doc('Use 1 005 kelvins (°k).');d[property].push({start:4,end:5});assert.deepEqual(run(d),[],property+' removed spaced quantity prefix');}
 for(const property of ['struck','excluded'])for(const text of ['Use 1e+3 kelvins (°k).','Use 1 / 3 kelvins (°k).','Use 1 . 005 kelvins (°k).']){const d=doc(text),at=text.includes('e+')?text.indexOf('e+'):text.includes('/')?text.indexOf('/'):text.indexOf('.');d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}
});

test('original exterior operators and colon ratios remain negative evidence after masking',()=>{
 for(const operator of ['-','/','⁄','∕','*','^','+','−','±','×','÷','=']){const text='Use 25 degrees Celsius (c) '+operator+' 3.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=doc(text),at=text.indexOf(operator,text.indexOf(')'));d[property].push({start:at,end:at+operator.length});assert.deepEqual(run(d),[],property+' '+operator);}}
 for(const property of ['struck','excluded']){const text='Use 1: 25 kelvins (k).',d=doc(text),at=text.indexOf(':');d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' ratio');}
});

test('finite original sign words preserve signed quantities even if removed from active wording',()=>{
 for(const sign of ['minus','negative','plus','positive'])for(const phrase of ['25 degrees Celsius (c)','25 kelvins (k)']){const text='Use '+sign+' '+phrase+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(let n=0;n<sign.length;n++){const d=doc(text);d[property].push({start:4+n,end:5+n});assert.deepEqual(run(d),[],property+' '+sign+' '+n);}}
 assert.equal(run('The instruction is positive. Use 25 kelvins (k).')[0].suggestion,'K');
});

test('each character of the complete quantity or role name enclosure and symbol is original evidence',()=>{
 for(const phrase of ['25 degrees Celsius (c)','temperature is measured in kelvin (°k)','gravity is measured in Baumé (B.E.)'])for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const d=doc('Use '+phrase+'.');d[property].push({start:4+n,end:5+n});assert.deepEqual(run(d),[],property+' '+phrase+' '+n);}
 for(const property of ['struck','excluded'])for(const text of ['Use 25 old kelvins (°k).','Use 25 kelvins old (°k).','Use 25 kelvins (°oldk).']){const d=doc(text),at=text.indexOf('old');d[property].push({start:at,end:at+3});assert.deepEqual(run(d),[],property+' '+text);}
});

test('original Unicode identifier and technical endpoints cannot expose a partial meaning witness',()=>{
 for(const [prefix,suffix]of [['é',''],['𐐀',''],['path/',''],['pre-',''],['Case ',''],['Form ',''],['','.field'],['','_field'],['','/field'],['','é'],['','\u0301'],['','^3'],['','*3'],['','+3'],['','−3'],['','÷3']]){const phrase='25 kelvins (°k)',text='Use '+prefix+phrase+suffix+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=doc(text),at=prefix?4:4+phrase.length;d[property].push({start:at,end:at+(prefix||suffix).length});assert.deepEqual(run(d),[],property+' '+text);}}
});

test('source quotes bill-local forms tables headings and created names retain their protection',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const text='The form is '+open+'25 kelvins (°k)'+close+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const d=doc(text);d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}}
 assert.deepEqual(run('The term “25 kelvins (°k)” is defined. Use 25 kelvins (°k).'),[]);
 const heading=makeDocument(['ASSEMBLY BILL 1\nUse 25 kelvins (°k).\nThe people do enact as follows:\nUse 25 kelvins (K).'],'Current');assert.deepEqual(run(heading),[]);
 const table=doc('Use 25 kelvins (°k).');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
 for(const suffix of [' Program is hereby established.',' is hereby created.',', Inc., is hereby established.',', Corp., is hereby created.',', Incorporated is designated.']){const text='The 25 Kelvins (°k)'+suffix;assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(let n=text.indexOf(')')+1;n<text.length-1;n++){const d=doc(text);d[property].push({start:n,end:n+1});assert.deepEqual(run(d),[],property+' '+n);}}
});

test('physical wraps page heads and genuine discretionary divisions keep exact original selections',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 Use 25 degrees','AB 999 — 2 —\nline 1 Celsius (c).'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.equal(i.text,'c');assert.equal(i.suggestion,'°C');
 const unknown=structuredClone(d),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;assert.deepEqual(run(unknown),[]);
 assert.equal(run('line 1 Use 25 kel-\nline 2 vins (°k).')[0].suggestion,'K');
 for(const dash of ['–','—'])assert.deepEqual(run('line 1 Use 25 kel'+dash+'\nline 2 vins (°k).'),[],dash);
});
