import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbDigestPercentIssues,restoreDigestPercentEvidence,LCB_DIGEST_PERCENT_SCOPE} from '../app/style-lcb-digest-percent.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(body,context='Digest')=>makeDocument([context==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:':'The people do enact as follows:\n'+body],'Current');
const check=doc=>lcbDigestPercentIssues(doc,refs);
const examples=[['one-half of 1 percent','1⁄2 of 1%'],['one half of 1 percent','1⁄2 of 1%'],['one-half of one percent','1⁄2 of 1%'],['one-half of 1%','1⁄2 of 1%'],['½ of 1 percent','½ of 1%'],['1/2 of 1 percent','1/2 of 1%'],['1⁄2 of one%','1⁄2 of 1%'],['1½ percent','1½%'],['1 1/2 percent','1 1/2%'],['1 1⁄2 percent','1 1⁄2%'],['one and one-half percent','1½%'],['one and one half percent','1½%']];

test('LCB23 actual source prints both complete fractional percentage roles and preserves exact selections',()=>{
 const source=refs.lcb.pages[22].text;for(const form of ['one-half of 1 percent','1⁄2 of 1%','11⁄2 percent','11⁄2%'])assert.ok(source.includes(form),form);
 for(const [input,wanted] of examples){const doc=make('The rate is '+input+'.'),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,input);const i=issues[0];assert.equal(i.text,input);assert.equal(i.suggestion,wanted);assert.equal(i.guideId,'lcb');assert.equal(i.guidePage,23);assert.equal(i.context,'Digest');assert.equal(i.checkId,'lcb-digest-percent');assert.equal(doc.text.slice(i.start,i.end),input);assert.equal(JSON.stringify(doc),before);for(const c of i.digestPercentEvidence.components)assert.equal(doc.text.slice(c.start,c.end),c.text);assert.equal(doc.text.slice(i.digestPercentEvidence.contextWitness.start,i.digestPercentEvidence.contextWitness.end),i.digestPercentEvidence.contextWitness.text);}
});

test('compliant printed Bill/Digest figures and equivalent existing fraction notation remain quiet',()=>{
 for(const input of ['1⁄2 of 1%','1/2 of 1%','½ of 1%','1½%','1 1/2%','1 1⁄2%','11⁄2%','0.5%','1.5%'])assert.equal(check(make('The rate is '+input+'.')).length,0,input);
 for(const input of ['one-half of 1 percent','1½ percent','1.5 percent','0.5 percent'])assert.equal(check(make('The rate is '+input+'.','Bill')).length,0,input+' Bill');
});

test('unknown fractions magnitudes decimals ranges malformed notation and identifiers remain manual',()=>{
 for(const input of ['one-third of 1 percent','one-half of 2 percent','2½ percent','11/2 percent','11⁄2 percent','two and one-half percent','1/3 percent','1 2/4 percent','900719925474099312345678901234567890½ percent','900719925474099312345678901234567890 1/2 percent','1.1½ percent','1,1½ percent','01½ percent','0 1½ percent','1½ percent%','1½ percentα','1½ percent-format','1½percent','-1½ percent','+1½ percent','$1½ percent','1½ percent to 2 percent','0 percent to 1½ percent','Section 1½ percent','Form one-half of 1 percent','one and two one-half of 1 percent','1½ of 1 percent','1/1½ percent','half of 1 percent'])assert.equal(check(make('The rate is '+input+'.')).length,0,input);
 assert.match(LCB_DIGEST_PERCENT_SCOPE,/large magnitudes/);
});

test('an actual intact unquoted Digest heading is necessary and Bill boundaries are respected',()=>{
 for(const text of ['The rate is 1½ percent.','OPINION\nThe rate is 1½ percent.','“LEGISLATIVE COUNSEL’S DIGEST”\nThe rate is 1½ percent.','The people do enact as follows:\nLEGISLATIVE COUNSEL’S DIGEST\nThe rate is 1½ percent.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const doc=make('The rate is 1½ percent.'),at=doc.text.indexOf('DIGEST');for(const field of ['struck','excluded']){const bad=structuredClone(doc);bad[field].push({start:at,end:at+6});assert.equal(check(bad).length,0);}
});

test('all complete percentage source characters protect strikes and uncertain exclusions',()=>{
 for(const input of ['one-half of 1 percent','1½ percent','one and one-half percent']){const doc=make('The rate is '+input+'.'),start=doc.text.indexOf(input),end=start+input.length;assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+input+' '+at);}}
 for(const input of ['2 1½ percent','$1½ percent','1½ percent Act']){const doc=make('The rate is '+input+'.'),at=doc.text.indexOf(input),damage=input.includes('Act')?doc.text.indexOf('Act'):at;for(const field of ['struck','excluded']){const bad=structuredClone(doc);bad[field].push({start:damage,end:damage+1});assert.equal(check(bad).length,0,input+' '+field);}}
});

test('literal and bill-local quoted forms tables titles body dashes and potential openings stay protected',()=>{
 for(const body of ['The rate is “1½ percent”.','The rate is "one-half of 1 percent".','“1½ percent” means the rate. The rate is 1½ percent.','“one-half” means the measure. The rate is one-half of 1 percent.','The rate is One and One-Half Percent.','The rate is one-half of 1 percent Act.','The rate is one—half of 1 percent.','One-half of 1 percent is required.','(a) One and one-half percent is required.','Rate: one-half of 1 percent is required.'])assert.equal(check(make(body)).length,0,body);
 assert.equal(check(make('The rate is 1½ percent.')).length,1,'Quoted authority does not leak to a new bill');
 const table=make('The rate is 1½ percent.');table.blocks.find(b=>b.text.includes('The rate')).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
});

test('recognized physical PDF heads preserve a whole percentage selection and restorable source evidence',()=>{
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nline 1 The rate is one-half of','AB 224 — 2 —\nline 1 1 percent.\nThe people do enact as follows:'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'1⁄2 of 1%');assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);const evidence=issues[0].digestPercentEvidence,copy=JSON.stringify(evidence),restored=restoreDigestPercentEvidence(evidence,x=>x,doc.text);assert.equal(restored.sourceText,issues[0].text);for(const c of restored.components)assert.equal(doc.text.slice(c.start,c.end),c.text);assert.equal(JSON.stringify(evidence),copy);assert.equal(JSON.stringify(doc),before);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(doc).length,0);
});
