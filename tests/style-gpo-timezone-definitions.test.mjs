import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoTimezoneDefinitionIssues} from '../app/style-gpo-timezone-definitions.mjs';
import {attachGuideEvidence} from '../app/style-guide-evidence.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';

const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const productionRefs={...refs,lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const review=doc=>reviewStyleIssues(doc,productionRefs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const timezones=doc=>review(doc).filter(i=>i.checkId==='gpo-timezone-definitions');
// Independent transcription of the complete printed table, including case.
const rows=[
 ['AKDT','Alaska daylight time'],['AKST','Alaska standard time'],['AKT','Alaska time'],
 ['AST','Atlantic standard time'],['AT','Atlantic time'],['CDT','central daylight time'],
 ['CST','central standard time'],['CT','central time'],['ChST','Chamorro standard time'],
 ['DST','daylight saving time'],['EDT','eastern daylight time'],['EST','eastern standard time'],
 ['ET','eastern time'],['GCT','Greenwich civil time'],['GMAT','Greenwich mean astronomical time'],
 ['GMT','Greenwich mean time'],['HDT','Hawaii-Aleutian daylight time'],
 ['HST','Hawaii-Aleutian standard time'],['LST','local standard time'],
 ['MDT','mountain daylight time'],['MST','mountain standard time'],['MT','mountain time'],
 ['PDT','Pacific daylight time'],['PST','Pacific standard time'],['PT','Pacific time'],
 ['SST','Samoan standard time'],['UTC','coordinated universal time']
];
const make=text=>makeDocument(Array.isArray(text)?text:[text],'Current');
const check=text=>gpoTimezoneDefinitionIssues(make(text),refs);
const exact=(doc,issue)=>{
 assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 assert.ok(issue.evidenceStart<=issue.start&&issue.evidenceEnd>=issue.end);
 const citation=attachGuideEvidence(issue,refs).references[0],page=refs.gpo.pages.find(p=>p.page===248),witness=citation.sourcePassage;
 assert.equal(citation.rule,'9.47');assert.equal(citation.guidePrintedPage,'234');
 assert.equal(page.text.slice(witness.start,witness.end),witness.text);
 assert.ok(witness.text.startsWith(issue.suggestion+'—'));
};

test('all 27 complete canonical time-zone definitions are quiet; each wrong recognized pair has its exact printed authority',()=>{
 assert.equal(rows.length,27);
 for(let n=0;n<rows.length;n++){
  const [symbol,name]=rows[n],wrong=rows[(n+1)%rows.length][0];
  assert.equal(check('Use '+name+' ('+symbol+').').length,0,name);
  const doc=make('Use '+name+' ('+wrong+').'),before=JSON.stringify(doc),found=gpoTimezoneDefinitionIssues(doc,refs);
  assert.equal(found.length,1,name);const [issue]=found;
  assert.equal(issue.suggestion,symbol);assert.equal(issue.text,wrong);exact(doc,issue);
  assert.equal(doc.text.slice(issue.evidenceStart,issue.evidenceEnd),name+' ('+wrong+')');
  assert.equal(JSON.stringify(doc),before,'review does not mutate the document');
 }
});

test('all printed symbols retain exact case, closed letters and no periods only inside complete definitions',()=>{
 for(const [symbol,name] of rows){
  const variants=[symbol.toLowerCase(),symbol.split('').join('.')+'.',symbol.split('').join(' ')];
  for(const variant of variants){const found=check('Use '+name+' ('+variant+').');assert.deepEqual(found.map(i=>i.suggestion),[symbol],name+' / '+variant);assert.equal(found[0].text,variant);}
 }
 assert.deepEqual(check('Use Chamorro standard time (CHST).').map(i=>i.suggestion),['ChST']);
 assert.equal(check('Use PACIFIC STANDARD TIME (PST).').length,0,'full-name case is not a rule inferred from the table');
});

test('Greenwich, Alaska, daylight and regional entries remain separate without seasonal or location inference',()=>{
 const text='Use Greenwich mean astronomical time (GMT), Greenwich mean time (GMAT), Greenwich civil time (GMT), Alaska time (AKST), Alaska daylight time (AKT), and Alaska standard time (AKDT).';
 assert.deepEqual(check(text).map(i=>i.suggestion),['GMAT','GMT','GCT','AKT','AKDT','AKST']);
 for(const text of [
  'In Hawaii in July, use Hawaii-Aleutian daylight time (HDT).',
  'Use Chamorro standard time (ChST) and Samoan standard time (SST).',
  'Daylight saving time (DST) starts on another date.',
  'Use daylight savings time (DST).',
  'Use Pacific standard time, UTC+8, and 8 p.m. in Alaska.'
 ])assert.equal(check(text).length,0,text);
});

test('unpaired names, unknown symbols, ordinary words and longer unfamiliar names do not receive guessed symbols',()=>{
 for(const text of [
  'AT, CT, ET, MT, PT, DST, CHST, P.S.T., and p s t are data labels.',
  'Use Pacific standard time (XYZ), Hawaii standard time (PST), and western standard time (EST).',
  'Use Greenwich mean astronomical timekeeping (GMT).',
  'The Alaska timezone (AKST) is displayed.',
  'Central time is used by the office. AT is a common label.',
  'Use Pacific standard time (ESTimate) and Pacific standard time (EST2).',
  'Use Pacific standard time [EST] and EST (Pacific standard time).'
 ])assert.equal(check(text).length,0,text);
 for(const dash of ['–','—','―'])assert.equal(check('Use Hawaii'+dash+'Aleutian daylight time (GMT).').length,0,'narrative dash is not a compound-name witness');
 for(const hyphen of ['-','‐','‑'])assert.deepEqual(check('Use Hawaii'+hyphen+'Aleutian daylight time (GMT).').map(i=>i.suggestion),['HDT']);
});

test('missing, altered and ambiguous authority cannot create an exact time-zone correction',()=>{
 const doc=make('Use Pacific standard time (EST).');
 assert.equal(gpoTimezoneDefinitionIssues(doc,{}).length,0);
 assert.equal(gpoTimezoneDefinitionIssues(doc,{gpo:{pages:[]}}).length,0);
 for(const mutation of [
  text=>text.replace('9.47.','9.48.'),
  text=>text.replace('The following forms are to be used','The following forms were withdrawn'),
  text=>text.replace('PST—Pacific  standard time','PST—another name'),
  text=>text.replace('PST—Pacific  standard time','PST—Pacific  standard time\nPST—Pacific  standard time')
 ]){
  const changed=structuredClone(refs);changed.gpo.pages.find(p=>p.page===248).text=mutation(changed.gpo.pages.find(p=>p.page===248).text);
  assert.equal(gpoTimezoneDefinitionIssues(doc,changed).length,0);
 }
 const changed=structuredClone(refs);changed.gpo.pages.find(p=>p.page===248).text=changed.gpo.pages.find(p=>p.page===248).text.replace('PST—Pacific  standard time','PST—another name');
 assert.deepEqual(gpoTimezoneDefinitionIssues(make('Use Pacific standard time (EST) and Alaska time (PST).'),changed).map(i=>i.suggestion),['AKT'],'one unavailable row does not suppress another exact authority');
});

test('all original name, whitespace, parenthesis and symbol evidence is required in both source-removal channels',()=>{
 for(const text of ['Use Pacific standard time (E.S.T.).','Use Chamorro standard time (C H S T).','Use Hawaii-Aleutian daylight time (GMT).']){
  const original=make(text),[issue]=gpoTimezoneDefinitionIssues(original,refs);assert.ok(issue,text);
  for(const channel of ['struck','excluded'])for(let at=issue.evidenceStart;at<issue.evidenceEnd;at++){
   const doc=structuredClone(original);doc[channel]=[...(doc[channel]||[]),{start:at,end:at+1}];
   assert.equal(gpoTimezoneDefinitionIssues(doc,refs).length,0,channel+' '+at+' '+JSON.stringify(text[at]));
  }
 }
});

test('quoted literal and bill-local forms remain protected even after an enclosure mark is removed',()=>{
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const text='The phrase '+open+'Pacific standard time (EST)'+close+' is printed.',doc=make(text);
  assert.equal(gpoTimezoneDefinitionIssues(doc,refs).length,0,text);
  for(const channel of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){
   const changed=structuredClone(doc);changed[channel]=[...(changed[channel]||[]),{start:at,end:at+1}];
   assert.equal(gpoTimezoneDefinitionIssues(changed,refs).length,0,channel+' quote '+at);
  }
 }
 assert.equal(check('“Pacific standard time (EST)” is the defined form. Use Pacific standard time (EST).').length,0,'exact bill-local wording is protected in subsequent prose');
});

test('original technical boundaries and apparent program names cannot be removed to expose a definition',()=>{
 const phrase='Pacific standard time (EST)';
 for(const prefix of ['X','é','𐐀','_','/','#','@','-','1','e\u0301']){
  const text='Use '+prefix+phrase+'.',doc=make(text);assert.equal(gpoTimezoneDefinitionIssues(doc,refs).length,0,text);
  for(const channel of ['struck','excluded']){
   const changed=structuredClone(doc);changed[channel]=[{start:4,end:4+prefix.length}];assert.equal(gpoTimezoneDefinitionIssues(changed,refs).length,0,text+' / '+channel);
  }
 }
 for(const suffix of ['X','é','𐐀','_','/ID','#1','@x','-code','1','\u0301']){
  const text='Use '+phrase+suffix+'.',doc=make(text);assert.equal(gpoTimezoneDefinitionIssues(doc,refs).length,0,text);
  for(const channel of ['struck','excluded']){
   const changed=structuredClone(doc),start=4+phrase.length;changed[channel]=[{start,end:start+suffix.length}];assert.equal(gpoTimezoneDefinitionIssues(changed,refs).length,0,text+' / '+channel);
  }
 }
 for(const text of ['The '+phrase+' Program applies.','The '+phrase+' Regional Fund is hereby established.']){
  const doc=make(text);assert.equal(gpoTimezoneDefinitionIssues(doc,refs).length,0,text);
  const start=text.indexOf(')',text.indexOf(phrase))+1,end=text.indexOf(' applies.')>0?text.indexOf(' applies.'):text.length-1;
  for(const channel of ['struck','excluded']){const changed=structuredClone(doc);changed[channel]=[{start,end}];assert.equal(gpoTimezoneDefinitionIssues(changed,refs).length,0,text+' / '+channel);}
 }
});

test('heading and geometry table definitions are protected; digest and bill route automatically',()=>{
 const doc=make('Pacific standard time (EST)\nLEGISLATIVE COUNSEL’S DIGEST\nUse Pacific standard time (EST).\nThe people do enact as follows:\nUse Pacific standard time (EST).');
 assert.deepEqual(gpoTimezoneDefinitionIssues(doc,refs).map(i=>i.context),['Digest','Bill']);
 const table=make('Use Pacific standard time (EST).');table.blocks[0].formatting={headerGaps:[{},{}]};
 assert.equal(gpoTimezoneDefinitionIssues(table,refs).length,0);
});

test('physical margins, recognized interior heads and split names retain exact offsets without mutation',()=>{
 const doc=make(['The people do enact as follows:\nline 1 Use Pacific stan-','AB 999 — 2 —\nline 1 dard time\nline 2 (E. S. T.).']),head=doc.blocks.find(b=>b.text==='AB 999 — 2 —');
 head.formatting={headerParts:[{text:head.text}]};
 const start=doc.text.indexOf('stan-'),second=doc.text.indexOf('dard');
 doc.wrappedWords=[{word:'standard',parts:['stan','dard'],start,end:second+4,spans:[{start,end:start+4},{start:second,end:second+4}],recognized:true}];
 const before=JSON.stringify(doc),found=gpoTimezoneDefinitionIssues(doc,refs);assert.equal(found.length,1);
 const [issue]=found;exact(doc,issue);assert.equal(issue.text,'E. S. T.');assert.equal(issue.suggestion,'PST');
 assert.equal(issue.evidenceStart,doc.text.indexOf('Pacific'));assert.equal(issue.evidenceEnd,doc.text.indexOf('(E. S. T.)')+10);
 assert.equal(JSON.stringify(doc),before);
 const unknown=structuredClone(doc),bad=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');bad.formatting={};bad.runningHead=false;bad.layoutLabel=false;
 assert.equal(gpoTimezoneDefinitionIssues(unknown,refs).length,0,'unknown interior bridge supplies no authority');
 for(const channel of ['struck','excluded']){
  const changed=structuredClone(doc);changed[channel]=[...(changed[channel]||[]),{start:second,end:second+1}];assert.equal(gpoTimezoneDefinitionIssues(changed,refs).length,0);
 }
});

test('split symbols preserve complete physical selections; an unavailable adjacent definition does not suppress another',()=>{
 const doc=make('The people do enact as follows:\nline 1 Use Pacific standard time (E.\nline 2 S. T.).');
 const [issue]=gpoTimezoneDefinitionIssues(doc,refs);assert.ok(issue);exact(doc,issue);
 assert.equal(issue.text,'E.\nline 2 S. T.');assert.equal(issue.suggestion,'PST');
 assert.equal(issue.evidenceEnd,doc.text.indexOf('T.)')+3);
 assert.equal(timezones(doc)[0].text,issue.text);
 for(const channel of ['struck','excluded']){
  const changed=make('Use Pacific standard time (EST) and Alaska time (PST).'),at=changed.text.indexOf('Pacific')+3;
  changed[channel].push({start:at,end:at+1});
  assert.deepEqual(gpoTimezoneDefinitionIssues(changed,refs).map(i=>i.suggestion),['AKT']);
  assert.deepEqual(timezones(changed).map(i=>i.suggestion),['AKT']);
 }
});

test('production retains all 27 exact definitions, independent clocks/units/LCB checks and physical evidence offsets',()=>{
 for(let n=0;n<rows.length;n++){
  const [symbol,name]=rows[n],wrong=rows[(n+1)%rows.length][0],doc=make('Use '+name+' ('+wrong+').'),found=timezones(doc);
  assert.equal(found.length,1,name);assert.equal(found[0].suggestion,symbol);exact(doc,found[0]);
  assert.equal(timezones(make('Use '+name+' ('+symbol+').')).length,0,name);
 }
 const doc=make('Use Pacific standard time (E.S.T.). Meet at 2:30 P.M. Measure milligrams (MG). The advisor shall act.'),before=JSON.stringify(doc),all=review(doc);
 for(const [text,suggestion] of [['E.S.T.','PST'],['2:30 P.M.','2:30 p.m.'],['MG','mg'],['advisor','adviser']])assert.ok(all.some(i=>i.text===text&&i.suggestion===suggestion),text+' / '+JSON.stringify(all.map(i=>[i.text,i.suggestion])));
 assert.equal(JSON.stringify(doc),before);
 const wrapped=make('Use Pacific stan-\nline 2 dard time (E.S.T.).');
 const start=wrapped.text.indexOf('stan-'),second=wrapped.text.indexOf('dard');
 wrapped.wrappedWords=[{word:'standard',parts:['stan','dard'],start,end:second+4,spans:[{start,end:start+4},{start:second,end:second+4}],recognized:true}];
 const [issue]=timezones(wrapped);assert.ok(issue);exact(wrapped,issue);
 assert.equal(issue.evidenceStart,wrapped.text.indexOf('Pacific'));assert.equal(issue.evidenceEnd,wrapped.text.indexOf('(E.S.T.)')+8);assert.equal(issue.text,'E.S.T.');
 for(const channel of ['struck','excluded']){
  const changed=structuredClone(wrapped);changed[channel].push({start:second,end:second+1});assert.equal(timezones(changed).length,0);
 }
});
