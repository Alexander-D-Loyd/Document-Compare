import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {workerWords} from './helpers/spelling-worker.mjs';

const references=Object.fromEntries(['lcb','gpo'].map(guide=>[guide,JSON.parse(fs.readFileSync(new URL('../app/data/'+guide+'-reference.json',import.meta.url)))]));
const fixtureBytes=fs.readFileSync(new URL('./fixtures/lcb-independent-lexical-source.json',import.meta.url));
const fixture=JSON.parse(fixtureBytes);
const words=await workerWords();
const sha=value=>crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const check=doc=>{
 const before=sha(doc),issues=jointStylisticIssues(doc,references);
 assert.equal(sha(doc),before,'Review must preserve physical source text, strike intervals and PDF geometry');
 for(const issue of issues){assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.ok(issue.start>=0&&issue.end<=doc.text.length&&issue.end>issue.start);}
 return issues;
};
const document=(body,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:':kind==='Bill'?'The people do enact as follows:\nline 1 '+body:'OPINION\n'+body],'Independent source');
const selected=(doc,ids)=>check(doc).filter(issue=>ids.includes(issue.checkId));

test('independent frozen public PDF models keep every established source selection and all original text/geometry',()=>{
 assert.equal(sha(fixtureBytes),'55aa30248c5841b7ebdf255f75d0172ed2a8e91ca86e4edc3b61055e48d6692c');
 let pages=0,positives=0;
 for(const entry of fixture.entries){
  const doc=makeDocument(entry.pages.map(page=>page.text),entry.sourcePDF.name,entry.pages.map(page=>page.struck),structuredClone(entry.pages.map(page=>page.formatting)),words);
  for(const page of entry.pages){assert.equal(sha(page.text),page.textSHA256);pages++;}
  const findings=check(doc);
  for(const expected of entry.positive){assert.ok(findings.some(issue=>issue.start===expected.start&&issue.end===expected.end&&issue.suggestion===expected.suggestion),entry.id+' '+expected.actual);positives++;}
  for(const issue of findings.filter(issue=>issue.guideId==='lcb'))assert.ok(issue.references.some(ref=>ref.guideId==='lcb'&&ref.sourcePassage?.text),'An LCB selection must provide actual source evidence');
 }
 assert.equal(fixture.entries.length,8);assert.equal(pages,19);assert.equal(positives,27);
});

test('independent County law comparison corrects only the printed word, without identifying a different law',()=>{
 const id=['lcb-listed-punctuation-name'];
 const good='County Employees Retirement Law of 1937',bad='County Employees’ Retirement Law of 1937';
 assert.ok(references.lcb.pages[6].text.replace(/\s+/gu,' ').includes(good));
 for(const kind of ['Bill','Digest']){
  const doc=document('The '+bad+' applies.',kind),found=selected(doc,id);
  assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['Employees’','Employees']]);
  assert.equal(found[0].guidePage,7);assert.ok(found[0].references.some(ref=>ref.sourcePassage?.text.includes(good)));
  assert.equal(selected(document('The '+good+' applies.',kind),id).length,0);
 }
 for(const body of ['The County Employees’ Retirement Law applies.','The County Employees’ Retirement Law of 1938 applies.','The County Employees’ Retirement Law of 19370 applies.','The County Employees’ Retirement Law of 1937α applies.','The County Employees’ Retirement Law of 1937 Fund applies.','The Nevada County Employees’ Retirement Law of 1937 applies.','The County Employee Retirement Law of 1937 applies.','The County Employees’ Retirement Law of 1937-identifier applies.'])assert.equal(selected(document(body),id).length,0,body);
});

test('independent quoted County law spelling is bill-local and preserves initial-capitalization exception only',()=>{
 const id=['lcb-listed-punctuation-name'],term='county employees’ retirement law of 1937';
 const protectedDoc=document('The term “'+term+'” is defined. The '+term+' applies.');
 assert.equal(selected(protectedDoc,id).length,0);
 assert.ok(selected(document('The '+term+' applies.'),id).length,'A new bill must not inherit the quoted exception');
 const doc=document('The term “'+term+'” is defined. The County employees’ retirement law of 1937 applies.');
 assert.equal(selected(doc,id).length,0,'Only the initial letter differs');
 const variant=document('The term “'+term+'” is defined. The County Employees’ retirement law of 1937 applies.');
 assert.ok(selected(variant,id).length,'An interior capital is not licensed by a different quoted term');
});

