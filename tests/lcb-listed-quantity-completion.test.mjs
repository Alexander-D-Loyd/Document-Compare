import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbListedPunctuationFormIssues} from '../app/style-lcb-listed-punctuation-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\nline 1 '+text],'Current'),check=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-mixed-half-quantity');
test('complete mixed quantities preserve original body dashes as punctuation',()=>{
 for(const dash of ['\u2012','\u2013','\u2014','\u2015'])for(const body of ['The worker is seventy'+dash+'one and one-half years of age.','The worker is seventy and one'+dash+'half years of age.','The period is twenty'+dash+'one and one-half hours.'])assert.equal(check(make(body)).length,0,body);
});
test('finite duration and mixed quantity checks cannot select decimal or signed suffixes',()=>{
 for(const before of ['1.','ID.','−','- ','1/','1⁄','negative ','$']){
  assert.equal(lcbListedPunctuationFormIssues(make('The term is '+before+'16 months or two or three years.'),refs).length,0,before);
  assert.equal(check(make('The term is '+before+'70 and one-half hours.')).length,0,before);
 }
});
test('credential cues cannot begin inside original astral Unicode words',()=>{
 const body='The applicant 𐐀holds a real estate broker’s license.';
 assert.equal(lcbListedPunctuationFormIssues(make(body),refs).length,0);
 for(const field of ['struck','excluded']){const doc=make(body),start=doc.text.indexOf('𐐀');doc[field].push({start,end:start+2});assert.equal(lcbListedPunctuationFormIssues(doc,refs).length,0,field);}
 assert.equal(lcbListedPunctuationFormIssues(make('The applicant holds a real estate broker’s license.'),refs).length,1);
});
test('whole mixed ages and durations of ten or more retain exact LCB source and one correction owner',()=>{
 for(const [text,wanted,page]of [['The worker is seventy and one-half years of age.','70 1⁄2',22],['The worker is twenty-one and one-half years of age.','21 1⁄2',22],['The worker is 70 and one half years of age.','70 1⁄2',22],['The term is thirty and one-half hours.','30 1⁄2',23],['The term is ten and one-half hours.','10 1⁄2',23]]){
  const doc=make(text),saved=JSON.stringify(doc),[i]=check(doc);assert.ok(i,text);assert.equal(i.suggestion,wanted);assert.equal(i.guidePage,page);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(doc.text.slice(i.mixedHalfEvidence.start,i.mixedHalfEvidence.end),i.mixedHalfEvidence.sourceText);assert.ok(i.references[0].sourcePassage.text.includes(page===22?'701⁄2':'101⁄2'));
  assert.equal(jointStylisticIssues(doc,refs).filter(x=>x.start<i.end&&x.end>i.start).length,1,'No isolated whole-number warning');assert.equal(check(makeDocument([doc.text.slice(0,i.start)+i.suggestion+doc.text.slice(i.end)],'Corrected')).length,0);assert.equal(JSON.stringify(doc),saved);
 }
});
test('correct source notation, small Bill fractions, sentence openings and unfamiliar roles stay outside this extension',()=>{
 for(const text of ['The worker is 70½ years of age.','The worker is 70 1⁄2 years of age.','The term is three and one-half hours.','The worker is seventy and two-thirds years of age.','Seventy and one-half years of age is specified.','The program uses seventy and one-half units.','The term is seventy and one-half hours-code.','The term is seventy and one-half hours Act.'])assert.equal(check(make(text)).length,0,text);
});
test('every original quantity/unit cue rejects strikeouts and unknown exclusions',()=>{
 const doc=make('The worker is seventy and one-half years of age.'),i=check(doc)[0];assert.ok(i);
 for(const field of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+at);}
 for(const text of ['The term is -seventy and one-half hours.','The term is /seventy and one-half hours.','The term is seventy and one-half hoursα.'])assert.equal(check(make(text)).length,0,text);
});
test('quoted bill terms and literal enclosures protect values and reset for another bill',()=>{
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){assert.equal(check(make('The text says '+marks[0]+'seventy and one-half years of age'+marks[1]+'.')).length,0);assert.equal(check(make(marks[0]+'seventy and one-half years of age'+marks[1]+' means the specified age. The worker is seventy and one-half years of age.')).length,0);}
 assert.equal(check(make('The worker is seventy and one-half years of age.')).length,1);
});
