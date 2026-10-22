import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {gpoMilitaryRankDefinitionIssues as check,GPO_MILITARY_RANK_DEFINITIONS as table,GPO_MILITARY_RANK_DEFINITION_SCOPE} from '../app/style-gpo-military-rank-definitions.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
const run=input=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),out=check(d,refs);assert.equal(JSON.stringify(d),before);for(const i of out){assert.equal(d.text.slice(i.start,i.end),i.text);const w=i.references[0].sourcePassage;assert.equal(refs.gpo.pages[w.page-1].text.slice(w.start,w.end),w.text);assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd>=i.end);}return out;};
const text=(r,code=r.symbol)=>'Use United States '+r.service+' rank '+r.name+' ('+code+').';

test('121 explicit branch/rank/code rows retain the physically verified matrix and source hashes',()=>{
 assert.equal(table.rows.length,121);assert.deepEqual(Object.fromEntries(['Army','Navy','Coast Guard','Marine Corps','Air Force'].map(s=>[s,table.rows.filter(r=>r.service===s).length])),{Army:27,Navy:25,'Coast Guard':24,'Marine Corps':25,'Air Force':20});
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../app/data/gpo-stylemanual-2016.pdf',import.meta.url))).digest('hex'),table.sourcePdfSHA256);
 for(const p of table.sourcePages){const source=refs.gpo.pages[p.page-1].text;assert.equal(crypto.createHash('sha256').update(source).digest('hex'),p.sha256);assert.equal(source.slice(p.headerPassage.start,p.headerPassage.end),p.headerPassage.text);}
 for(const r of table.rows){assert.match(r.association,/Original rendered matrix/u);assert.ok(r.sourceOccurrence>=1);assert.equal(refs.gpo.pages[r.page-1].text.slice(r.sourcePassage.start,r.sourcePassage.end),r.sourcePassage.text);}
 for(const x of table.excluded)for(const w of x.sourcePassages)assert.equal(refs.gpo.pages[w.page-1].text.slice(w.start,w.end),w.text);
 assert.match(GPO_MILITARY_RANK_DEFINITION_SCOPE,/no nationality/u);
});

test('all complete canonical cells are quiet and same-letter case/spacing/dot variants preserve every service-specific form',()=>{
 for(const r of table.rows){assert.equal(run(text(r)).length,0,text(r));const variants=[r.symbol.replace(/[. ]/gu,'').toLowerCase(),r.symbol.replace(/[. ]/gu,'').split('').join(' '),r.symbol.replace(/[. ]/gu,'').toUpperCase()];for(const v of variants){if(v===r.symbol)continue;const out=run(text(r,v));assert.equal(out.length,1,text(r,v));assert.equal(out[0].suggestion,r.symbol);assert.equal(out[0].militaryRankDefinitionEvidence.service,r.service);}}
});

test('printed Army, Marines and Air Force differences remain literal and wrong families are never substituted',()=>{
 for(const [s,n,code,wanted]of [['Army','Staff Sergeant','ssg','SSG'],['Marine Corps','Staff Sergeant','SSGT','SSgt'],['Air Force','Staff Sergeant','SSGT','SSgt'],['Army','Second Lieutenant','2lt','2LT'],['Marine Corps','Second Lieutenant','2NDLT','2nd Lt.'],['Air Force','Second Lieutenant','2NDLT','2nd Lt.'],['Marine Corps','General','GEN','Gen.'],['Marine Corps','Brigadier General','BRIGGEN','Brig. Gen.'],['Marine Corps','Warrant Officer 1','wo','WO']])assert.equal(run('Use U.S. '+s+' rank '+n+' ('+code+').')[0].suggestion,wanted);
 for(const t of ['Use U.S. Army rank Staff Sergeant (SSgt).','Use U.S. Marines rank Second Lieutenant (2LT).','Use U.S. Army rank Second Lieutenant (2nd Lt.).','Use U.S. Navy rank Captain (CPT).','Use U.S. Marine Corps rank Warrant Officer 1 (WO1).'])assert.equal(run(t).length,0,t);
});

test('nationality, whole service, explicit rank role and whole rank are required without office or code identity inference',()=>{
 for(const t of ['Use Army rank Staff Sergeant (ssg).','Use Navy rank Captain (capt).','Use British Army rank Staff Sergeant (ssg).','Use United States Army Staff Sergeant (ssg).','Use United States rank Staff Sergeant (ssg).','Use U.S. Army rank Staff Sergeant General (ssg).','Use U.S. Navy rank Captain (XYZ).','Use SSG as a field.','Use United States Army rank Sergeant (SSG).'])assert.equal(run(t).length,0,t);
 assert.equal(run('Use U.S. Marines rank Staff Sergeant (SSGT).')[0].suggestion,'SSgt');
});

