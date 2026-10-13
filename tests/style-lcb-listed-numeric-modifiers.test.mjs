import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbListedNumericModifierIssues,lcbListedNumericModifierProtectionRanges,restoreListedNumericModifierEvidence} from '../app/style-lcb-listed-numeric-modifiers.mjs';
import {fractionIssues} from '../app/style-fractions.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(text,context='Bill')=>makeDocument([context==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+text+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+text],'Current');
const check=d=>lcbListedNumericModifierIssues(d,refs);
const examples=[
 ['a 5 percent increase','5-percent','Bill'],['a 5% increase','5-percent','Bill'],['a five percent increase','5-percent','Bill'],['a 5-percent increase','5%','Digest'],['a 5 percent increase','5%','Digest'],
 ['a two inch board','two-inch','Bill'],['a 2-inch board','two-inch','Bill'],['a 2 inch board','two-inch','Bill'],['a two-inch board','2-inch','Digest'],['a two inch board','2-inch','Digest'],
 ['a 3/4-ton truck','three-quarter-ton','Bill'],['a 3⁄4 ton truck','three-quarter-ton','Bill'],['a ¾-ton truck','three-quarter-ton','Bill'],['a three quarter ton truck','three-quarter-ton','Bill'],['a three-quarter-ton truck','3⁄4-ton','Digest'],
];

test('the three complete printed numeric modifiers use their explicit Bill and Digest forms',()=>{
 for(const [phrase,wanted,context]of examples){const d=make('The agency requires '+phrase+'.',context),saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,context+' '+phrase);const i=found[0];assert.equal(i.suggestion,wanted);assert.equal(i.guidePage,23);assert.equal(i.guideId,'lcb');assert.equal(i.references.length,1);assert.equal(i.checkId,'lcb-listed-numeric-modifier');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.numericModifierEvidence.head.start,i.numericModifierEvidence.head.end),i.numericModifierEvidence.head.text);assert.ok(i.numericModifierEvidence.head.start>=i.end);assert.ok(i.evidenceStart<i.start);assert.equal(JSON.stringify(d),saved);}
});

test('printed compliant variants are quiet including ASCII fraction equivalents and genuine Unicode hyphens',()=>{
 for(const [phrase,context]of [['a 5-percent increase','Bill'],['a 5% increase','Digest'],['a two-inch board','Bill'],['a 2-inch board','Digest'],['a three-quarter-ton truck','Bill'],['a 3/4-ton truck','Digest'],['a 3⁄4-ton truck','Digest'],['a two‐inch board','Bill'],['a 2‑inch board','Digest']])assert.equal(check(make('The agency requires '+phrase+'.',context)).length,0,phrase);
});

test('ordinary percentage partitives, other values and noun heads cannot inherit the printed construction',()=>{
 for(const phrase of ['a 5 percent of the increase','a 5 percent program','a 5percent increase','a 5%% increase','a $5 percent increase','a 2 foot board','a two inch program','a 3 inch board','a 1/4-ton truck','a 3/40-ton truck','a 3/4-ton program','a three quarters ton truck','a three quarter ton truckload','a 3/4-ton trucké','a 5 percent increasé','a 5 percent increase-identifier','Section5 percent increase'])assert.equal(check(make('The agency requires '+phrase+'.')).length,0,phrase);
 for(const phrase of ['5 percent increase','two inch board','three quarter ton truck'])assert.equal(check(make('The agency requires '+phrase+'.')).length,0,phrase);
});

test('percentage modifiers preserve exact complete numeric values without per-value rules or rounding',()=>{
 for(const value of ['5','7','12.5','0.5','5.0','12,345.67','900719925474099312345678901234567890'])for(const context of ['Bill','Digest']){
  const input=context==='Bill'?value+'%':value+'-percent',d=make('The agency requires a '+input+' increase.',context),found=check(d);assert.equal(found.length,1,value+' '+context);assert.equal(found[0].suggestion,context==='Bill'?value+'-percent':value+'%');assert.equal(found[0].numericModifierEvidence.sourceValue,value);
  const correct=make('The agency requires a '+(context==='Bill'?value+'-percent':value+'%')+' increase.',context);assert.equal(check(correct).length,0,value+' compliant');
 }
 for(const input of ['1,23 percent','1..5 percent','-5 percent','5-7 percent','5 to 7 percent','5/7 percent','5, percent','5 percent%','5é percent','5 percentα','5. percent'])assert.equal(check(make('The agency requires a '+input+' increase.')).length,0,input);
});

