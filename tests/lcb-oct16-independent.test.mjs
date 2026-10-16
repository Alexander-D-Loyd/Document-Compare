import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbListedPunctuationFormIssues} from '../app/style-lcb-listed-punctuation-forms.mjs';
import {lcbMixedHalfIssues} from '../app/style-lcb-mixed-halves.mjs';
import {workerWords} from './helpers/spelling-worker.mjs';

const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const id='lcb-listed-punctuation-form';
const words=await workerWords();
const make=(body,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+body],'Independent October 16 source');
const check=(doc,joint=false)=>{
 const saved=JSON.stringify(doc),issues=joint?jointStylisticIssues(doc,refs).filter(i=>i.checkId===id):lcbListedPunctuationFormIssues(doc,refs);
 assert.equal(JSON.stringify(doc),saved,'Physical source and PDF geometry remain unchanged');
 for(const i of issues){assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(doc.text.slice(i.listedPunctuationEvidence.start,i.listedPunctuationEvidence.end),i.listedPunctuationEvidence.sourceText);assert.equal(i.guidePage,7);const cite=i.references.find(r=>r.guideId==='lcb'),norm=s=>s.replace(/\s+/gu,' ').trim();assert.equal(norm(refs.lcb.pages[6].text.slice(cite.sourcePassage.start,cite.sourcePassage.end)),norm(cite.sourcePassage.text));assert.ok(norm(cite.sourcePassage.text).includes(i.listedPunctuationEvidence.printedForm));}
 return issues;
};
const cases=[
 ['A city, county or city and county may act.','city, county or city and county may',' or',', or'],
 ['The term is 16 months or two or three years.','16 months or two or three years',' or',', or'],
 ['The person holds a real estate broker’s license.','holds a real estate broker’s license','real estate broker’s license','real estate broker license'],
 ['The person applies for a real estate salesperson’s license.','applies for a real estate salesperson’s license','real estate salesperson’s license','real estate salesperson license'],
 ['The property is under United States’ control.','under United States’ control','United States’ control','United States control']
];

test('independent printed LCB7 forms have exact source citations, one production owner and immutable source',()=>{
 for(const [body,,text,suggestion] of cases)for(const kind of ['Bill','Digest']){
  const doc=make(body,kind),found=check(doc);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[text,suggestion]],body);
  const joint=check(doc,true);assert.deepEqual(joint.map(i=>[i.start,i.end,i.suggestion]),found.map(i=>[i.start,i.end,i.suggestion]));
  assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.start<joint[0].end&&i.end>joint[0].start).length,1,'No duplicate or competing component correction');
 }
});

test('independent compliant page7 forms and nonlisted identities stay quiet',()=>{
 for(const body of ['A city, county, or city and county may act.','The term is 16 months, or two or three years.','The person holds a real estate broker license.','The person holds a real estate salesperson license.','The property is under United States control.','The term is 17 months or two or three years.','The term is 16 months or two or four years.','A city, district or city and county may act.','The real estate broker’s license was surrendered.','The person owns a real estate broker’s license.','The property is under United Kingdom’s control.'])assert.equal(check(make(body)).length,0,body);
});

test('independent technical identifiers and complete title extensions cannot authorize listed form corrections',()=>{
 for(const body of ['The person holds a real estate broker’s license-code.','The person holds a real estate broker’s license.1.','The property is under United States’ control-code.','The property is under United States’ control.1.','A city, county or city and county may-code.','A city, county or city and county mayα act.','The person holds a real estate broker’s license Act.','The property is under United States’ control Authority.','A city, county or city and county Act may act.','The term is 16 months or two or three years-identifier.'])assert.equal(check(make(body)).length,0,body);
});

test('independent complete supporting construction cannot be fabricated by any damaged source character',()=>{
 for(const [body,span]of cases){const original=make(body),start=original.text.indexOf(span);assert.equal(check(original).length,1);
  for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0,field+' '+body+' '+at);}
 }
 for(const field of ['struck','excluded'])for(const [body,word]of [['A city, county or city and county unknown may act.','unknown'],['The term is 16 months or two or three years unknown may apply.','unknown'],['The person holds unrelated a real estate broker’s license.','unrelated'],['The property is under unrelated United States’ control.','unrelated']]){const doc=make(body),at=doc.text.indexOf(word);doc[field].push({start:at,end:at+word.length});assert.equal(check(doc).length,0,field+' '+body);}
});

test('independent original double and single quotations remain protected when either mark is damaged',()=>{
 for(const [body,span]of cases)for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=make(body.replace(span,open+span+close));assert.equal(check(doc).length,0,body);
  for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+body+' '+open);}
 }
});