test('whole printed Digest percentage expressions own their partial value/percent findings and preserve exact notation',()=>{
 for(const [source,replacement] of [['one-half of 1 percent','1⁄2 of 1%'],['one and one-half percent','1½%'],['½ of 1 percent','½ of 1%'],['1/2 of 1 percent','1/2 of 1%'],['1 1/2 percent','1 1/2%']]){
  const doc=document('The rate is '+source+'.','Digest'),issues=check(doc),start=doc.text.indexOf(source),end=start+source.length,owners=issues.filter(i=>i.start<end&&i.end>start);
  assert.equal(owners.length,1,source);assert.equal(owners[0].checkId,'lcb-digest-percent');assert.equal(owners[0].text,source);assert.equal(owners[0].suggestion,replacement);assert.equal(owners[0].guidePage,23);
  assert.ok(owners[0].references.some(ref=>ref.guideId==='lcb'&&ref.sourcePassage?.text.includes('percent')));
  const evidence=owners[0].digestPercentEvidence;assert.equal(doc.text.slice(evidence.start,evidence.end),evidence.sourceText);
  for(const component of evidence.components)assert.equal(doc.text.slice(component.start,component.end),component.text);
 }
 for(const source of ['1⁄2 of 1%','1/2 of 1%','½ of 1%','1½%','1 1/2%','0.5%','1.5%'])assert.equal(selected(document('The rate is '+source+'.','Digest'),['lcb-digest-percent']).length,0,source);
});

test('bounded fractional percentage checks never reinterpret magnitudes, unfamiliar fractions or wrong document contexts',()=>{
 const id=['lcb-digest-percent'];
 for(const source of ['11½ percent','01½ percent','123456789012345678901234567890½ percent','1.5½ percent','1/3 percent','1½ percentα','1½ percent-format','1½ percent%','1½ percent to 2 percent','Form 1½ percent','1½ percent Act','one-third of 1 percent','one-half of 2 percent','two and one-half percent'])assert.equal(selected(document('The rate is '+source+'.','Digest'),id).length,0,source);
 for(const kind of ['Bill','Unknown'])for(const source of ['one-half of 1 percent','one and one-half percent','1½ percent'])assert.equal(selected(document('The rate is '+source+'.',kind),id).length,0,kind+' '+source);
 for(const source of ['“one-half of 1 percent” means the rate. The rate is one-half of 1 percent.','“1½ percent” means the rate. The rate is 1½ percent.','One and one-half percent is payable.','The rate is one—half of 1 percent.'])assert.equal(selected(document(source,'Digest'),id).length,0,source);
 assert.equal(selected(document('The rate is one and one-half percent.','Digest'),id).length,1,'A quoted previous bill has no authority in the next bill');
});

test('inclusive reference commas preserve whole identifiers, share capitalization ownership and add no inclusive intent',()=>{
 const id=['lcb-inclusive-range'];
 for(const [source,replacement] of [['sections 123 to 130 inclusive apply.','Sections 123 to 130, inclusive,'],['Sections 123 to 130 inclusive.','Sections 123 to 130, inclusive'],['Pupils in grades 1 to 6 inclusive attend.','grades 1 to 6, inclusive,'],['Sections 000123.500 to 999999999999999999999999.600 inclusive apply.','Sections 000123.500 to 999999999999999999999999.600, inclusive,']]){
  const doc=document(source),issues=check(doc),owners=issues.filter(i=>id.includes(i.checkId));assert.equal(owners.length,1,source);const owner=owners[0];assert.equal(owner.suggestion,replacement);assert.equal(issues.filter(i=>i.start<owner.end&&i.end>owner.start).length,1,'No fragment/capitalization duplicate');
  assert.ok(owner.references.some(ref=>ref.guideId==='lcb'&&ref.guidePage===22&&ref.sourcePassage?.text.includes('inclusive')));assert.equal(doc.text.slice(owner.referenceRangeEvidence.start,owner.referenceRangeEvidence.end),owner.referenceRangeEvidence.sourceText);
 }
 for(const source of ['Sections 123 to 130 apply.','Sections 123 through 130 inclusive apply.','Section 123 to 130 inclusive apply.','Sections one to four inclusive apply.','Items 123 to 130 inclusive apply.','Sections 123 to 130, inclusive, apply.','The term “Sections 123 to 130 inclusive” is defined. Sections 123 to 130 inclusive apply.','Sections 123 to 130 inclusive-access rules apply.','Sections 123 to 130 inclusive.1 rules apply.','Sections 123 to 130 inclusiveα apply.'])assert.equal(selected(document(source),id).length,0,source);
});