test('actual Bill or Digest source witness is necessary and cannot be manufactured from removed context',()=>{
 for(const text of ['The agency requires a 5 percent increase.','OPINION\nThe agency requires a 5 percent increase.','ASSEMBLY RESOLUTION\nThe agency requires a two inch board.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const d=make('The agency requires a 5 percent increase.'),at=d.text.indexOf('enact');for(const field of ['struck','excluded']){const bad=structuredClone(d);bad[field].push({start:at,end:at+5});assert.equal(check(bad).length,0);}
});

test('every article modifier head and connecting source character is establishing evidence',()=>{
 for(const [phrase,,context]of examples.filter((_,n)=>[0,5,13].includes(n))){const d=make('The agency requires '+phrase+'.',context),start=d.text.indexOf(phrase),end=start+phrase.length;assert.equal(check(d).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const bad=structuredClone(d);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+phrase+' '+at);}}
});

test('quotes local quoted forms tables titles and visible rhetorical dashes remain protected',()=>{
 for(const phrase of ['“a 5 percent increase”','"a two inch board"','a 5 Percent Increase','a 5 percent Increase Act','a two inch Board Foundation','a 3/4-ton Truck Institute','a 5—percent increase','a two–inch board','a three—quarter—ton truck'])assert.equal(check(make('The agency requires '+phrase+'.')).length,0,phrase);
 const d=make('“5 percent increase” means the change. The agency requires a 5 percent increase.');assert.equal(check(d).length,0);assert.equal(check(make('The agency requires a 5 percent increase.')).length,1);
 const table=make('The agency requires a two inch board.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 const extended=make('The agency requires a 5 percent increase Act.');const at=extended.text.indexOf('Act');for(const field of ['struck','excluded']){const bad=structuredClone(extended);bad[field].push({start:at,end:at+3});assert.equal(check(bad).length,0);}
});

test('recognized source page heads retain modifier-only physical selections and restored evidence',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 The agency requires a two','AB 192 — 2 —\nline 1 inch board.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1);assert.equal(found[0].suggestion,'two-inch');assert.equal(d.text.slice(found[0].numericModifierEvidence.head.start,found[0].numericModifierEvidence.head.end),'board');assert.equal(found[0].numericModifierEvidence.head.start>found[0].end,true);assert.equal(JSON.stringify(d),saved);
 const e=found[0].numericModifierEvidence,copy=JSON.stringify(e),restored=restoreListedNumericModifierEvidence(e,x=>x,d.text);assert.equal(restored.modifier.text,d.text.slice(found[0].start,found[0].end));assert.equal(restored.article.text,'a');assert.equal(restored.head.text,'board');assert.equal(JSON.stringify(e),copy);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(d).length,0);
});

test('integrated production lets the complete printed modifier own partial numeral percentage and fraction suggestions',()=>{
 for(const [phrase,wanted,context]of examples){const d=make('The agency requires '+phrase+'.',context),saved=JSON.stringify(d),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),direct=check(d),found=all.filter(i=>i.checkId==='lcb-listed-numeric-modifier');assert.equal(found.length,1,phrase+' '+context);assert.equal(found[0].suggestion,wanted);assert.deepEqual(found.map(i=>[i.start,i.end]),direct.map(i=>[i.start,i.end]));assert.ok(!all.some(i=>i!==found[0]&&i.start<found[0].end&&i.end>found[0].start));assert.ok(found[0].references[0].sourcePassage.text.includes(context==='Bill'?'(bill)':'(digest)'));assert.equal(JSON.stringify(d),saved);}
});

test('integrated percentage modifiers preserve large decimal and exact digit strings and keep compliant forms quiet',()=>{
 for(const value of ['7','12.5','12,345.67','900719925474099312345678901234567890'])for(const context of ['Bill','Digest']){
  const wrong=context==='Bill'?value+'%':value+'-percent',d=make('The agency requires a '+wrong+' increase.',context),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),i=all.find(i=>i.checkId==='lcb-listed-numeric-modifier');assert.ok(i,value+' '+context);assert.equal(i.suggestion,context==='Bill'?value+'-percent':value+'%');assert.equal(i.numericModifierEvidence.sourceValue,value);assert.equal(d.text.slice(i.numericModifierEvidence.modifier.start,i.numericModifierEvidence.modifier.end),i.numericModifierEvidence.modifier.text);assert.equal(d.text.slice(i.start,i.end),wrong);
  const correct=make('The agency requires a '+(context==='Bill'?value+'-percent':value+'%')+' increase.',context);assert.equal(jointStylisticIssues(correct,refs,{includeReviewSuggestions:true}).length,0,value+' compliant');
 }
 for(const [phrase,context]of [['a two-inch board','Bill'],['a 2-inch board','Digest'],['a three-quarter-ton truck','Bill'],['a 3⁄4-ton truck','Digest']])assert.equal(jointStylisticIssues(make('The agency requires '+phrase+'.',context),refs,{includeReviewSuggestions:true}).length,0,phrase);
});