test('independent bill-local quoted forms allow initial case differences and reset for the next bill',()=>{
 for(const [body,span]of cases){const doc=make('The term “'+span+'” is defined. '+body);assert.equal(check(doc,true).length,0,body);assert.equal(check(make(body),true).length,1,'A previous bill cannot authorize this spelling');}
 const body='The term “City, county or city and county” is defined. A city, county or city and county may act.';assert.equal(check(make(body),true).length,0);
});

test('independent actual table geometry and headings remain outside the printed prose checks',()=>{
 for(const [body]of cases){const table=make(body);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0,body);const head=makeDocument([body+'\nThe people do enact as follows:\nline 1 Other language applies.'],'Heading');assert.equal(check(head).length,0,body);}
});

test('independent hidden longer-title and technical suffix evidence cannot manufacture a listed identity',()=>{
 for(const field of ['struck','excluded'])for(const [body,damage]of [['The person holds a real estate broker’s license Act.','Act'],['The property is under United States’ control Authority.','Authority'],['A city, county or city and county Act may act.','Act'],['The person holds a real estate broker’s license-code.','-code'],['The property is under United States’ control-code.','-code']]){
  const doc=make(body),at=doc.text.indexOf(damage);doc[field].push({start:at,end:at+damage.length});assert.equal(check(doc).length,0,field+' '+body);
 }
});

test('independent listed duration values remain exact and unfamiliar groupings remain outside scope',()=>{
 for(const tail of ['two or three','2 or three','two or 3','2 or 3']){const doc=make('The term is 16 months or '+tail+' years.');const found=check(doc);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[' or',', or']]);assert.ok(found[0].listedPunctuationEvidence.sourceText.includes('16 months or '+tail+' years'));}
 for(const body of ['The term is 016 months or two or three years.','The term is 116 months or two or three years.','The term is 16.0 months or two or three years.','The term is 16 months or two or thirty years.','The term is 16 months or two or three fiscal years.','The term is 16 months and two or three years.','The term is 16 months or two or three yearsα.'])assert.equal(check(make(body)).length,0,body);
});

test('independent recognized row and page breaks keep complete production evidence on original physical coordinates',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The person holds a real estate bro-','AB 224 — 2 —\nline 1 ker’s license.'],'Physical source',[],[],words);const head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=check(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,'real estate broker license');assert.ok(found[0].text.includes('\n'));
});