test('complete percentage and inclusive-range evidence must survive every physical struck/excluded source character',()=>{
 for(const [body,kind,id,span] of [['The rate is one and one-half percent.','Digest','lcb-digest-percent','one and one-half percent'],['Sections 123 to 130 inclusive apply.','Bill','lcb-inclusive-range','Sections 123 to 130 inclusive apply']]){
  const original=document(body,kind),start=original.text.indexOf(span);assert.equal(selected(original,[id]).length,1);
  for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(selected(doc,[id]).length,0,field+' '+body+' '+at);}
  const table=structuredClone(original);table.blocks.find(b=>b.text.includes(body)).formatting={headerGaps:[1,2]};assert.equal(selected(table,[id]).length,0,'Actual table geometry');
 }
 for(const field of ['struck','excluded'])for(const [body,kind,id,damage] of [['The rate is one and unknown one-half percent.','Digest','lcb-digest-percent','unknown'],['Sections 123 not to 130 inclusive apply.','Bill','lcb-inclusive-range','not']]){
  const doc=document(body,kind),start=doc.text.indexOf(damage);doc[field].push({start,end:start+damage.length});assert.equal(selected(doc,[id]).length,0,'Removed body wording cannot fabricate a printed construction');
 }
});

test('physical line/page headers retain original complete percentage and inclusive-reference selection coordinates',()=>{
 for(const [pages,id,replacement] of [
  [['LEGISLATIVE COUNSEL’S DIGEST\nline 1 The rate is one-half of','AB 224 — 2 —\nline 1 1 percent.\nThe people do enact as follows:'],'lcb-digest-percent','1⁄2 of 1%'],
  [['The people do enact as follows:\nline 1 Sections 123 to','AB 224 — 2 —\nline 1 130 inclusive apply.'],'lcb-inclusive-range','Sections 123 to 130, inclusive,']
 ]){
  const doc=makeDocument(pages,'Independent public-layout reconstruction'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
  const found=selected(doc,[id]);assert.equal(found.length,1);assert.equal(found[0].suggestion,replacement);assert.ok(found[0].text.includes('\n'));
  assert.equal(check(doc).filter(i=>i.start<found[0].end&&i.end>found[0].start).length,1,'One correction covers the physical continuation');
 }
});

test('printed Cal-OSHA alias and case corrections retain one owner and a complete source-confirmed noun head',()=>{
 assert.ok(references.lcb.pages[8].text.includes('Cal-OSHA'));
 for(const agency of ['Cal OSHA','cal OSHA','calOSHA','cal-osha']){
  const doc=document('The '+agency+' requirements apply.'),at=doc.text.indexOf(agency),issues=check(doc),owners=issues.filter(i=>i.start<at+agency.length&&i.end>at);
  assert.equal(owners.length,1,agency);assert.equal(owners[0].suggestion,'Cal-OSHA');assert.ok(owners[0].references.some(ref=>ref.guideId==='lcb'&&ref.sourcePassage?.text.includes('Cal-OSHA')));
 }
 for(const body of ['The Cal-OSHA program applies.','The Cal OSHA applies.','The Cal OSHA program Act applies.','The Model Cal OSHA program applies.','The Cal OSHA program.1 applies.','The Cal OSHA programsα apply.','The Cal OSHA requirements-code applies.','The Cal OSHA requirements of Nevada apply.','The Cal—OSHA requirements apply.','The term “Cal OSHA” is defined. The Cal OSHA program applies.'])assert.equal(selected(document(body),['lcb-listed-agency-form']).length,0,body);
 assert.equal(selected(document('The Cal OSHA program applies.'),['lcb-listed-agency-form']).length,1,'Quoted authority cannot leak to a subsequent bill');
});

test('quoted alias, longer named law and head/source masks cannot fabricate complete printed identities',()=>{
 for(const [body,damage,id] of [['The Cal unknown OSHA program applies.','unknown','lcb-listed-agency-form'],['The Cal OSHA unrelated program applies.','unrelated','lcb-listed-agency-form'],['The County Employees’ unrelated Retirement Law of 1937 applies.','unrelated','lcb-listed-punctuation-name'],['The Nevada County Employees’ Retirement Law of 1937 applies.','Nevada','lcb-listed-punctuation-name'],['The County Employees’ Retirement Law of 1937 Fund applies.','Fund','lcb-listed-punctuation-name']]){
  for(const field of ['struck','excluded']){const doc=document(body),start=doc.text.indexOf(damage);doc[field].push({start,end:start+damage.length});assert.equal(selected(doc,[id]).length,0,field+' '+body);}
 }
 for(const [body,span,id] of [['The Cal OSHA program applies.','Cal OSHA program','lcb-listed-agency-form'],['The County Employees’ Retirement Law of 1937 applies.','County Employees’ Retirement Law of 1937','lcb-listed-punctuation-name']]){
  const original=document(body),start=original.text.indexOf(span);assert.ok(selected(original,[id]).length);
  for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(selected(doc,[id]).length,0,field+' '+body+' '+at);}
 }
});

