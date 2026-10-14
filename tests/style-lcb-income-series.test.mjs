import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbIncomeSeriesIssues,lcbIncomeSeriesProtectionRanges,restoreIncomeSeriesEvidence,LCB_INCOME_SERIES_SCOPE} from '../app/style-lcb-income-series.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const preferred='extremely low, very low, low-, and moderate-income',make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current'),check=doc=>lcbIncomeSeriesIssues(doc,refs);
const variants=['extremely low, very low, low and moderate income','extremely low, very low, low- and moderate-income','extremely low, very low, low, and moderate-income','extremely-low, very-low, low-, and moderate-income','extremely low-, very low-, low and moderate income','extremely low very low low and moderate income'];

test('the intact exact four-category households sequence compares the complete printed LCB7 form',()=>{
 for(const input of variants){const doc=make('The '+input+' households receive assistance.'),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,input);const i=issues[0];assert.equal(i.text,input);assert.equal(i.suggestion,preferred);assert.equal(i.guideId,'lcb');assert.equal(i.guidePage,7);assert.equal(i.checkId,'lcb-income-series');assert.equal(doc.text.slice(i.start,i.end),input);const e=i.incomeSeriesEvidence;assert.equal(e.components.length,4);assert.equal(e.head.text,'households');assert.ok(e.head.start>i.end);for(const r of [...e.components,e.head,e.modifier])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(refs.lcb.pages[6].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(e.sourceExample.text.replace(/\s+/gu,' '),preferred+' households');assert.equal(JSON.stringify(doc),before);}
});

test('the printed compliant sequence and preserved initial capital or ordinary Unicode hyphen stay quiet',()=>{
 for(const input of [preferred,preferred.replaceAll('-','‐'),preferred.replaceAll('-','‑'),'Extremely low, very low, low-, and moderate-income'])assert.equal(check(make('The '+input+' households receive assistance.')).length,0,input);
 const doc=make('Extremely low, very low, low and moderate income households receive assistance.'),i=check(doc)[0];assert.ok(i);assert.equal(i.suggestion,'Extremely low, very low, low-, and moderate-income');
});

test('different categories order conjunctions and heads cannot inherit the printed list',()=>{
 for(const input of ['very low, extremely low, low and moderate income households','extremely low, low, very low and moderate income households','extremely low, very low and moderate income households','extremely low, very low, low or moderate income households','extremely low, very low, low and high income households','extremely low, very low, low and moderate income families','extremely low, very low, low and moderate income household','extremely low, very low, low and moderate income householdsα','extremelylow, very low, low and moderate income households','extremely lowé, very low, low and moderate income households','extremely low, very low, low and moderate income households-identifier','unknown-extremely low, very low, low and moderate income households'])assert.equal(check(make('The '+input+' receive assistance.')).length,0,input);
 assert.match(LCB_INCOME_SERIES_SCOPE,/No household eligibility/);
 assert.equal(check(make('The label is Form '+variants[0]+' households.')).length,0,'An explicit identifier label does not establish ordinary list syntax');
});

test('every category comma hyphen conjunction head and connecting space is establishing source evidence',()=>{
 const phrase='extremely low, very low, low and moderate income households',doc=make('The '+phrase+' receive assistance.'),start=doc.text.indexOf(phrase),end=start+phrase.length;assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+at);}
 const title=make('The '+phrase+' Act applies.'),at=title.text.indexOf('Act');for(const field of ['struck','excluded']){const damaged=structuredClone(title);damaged[field].push({start:at,end:at+3});assert.equal(check(damaged).length,0,'Masked title extension cannot establish ordinary prose');}
});

