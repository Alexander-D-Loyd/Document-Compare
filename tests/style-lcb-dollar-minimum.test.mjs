import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbDollarMinimumIssues,restoreDollarMinimumEvidence,LCB_DOLLAR_MINIMUM_SCOPE} from '../app/style-lcb-dollar-minimum.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current'),check=doc=>lcbDollarMinimumIssues(doc,refs);
const bad=['two hundred dollar','two-hundred dollar','two hundred-dollar'];

test('the complete exact LCB23 two-hundred-dollar minimum compares only its word-modifier hyphens',()=>{
 assert.ok(refs.lcb.pages[22].text.includes('two-hundred-dollar ($200) minimum'));
 for(const modifier of bad){const doc=make('The '+modifier+' ($200) minimum applies.'),before=JSON.stringify(doc),[i]=check(doc);assert.ok(i,modifier);assert.equal(check(doc).length,1);assert.equal(i.text,modifier);assert.equal(i.suggestion,'two-hundred-dollar');assert.equal(i.guideId,'lcb');assert.equal(i.guidePage,23);assert.equal(i.rule,'Numerals: Money');assert.equal(i.checkId,'lcb-dollar-minimum');assert.equal(doc.text.slice(i.start,i.end),modifier);const e=i.dollarMinimumEvidence;assert.equal(e.sourceValue,'200');for(const r of [e.modifier,e.amount,e.head,e.contextWitness])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(e.amount.text,'($200)');assert.equal(e.head.text,'minimum');assert.ok(e.amount.start>i.end);assert.ok(e.head.start>e.amount.end);assert.equal(JSON.stringify(doc),before);}
});

test('the exact printed construction and ordinary Unicode hyphens remain quiet without reformatting the figure',()=>{
 for(const modifier of ['two-hundred-dollar','two‐hundred‐dollar','two‑hundred‑dollar'])assert.equal(check(make('The '+modifier+' ($200) minimum applies.')).length,0,modifier);
 const doc=make('The two hundred dollar ( $200 ) minimum applies.'),i=check(doc)[0];assert.ok(i);assert.equal(i.dollarMinimumEvidence.amount.text,'( $200 )');assert.equal(i.text,'two hundred dollar');
 assert.equal(check(make('The board often two hundred dollar ($200) minimum applies.')).length,1,'A preceding nonnumeric word cannot become a number-token suffix');
});

test('other values amount agreement singular heads malformed tokens and numeric identifiers remain manual',()=>{
 for(const phrase of ['two hundred dollar ($201) minimum','two hundred dollar ($200.00) minimum','two hundred dollar ($2,00) minimum','two hundred dollar ($0200) minimum','two hundred dollars ($200) minimum','two hundred dollar minimum','two hundred dollar ($200) fee','three hundred dollar ($300) minimum','two hundred dollar ($200) minimums','two hundred dollar ($200) minimumα','two hundred dollará ($200) minimum','900719925474099312345678901234567890 two hundred dollar ($200) minimum','one two hundred dollar ($200) minimum','Section two hundred dollar ($200) minimum','-two hundred dollar ($200) minimum','two hundred dollar ($200) minimum-identifier'])assert.equal(check(make('The '+phrase+' applies.')).length,0,phrase);
 assert.match(LCB_DOLLAR_MINIMUM_SCOPE,/No arbitrary value-to-word conversion/);
});

test('only an actual intact Bill witness is eligible and monetary exceptions retain their owner',()=>{
 for(const text of ['The two hundred dollar ($200) minimum applies.','OPINION\nThe two hundred dollar ($200) minimum applies.','LEGISLATIVE COUNSEL’S DIGEST\nThe two hundred dollar ($200) minimum applies.','“The people do enact as follows:”\nThe two hundred dollar ($200) minimum applies.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const d=make('The two hundred dollar ($200) minimum applies.'),at=d.text.indexOf('enact');for(const field of ['struck','excluded']){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+5});assert.equal(check(damaged).length,0);}
 assert.equal(check(make('SEC. 1. The Legislature finds and declares the following:\nThe two hundred dollar ($200) minimum applies.')).length,0,'Known uncodified findings use figures alone');
 assert.equal(check(make('ASSEMBLY RESOLUTION No. 1\nThe two hundred dollar ($200) minimum applies.')).length,0,'Recognized resolution monetary form remains separate');
 assert.equal(check(make('SEC. 1. Section 7 of the Education Code is amended to read:\n7. The two hundred dollar ($200) minimum applies.')).length,1);
});

test('all modifier amount head and connecting source characters are complete establishing evidence',()=>{
 const phrase='two hundred dollar ($200) minimum',doc=make('The '+phrase+' applies.'),start=doc.text.indexOf(phrase),end=start+phrase.length;for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+at);}
 for(const phrase of ['one two hundred dollar ($200) minimum','two hundred dollar ($200) minimum Act']){const doc=make('The '+phrase+' applies.'),at=doc.text.indexOf(phrase.includes('Act')?'Act':'one');for(const field of ['struck','excluded']){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+3});assert.equal(check(damaged).length,0);}}
});

test('quotes local quoted forms literal names tables and genuine body dashes retain protection',()=>{
 for(const body of ['The “two hundred dollar ($200) minimum” applies.','“two hundred dollar” means the rate. The two hundred dollar ($200) minimum applies.','The Two Hundred Dollar ($200) Minimum applies.','The two hundred dollar ($200) minimum Act applies.','The two—hundred dollar ($200) minimum applies.','The two hundred—dollar ($200) minimum applies.'])assert.equal(check(make(body)).length,0,body);
 assert.equal(check(make('The two hundred dollar ($200) minimum applies.')).length,1);
 const table=make('The two hundred dollar ($200) minimum applies.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
});

test('recognized physical PDF divisions keep the word selection separate from full amount/head evidence',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The two hundred','AB 224 — 2 —\nline 1 dollar ($200) minimum applies.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1);const i=issues[0];assert.equal(i.suggestion,'two-hundred-dollar');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('AB 224'));assert.equal(i.dollarMinimumEvidence.amount.text,'($200)');const e=i.dollarMinimumEvidence,copy=JSON.stringify(e),restored=restoreDollarMinimumEvidence(e,x=>x,doc.text);for(const r of [restored.modifier,restored.amount,restored.head,restored.contextWitness])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(JSON.stringify(e),copy);assert.equal(JSON.stringify(doc),before);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(doc).length,0);
});

test('integrated exact monetary-modifier ownership retains full original evidence and independent GPO checks',()=>{
 for(const modifier of bad){const doc=make('The '+modifier+' ($200) minimum applies. The check up is required.'),issues=jointStylisticIssues(doc,refs),own=issues.filter(i=>i.checkId==='lcb-dollar-minimum');assert.equal(own.length,1,modifier);const i=own[0];assert.equal(i.suggestion,'two-hundred-dollar');assert.ok(!issues.some(other=>other!==i&&other.start<i.end&&other.end>i.start));assert.ok(issues.some(other=>other.checkId==='gpo-nominals'&&other.suggestion==='checkup'));for(const r of [i.dollarMinimumEvidence.modifier,i.dollarMinimumEvidence.amount,i.dollarMinimumEvidence.head,i.dollarMinimumEvidence.contextWitness])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.ok(i.references[0].sourcePassage.text.includes('two-hundred-dollar ($200) minimum'));}
 const compliant=jointStylisticIssues(make('The two-hundred-dollar ($200) minimum applies.'),refs);assert.equal(compliant.length,0);
});
