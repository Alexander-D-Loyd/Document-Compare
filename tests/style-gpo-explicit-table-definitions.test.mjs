import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {gpoExplicitTableDefinitionIssues as check,GPO_EXPLICIT_DEFINITION_TABLES as table,GPO_EXPLICIT_TABLE_DEFINITION_SCOPE} from '../app/style-gpo-explicit-table-definitions.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const make=text=>makeDocument(Array.isArray(text)?text:[text],'Current');
const run=input=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),found=check(d,refs);assert.equal(JSON.stringify(d),before);for(const i of found){assert.equal(d.text.slice(i.start,i.end),i.text);assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd>=i.end);const w=i.references[0].sourcePassage,p=refs.gpo.pages[w.page-1];assert.equal(p.text.slice(w.start,w.end),w.text);assert.ok(w.symbols.includes(i.explicitTableDefinitionEvidence.symbol));}return found;};

test('fixed original PDF and every page/passage have independent SHA-256 provenance',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../app/data/gpo-stylemanual-2016.pdf',import.meta.url))).digest('hex'),table.sourcePdfSha256);
 assert.deepEqual(table.sourcePages.map(p=>p.page),[252,262,263,264,265,266,267,268,269,270,279,353,354,355,356,357,358]);
 for(const p of table.sourcePages)assert.equal(crypto.createHash('sha256').update(refs.gpo.pages[p.page-1].text).digest('hex'),p.sha256);
 for(const row of table.rows)for(const w of row.witnesses)assert.equal(refs.gpo.pages[w.page-1].text.slice(w.start,w.end),w.text);
 assert.match(GPO_EXPLICIT_TABLE_DEFINITION_SCOPE,/fixed July 2016/u);assert.match(GPO_EXPLICIT_TABLE_DEFINITION_SCOPE,/infra\/supra/u);
});

test('complete printed definitions are quiet and same-letter interletter/case variants use their exact original source',()=>{
 for(const row of table.rows)for(const symbol of row.symbols){
  const lead='Use '+(row.group==='unit'?'25 ':'')+row.name+' (';
  assert.equal(run(lead+symbol+').').length,0,row.group+' / '+row.name+' / '+symbol);
  if(!/[A-Za-z]/u.test(symbol))continue;
  const variant=symbol.replace(/[. ]/gu,'').split('').join(' ');
  if(variant===symbol)continue;
  const found=run(lead+variant+').');assert.equal(found.length,1,row.name+' / '+variant);assert.equal(found[0].suggestion,symbol);
 }
});

test('all explicit same-name letter-case variants preserve significant printed case including one-letter symbols',()=>{
 for(const row of table.rows)for(const symbol of row.symbols){if(!/[A-Za-z]/u.test(symbol))continue;const variant=[...symbol].map(c=>/[a-z]/u.test(c)?c.toUpperCase():/[A-Z]/u.test(c)?c.toLowerCase():c).join('');if(variant===symbol)continue;const lead='Use '+(row.group==='unit'?'25 ':'')+row.name+' (';const found=run(lead+variant+').');assert.equal(found.length,1,row.name+' / '+variant);assert.equal(found[0].suggestion,symbol);}
});

test('all 118 atomic numbers are represented once with physical table symbols, without formula or identity inference',()=>{
 const rows=table.rows.filter(r=>r.group==='chemical');assert.equal(rows.length,118);
 assert.deepEqual(rows.map(r=>Number(/(\d+)$/u.exec(r.sourcePassage.text)[1])).sort((a,b)=>a-b),Array.from({length:118},(_,i)=>i+1));
 for(const [name,variant,wanted]of [['chlorine','CL','Cl'],['gold','a.u.','Au'],['nihonium','NH','Nh'],['oganesson','o.g.','Og']])assert.equal(run('Use '+name+' ('+variant+').')[0].suggestion,wanted);
 for(const t of ['CL and h are symbols.','Use chlorine (C).','Use chlorine (Cl2).','Use chlorinated water (CL).','Use chemical formula H2O.','Use element 17 (CL).'])assert.equal(run(t).length,0,t);
});

test('derived units retain printed r/min and source spellings, accept flattened powers and never guess rpm or convert families',()=>{
 for(const [text,wanted]of [['Use 25 revolutions per minute (R/MIN).','r/min'],['The power is measured in megawatt (mw).','MW'],['Use 25 femtometer (FM).',null],['Use 25 fentometer (FM).','fm'],['Use 25 square micrometer (μM²).','μm²'],['Use 25 watt per meter kelvin (w/(m•k)).','W/(m•K)'],['Use 25 conventional foot of water (FTH₂O).','ftH₂O'],['Use 25 newton per square meter (n/M²).','N/m²']]){const out=run(text);assert.equal(out.length,wanted?1:0,text);if(wanted)assert.equal(out[0].suggestion,wanted);}
 for(const t of ['Use revolutions per minute (R/MIN).','Use 25 revolutions per minute (rpm).','Use 25 revolutions per minute (r/s).','Use 25 square micrometer (μm²).','Use 25 square micrometer (μm2).','Use 25 kilowatt (mW).','Use 25 microgram (µG).','Use 25 conventional foot of water (ftH₂O).','Use 25 calorie (CALIT).'])assert.equal(run(t).length,0,t);
});

