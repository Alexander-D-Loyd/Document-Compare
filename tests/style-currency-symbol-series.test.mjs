import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {currencySymbolSeriesIssues,currencySeriesEvidence,GPO_CURRENCY_SYMBOL_SERIES_SCOPE} from '../app/style-currency-symbol-series.mjs';
const refs=Object.fromEntries(['gpo','lcb'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=(body,type='opinion')=>{const d=makeDocument([type==='digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+body+'\nThe people do enact as follows:\nOther text.':body],'Current');if(type!=='digest')d.styleDocumentType=type;return d;};
const run=input=>{const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d),issues=currencySymbolSeriesIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of issues){assert.equal(i.text,d.text.slice(i.start,i.end));assert.equal(i.guidePage,277);assert.equal(i.rule,'10.6');assert.deepEqual(i.references.map(r=>[r.guideId,r.guidePage]),[['gpo',277],['lcb',23]]);}return issues;};

test('pinned dollar-range source and LCB MONEY contexts bound the selected scope',()=>{
 assert.ok(refs.gpo.pages[276].text.includes('$5 to $8 price range'));assert.ok(refs.lcb.pages[22].text.includes('$10 (digest, opinion, and cover letter)'));assert.match(GPO_CURRENCY_SYMBOL_SERIES_SCOPE,/selected complete homogeneous dollar ranges/u);assert.match(GPO_CURRENCY_SYMBOL_SERIES_SCOPE,/manual/u);
 for(const type of ['digest','opinion','cover-letter'])assert.equal(run(doc('The prices are $5 and 8.',type))[0].suggestion,'$5 and $8',type);
 for(const type of ['bill','unknown']){const d=doc('The prices are $5 and 8.',type);assert.deepEqual(run(d),[],type);assert.deepEqual(currencySeriesEvidence(d),[]);}
 const guessed=doc('The prices are $5 and 8.','bill');guessed.opinion=true;guessed.documentType='opinion';assert.deepEqual(run(guessed),[]);
 assert.deepEqual(currencySymbolSeriesIssues(doc('The prices are $5 and 8.'),{gpo:refs.gpo}),[]);assert.deepEqual(currencySymbolSeriesIssues(doc('The prices are $5 and 8.'),{lcb:refs.lcb}),[]);
});

test('finite homogeneous ranges and lists repeat only missing marks and retain every figure connector',()=>{
 for(const [text,wanted]of [['The cost is $5 to 8.','$5 to $8'],['The rates were 5 through $8.','$5 through $8'],['The prices are $5, 8, and 10.','$5, $8, and $10'],['The prices are 5, $8 or 10.','$5, $8 or $10'],['A $5 to 8 price range applies.','$5 to $8'],['The cost is 5–$8.','$5–$8'],['The cost is $5 - 8.','$5 - $8'],['The costs are $12,345.0001 and 9007199254740993.','$12,345.0001 and $9007199254740993'],['The prices are 0 and $5.00.','$0 and $5.00']])assert.equal(run(text)[0]?.suggestion,wanted,text);
 for(const text of ['The prices are $5 and $8.','A $5 to $8 price range applies.']){assert.deepEqual(run(text),[]);assert.equal(currencySeriesEvidence(doc(text)).length,1,text);}
});

test('canonical amounts and explicit joins resolve damaged-grouping ambiguities conservatively',()=>{
 for(const text of ['The prices are $1, 005 and 8.','The prices are $1, 300 and 8.','The prices are $1, 300.20 and 8.','The prices are 0030 and $5.00.','The prices are $01 and 8.','The prices are $01,300 and 8.'])assert.deepEqual(run(text),[],text);
 for(const [text,wanted]of [['The prices are $1, $300 and 8.','$1, $300 and $8'],['The prices are $1 and 300.','$1 and $300'],['The prices are $1,300 and 8.','$1,300 and $8'],['The prices are $1, and 300.','$1, and $300'],['The prices are $1, $300.50 and 8.','$1, $300.50 and $8'],['The prices are $1 and 300.50.','$1 and $300.50'],['The prices are $1,300.50 and 8.','$1,300.50 and $8']])assert.equal(run(text)[0]?.suggestion,wanted,text);
 for(const property of ['struck','excluded'])for(const text of ['The prices are $1, 005 and 8.','The prices are $1, 300 and 8.']){const d=doc(text),at=text.indexOf(',');d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}
});

test('complete cues and explicit dollar meaning are required; mixed unknown and signed forms stay manual',()=>{
 for(const text of ['Use $5 and 8.','The prices are 5 and 8.','The prices are $5 and 8 cents.','The prices are $5 and 8 meters.','The prices are $5 and 8 degrees.','The prices are $5 and €8.','The prices are $5 and 8¢.','The prices are $5 and 8%.','The prices are $5 and 8 thousand.','The prices are $5 and 8 per unknown.','The prices are $5 and 8 dollars.','The prices are $5 and -8.','The prices are -$5 and 8.','The prices are minus $5 and 8.','A negative $5 to 8 price range applies.','The prices are $1e+3 and 8.','The prices are $1 / 3 and 8.','The prices are $1,23 and 8.','The prices are $1 . 005 and 8.','The prices are $ 5 and 8.'])assert.deepEqual(run(text),[],text);
});

test('each original cue member connector and dollar mark remains required positive evidence',()=>{
 for(const phrase of ['prices are $5 and 8','$5 to 8 price range'])for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const d=doc('The '+phrase+'.'),at=d.text.indexOf(phrase)+n;d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+phrase+' '+n);assert.deepEqual(currencySeriesEvidence(d),[]);}
 for(const property of ['struck','excluded'])for(const text of ['The prices are $5 old and 8.','The prices are $5 and old 8.']){const d=doc(text),at=d.text.indexOf('old');d[property].push({start:at,end:at+3});assert.deepEqual(run(d),[],property+' '+text);}
});

test('complete original longer series malformed prefixes and technical tails cannot expose a fragment',()=>{
 for(const text of ['The prices are $5, 8 and 10.','The prices are 3, $5 and 8.'])for(const property of ['struck','excluded']){const d=doc(text),at=text.indexOf(',');d[property].push({start:text.indexOf('$')>=0?text.indexOf('$'):text.indexOf('3'),end:at+1});assert.deepEqual(run(d),[],property+' '+text);}
 for(const text of ['A 1: $5 to 8 price range applies.','A 1 005 to $8 price range applies.','A 1 / $5 to 8 price range applies.','A é$5 to 8 price range applies.','A path/$5 to 8 price range applies.','A $5 to 8 price range/field applies.','The prices are $5 and 8^3.','The prices are $5 and 8 - 3.','The prices are $5 and 8, 10 unknown.','A Form $5 to 8 price range applies.'])assert.deepEqual(run(text),[],text);
 for(const property of ['struck','excluded'])for(const text of ['A 1: $5 to 8 price range applies.','A minus $5 to 8 price range applies.','The prices are $5 and 8 - 3.','The prices are $5 and 8 meters.']){const d=doc(text),needle=text.includes(':')?':':text.includes('minus')?'minus':text.includes('meters')?'meters':'-',at=text.indexOf(needle);d[property].push({start:at,end:at+needle.length});assert.deepEqual(run(d),[],property+' '+text);}
});

test('quotes bill-local forms tables headings and original created names stay protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const text='The form is '+open+'prices are $5 and 8'+close+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const d=doc(text);d[property].push({start:at,end:at+1});assert.deepEqual(run(d),[],property+' '+text);}}
 assert.deepEqual(run('The term “prices are $5 and 8” is defined. The prices are $5 and 8.'),[]);
 const table=doc('The prices are $5 and 8.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
 const heading=makeDocument(['ASSEMBLY BILL 1\nThe prices are $5 and 8.\nLEGISLATIVE COUNSEL’S DIGEST\nThe prices are $5 and $8.\nThe people do enact as follows:\nOther text.'],'Current');assert.deepEqual(run(heading),[]);
 for(const suffix of [' Program is established.',', Inc., is hereby established.']){const text='The $5 to 8 Price Range'+suffix;assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=doc(text),at=text.indexOf(suffix);d[property].push({start:at,end:text.length-1});assert.deepEqual(run(d),[],property+' '+text);}}
});

test('physical wraps and identified page heads preserve exact selected source and inserted dollars',()=>{
 const d=makeDocument(['The prices are $5','AB 999 — 2 —\nline 1 and 8.'],'Current');d.styleDocumentType='opinion';const head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.ok(i.text.includes('AB 999'));assert.equal(i.suggestion,'$5 and $8');
 const unknown=structuredClone(d),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;assert.deepEqual(run(unknown),[]);
});

test('valid complete monetary series evidence identifies the small figures requiring numeral protection',()=>{
 const d=doc('The prices are $5 and 8.'),[r]=currencySeriesEvidence(d);assert.ok(r);assert.deepEqual(r.members.map(p=>d.text.slice(p.valueStart,p.end)),['5','8']);
 assert.equal(d.text.slice(r.start,r.end),'$5 and 8');assert.equal(d.text.slice(r.evidenceStart,r.evidenceEnd),'prices are $5 and 8');
});
