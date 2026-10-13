import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {styleContext} from '../app/style-context.mjs';
import {percentageValueMatches} from '../app/style-percentage-values.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const percent=doc=>contextualPunctuationIssues(doc,refs).filter(i=>i.rule==='Numerals: Percent');
const check=text=>percent(makeDocument([text],'Current'));

test('LCB23 percent figures select the entire integer grouped or decimal magnitude',()=>{
 assert.match(refs.lcb.pages[22].text,/PERCENT \(always in figures\)/);
 assert.match(refs.lcb.pages[22].text,/0\.5 percent/);
 for(const value of ['0','5','50,000','1,234,567.89','0.5','12.05']){
  const text='The rate is '+value+'%.',found=check(text);
  assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[value+'%',value+' percent']],text);
  assert.equal(found[0].guidePage,23);assert.equal(text.slice(found[0].start,found[0].end),found[0].text);
  assert.equal(check('The rate is '+value+' percent.').length,0);
 }
});

test('malformed numeric values Unicode identifiers fractions signs and ranges are not clipped',()=>{
 for(const value of ['1,00%','12,345,67%','1.2.3%','é5%','A5%','_5%','5%rate','5percenté','5%5','5%%','1⁄2%','1 / 2%','-5%','− 5%','+ 5%','$ 5%','5 to 7%','5 through 7%','5% to 7%','5%–7%','5%-increase'])assert.equal(check('The expression is '+value+'.').length,0,value);
 assert.deepEqual(check('Under Section 5, the rate is 7%.').map(i=>i.suggestion),['7 percent']);
 assert.equal(check('The serial is é'+'5'.repeat(40000)+'%suffix.').length,0,'A long identifier cannot become repeated percentage suffix candidates');
 assert.equal(check('The range is 5%'+ ' '.repeat(300)+'to 7%.').length,0,'Long layout whitespace cannot hide a range continuation');
 assert.equal(check('The value is −'+ ' '.repeat(300)+'5%.').length,0,'Long layout whitespace cannot hide a sign');
});

test('strikes and unknown exclusions cannot manufacture a magnitude unit or numeric boundary',()=>{
 for(const [text,needle]of [['The rate is 1x000%.','x'],['The rate is 1,x000%.','x'],['The rate is é5%.','é'],['The rate is 5 x %.','x'],['The rate is 5 percentx.','x']]){
  for(const property of ['struck','excluded']){
   const doc=makeDocument([text],'Current'),start=doc.text.indexOf(needle);doc[property]=[{start,end:start+needle.length}];assert.equal(percent(doc).length,0,text+' '+property);
  }
 }
 const doc=makeDocument(['The rate is 5%.'],'Current');doc.struck=[{start:doc.text.indexOf('5'),end:doc.text.indexOf('%')+1}];assert.equal(percent(doc).length,0);
});

test('quoted and tabular percentages are protected while genuine prose remains checked',()=>{
 assert.equal(check('The literal is “50,000%”.').length,0);
 const doc=makeDocument(['The rate is 5%.\nThe rate is 7%.'],'Current');doc.blocks[0].formatting={headerGaps:[1,2]};assert.deepEqual(percent(doc).map(i=>i.suggestion),['7 percent']);
});

test('PDF margins and recognized interior running heads preserve complete percent source spans',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 1\nThe people do enact as follows:\nline 1 The rate is 0.5\n97','AB 1 — 2 —\nline 1 %.'],'Current'),head=doc.blocks.find(b=>b.ignored&&b.text.includes('AB 1'));head.formatting={headerParts:[{text:head.text}]};
 const original=doc.text,found=percent(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'0.5 percent');assert.equal(found[0].start,doc.text.indexOf('0.5'));assert.equal(found[0].end,doc.text.indexOf('%')+1);assert.equal(doc.text,original);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(percent(doc).length,0);
});

test('sentence-opening spelling and the printed LCB Digest percent preference remain independent',()=>{
 assert.equal(check('60% is allocated.').length,0);
 assert.deepEqual(jointStylisticIssues(makeDocument(['60% is allocated.'],'Current'),refs).filter(i=>i.checkId==='opening-percentages').map(i=>i.suggestion),['Sixty percent']);
 assert.equal(check('50,000% is allocated.').length,0);
 assert.deepEqual(jointStylisticIssues(makeDocument(['50,000% is allocated.'],'Current'),refs).filter(i=>i.checkId==='opening-percentages').map(i=>i.suggestion),['Fifty thousand percent']);
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 50,000 percent.'],'Current');assert.deepEqual(percent(doc).map(i=>[i.text,i.suggestion,i.conflict]),[['50,000 percent','50,000%',true]]);assert.deepEqual(jointStylisticIssues(doc,refs).filter(i=>i.rule==='Numerals: Percent').map(i=>i.suggestion),['50,000%']);
 const body=makeDocument(['The rate is 0.5%.'],'Current');assert.deepEqual(percentageValueMatches(body,styleContext(body)).map(m=>m.number),['0.5']);
});
