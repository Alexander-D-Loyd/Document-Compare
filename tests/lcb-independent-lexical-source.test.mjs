import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {billQuotedTermProtection}from '../app/style-quoted-terms.mjs';import {styleContext}from '../app/style-context.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/lcb-independent-lexical-source.json',import.meta.url))),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const words=await workerWords(),source=e=>makeDocument(e.pages.map(p=>p.text),e.sourcePDF.name,e.pages.map(p=>p.struck),structuredClone(e.pages.map(p=>p.formatting)),words),plain=t=>makeDocument([t],'Independent controlled text'),check=d=>jointStylisticIssues(d,refs);
test('independent public bill excerpts retain source text, printed page provenance, strikes and run geometry',()=>{
 assert.equal(fixture.entries.length,8);assert.equal(fixture.entries.reduce((n,e)=>n+e.pages.length,0),19);
 for(const e of fixture.entries){assert.match(e.sourcePDF.sha256,/^[a-f\d]{64}$/);const d=source(e),before=sha(d);for(const [n,p]of e.pages.entries()){assert.equal(sha(p.text),p.textSHA256);const bs=d.blocks.filter(b=>b.page===n+1);assert.equal(bs.length,p.formatting.length);for(let i=0;i<bs.length;i++)assert.deepEqual(bs[i].formatting.runs,p.formatting[i].runs);}check(d);assert.equal(sha(d),before);}
});
test('27 frozen LCB lexical selections retain exact original ranges and preferred forms on real bill excerpts',()=>{
 let count=0;for(const e of fixture.entries){const d=source(e),issues=check(d);for(const wanted of e.positive){assert.equal(d.text.slice(wanted.start,wanted.end),wanted.actual);const i=issues.find(i=>i.start===wanted.start&&i.end===wanted.end&&i.suggestion===wanted.suggestion);assert.ok(i,e.id+' source pages '+wanted.sourcePages+' '+wanted.actual);assert.ok(i.references.some(r=>r.guideId==='lcb'));assert.ok(!d.struck.some(r=>r.start<i.end&&r.end>i.start));count++;}}assert.equal(count,27);
});
test('real licensed childcare and open-space quoted forms protect unquoted recurrences within that bill',()=>{
 let count=0;for(const e of fixture.entries.filter(e=>e.quoted.length)){const d=source(e),protect=billQuotedTermProtection(d),issues=check(d);for(const q of e.quoted){assert.equal(d.text.slice(q.start,q.end),q.source);assert.equal(d.text.slice(q.quoteStart,q.quoteEnd),q.quotedSource);assert.equal(protect(q),true);assert.ok(!issues.some(i=>i.start>=q.start&&i.end<=q.end));count++;}}assert.equal(count,2);
});
test('printed LCB noun-form errors are contrasted with accepted listed spellings independently of parser guesses',()=>{
 for(const [wrong,right,frame,page]of [
  ['homepage','home page',t=>'The report is on the '+t+' of the agency website.',11],
  ['floor space','floorspace',t=>'The average total area of '+t+' for the proposed units shall not exceed 1,750 square feet.',10],
  ['homeownership','home ownership',t=>'The act supports '+t+' opportunities.',11],
  ['work day','workday',t=>'The employee works full-time hours in each '+t+'.',14],
  ['school days','schooldays',t=>'The school operates a minimum of 175 '+t+'.',13],
  ['cash flow','cashflow',t=>'The agency reviews a '+t+' analysis.',9]
 ]){const bad=plain(frame(wrong)),good=plain(frame(right)),i=check(bad).find(i=>i.suggestion===right);assert.ok(i,wrong);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===page));assert.ok(!check(good).some(i=>(i.matchText||i.text).toLowerCase()===right.toLowerCase()),right);}
});
test('an exact quoted lexical form stays accepted only for that bill and does not widen to interior capitals or hyphens',()=>{
 const a=plain('The term “homeownership” is defined. The act supports homeownership opportunities.'),at=a.text.lastIndexOf('homeownership');assert.equal(billQuotedTermProtection(a)({start:at,end:at+13}),true);assert.ok(!check(a).some(i=>i.suggestion==='home ownership'));
 const b=plain('The act supports homeownership opportunities.');assert.ok(check(b).some(i=>i.suggestion==='home ownership'));
 const d=plain('The term “open space land” is defined. Open space land is preserved. Open Space land differs. Open-space land differs.'),protect=billQuotedTermProtection(d);for(const [text,expected]of [['Open space land',true],['Open Space land',false],['Open-space land',false]]){const start=d.text.indexOf(text);assert.equal(protect({start,end:start+text.length}),expected,text);}
});
test('complete native margin labels do not become part of wrapped owner-occupied selection identity',()=>{
 const e=fixture.entries.find(e=>e.id==='sb79-afa4636cf795'),d=source(e),wanted=e.positive.find(r=>/owner\nline \d+ occupied/.test(r.actual));assert.ok(wanted);const i=check(d).find(i=>i.start===wanted.start&&i.end===wanted.end&&i.suggestion==='owner-occupied');assert.ok(i);assert.equal(i.matchText,'owner occupied');const ctx=styleContext(d);for(const b of d.blocks.filter(b=>b.margin&&b.start<i.end&&b.end>i.start))assert.equal(ctx.source.slice(b.start,b.start+b.margin.length).trim(),'');
});
test('actual SB3 stand-alone webpage is a bounded listed noun context, without general adjective guesses',()=>{
 const e=fixture.entries.find(e=>e.id==='sb3-2efde1a5eec0'),d=source(e),m=/stand-alone webpage for/u.exec(d.text);assert.ok(m);const start=m.index+'stand-alone '.length,i=check(d).find(i=>i.start===start&&i.end===start+7&&i.suggestion==='web page');assert.ok(i);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===14));
 for(const text of ['The agency reviews a red webpage for the election.','The agency reviews a stand-alone webpage containing the report.','The quoted term “stand-alone webpage” is stated. The stand-alone webpage for the election applies.'])assert.ok(!check(plain(text)).some(i=>i.suggestion==='web page'),text);
});