const mixed=(doc,joint=false)=>{
 const before=JSON.stringify(doc),found=joint?jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-mixed-half-quantity'):lcbMixedHalfIssues(doc,refs);assert.equal(JSON.stringify(doc),before);
 for(const i of found){const e=i.mixedHalfEvidence;assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(doc.text.slice(e.start,e.end),e.sourceText);assert.equal(doc.text.slice(e.unitStart,e.unitEnd),e.unit);const source=i.references.find(r=>r.sourcePassage),page=refs.lcb.pages[source.guidePage-1],norm=s=>s.replace(/\s+/gu,' ').trim();assert.equal(norm(page.text.slice(source.sourcePassage.start,source.sourcePassage.end)),norm(source.sourcePassage.text));}
 return found;
};
test('independent mixed-half source forms own the complete value once and preserve exact quantity',()=>{
 for(const kind of ['Bill','Digest'])for(const [body,suggestion,page]of [['The period is ten and one-half hours.','10 1⁄2',23],['The person is seventy and one-half years of age.','70 1⁄2',22],['The period is ninety-nine and one-half minutes.','99 1⁄2',23],['The period is 10 and one-half hours.','10 1⁄2',23]]){
  const doc=make(body,kind),direct=mixed(doc),found=mixed(doc,true);assert.equal(found.length,1,body);assert.equal(found[0].suggestion,suggestion);assert.equal(found[0].guidePage,page);assert.equal(direct.length,1);assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.start<found[0].end&&i.end>found[0].start).length,1,'Complete mixed value must not leave a competing whole-number or fractional finding');
 }
});
test('independent mixed-half bounds retain other quantities, contexts and technical literals',()=>{
 for(const body of ['The period is nine and one-half hours.','The period is ten and one-third hours.','The period is ten and one-half meters.','The period is ten and one-half hours-code.','The period is 10 and one-half hours.1.','The person is seventy and one-half years of age.1.','The period is − ten and one-half hours.','The period is minus ten and one-half hours.','The period is plus ten and one-half hours.','Ten and one-half hours apply.','The period is ten and one-half hours Act.'])assert.equal(mixed(make(body)).length,0,body);
 for(const body of ['The period is 10½ hours.','The person is 70 1⁄2 years of age.'])assert.equal(mixed(make(body)).length,0,body);
});
test('independent complete mixed-half evidence requires every live source character',()=>{
 const body='The person is seventy and one-half years of age.',span='seventy and one-half years of age',original=make(body),start=original.text.indexOf(span);assert.equal(mixed(original).length,1);
 for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(mixed(doc).length,0,field+' '+at);}
 for(const field of ['struck','excluded'])for(const [body,damage]of [['The period is ten unrelated and one-half hours.','unrelated'],['The period is ten and one-half hours Act.','Act'],['The period is − ten and one-half hours.','−']]){const doc=make(body),at=doc.text.indexOf(damage);doc[field].push({start:at,end:at+damage.length});assert.equal(mixed(doc).length,0,field+' '+body);}
 const table=make(body);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(mixed(table).length,0);
});
test('independent mixed-half original literals and bill-local quoted variants stay protected and reset',()=>{
 const span='ten and one-half hours';for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const doc=make('The period is '+open+span+close+'.');assert.equal(mixed(doc).length,0);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(mixed(damaged).length,0,field+' '+open);}}
 assert.equal(mixed(make('The term “Ten and one-half hours” is defined. The period is ten and one-half hours.'),true).length,0);assert.equal(mixed(make('The period is ten and one-half hours.'),true).length,1);
});
test('independent mixed-half evidence restores reader-recognized word divisions and original unit offsets',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The person is seven-','AB 224 — 2 —\nline 1 ty and one-half years of age.'],'Physical source',[],[],words),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=mixed(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,'70 1⁄2');assert.ok(found[0].text.includes('\n'));
});
test('independent complete larger mixed-half values never select only a written suffix',()=>{
 for(const [body,wanted]of [['The period is one hundred and ten and one-half hours.','110 1⁄2'],['The person is one hundred seventy and one-half years of age.','170 1⁄2'],['The period is one thousand ten and one-half hours.','1,010 1⁄2'],['The period is one hundred and twenty-five and one-half hours.','125 1⁄2']]){
  const clean=make(body),found=mixed(clean);assert.equal(found.length,1,body);assert.equal(found[0].start,clean.text.indexOf('one '));assert.equal(found[0].suggestion,wanted);
  for(const field of ['struck','excluded']){const doc=make(body),start=doc.text.indexOf('one hundred')>=0?doc.text.indexOf('one hundred'):doc.text.indexOf('one thousand'),word=body.includes('thousand')?'one thousand':'one hundred';doc[field].push({start,end:start+word.length});assert.equal(mixed(doc).length,0,field+' '+body);}
 }
});
test('independent newly wired constitutional form keeps one whole owner and nested physical source coordinates',()=>{
 for(const alias of ['XIIIB','XIII-B'])for(const divided of [false,true]){
  const pages=divided?['The people do enact as follows:\nline 1 Under Article '+alias+' of the California Consti-','AB 224 — 2 —\nline 1 tution, the provision applies.']:['The people do enact as follows:\nline 1 Under Article','AB 224 — 2 —\nline 1 '+alias+' of the California Constitution, the provision applies.'];
  const doc=makeDocument(pages,'Physical source',[],[],words),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs),found=issues.filter(i=>i.checkId==='lcb-listed-reference-form');assert.equal(found.length,1,alias+' '+divided);const issue=found[0],e=issue.listedReferenceEvidence;assert.equal(issue.suggestion,'Article XIII B');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(issues.filter(i=>i.start<issue.end&&i.end>issue.start).length,1);assert.equal(doc.text.slice(e.start,e.end),e.sourceText);for(const range of [e.selection,e.identifier,e.continuation])assert.equal(doc.text.slice(range.start,range.end),range.text);assert.equal(refs.lcb.pages[21].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(e.sourceExample.text,'Article XIII B');assert.equal(JSON.stringify(doc),saved);
 }
});
test('independent newly wired constitutional aliases respect bill-local identifiers and complete qualifier protection',()=>{
 const found=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-listed-reference-form');
 for(const body of ['The term “XIIIB” is defined. Article XIIIB of the California Constitution applies.','The term “article XIII-B” is defined. Article XIII-B of the California Constitution applies.','Article XIIIB of the Nevada Constitution applies.','Article XIIIB of the California Constitution Act applies.','Article XIIIB of the California Constitution.2 applies.'])assert.equal(found(make(body)).length,0,body);
 assert.equal(found(make('Article XIIIB of the California Constitution applies.')).length,1,'A prior quoted bill does not license the next one');
 for(const field of ['struck','excluded']){const doc=make('Article XIIIB of the unrelated California Constitution applies.'),at=doc.text.indexOf('unrelated');doc[field].push({start:at,end:at+9});assert.equal(found(doc).length,0,field);}
});
test('independent final source guard controls reject body dashes and astral word fragments',()=>{
 for(const dash of ['‐','‑','‒','–','—'])for(const body of ['The person is seventy'+dash+'one and one-half years of age.','The period is ten and one'+dash+'half hours.'])assert.equal(mixed(make(body)).length,0,body);
 for(const field of [null,'struck','excluded']){const doc=make('The person 𐐀holds a real estate broker’s license.'),at=doc.text.indexOf('𐐀');if(field)doc[field].push({start:at,end:at+2});assert.equal(check(doc).length,0,String(field));}
});