test('the complete printed monetary minimum establishes one exact Bill modifier, never another amount or document type',()=>{
 const body='The two hundred dollar ($200) minimum applies.',doc=document(body),issues=check(doc),owner=issues.find(i=>i.checkId==='lcb-dollar-minimum');assert.ok(owner);
 assert.equal(owner.text,'two hundred dollar');assert.equal(owner.suggestion,'two-hundred-dollar');assert.equal(owner.dollarMinimumEvidence.sourceValue,'200');assert.equal(owner.dollarMinimumEvidence.amount.text,'($200)');assert.equal(issues.filter(i=>i.start<owner.evidenceEnd&&i.end>owner.evidenceStart).length,1);
 assert.ok(owner.references.some(ref=>ref.guideId==='lcb'&&ref.sourcePassage?.text.includes('two-hundred-dollar')));
 for(const body of ['The two-hundred-dollar ($200) minimum applies.','The two hundred dollar ($201) minimum applies.','The two hundred dollar ($200.00) minimum applies.','The two hundred dollar ($2,000) minimum applies.','The two hundred dollar ($2000) minimum applies.','The two hundred dollar ($200) minimumα applies.','The two hundred dollar ($200) minimum-amount applies.','The two hundred dollar ($200) minimum Act applies.','The Form two hundred dollar ($200) minimum applies.','The term “two hundred dollar” is defined. The two hundred dollar ($200) minimum applies.'])assert.equal(selected(document(body),['lcb-dollar-minimum']).length,0,body);
 for(const kind of ['Digest','Unknown'])assert.equal(selected(document(body,kind),['lcb-dollar-minimum']).length,0,kind);
 const start=doc.text.indexOf('two'),span='two hundred dollar ($200) minimum';
 for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(selected(bad,['lcb-dollar-minimum']).length,0,field+' '+at);}
 for(const field of ['struck','excluded']){const bad=document('The two hundred dollar not ($200) minimum applies.'),at=bad.text.indexOf('not');bad[field].push({start:at,end:at+3});assert.equal(selected(bad,['lcb-dollar-minimum']).length,0);}
});

test('the exact printed four-class income series owns one whole correction and leaves other orders or names manual',()=>{
 const modifier='extremely low, very low, low and moderate income',replacement='extremely low, very low, low-, and moderate-income';
 for(const kind of ['Bill','Digest']){
  const doc=document('The '+modifier+' households receive assistance.',kind),issues=check(doc),owner=issues.find(i=>i.checkId==='lcb-income-series');assert.ok(owner,kind);assert.equal(owner.text,modifier);assert.equal(owner.suggestion,replacement);assert.equal(issues.filter(i=>i.start<owner.evidenceEnd&&i.end>owner.evidenceStart).length,1,'No contained partial modifier/serial comma duplicates');
  const evidence=owner.incomeSeriesEvidence;for(const part of [...evidence.components,evidence.modifier,evidence.head])assert.equal(doc.text.slice(part.start,part.end),part.text);assert.equal(evidence.head.text,'households');const source=evidence.sourceExample;assert.equal(references.lcb.pages[source.guidePage-1].text.slice(source.start,source.end),source.text);
 }
 for(const body of ['The '+replacement+' households receive assistance.','The very low, low and moderate income households receive assistance.','The very low, extremely low, low and moderate income households receive assistance.','The extremely low, very low, low and moderate income individuals receive assistance.','The extremely low, very low, low and moderate income householdsα receive assistance.','The extremely low, very low, low and moderate income households Act applies.','The term “'+modifier+'” is defined. The '+modifier+' households receive assistance.'])assert.equal(selected(document(body),['lcb-income-series']).length,0,body);
 const doc=document('The '+modifier+' households receive assistance.'),span=modifier+' households',start=doc.text.indexOf(modifier);
 for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(selected(bad,['lcb-income-series']).length,0,field+' '+at);}
 for(const field of ['struck','excluded']){const bad=document('The extremely low, very low, unknown low and moderate income households receive assistance.'),at=bad.text.indexOf('unknown');bad[field].push({start:at,end:at+7});assert.equal(selected(bad,['lcb-income-series']).length,0);}
});