test('Latin alternatives remain alternatives; ambiguous expansions and infra/supra/ultimo conflicts remain outside the check',()=>{
 for(const [text,wanted]of [['Use exempli gratia (E G).','e.g.'],['Use id est (IE).','i.e.'],['Use post mortem (p.m.).','P.M.'],['Use post meridiem (P.M.).','p.m.'],['Use ibidem (IB).','ib.'],['Use ibidem (IBID).','ibid.'],['Use scientiae baccalaureus (SC B).','Sc. B.']])assert.equal(run(text)[0].suggestion,wanted);
 for(const t of ['Use infra (INF).','Use supra (SUP).','Use ultimo (ULT).','Use anno ante (AAC).','Use sine loco (SLAN).','Use c. for centum (CWT).','Use etc. and e.g.','Use quod erat demonstrandum (QEF).'])assert.equal(run(t).length,0,t);
 for(const term of ['infra','supra','ultimo'])assert.ok(table.excluded.some(r=>r.group==='latin'&&r.name.startsWith(term)));
});

test('fixed July 2016 currency codes compare full names only and preserve table alternatives and current-authority limits',()=>{
 for(const [text,wanted]of [['Use U.S. dollar (u.s.d.).','USD'],['Use North Korean won (kpw).','KPW'],['Use Denar (m.k.d.).','MKD'],['Use Uruguay peso en Unidades Indexadas (URUIURUI) (u.y.i.).','UYI'],['Use dollar (DOL).','dol'],['Use cent (CT).','ct']])assert.equal(run(text)[0].suggestion,wanted,text);
 for(const t of ['Use Belarusian ruble (byn).','Use Belarusian ruble (byr).','Use dollar (USD).','Use euro (€).','Use Euro (EUR).','Use Swiss franc (CHW).','Use peso (MXN).','Use yen in Japan.','USD, eur and gbp are data fields.'])assert.equal(run(t).length,0,t);
 assert.equal(table.excluded.filter(r=>r.group==='currency'&&r.name==='Belarusian ruble').length,2);
});

test('any missing, changed or duplicated authority page cannot create its table correction',()=>{
 const d=make('Use chlorine (CL).');
 for(const page of [null,{...refs.gpo.pages[278],text:refs.gpo.pages[278].text.replace('Cl 17','CL 17')},{...refs.gpo.pages[278],text:refs.gpo.pages[278].text+'\nAltered authority'}]){const pages=refs.gpo.pages.filter(p=>p.page!==279);if(page)pages.push(page);assert.equal(check(d,{gpo:{...refs.gpo,pages}}).length,0);}
 assert.equal(check(d,{}).length,0);
 assert.equal(check(d,{gpo:{...refs.gpo,pages:[...refs.gpo.pages,refs.gpo.pages[278]]}}).length,0);
});

test('quotes, names, tables, headings, technical endpoints and uncertain characters preserve complete original evidence',()=>{
 for(const text of ['Use “chlorine (CL)”.',"Use 'chlorine (CL)'.",'Use chlorine (CL) Authority.','The chlorine (CL) is hereby created.','Use chlorine (CL) ^ 2.','Section 25 revolutions per minute (R/MIN).','Use −25 revolutions per minute (R/MIN).','Use 1e25 revolutions per minute (R/MIN).','Use 1/25 revolutions per minute (R/MIN).','Use 25 00 revolutions per minute (R/MIN).','Use minus 25 revolutions per minute (R/MIN).'])assert.equal(run(text).length,0,text);
 const raw='Use 25 revolutions per minute (R/MIN).';
 const base=run(raw)[0];for(let at=base.evidenceStart;at<base.evidenceEnd;at++)for(const property of ['struck','excluded']){const d=make(raw);d[property]=[{start:at,end:at+1}];assert.equal(run(d).length,0,property+' '+at);}
 const d=make(['Chlorine (CL)','LEGISLATIVE COUNSEL’S DIGEST','Use chlorine (CL).']);assert.equal(run(d).length,1);
 const t=make('Use chlorine (CL).');t.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(run(t).length,0);
});

test('reader-identified interior running heads preserve complete exact evidence offsets',()=>{
 const d=make(['Use 25 revolutions','AB 2266 — 7 —','per minute (R/MIN).']);
 const head=d.blocks[1];head.ignored=true;head.runningHead=true;head.formatting={headerParts:[{text:head.text}]};d.excluded=[{start:head.start,end:head.end}];
 const out=run(d);assert.equal(out.length,1);assert.equal(out[0].text,'R/MIN');assert.ok(d.text.slice(out[0].evidenceStart,out[0].evidenceEnd).includes(head.text));
});

test('recognized full-name word divisions restore original ranges and do not invent compounds or uncertain bridges',()=>{
 const d=make('Use 25 revolu-\nline 2 tions per minute (R/MIN).'),start=d.text.indexOf('revolu-'),second=d.text.indexOf('tions');
 d.wrappedWords=[{word:'revolutions',parts:['revolu','tions'],start,end:second+5,spans:[{start,end:start+6},{start:second,end:second+5}],recognized:true}];
 const before=JSON.stringify(d),[i]=run(d);assert.ok(i);assert.equal(i.suggestion,'r/min');assert.equal(i.evidenceStart,d.text.indexOf('25'));assert.equal(i.evidenceEnd,d.text.indexOf('R/MIN)')+6);assert.ok(d.text.slice(i.evidenceStart,i.evidenceEnd).includes('revolu-\nline 2 tions'));assert.equal(JSON.stringify(d),before);
 for(const channel of ['struck','excluded']){const changed=structuredClone(d);changed[channel]=[{start:second,end:second+1}];assert.equal(run(changed).length,0);}
 const narrative=make('Use 25 foot—pound (FT•LB).');assert.equal(run(narrative).length,0);
});