test('literal and bill-local quoted forms titles tables genuine body dashes and headings remain protected',()=>{
 for(const body of ['The “'+variants[0]+' households” receive assistance.','“moderate income” means the class. The '+variants[0]+' households receive assistance.','The Extremely Low, Very Low, Low and Moderate Income Households Program applies.','The '+variants[0]+' households Act applies.','The extremely—low, very low, low and moderate income households receive assistance.','The extremely low, very low, low and moderate—income households receive assistance.'])assert.equal(check(make(body)).length,0,body);
 assert.equal(check(make('The '+variants[0]+' households receive assistance.')).length,1,'Quoted authority remains document-local');
 const heading=makeDocument(['The '+variants[0]+' households receive assistance.\nThe people do enact as follows:\nOther content applies.'],'Current');assert.equal(check(heading).length,0);
 const table=make('The '+variants[0]+' households receive assistance.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
});

test('physical page divisions preserve exact modifier and separate households evidence',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The extremely low, very low, low and','AB 224 — 2 —\nline 1 moderate income households receive assistance.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1);const i=issues[0];assert.equal(i.suggestion,preferred);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('AB 224'));const e=i.incomeSeriesEvidence,copy=JSON.stringify(e),restored=restoreIncomeSeriesEvidence(e,x=>x,doc.text);for(const r of [restored.modifier,...restored.components,restored.head])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.deepEqual(restored.sourceExample,e.sourceExample);assert.equal(JSON.stringify(e),copy);assert.equal(JSON.stringify(doc),before);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(doc).length,0);
});

test('exact complete income titles protect only contained shared-modifier ownership with full source evidence',()=>{
 for(const title of ['Act','Code','Law','Fund','Account','Authority','Department','Agency','Commission','Board']){const doc=make('The '+variants[0]+' households '+title+' applies.'),ranges=lcbIncomeSeriesProtectionRanges(doc);assert.equal(ranges.length,1,title);assert.deepEqual(ranges[0].supersedesCheckIds,['shared-modifiers']);assert.ok(doc.text.slice(ranges[0].evidenceStart,ranges[0].evidenceEnd).endsWith('households '+title));assert.equal(check(doc).length,0);}
 for(const text of ['The very low, low and moderate income households Act applies.','The '+variants[0]+' families Act applies.','The '+variants[0]+' households Acting applies.'])assert.equal(lcbIncomeSeriesProtectionRanges(make(text)).length,0,text);
 const d=make('The '+variants[0]+' households Act applies.'),range=lcbIncomeSeriesProtectionRanges(d)[0];for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+1});assert.equal(lcbIncomeSeriesProtectionRanges(damaged).length,0,field+' '+at);}
});

test('integrated whole income ownership corrects the exact list and preserves independent findings outside it',()=>{
 for(const input of variants){const doc=make('The '+input+' households receive assistance. The check up is required.'),issues=jointStylisticIssues(doc,refs),own=issues.filter(i=>i.checkId==='lcb-income-series');assert.equal(own.length,1,input);assert.equal(own[0].suggestion,preferred);assert.ok(!issues.some(i=>i!==own[0]&&i.start<own[0].end&&i.end>own[0].start));assert.ok(issues.some(i=>i.checkId==='gpo-nominals'&&i.suggestion==='checkup'));const e=own[0].incomeSeriesEvidence;for(const r of [e.modifier,...e.components,e.head])assert.equal(doc.text.slice(r.start,r.end),r.text);}
});

test('integrated exact income titles suppress the old contained shared candidate without hiding unrelated warnings',()=>{
 const doc=make('The '+variants[0]+' households Act applies. The low and moderate income families receive assistance. The check up is required.'),issues=jointStylisticIssues(doc,refs),titleStart=doc.text.indexOf(variants[0]),titleEnd=titleStart+variants[0].length;
 assert.ok(!issues.some(i=>i.start<titleEnd&&i.end>titleStart),'A complete Act title cannot leave an inner low/moderate warning');assert.ok(issues.some(i=>i.checkId==='shared-modifiers'&&i.suggestion==='low- and moderate-income'));assert.ok(issues.some(i=>i.checkId==='gpo-nominals'&&i.suggestion==='checkup'));
});
