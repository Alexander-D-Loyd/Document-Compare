import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';import {styleEvidenceGuard}from '../app/style-evidence.mjs';import {billQuotedTermProtection}from '../app/style-quoted-terms.mjs';
import {jointStylisticIssues}from '../app/joint-style.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {inStatePrepositionalEvidence}from '../app/style-in-state-evidence.mjs';import {nonNominalModifierHeadEvidence}from '../app/style-modifier-head-evidence.mjs';
import {digestPayload,amendmentName}from '../app/digest-amendment.mjs';import {digestChangedRanges}from '../app/digest-delta.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/legislative-stabilization-source-excerpts.json',import.meta.url))),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const entry=id=>fixture.entries.find(e=>e.id===id),source=id=>{const e=entry(id);return makeDocument(e.pages.map(p=>p.text),e.sourcePDF.name,e.pages.map(p=>p.struck),structuredClone(e.pages.map(p=>p.formatting)));},plain=text=>makeDocument([text],'Current'),check=(doc,options={})=>jointStylisticIssues(doc,refs,{includeReviewSuggestions:true,...options});
test('frozen public source excerpts retain complete text, strikes and physical source run geometry',()=>{
 for(const e of fixture.entries){assert.match(e.sourcePDF.sha256,/^[a-f\d]{64}$/);for(const p of e.pages)assert.equal(sha(p.text),p.textSHA256);const d=source(e.id);assert.equal(d.text,e.pages.map(p=>p.text).join('\n'));for(const [n,p]of e.pages.entries()){const blocks=d.blocks.filter(b=>b.page===n+1);assert.equal(blocks.length,p.formatting.length);for(let i=0;i<blocks.length;i++){assert.equal(blocks[i].formatting.x,p.formatting[i].x);assert.equal(blocks[i].formatting.right,p.formatting[i].right);assert.deepEqual(blocks[i].formatting.runs,p.formatting[i].runs);}}}
});
test('actual AB76 JR source rows keep numbers in the gutter and text at original x100',()=>{
 const d=source('ab76-current'),rows=d.blocks.filter(b=>b.jrBox);assert.equal(rows.length,3);assert.deepEqual(rows.map(b=>b.margin),['line 14 ','line 15 ','line 16 ']);for(const b of rows){const f=b.formatting,p=f.headerParts[0];assert.equal(p.start,b.margin.length);assert.equal(p.anchor,'left');assert.equal(f.columnLeft+p.position*(f.columnRight-f.columnLeft),100);assert.ok(p.position>0);assert.equal(b.ignored,true);}assert.ok(!d.effectiveTokens.some(t=>t.value==='JR11'));
});
test('actual AB224 coauthor italic remains a physical source attribute',()=>{
 const d=source('ab224-current'),b=d.blocks.find(b=>b.text.includes('Principal coauthor:'));assert.ok(b);assert.ok(b.formatting.runs.some(r=>r.italic));assert.ok(!d.struck.some(r=>r.start<b.end&&r.end>b.start));
});
test('actual AB224 digest highlights only frozen red removals and blue additions while keeping Digest label',()=>{
 const old=source('ab224-previous'),now=source('ab224-current'),delta=digestChangedRanges(digestPayload(old).tokens,digestPayload(now).tokens),expected=fixture.digestDelta;assert.deepEqual(delta.previousRanges.map(r=>({...r,text:old.text.slice(r.start,r.end)})),expected.removedRanges);assert.deepEqual(delta.currentRanges.map(r=>({...r,text:now.text.slice(r.start,r.end)})),expected.addedRanges);assert.equal(amendmentName({digest:true,number:'Digest'}),'Digest');assert.equal(amendmentName({number:'1'}),'Amendment 1');for(const [key,ranges]of [['previous',delta.previousRanges],['current',delta.currentRanges]]){const witness=expected.retainedWitnesses[key];assert.ok(!ranges.some(r=>r.start<witness.end&&r.end>witness.start));}
});
test('actual budget tables and struck amounts are protected while numbered margins and running heads are masked',()=>{
 const d=source('ab109-e6823d62260a'),ctx=styleContext(d),guard=styleEvidenceGuard(d,ctx),table=d.blocks.find(b=>b.margin==='line 45 '&&/^Office\./.test(b.text.slice(b.margin.length)));assert.ok(table);assert.equal(ctx.tableAt(table.start),true);assert.equal(guard(table.start+table.margin.length,table.end),true);
 const struck=d.struck.find(r=>d.text.slice(r.start,r.end).includes('188,040,000'));assert.ok(struck);assert.equal(guard(struck.start,struck.end),true);for(const b of d.blocks.filter(b=>b.runningHead))assert.equal(ctx.source.slice(b.start,b.end).trim(),'');for(const b of d.blocks.filter(b=>b.margin))assert.equal(ctx.source.slice(b.start,b.start+b.margin.length).trim(),'');assert.ok(d.text.includes('Office....................................................................... 0'));
});
test('actual AB8 preposition and pursuant constructions cannot supply a hyphenated nominal head',()=>{
 const d=source('ab8-bc84321afb07'),ctx=styleContext(d),m=/a change\s+in state\s+statute/u.exec(ctx.source);assert.ok(m);const a=m.index+m[0].indexOf('in state');assert.ok(inStatePrepositionalEvidence(d,ctx,a,a+8,m.index+m[0].length));const b=d.blocks.find(b=>/pursuant to/.test(b.text)&&/laboratory|licensed/.test(b.text));assert.ok(b);const at=b.start+b.text.indexOf('pursuant');assert.ok(nonNominalModifierHeadEvidence(d,ctx,{start:at,end:at+8}));
});
test('quoted authority accepts only initial-letter case variation and exact interior form',()=>{
 const d=plain('The term “Student only health center” is stated. A student only health center applies. Student Only health center differs. Student-only health center differs.'),protect=billQuotedTermProtection(d),lower=d.text.indexOf('student only'),interior=d.text.indexOf('Student Only'),hyphen=d.text.indexOf('Student-only');assert.equal(protect({start:lower,end:lower+24}),true);assert.equal(protect({start:interior,end:interior+24}),false);assert.equal(protect({start:hyphen,end:hyphen+25}),false);
});
test('quoted form protection is rebuilt after replacing a bill or removing its active quotation',()=>{
 const first=plain('The term “advisor” is stated. The advisor acts.'),last=first.text.lastIndexOf('advisor');assert.equal(billQuotedTermProtection(first)({start:last,end:last+7}),true);const next=plain('The advisor acts.');assert.equal(billQuotedTermProtection(next)({start:4,end:11}),false);first.struck=[{start:first.text.indexOf('“'),end:first.text.indexOf('”')+1}];assert.equal(billQuotedTermProtection(first)({start:last,end:last+7}),false);
});
test('grammar and unknown engine rules cannot be promoted into LCB style candidates',()=>{
 const d=plain('The agency reviews applications.'),p=prepareOfflineLanguage(d),at=p.text.indexOf('reviews'),raw={start:at,end:at+7,evidenceStart:0,evidenceEnd:p.text.length,suggestion:'review',engine:'LanguageTool',engineRule:'AGREEMENT_SENT_START'};assert.deepEqual(mapOfflineIssues(d,p,[raw],'style'),[]);assert.deepEqual(mapOfflineIssues(d,p,[{...raw,engine:'spaCy',engineRule:'LCB_DATA_PROCESSING_MODIFIER'}],'grammar'),[]);assert.deepEqual(mapOfflineIssues(d,p,[{...raw,engineRule:'UNREGISTERED_GRAMMAR_RULE'}],'grammar'),[]);
});
test('precise printed LCB word forms remain available without changing accepted forms',()=>{
 assert.ok(check(plain('The agency appoints an advisor.')).some(i=>i.suggestion==='adviser'&&i.references.some(r=>r.guideId==='lcb')));assert.ok(!check(plain('The agency appoints an adviser.')).some(i=>/advis/.test(i.text)));
 assert.ok(!check(plain('The term “advisor” is stated. The advisor acts.')).some(i=>i.suggestion==='adviser'));assert.ok(check(plain('The advisor acts.')).some(i=>i.suggestion==='adviser'));
});
test('printed LCB modifier contrasts retain precise corrections and accept their listed forms',()=>{
 for(const [phrase,preferred,noun]of [['data processing','data-processing','programs'],['high quality','high-quality','programs'],['cost effective','cost-effective','plans']]){
  const bad=plain('The agency requires '+phrase+' '+noun+'.'),good=plain('The agency requires '+preferred+' '+noun+'.');
  assert.ok(check(bad).some(i=>i.text===phrase&&i.suggestion===preferred&&i.references.some(r=>r.guideId==='lcb'&&/Hyphenation examples/.test(r.rule))),phrase);
  assert.ok(!check(good).some(i=>i.text.includes(preferred)),preferred);
 }
});
test('generic modifier and unlisted grammar candidates cannot become production findings through legacy options',()=>{
 for(const phrase of ['social media','information technology','quality assurance','law enforcement','person centered','agency certified','gas free']){const d=plain('The agency reviews '+phrase+' programs.'),a=d.text.indexOf(phrase),head=d.text.indexOf('programs'),candidate={start:a,end:a+phrase.length,text:phrase,matchText:phrase,suggestion:null,evidenceStart:0,evidenceEnd:d.text.length,head:'programs',headStart:head,headEnd:head+8,engine:'spaCy',engineRule:'LCB_GENERAL_UNIT_MODIFIER_REVIEW',reviewSuggested:true,reviewVariant:'open-modifier'};const issues=check(d,{engineIssues:[candidate],includeNounSequenceReview:true,includeQualifiedNounPrefixReview:true,includeParsedPredicateReview:true});assert.ok(!issues.some(i=>i.engineRule==='LCB_GENERAL_UNIT_MODIFIER_REVIEW'||i.checkId==='lcb-general-unit-modifier-review'),phrase);}
});
