import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';
import {gpoPrintedFullNameIssues as check,validGpoPrintedFullNameWitness as valid,GPO_PRINTED_FULL_NAMES_SCOPE} from '../app/style-gpo-printed-full-names.mjs';
import {GPO_PRINTED_FULL_NAMES as rows,GPO_PRINTED_FULL_NAME_PAGE_AUDIT as pages} from '../app/data/gpo-printed-full-name-definitions.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
function run(input,options={},references=refs){
 const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),issues=check(d,references,options);assert.equal(JSON.stringify(d),before);
 for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(valid(i,d.text),true);assert.equal(i.suggestion.toLowerCase(),i.text.toLowerCase());const r=i.references[0],page=references.gpo.pages.find(p=>p.page===r.guidePage);assert.equal(page.text.slice(r.sourcePassage.start,r.sourcePassage.end),r.sourcePassage.text);}
 return issues;
}
test('all 36 original pages are assessed with exact source checksums and explicit conditional remainder',()=>{
 assert.equal(pages.length,36);assert.equal(rows.length,134);assert.match(GPO_PRINTED_FULL_NAMES_SCOPE,/not full semantic/);assert.equal(new Set(rows.map(r=>r.name)).size,rows.length);
 for(let n=59;n<=94;n++){const a=pages[n-59],p=refs.gpo.pages.find(p=>p.page===n);assert.equal(a.sourcePage,n);assert.equal(a.printedPage,p.printedPage);assert.equal(a.visuallyInspected,true);assert.ok(a.manualReason.length>30);assert.equal(a.sha256,crypto.createHash('sha256').update(p.text).digest('hex'));assert.deepEqual(a.selectedRowIds,rows.filter(r=>r.sourcePage===n).map(r=>r.id));}
 for(const r of rows){const p=refs.gpo.pages.find(p=>p.page===r.sourcePage),s=r.sourcePassage;assert.equal(p.text.slice(s.start,s.end),s.text);assert.equal(s.text.replace(/\s+/gu,' '),r.name);assert.match(r.name,/\s/u);}
});
test('every selected whole printed form has one case-only comparison and correct case stays quiet',()=>{
 for(const r of rows){const [i,...rest]=run('Use '+r.name.toLowerCase()+'.');assert.ok(i,r.name);assert.equal(rest.length,0,r.name);assert.equal(i.suggestion,r.name);assert.equal(i.listedNameEvidence.rowId,r.id);assert.deepEqual(run('Use '+r.name+'.'),[],r.name);}
});
test('all selected name evidence characters must survive under both removal channels',()=>{
 for(const r of rows){const d=make('Use '+r.name.toLowerCase()+'.'),start=d.text.indexOf(r.name.toLowerCase());for(const channel of ['struck','excluded'])for(let n=0;n<r.name.length;n++){const copy=structuredClone(d);copy[channel].push({start:start+n,end:start+n+1});assert.deepEqual(run(copy),[],r.name+' '+channel+' '+n);}}
});
test('whole names preserve original digits punctuation whitespace and physical offsets',()=>{
 const d=make('Use federal\nreserve\tbank of new york, then proceed.'),[i]=run(d);assert.equal(i.text,'federal\nreserve\tbank of new york');assert.equal(i.suggestion,'Federal\nReserve\tBank of New York');assert.equal(i.start,d.text.indexOf('federal'));assert.equal(i.end,i.start+i.text.length);
 assert.equal(run('Use j.c. penney co., inc..')[0].suggestion,'J.C. Penney Co., Inc.');assert.equal(run('Use naval petroleum reserve no. 2.')[0].suggestion,'Naval Petroleum Reserve No. 2');
 for(const text of ['Use national academies of sciences.','Use national academy for sciences.','Use north american free trade agreement.','Use j c penney co inc.','Use naval petroleum reserve no. 3.','Use san joaquin wilderness, caa.'])assert.deepEqual(run(text),[],text);
});
test('quotes bill-local terms definitions and actual extended names retain protections',()=>{
 const term='national academy of sciences';
 for(const text of ['Use “'+term+'”.','Use "'+term+'".',"Use '"+term+"'.",'“'+term+'” is the label. Use '+term+'.','For this section '+term+' means a local body. Use '+term+'.','For this section '+term+' shall mean a local body. Use '+term+'.','For this section '+term+' is defined as a local body. Use '+term+'.','The '+term+' Program applies.','The '+term+' West Foundation is hereby established.','The California '+term+' applies.','Use '+term+' Research Institute.'])assert.deepEqual(run(text),[],text);
 for(const channel of ['struck','excluded'])for(const [text,needle]of [['Use “'+term+'”.','“'],['The '+term+' West Foundation is hereby established.','West'],['The California '+term+' applies.','California'],['For this section '+term+' means a local body. Use '+term+'.','means']]){const d=make(text),at=d.text.indexOf(needle);d[channel].push({start:at,end:at+needle.length});assert.deepEqual(run(d),[],channel+' '+text);}
});
test('headings tables unknown gaps and attached Unicode or technical endpoints stay quiet',()=>{
 const term='national academy of sciences';
 for(const [pre,post]of [['é',''],['𐐀',''],['\u0301',''],['pre-',''],['path/',''],['','é'],['','\u0301'],['','_key'],['','/key'],['','.key'],['',"'s"]]){
  const d=make('Use '+pre+term+post+'.');assert.deepEqual(run(d),[],pre+' / '+post);for(const channel of ['struck','excluded']){const copy=structuredClone(d),at=d.text.indexOf(pre||post);copy[channel].push({start:at,end:at+(pre||post).length});assert.deepEqual(run(copy),[],channel+' '+pre+' / '+post);}
 }
 for(const label of ['identifier','token:','filename','path='])assert.deepEqual(run('The '+label+' '+term+' applies.'),[]);
 const table=make('Use '+term+'.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
 assert.deepEqual(run(makeDocument(['Use '+term+'.\nThe people do enact as follows:'],'Current')),[]);
 const unknown=make('Use national academy of hidden sciences.');const start=unknown.text.indexOf('hidden');unknown.excluded.push({start,end:start+6});assert.deepEqual(run(unknown),[]);
});
test('LCB and California Entities retain overlapping ownership; unrelated checks do not silence names',()=>{
 const d=make('Use national academy of sciences.'),[i]=run(d);
 for(const owner of [{guideId:'lcb'},{guideId:'gpo',checkId:'california-entities'}])assert.deepEqual(run(d,{existingIssues:[{...owner,start:i.start,end:i.end}]}),[]);
 assert.equal(run(d,{existingIssues:[{guideId:'lcb',start:0,end:3}]}).length,1);assert.equal(run(d,{existingIssues:[{guideId:'gpo',checkId:'other',start:i.start,end:i.end}]}).length,1);
});
test('strict final exception rejects forged row identity ranges text case and source citations',()=>{
 const d=make('Use national academy of sciences.'),[i]=run(d);assert.equal(valid(i,d.text),true);
 for(const change of [x=>x.checkId='capitalization',x=>x.guideId='lcb',x=>x.guidePage++,x=>x.listedNameEvidence.rowId='invented',x=>x.listedNameEvidence.sourcePage++,x=>x.listedNameEvidence.printedName='Academy of Sciences',x=>x.listedNameEvidence.start++,x=>x.listedNameEvidence.end--,x=>x.listedNameEvidence.sourceText='Academy of Sciences',x=>x.suggestion='National Institute of Sciences',x=>x.references[0].sourcePassage.start++,x=>x.references[0].sourcePassage.text+='x',x=>x.references[0].guidePrintedPage='wrong']){const copy=structuredClone(i);change(copy);assert.equal(valid(copy,d.text),false);}
 assert.equal(valid(i,d.text.replace('sciences','Sciences')),false);
 const changed=structuredClone(refs),r=i.references[0],p=changed.gpo.pages.find(p=>p.page===r.guidePage);p.text=p.text.slice(0,r.sourcePassage.start)+'X'+p.text.slice(r.sourcePassage.start+1);assert.deepEqual(run(d,{},changed),[]);assert.equal(run('Use adobe acrobat reader.',{},changed).length,1);
 const duplicate=structuredClone(refs);duplicate.gpo.pages.push(structuredClone(duplicate.gpo.pages.find(p=>p.page===59)));assert.deepEqual(run(d,{},duplicate),[]);
});
test('inherited headings roles source gaps and unlisted meanings are not reconstructed',()=>{
 for(const text of ['The state shall comply.','Use army reserve.','Use national science foundation.','Use federal national mortgage association.','Use operation desert storm.','Use twilight twitter.','Use cold war.','Use western states.','Use voice of america.','Use the secretary.','Use tw in cit ies.','Use world bank.'])assert.deepEqual(run(text),[],text);
});
test('new module import consumes a fresh document whose source blocks already exist',async()=>{
 const fresh=await import('../app/style-gpo-printed-full-names.mjs?fresh-block-document'),d=make('Use national academy of sciences.'),before=JSON.stringify(d);assert.ok(d.blocks.length>1);const [i]=fresh.gpoPrintedFullNameIssues(d,refs);assert.equal(i.suggestion,'National Academy of Sciences');assert.equal(valid(i,d.text),true);assert.equal(JSON.stringify(d),before);
});
test('coverage and source inventory expose selected GPO implementations without upgrading whole tables',async()=>{
 const {CHECK_COVERAGE}=await import('../app/style-coverage.mjs'),{styleRuleInventory}=await import('../app/style-rule-inventory.mjs'),all={...refs,lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))},inventory=styleRuleInventory(all);
 for(const title of ['GPO complete printed-name case','GPO explicit negative spelling preference','GPO literal date time and decimal forms','GPO standard and IT abbreviation definitions','GPO unit Latin element and currency definitions','GPO military rank abbreviation definitions','GPO printed lumber designation','GPO complete printed compound nouns']){const c=CHECK_COVERAGE.find(c=>c.title===title);assert.ok(c,title);assert.doesNotMatch(c.status,/Fully automated/);assert.ok(c.text.length>150);}
 for(const id of ['gpo-page-59','gpo-page-97','gpo-12.9','gpo-9.29','gpo-9.60','gpo-9.61','gpo-9.62','gpo-9.63','gpo-9.64','gpo-page-279','gpo-page-353']){const r=inventory.find(r=>r.id===id);assert.ok(r,id);assert.equal(r.status,'Partially automated',id);assert.match(r.scope,/original manual remainder retained/,id);}
 for(const id of ['gpo-page-73','gpo-page-77','gpo-page-78','gpo-page-81','gpo-page-83','gpo-page-93']){const r=inventory.find(r=>r.id===id);assert.match(r.scope,/0 selected complete printed-name witnesses/);assert.equal(r.status,'Assessed — mapping incomplete');}
 const compound=inventory.find(r=>r.id==='gpo-page-127');assert.match(compound.scope,/explicit nominal continuation/);assert.equal(compound.status,'Partially automated');
 const {GPO_LISTED_COMPOUND_FORMS:compoundRows}=await import('../app/data/gpo-listed-compound-forms.mjs');for(let page=127;page<=206;page++){const selected=compoundRows.filter(r=>r.page===page).length,r=inventory.find(r=>r.id==='gpo-page-'+page);assert.ok(r);if(selected){assert.equal(r.status,'Partially automated');assert.ok(r.scope.includes(selected+' selected complete compound rows'));}else assert.notEqual(r.status,'Partially automated');}
});