test('omitted titles, absent abbreviations, job-only cells and no-warrant positions have explicit exclusions',()=>{
 assert.equal(table.excluded.length,16);
 for(const t of ['Use U.S. Army rank General of the Army (GEN).','Use U.S. Navy rank Fleet Admiral (ADM).','Use U.S. Army rank Army Chief of Staff (GEN).','Use U.S. Coast Guard rank Master Chief Petty Officer of the Coast Guard (mcpocg).','Use U.S. Air Force rank Chief Warrant Officer 4 (CWO4).','Use U.S. Marines rank First Sergeant (1sg).','Use U.S. Air Force rank First Sergeant (1sg).','Use U.S. Army rank Private (PVT).','Use U.S. Air Force rank Airman Basic (AB).'])assert.equal(run(t).length,0,t);
 assert.equal(run('Use U.S. Navy rank Master Chief Petty Officer of the Navy (mcpon).')[0].suggestion,'MCPON');
});

test('entire identity/role/rank/parenthesis evidence is protected at every struck or uncertain source character',()=>{
 const raw='Use United States Army rank Second Lieutenant (2lt).',base=run(raw)[0];assert.ok(base);
 for(let at=base.evidenceStart;at<base.evidenceEnd;at++)for(const property of ['struck','excluded']){const d=make(raw);d[property]=[{start:at,end:at+1}];assert.equal(run(d).length,0,property+' '+at);}
 for(const t of ['Use “United States Army rank Second Lieutenant (2lt)”.',"Use 'United States Army rank Second Lieutenant (2lt)'.",'Use United States Army rank Second Lieutenant (2lt) Program.','The United States Army rank Second Lieutenant (2lt) is hereby created.','Use United States Army rank Second Lieutenant (2lt) ^ 2.'])assert.equal(run(t).length,0,t);
 const d=make(raw);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(run(d).length,0);
});

test('missing, changed and duplicate source pages cannot manufacture matrix authority',()=>{
 const d=make('Use U.S. Army rank Second Lieutenant (2lt).');for(const refs2 of [{},{gpo:{...refs.gpo,pages:refs.gpo.pages.filter(p=>p.page!==242)}},{gpo:{...refs.gpo,pages:refs.gpo.pages.map(p=>p.page===242?{...p,text:p.text.replace('2LT','2Lt')}:p)}},{gpo:{...refs.gpo,pages:[...refs.gpo.pages,refs.gpo.pages[241]]}}])assert.equal(check(d,refs2).length,0);
});

test('physical reading order is not used as service inference and correct branch occurrences remain bound',()=>{
 const row=(s,n)=>table.rows.find(r=>r.service===s&&r.name===n);
 assert.equal(row('Marine Corps','General').sourceOccurrence,1);assert.equal(row('Air Force','General').sourceOccurrence,2);
 assert.ok(row('Marine Corps','General').sourcePassage.start<row('Air Force','General').sourcePassage.start);
 assert.equal(row('Army','Private First Class').sourceOccurrence,1);assert.equal(row('Marine Corps','Private First Class').sourceOccurrence,2);
 assert.equal(row('Marine Corps','Warrant Officer 1').sourcePassage.text.trimEnd(),'Warrant Officer 1\nWO');
});

test('original numeral-rank punctuation and recognized physical word divisions preserve source selections',()=>{
 assert.equal(run('Use U.S. Army rank Private E–2 (pv2).')[0].suggestion,'PV2');assert.equal(run('Use U.S. Army rank Private E—2 (pv2).').length,0);
 const d=make(['Use United States Army rank Second Lieu-','AB 999 — 2 —','line 2 tenant (2lt).']),first=d.text.indexOf('Lieu-'),second=d.text.indexOf('tenant'),head=d.blocks[1];
 head.ignored=true;head.runningHead=true;head.formatting={headerParts:[{text:head.text}]};d.excluded.push({start:head.start,end:head.end});d.wrappedWords=[{word:'Lieutenant',parts:['Lieu','tenant'],start:first,end:second+6,spans:[{start:first,end:first+4},{start:second,end:second+6}],recognized:true}];
 const [i]=run(d);assert.ok(i);assert.equal(i.text,'2lt');assert.equal(i.evidenceStart,d.text.indexOf('United'));assert.equal(i.evidenceEnd,d.text.indexOf('(2lt)')+5);assert.ok(d.text.slice(i.evidenceStart,i.evidenceEnd).includes(head.text));
 for(const property of ['struck','excluded']){const changed=structuredClone(d);changed[property]=[...(changed[property]||[]),{start:second,end:second+1}];assert.equal(run(changed).length,0);}
});
