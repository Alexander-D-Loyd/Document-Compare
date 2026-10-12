import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {lcbFreshDefinitionQuoteReviewIssues}from '../app/style-lcb-review-quote-ownership.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {styleRuleInventory}from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE}from '../app/style-coverage.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),make=text=>makeDocument([text],'Current',[],[],words),direct=d=>lcbFreshDefinitionQuoteReviewIssues(d,refs),find=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fresh-quote-ownership-review');
const exact=(d,i)=>{const q=i.quoteEvidence;assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(q.punctuationStart,q.punctuationEnd),q.punctuation);assert.equal(d.text.slice(q.definitionVerb.start,q.definitionVerb.end),q.definitionVerb.text);assert.ok(q.evidenceStart===i.start&&q.evidenceEnd>=q.definitionVerb.end);assert.equal(i.suggestion,null);assert.ok(i.references.every(r=>r.preferred===null));};

test('four fresh marker types work in matching curly straight double and curly ASCII single quotes',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const mark of [';',':','?','!']){const d=make(open+'Eligible applicant'+mark+close+' means an individual who satisfies this section.'),before=JSON.stringify(d),[i]=direct(d);assert.ok(i,open+mark);assert.equal(i.text,open+'Eligible applicant'+mark+close);assert.equal(i.quoteEvidence.punctuation,mark);assert.equal(i.quoteEvidence.evidenceEnd,d.text.trimEnd().length);exact(d,i);assert.equal(JSON.stringify(d),before);const joint=find(d);assert.equal(joint.length,1);exact(d,joint[0]);}
});
test('recognizable quoted questions retain their own question marks without an ownership stop',()=>{
 for(const term of ['Who may apply','What is required','Where is the applicant','When can a person register','Why is registration required','How shall the agency act','Is the applicant eligible','Does this apply','Can a person apply'])assert.equal(direct(make('“'+term+'?” means an individual who registers.')).length,0,term);
});
test('selected complete imperative prompts and literal command title definitions stay protected',()=>{
 for(const term of ['Apply now','Register today','Call here','Contact now','Stop','Wait','Help','Do not enter','Call for service'])assert.equal(direct(make('“'+term+'!” means an individual who registers.')).length,0,term);
 for(const noun of ['title','heading','caption','command','literal text','string','name','code identifier','punctuation character','quoted phrase'])for(const mark of ['?','!'])assert.equal(direct(make('“Eligible applicant'+mark+'” means the '+noun+' on the form.')).length,0,noun+mark);
});
test('ASCII single-quoted apostrophes and complete multiword terms retain the whole source token',()=>{
 for(const term of ["Officer's applicant",'officer’s applicant',Array(40).fill('qualified').join(' ')+' participant']){const d=make("'"+term+";' means an individual who registers."),[i]=direct(d);assert.ok(i,term);assert.equal(i.quoteEvidence.term,term);assert.equal(i.text,"'"+term+";'");exact(d,i);}
});
test('long definition evidence reaches its actual terminator rather than a two-hundred-character continuation',()=>{
 const clause='an individual '+('who satisfies the applicable statutory requirement and '.repeat(20))+'is registered with the department.',d=make('“Participant;” means '+clause),[i]=direct(d);assert.ok(i);assert.equal(i.quoteEvidence.evidenceEnd,d.text.trimEnd().length);assert.ok(i.quoteEvidence.description.endsWith('with the department'));exact(d,i);for(const kind of ['struck','excluded']){const changed=structuredClone(d),start=changed.text.lastIndexOf('department');changed[kind]=[{start,end:start+10}];assert.equal(direct(changed).length,0,kind);}
});
test('every character in a long establishing definition remains required source evidence',()=>{
 const text='“Participant?” means an individual '+('who is registered and '.repeat(16))+'satisfies this section.',d=make(text),start=d.text.indexOf('means');for(const kind of ['struck','excluded'])for(let n=start;n<d.text.trimEnd().length;n++){const altered=structuredClone(d);altered[kind]=[{start:n,end:n+1}];assert.equal(direct(altered).length,0,kind+' '+n);}
});
test('complete decimal and known abbreviated references do not truncate the definition source clause',()=>{
 const d=make('“Participant;” means an individual under Section 12.3 who registers with Dr. Jones.'),[i]=direct(d);assert.ok(i);assert.equal(i.quoteEvidence.evidenceEnd,d.text.trimEnd().length);assert.ok(i.quoteEvidence.description.endsWith('Dr. Jones'));exact(d,i);
});
test('a semicolon ends the selected definition clause while an independent following sentence stays outside evidence',()=>{
 const d=make('“Participant!” means an individual who registers; a separate provision applies.'),[i]=direct(d);assert.ok(i);assert.equal(i.quoteEvidence.evidenceEnd,d.text.indexOf('; a separate')+1);assert.equal(i.quoteEvidence.description,'an individual who registers');const start=d.text.indexOf('separate');d.excluded=[{start,end:start+8}];assert.equal(direct(d).length,1);exact(d,i);
});
test('nested single enclosures with internal apostrophes cannot become fresh definitions',()=>{
 for(const [open,close]of [['‘','’'],["'","'"]])for(const inner of ['“Participant;”','"Participant?"']){const text='The witness said, '+open+"The officer's definition "+inner+' means an individual who registers.'+close;assert.equal(direct(make(text)).length,0,text);}
});
test('source-damaged provenance and enclosing quotation delimiters remain conservative protections',()=>{
 for(const prefix of ['The report reads: ','The previous statute uses ','Insert the words '])for(const kind of ['struck','excluded']){const d=make(prefix+'“Participant?” means an individual who registers.');d[kind]=[{start:0,end:prefix.length}];assert.equal(direct(d).length,0,prefix+kind);}
 const d=make("'The officer's definition “Participant!” means an individual who registers.'");for(const kind of ['struck','excluded']){const altered=structuredClone(d);altered[kind]=[{start:0,end:1}];assert.equal(direct(altered).length,0,'outer delimiter '+kind);}
});
test('headings literal payloads tables source damage and Unicode partial words retain protections',()=>{
 for(const text of ['“Participant?” means an individual................20','“Participant!” means an individual\nLEGISLATIVE COUNSEL’S DIGEST\nExisting law applies.','“Participant!” meansα an individual.','“Participant!” means an individualα.','α“Participant!” means an individual.','“?” means an unknown value.',"';' means a semicolon character."])assert.equal(direct(make(text)).length,0,text);
 for(const kind of ['struck','excluded']){const d=make('“Participant!” means an individual who registers.'),at=d.text.indexOf('!');d[kind]=[{start:at,end:at+1}];assert.equal(direct(d).length,0,kind);}
});
test('complete quote and definition selections survive recognized word and page divisions',()=>{
 const d=makeDocument(["'Eligible applic-", "AB 192 — 2 —\nline 1 ant?' means an individ-\nline 2 ual who registers."],'Current',[],[],words),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=find(d);assert.ok(i);assert.equal(i.quoteEvidence.term,'Eligible applicant');assert.equal(i.quoteEvidence.description,'an individual who registers');assert.equal(i.quoteEvidence.evidenceEnd,d.text.trimEnd().length);exact(d,i);assert.ok(i.text.includes('AB 192 — 2 —'));head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(direct(d).length,0);
});
test('expanded source coverage stays partial and names semantic prompt quotation limits',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-page-6','gpo-8.138']){const r=rows.find(r=>r.id===id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/question mark or exclamation point/);assert.match(r.scope,/no twelve-word cap/);assert.match(r.scope,/no two-hundred-character continuation limit/);assert.match(r.scope,/ambiguous single-quote\/apostrophe roles/);assert.match(r.scope,/not full punctuation automation/);}assert.match(CHECK_COVERAGE.find(r=>r.title==='Fresh-definition quotation punctuation').text,/ASCII single quotes/);
});
