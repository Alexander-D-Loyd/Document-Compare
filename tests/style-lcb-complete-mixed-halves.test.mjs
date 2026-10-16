import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbMixedHalfIssues,mixedHalfParts} from '../app/style-lcb-mixed-halves.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {spellNumber} from '../app/style-cardinal-values.mjs';
import {workerWords} from './helpers/spelling-worker.mjs';
const words=await workerWords(),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),id='lcb-mixed-half-quantity';
const make=(body,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+body],'Current',[],[],words);
const check=(doc,joint=false)=>{const saved=JSON.stringify(doc),found=joint?jointStylisticIssues(doc,refs).filter(i=>i.checkId===id):lcbMixedHalfIssues(doc,refs);assert.equal(JSON.stringify(doc),saved);for(const i of found){assert.equal(doc.text.slice(i.start,i.end),i.text);const e=i.mixedHalfEvidence;assert.equal(doc.text.slice(e.start,e.end),e.sourceText);assert.equal(doc.text.slice(e.unitStart,e.unitEnd),e.unit);}return found;};

test('complete canonical mixed half values above99 keep the entire whole and half in one owner',()=>{
 for(const [whole,wanted]of [['one hundred','100'],['one hundred and ten','110'],['one hundred ten','110'],['one hundred and twenty-five','125'],['one thousand ten','1,010'],['one thousand and one hundred and ten','1,110'],['one million two hundred thirty-four thousand five hundred sixty-seven','1,234,567']])for(const kind of ['Bill','Digest']){
  const doc=make('The term is '+whole+' and one-half hours.',kind),found=check(doc,true);assert.equal(found.length,1,whole);const i=found[0];assert.equal(i.text,whole+' and one-half');assert.equal(i.suggestion,wanted+' 1⁄2');assert.equal(i.mixedHalfEvidence.wholeDigits,wanted.replaceAll(',',''));assert.equal(jointStylisticIssues(doc,refs).filter(x=>x.start<i.end&&x.end>i.start).length,1);assert.ok(i.references.some(r=>r.guidePage===23&&r.sourcePassage.text.includes('101⁄2')));
 }
});
test('canonical arbitrarily long digit whole values remain exact and receive complete mixed notation',()=>{
 for(const digits of ['100','1000','1,000','9007199254740993','123456789012345678901234567890123456789']){
  const doc=make('The period is '+digits+' and one-half hours.'),found=check(doc,true);assert.equal(found.length,1,digits);assert.equal(found[0].text,digits+' and one-half');assert.equal(found[0].mixedHalfEvidence.wholeDigits,digits.replaceAll(',',''));assert.equal(found[0].suggestion.replaceAll(',',''),digits.replaceAll(',','')+' 1⁄2');
 }
});
test('safe canonical whole parsing is stable across representative scales without accepting fragments',()=>{
 for(const n of [10,19,20,99,100,101,110,999,1000,1001,1010,999999,1000000,999999999999999]){const whole=spellNumber(n),parts=mixedHalfParts(whole+' and one-half hours');assert.equal(parts.length,1,whole);assert.equal(parts[0].start,0);assert.equal(parts[0].digits,String(n));}
 for(const body of ['one hundred hundred and one-half hours','one thousand thousand ten and one-half hours','one hundred and and ten and one-half hours','one hundred and thousand and one-half hours','ten and twenty and one-half hours','hundred and one-half hours','one hundred and 20 and one-half hours','nine quadrillion ten and one-half hours','one hundred twenty-five million million and one-half hours','one point ten and one-half hours'])assert.equal(check(make('The period is '+body+'.')).length,0,body);
});
test('malformed numeric forms, signed values, decimal suffixes and technical quantity roles stay quiet',()=>{
 for(const quantity of ['1,00','00,110','00110','1.110','.110','-110','− 110','plus 110','negative one hundred ten','$110','€ 110','1/110','1⁄110','^110','1e110','Form 110','Section 110'])assert.equal(check(make('The period is '+quantity+' and one-half hours.')).length,0,quantity);
 for(const after of ['hours-code','hours.1','hours Act','hoursα','hours/identifier'])assert.equal(check(make('The period is one hundred ten and one-half '+after+'.')).length,0,after);
});
test('every complete large mixed whole/fraction/unit source character is necessary, including internal and',()=>{
 const body='The period is one hundred and ten and one-half hours.',original=make(body),found=check(original);assert.equal(found.length,1);const {start,end}=found[0].mixedHalfEvidence;
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0,field+' '+at);}
 for(const field of ['struck','excluded']){const doc=make('The period is one hundred unrelated and ten and one-half hours.'),at=doc.text.indexOf('unrelated');doc[field].push({start:at,end:at+9});assert.equal(check(doc).length,0,field);}
});
test('complete large mixed quantities keep original literal quotes, local authority and source masks protected',()=>{
 const term='one hundred and ten and one-half hours';for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const doc=make('The period is '+open+term+close+'.');assert.equal(check(doc,true).length,0);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+open);}}
 assert.equal(check(make('“One hundred and ten and one-half hours” is defined. The period is '+term+'.'),true).length,0);assert.equal(check(make('The period is '+term+'.'),true).length,1);
});
test('large age values preserve nested original offsets through physical word divisions',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The person is one hun-','AB 224 — 2 —\nline 1 dred and ten and one-half years of age.'],'Current',[],[],words),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=check(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,'110 1⁄2');assert.ok(found[0].text.includes('\n'));assert.equal(found[0].guidePage,22);
});
