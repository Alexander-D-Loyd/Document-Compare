import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleWordDivisionView} from '../app/style-word-divisions.mjs';import {workerWords} from './helpers/spelling-worker.mjs';
import {customStyleIssues} from '../app/custom-style.mjs';
import compounds from '../app/data/style-division-compounds.json' with {type:'json'};
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords();
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current',[],[],words),check=t=>jointStylisticIssues(make(t),refs);
test('existing contextual rules receive recognized words split inside the modifier, head or jurisdiction',()=>{
 for(const [bad,preferred] of [['The high qual-\nity services shall apply.','high-quality'],['The data sharing agree-\nment shall apply.','data-sharing'],['The Califor-\nnia supreme court shall act.','Supreme Court'],['The output is measured in Kilow-\natt (kW).','kilowatt'],['The county Treas-\nurer shall act.','treasurer']]){const d=make(bad);assert.ok(d.wrappedWords.some(w=>w.recognized),bad);const found=jointStylisticIssues(d,refs);assert.ok(found.some(i=>i.suggestion===preferred),bad+' '+JSON.stringify(found.map(i=>i.suggestion)));}
});
test('finite explicitly checked spelling variants also survive physical word divisions without dictionary acceptance',()=>{
 const d=make('The assig-\nnner shall act.');assert.ok(d.wrappedWords.some(w=>w.word==='assignner'&&!w.recognized));assert.deepEqual(jointStylisticIssues(d,refs).map(i=>i.suggestion),['assigner']);
 assert.equal(check('The assig-nner shall act.').length,0,'No same-line discretionary joining');
});
test('full original selections and logical Ignore All identities survive multiple word divisions',()=>{
 const d=make('The high qual-\nity ser-\nvices shall apply. The high quality services shall apply.'),before=JSON.stringify(d),found=jointStylisticIssues(d,refs).filter(i=>i.suggestion==='high-quality');assert.equal(found.length,2);assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.equal(found[0].matchText,found[1].matchText);assert.equal(JSON.stringify(d),before);assert.equal(found[0].sourceWordDivisions.length,1);
});
test('known interior page heads preserve whole divided style selections and independent following numerals',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The high qual-','AB 9999 — 2 —\nline 1 ity services shall provide 1 claimant.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=jointStylisticIssues(d,refs);assert.deepEqual(found.map(i=>i.suggestion),['high-quality','one']);assert.ok(found[0].text.includes('AB 9999'));assert.equal(found[0].start,d.text.indexOf('high'));assert.equal(found[0].end,d.text.indexOf('ity services')+3);assert.equal(found[1].start,d.text.indexOf('1 claimant'));
});
test('source strikes in the word or gap cannot supply joined evidence',()=>{
 for(const text of ['The high qual-\nity services shall apply.','The high qual-\nformer\nity services shall apply.']){const d=make(text),start=d.text.indexOf(text.includes('former')?'former':'qual');d.struck=[{start,end:start+(text.includes('former')?6:4)}];assert.equal(styleWordDivisionView(d),null);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.suggestion==='high-quality').length,0);}
});
test('wrapped quotations, table rows and unknown ignored gaps stay protected',()=>{
 assert.equal(check('The literal "high qual-\nity services" remains.').length,0);
 const t=make('The high qual-\nity services shall apply.');t.blocks[1].formatting={headerGaps:[1,2]};assert.equal(styleWordDivisionView(t),null);
 const u=make('The high qual-\nunknown marker\nity services shall apply.'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(styleWordDivisionView(u),null);
 const x=make('The high qual-\nhidden\nity services shall apply.'),hidden=x.blocks.find(b=>b.text==='hidden');x.excluded.push({start:hidden.start,end:hidden.end});assert.equal(styleWordDivisionView(x),null);
});
test('source-guided compounds and unknown words are not rewritten as discretionary joins',()=>{
 for(const text of ['The low-\nincome households shall apply.','The x-\nray images shall apply.','The unrecogniz-\nzedlabel shall apply.'])assert.equal(styleWordDivisionView(make(text)),null,text);
});
test('word evidence is revalidated against source and fresh protection metadata on every review',()=>{
 const d=make('The high qual-\nity services shall apply.');assert.ok(styleWordDivisionView(d));d.wrappedWords[0].word='unrelated';assert.equal(styleWordDivisionView(d),null);d.wrappedWords[0].word='quality';d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(styleWordDivisionView(d),null);delete d.blocks[0].formatting;assert.ok(styleWordDivisionView(d));d.struck=[{start:d.text.indexOf('ity'),end:d.text.indexOf('ity')+3}];assert.equal(styleWordDivisionView(d),null);
});
test('projection endpoints preserve adjacent source words and contiguous source letters',()=>{
 const d=make('Before qual-\nity after. Later treas-\nurer after.'),v=styleWordDivisionView(d);assert.ok(v);assert.equal(v.doc.text,'Before quality after. Later treasurer after.');assert.equal(v.restore([{start:0,end:6,text:'Before'}])[0].text,'Before');const at=v.doc.text.indexOf('after');assert.equal(v.restore([{start:at,end:at+5,text:'after'}])[0].text,'after');for(const w of v.words){const start=v.toView(w.start),end=v.toView(w.end);assert.equal(v.doc.text.slice(start,end),w.word);assert.equal(v.toSource(start),w.start);assert.equal(v.toSource(end,true),w.end);}
});
test('saved style terms retain exact case and unknown user-defined word identity through physical divisions',()=>{
 const terms=[{term:'Foobarl',replacement:'Example'}];for(const text of ['Use Foob-\narl here.','Use Foobarl here.']){const d=make(text),before=JSON.stringify(d),found=customStyleIssues(d,terms);assert.equal(found.length,1);assert.equal(found[0].suggestion,'Example');assert.equal(found[0].matchText||found[0].text,'Foobarl');assert.equal(JSON.stringify(d),before);}
 assert.equal(customStyleIssues(make('Use foob-\narl here.'),terms).length,0);assert.equal(customStyleIssues(make('Use Foob-arl here.'),terms).length,0);
});
test('explicit saved terms still check quotations and tables unlike contextual guide suggestions',()=>{
 const terms=[{term:'quality',replacement:''}];assert.equal(customStyleIssues(make('The literal "qual-\nity" remains.'),terms).length,1);const d=make('The qual-\nity remains.');d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(customStyleIssues(d,terms).length,1);assert.equal(styleWordDivisionView(d),null);
});
test('saved divided terms preserve full cross-page ranges and strike protection',()=>{
 const terms=[{term:'quality',replacement:'standard'}],d=make(['ASSEMBLY BILL No. 9999\nline 1 The qual-','AB 9999 — 2 —\nline 1 ity remains.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=customStyleIssues(d,terms);assert.equal(found.length,1);assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.equal(found[0].matchText,'quality');d.struck=[{start:d.text.indexOf('qual'),end:d.text.indexOf('qual')+4}];assert.equal(customStyleIssues(d,terms).length,0);
});
test('custom word matching does not enable cross-line unknown body exclusions or alter genuine compound hyphens',()=>{
 const d=make('The qual-\nunknown marker\nity remains.'),b=d.blocks.find(b=>b.text==='unknown marker');b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(customStyleIssues(d,[{term:'quality',replacement:''}]).length,0);assert.equal(customStyleIssues(make('The low-\nincome program applies.'),[{term:'lowincome',replacement:''}]).length,0);
});
test('every protected listed compound retains its true hyphen at each physical division even against a saved solid term',()=>{
 assert.equal(compounds.records.length,218);assert.ok(compounds.records.some(r=>r.word==='low-income'&&r.sources.some(s=>s.guide==='lcb'&&s.page===11)));
 for(const r of compounds.records){const parts=r.word.split('-');for(let n=1;n<parts.length;n++){const left=parts.slice(0,n).join('-'),right=parts.slice(n).join('-'),d=make('The '+left+'-\n'+right+' applies.'),term=left+right;assert.equal(customStyleIssues(d,[{term,replacement:''}]).length,0,r.word+' '+n);}}
 assert.equal(customStyleIssues(make('The county-\nowned property applies.'),[{term:'countyowned',replacement:''}]).length,0);
});
test('finite role and expression variants reach their original contextual rules across word divisions',()=>{
 for(const [text,wanted]of [['The xr-\nay images are retained.','x-ray'],['The costeffec-\ntively process applies.','cost-effectively'],['The revi-\nvver shall act.','reviver']])assert.ok(check(text).some(i=>i.suggestion===wanted),text+' '+JSON.stringify(check(text).map(i=>i.suggestion)));
});