test('independent complete-document review keeps all six source-backed owners separate from unrelated existing GPO findings',()=>{
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe rate is one and one-half percent.\nThe people do enact as follows:\nline 1 Sections 123 to 130 inclusive apply.\nline 2 The County Employees’ Retirement Law of 1937 applies.\nline 3 The Cal OSHA requirements apply.\nline 4 The two hundred dollar ($200) minimum applies.\nline 5 The extremely low, very low, low and moderate income households receive assistance.\nline 6 The check up is required.'],'Independent complete source');
 const issues=check(doc),ids=['lcb-digest-percent','lcb-inclusive-range','lcb-listed-punctuation-name','lcb-listed-agency-form','lcb-dollar-minimum','lcb-income-series'];
 for(const id of ids){const found=issues.filter(i=>i.checkId===id);assert.equal(found.length,1,id);const owner=found[0];assert.equal(issues.filter(i=>i.start<owner.end&&i.end>owner.start).length,1,id+' has no duplicate overlap');assert.equal(owner.guideId,'lcb');assert.equal(owner.conflict,false);}
 assert.ok(issues.some(i=>i.guideId==='gpo'&&i.suggestion==='checkup'),'Finite LCB ownership does not discard unrelated GPO rules');
});

test('all six exact LCB-compliant controls stay quiet through the complete production checker',()=>{
 for(const [body,kind] of [['The rate is 1⁄2 of 1%.','Digest'],['The rate is 1½%.','Digest'],['Sections 123 to 130, inclusive, apply.','Bill'],['Pupils in grades 1 to 6, inclusive, attend.','Bill'],['The County Employees Retirement Law of 1937 applies.','Bill'],['The Cal-OSHA program applies.','Bill'],['The two-hundred-dollar ($200) minimum applies.','Bill'],['The extremely low, very low, low-, and moderate-income households receive assistance.','Bill']])assert.equal(check(document(body,kind)).length,0,kind+' '+body);
});

test('user-restored data-sharing agreements use the explicit unit-modifier provision with one selected owner',()=>{
 for(const [body,expected] of [['The board retains a data sharing agreement.','data-sharing'],['The data sharing agreements apply.','data-sharing'],['Data sharing agreement applies.','Data-sharing']]){
  const doc=document(body),issues=check(doc),owner=issues.find(i=>i.checkId==='lcb-data-sharing-agreement');assert.ok(owner,body);assert.equal(owner.suggestion,expected);assert.equal(issues.filter(i=>i.start<owner.end&&i.end>owner.start).length,1);
  assert.ok(owner.references.some(ref=>ref.guideId==='lcb'&&ref.guidePage===8&&ref.sourcePassage?.kind==='Source provision'&&ref.sourcePassage?.text.includes('unit modifier')));
 }
 for(const body of ['The agreement concerns data sharing.','The data sharing is permitted.','The agency shares data under an agreement.','The data-sharing agreement applies.','The data sharing program operates.','The Data Sharing Agreement applies.','The data sharing agreement Act applies.','The data sharing agreementsα apply.','The data sharing agreement.1 applies.','The data sharing agreement-identifier applies.','The term “Data sharing” is defined. The data sharing agreement applies.'])assert.equal(selected(document(body),['lcb-data-sharing-agreement']).length,0,body);
 assert.equal(selected(document('The data sharing agreement applies.'),['lcb-data-sharing-agreement']).length,1,'The quoted authority from a previous bill does not persist');
});

test('data-sharing source and intact head cannot be manufactured by exclusions, damaged literal marks or record quotations',()=>{
 const id=['lcb-data-sharing-agreement'],body='The data sharing agreement applies.',original=document(body),span='data sharing agreement',start=original.text.indexOf(span);
 for(const field of ['struck','excluded'])for(let at=start;at<start+span.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(selected(doc,id).length,0,field+' '+at);}
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=document('The instruction shall insert '+marks[0]+'data sharing agreement'+marks[1]+'.');assert.equal(selected(doc,id).length,0);
  for(const field of ['struck','excluded'])for(const mark of marks){const damaged=structuredClone(doc),at=doc.text.indexOf(mark);damaged[field].push({start:at,end:at+1});assert.equal(selected(damaged,id).length,0,field+' quoted '+mark);}
 }
 for(const body of ['The data unrelated sharing agreement applies.','The data sharing unrelated agreement applies.'])for(const field of ['struck','excluded']){const doc=document(body),at=doc.text.indexOf('unrelated');doc[field].push({start:at,end:at+9});assert.equal(selected(doc,id).length,0);}
});

