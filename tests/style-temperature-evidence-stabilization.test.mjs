import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {measurementIssues} from '../app/style-measures.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current');
const direct=doc=>measurementIssues(doc,refs).filter(i=>i.checkId==='temperature-name'),joint=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='temperature-name');
test('LCB temperature corrections keep exact scale selection and complete degree evidence',()=>{
 for(const [body,bad,good,page] of [['Use degrees celsius.','celsius','Celsius',3],['Use degree fahrenheit.','fahrenheit','Fahrenheit',4],['Use degrees\ncelsius.','celsius','Celsius',3]]){const doc=make(body),before=JSON.stringify(doc);for(const check of [direct,joint]){const issues=check(doc);assert.equal(issues.length,1,body);const i=issues[0];assert.equal(i.text,bad);assert.equal(i.suggestion,good);assert.equal(i.guidePage,page);assert.equal(doc.text.slice(i.start,i.end),bad);assert.match(doc.text.slice(i.evidenceStart,i.evidenceEnd),/^degrees?\s+(?:celsius|fahrenheit)$/);assert.ok(refs.lcb.pages[page-1].text.includes(good));}assert.equal(JSON.stringify(doc),before);}
 for(const body of ['Use degrees Celsius.','Use degrees Fahrenheit.','Use degrees centigrade.'])assert.equal(jointStylisticIssues(make(body),refs).length,0,body);
 assert.deepEqual(jointStylisticIssues(make('Use degrees Centigrade.'),refs).map(i=>i.suggestion),['centigrade']);
});
test('Unicode suffixes and attached identifiers never become partial temperature-scale words',()=>{
 for(const body of ['Use degrees celsiusé.','Use degrees fahrenheit\u0301.','Use degreesα celsius.','Use degrees\u0301 fahrenheit.','Use xdegrees celsius.','Use /degrees celsius.','Use degrees celsius/key.','Use degrees fahrenheit.2.','Use degrees celsius’s form.','Use Section degrees celsius.'])for(const check of [direct,joint])assert.equal(check(make(body)).length,0,body);
});
test('every original degree cue scale word and connecting character must remain readable active evidence',()=>{
 for(const phrase of ['degrees celsius','degree fahrenheit']){const doc=make('Use '+phrase+'.'),start=doc.text.indexOf(phrase),end=start+phrase.length;for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});for(const check of [direct,joint])assert.equal(check(damaged).length,0,field+' '+phrase+' '+at);}}
});
test('explicit extended titles remain protected even when title evidence is struck or excluded',()=>{
 for(const title of ['Act','Code','Law','Program']){const doc=make('The degrees celsius '+title+' applies.');for(const check of [direct,joint])assert.equal(check(doc).length,0,title);for(const field of ['struck','excluded']){const damaged=structuredClone(doc),at=doc.text.indexOf(title);damaged[field].push({start:at,end:at+title.length});for(const check of [direct,joint])assert.equal(check(damaged).length,0,field+' '+title);}}
});
test('original quoted payload enclosure and quoted bill-local terms remain protected',()=>{
 for(const [open,close] of [['“','”'],['"','"'],["'","'"]]){const doc=make('The instruction states '+open+'Use degrees celsius.'+close);for(const check of [direct,joint])assert.equal(check(doc).length,0,open);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});for(const check of [direct,joint])assert.equal(check(damaged).length,0,field+' '+open+' '+at);}}
 for(const check of [direct,joint]){assert.equal(check(make('“celsius” means this scale. Use degrees celsius.')).length,0);assert.equal(check(make('Use degrees celsius.')).length,1);}
});
test('heading table and independent measured unit checks retain their existing behavior',()=>{
 const heading=makeDocument(['ASSEMBLY BILL 1\nUse degrees celsius.\nThe people do enact as follows:\nUse degrees Fahrenheit.'],'Current');assert.equal(joint(heading).length,0);
 const table=make('Use degrees celsius.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.equal(direct(table).length,0);assert.equal(joint(table).length,0);
 const units=jointStylisticIssues(make('Use 30 kgs. The kilowatt (kw) is measured.'),refs);assert.ok(units.some(i=>i.suggestion==='30 kg'));assert.ok(units.some(i=>i.suggestion==='kW'));
});