test('integrated cross-page evidence maps back to the complete article modifier and excluded noun head',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 The agency requires a 12.5','AB 192 — 2 —\nline 1 percent increase.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-numeric-modifier');assert.equal(found.length,1);const i=found[0];assert.equal(i.suggestion,'12.5-percent');for(const r of [i.numericModifierEvidence.article,i.numericModifierEvidence.modifier,i.numericModifierEvidence.head])assert.equal(d.text.slice(r.start,r.end),r.text);assert.equal(i.numericModifierEvidence.head.text,'increase');assert.ok(i.numericModifierEvidence.head.start>i.end);assert.equal(JSON.stringify(d),saved);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-numeric-modifier').length,0);
});

test('integrated quoted head and table contexts never manufacture the printed numeric construction',()=>{
 for(const text of ['The agency requires “a 5 percent increase”.','“5 percent increase” means the change. The agency requires a 5 percent increase.'])assert.equal(jointStylisticIssues(make(text),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-numeric-modifier').length,0,text);
 const heading=makeDocument(['The agency requires a 5 percent increase.\nThe people do enact as follows:\nline 1 Other content applies.'],'Current');assert.equal(jointStylisticIssues(heading,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-numeric-modifier').length,0);
 const table=make('The agency requires a 5 percent increase.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(jointStylisticIssues(table,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-numeric-modifier').length,0);
});

test('unknown document context preserves complete printed compounds without inventing a Bill replacement',()=>{
 for(const text of ['Use a ¾-ton truck.','Use a 3/4-ton truck.','Use a two inch board.','Use a 5 percent increase.']){
  const d=makeDocument([text],'Unknown'),saved=JSON.stringify(d),ranges=lcbListedNumericModifierProtectionRanges(d);assert.equal(ranges.length,1,text);assert.equal(check(d).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).length,0,text);assert.equal(JSON.stringify(d),saved);
 }
 const unknown=makeDocument(['Use a ¾-ton truck.'],'Unknown');assert.ok(fractionIssues(unknown,refs).some(i=>i.suggestion==='three-fourths'),'The regression control still exercises a real generic partial candidate.');
 const bill=make('Use a ¾-ton truck.'),found=jointStylisticIssues(bill,refs,{includeReviewSuggestions:true});assert.equal(found.length,1);assert.equal(found[0].checkId,'lcb-listed-numeric-modifier');assert.equal(found[0].suggestion,'three-quarter-ton');assert.equal(lcbListedNumericModifierProtectionRanges(bill).length,0);
 assert.equal(jointStylisticIssues(make('Use a 3/4-ton truck.','Digest'),refs,{includeReviewSuggestions:true}).length,0);
});

test('unknown-context negative ownership requires every complete source character and cannot hide unrelated fractions',()=>{
 for(const text of ['Use a ¾-ton trailer.','Use a half-ton truck.','Use a 3/40-ton truck.','Use a ¾—ton truck.','Use ¾-ton truck.','Use a ¾-ton Truck Foundation.','Use “a ¾-ton truck”.'])assert.equal(lcbListedNumericModifierProtectionRanges(makeDocument([text],'Unknown')).length,0,text);
 const d=makeDocument(['Use a ¾-ton truck.'],'Unknown'),range=lcbListedNumericModifierProtectionRanges(d)[0];assert.deepEqual(range.supersedesCheckIds,['fractions','numerals']);assert.deepEqual(range.supersedesRules,['Numerals: Percent']);
 for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){const bad=structuredClone(d);bad[field].push({start:at,end:at+1});assert.equal(lcbListedNumericModifierProtectionRanges(bad).length,0,field+' '+at);}
 const unrelated=makeDocument(['The amount is ¾.'],'Unknown');assert.equal(lcbListedNumericModifierProtectionRanges(unrelated).length,0);assert.ok(jointStylisticIssues(unrelated,refs,{includeReviewSuggestions:true}).some(i=>i.checkId==='fractions'));
});