test('including boundary has one complete owner and keeps the original item, list meaning and unrelated findings',()=>{
 const id=['lcb-listed-including-boundary'];
 for(const kind of ['Bill','Digest'])for(const phrase of ['including but not limited to','including, but not limited to,']){
  const doc=document('The agency lists records '+phrase+' reports.',kind),issues=check(doc),owner=issues.find(i=>id.includes(i.checkId));assert.ok(owner);assert.equal(owner.text,'records '+phrase);assert.equal(owner.suggestion,'records, including, but not limited to,');assert.equal(issues.filter(i=>i.start<owner.end&&i.end>owner.start).length,1,'No contained existing including-comma owner');
  const e=owner.includingBoundaryEvidence;assert.equal(doc.text.slice(e.evidenceStart,e.evidenceEnd),e.sourceText);assert.equal(doc.text.slice(e.itemStart,e.itemEnd),'reports');assert.ok(owner.references.some(ref=>ref.guideId==='lcb'&&ref.guidePage===7&&ref.sourcePassage?.text.includes(', including, but not limited to,')));
 }
 assert.equal(check(document('The agency lists records, including, but not limited to, reports.')).length,0);
 for(const body of ['The agency lists record including, but not limited to, reports.','The agency lists records including, but not limited to, reportsα.','The agency lists records including, but not limited to, reports/key.','The agency lists records including, but not limited to, reports.2','The agency lists records including, but not limited to, reports Act.','The agency lists records including, but not limited to, reports novelword.','The agency acts without including, but not limited to, reports.','Including, but not limited to, reports applies.'])assert.equal(selected(document(body),id).length,0,body);
});

test('including lists retain quote/directive/record literal and complete physical source protections',()=>{
 const id=['lcb-listed-including-boundary'],body='The agency lists records including, but not limited to, reports.',original=document(body),owner=selected(original,id)[0];assert.ok(owner);
 for(const field of ['struck','excluded'])for(let at=owner.evidenceStart;at<owner.evidenceEnd;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(selected(doc,id).length,0,field+' '+at);}
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=document('The instruction shall insert '+marks[0]+body+marks[1]);assert.equal(selected(doc,id).length,0);
  for(const field of ['struck','excluded'])for(const mark of marks){const damaged=structuredClone(doc),at=doc.text.indexOf(mark);damaged[field].push({start:at,end:at+1});assert.equal(selected(damaged,id).length,0,field+' '+mark);}
 }
 for(const field of ['struck','excluded']){const doc=document('The agency lists unknown records including, but not limited to, reports.'),at=doc.text.indexOf('unknown');doc[field].push({start:at,end:at+7});assert.equal(selected(doc,id).length,0);}
 const quoted=document('“records including, but not limited to, reports” means a record list. '+body);assert.equal(selected(quoted,id).length,0);
 assert.equal(selected(original,id).length,1,'A quoted earlier bill does not license another bill');
});

test('all new exact rule helpers respect complete original instructional and record literals when individual quotation marks are damaged',()=>{
 const cases=[['lcb-dollar-minimum','two hundred dollar ($200) minimum','Bill'],['lcb-inclusive-range','Sections 123 to 130 inclusive apply','Bill'],['lcb-digest-percent','The rate is one and one-half percent','Digest'],['lcb-income-series','The extremely low, very low, low and moderate income households receive assistance','Bill'],['lcb-listed-including-boundary','The agency lists records including but not limited to reports','Bill'],['lcb-listed-agency-form','The Cal OSHA program applies','Bill'],['lcb-listed-punctuation-name','The County Employees’ Retirement Law of 1937 applies','Bill']];
 for(const [id,body,kind] of cases)for(const prefix of ['The instruction shall insert ','The record contains '])for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=document(prefix+marks[0]+body+marks[1]+'.',kind);assert.equal(selected(doc,[id]).length,0,id+' intact literal');
  const opening=doc.text.indexOf(marks[0]),closing=doc.text.lastIndexOf(marks[1]);assert.ok(closing>opening);
  for(const field of ['struck','excluded'])for(const at of [opening,closing]){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(selected(bad,[id]).length,0,id+' '+field+' original '+marks.join('')+' at '+at);}
 }
});
