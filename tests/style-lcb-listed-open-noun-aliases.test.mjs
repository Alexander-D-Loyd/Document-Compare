import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{lcbListedOpenNounAliasIssues,LCB_LISTED_OPEN_NOUN_ALIASES,restoreListedOpenNounAliasEvidence}from '../app/style-lcb-listed-open-noun-aliases.mjs';
import{styleWordDivisionView}from '../app/style-word-divisions.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const make=(t,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+t+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+t],'Current'),check=d=>lcbListedOpenNounAliasIssues(d,refs);

test('five exact printed open nouns cover their missing hyphen aliases with complete source roles',()=>{
 for(const kind of ['Bill','Digest'])for(const r of LCB_LISTED_OPEN_NOUN_ALIASES){const d=make('The '+r.variant+' is required.',kind),saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,r.variant);const i=found[0];assert.equal(i.text,r.variant);assert.equal(i.suggestion,r.preferred);assert.equal(i.guidePage,r.page);assert.equal(i.references[0].ruleText,r.preferred);assert.equal(i.checkId,'lcb-listed-open-noun-aliases');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.openNounAliasEvidence.evidenceStart,i.openNounAliasEvidence.evidenceEnd),i.openNounAliasEvidence.sourceText);assert.ok(refs.lcb.pages[r.page-1].text.includes(r.preferred));assert.equal(JSON.stringify(d),saved);assert.equal(check(make('The '+r.preferred+' is required.',kind)).length,0);}
});

test('complete printed noun senses retain selected person vehicle and school-year predicates',()=>{
 for(const [t,w]of [['A home-buyer is eligible.','home buyer'],['A home-buyer is an eligible person.','home buyer'],['A motor-home is a vehicle.','motor home'],['The school-year begins in August.','school year'],['The school-year ends in June.','school year']]){const found=check(make(t));assert.equal(found.length,1,t);assert.equal(found[0].suggestion,w);}
});

test('unit modifiers, unfamiliar noun roles and named or technical extensions remain protected',()=>{
 for(const r of LCB_LISTED_OPEN_NOUN_ALIASES)for(const t of ['The '+r.variant+' calendar is required.','The '+r.variant+' review is required.','The '+r.variant+' program applies.','The '+r.variant+' applies.','The '+r.variant+' is unknownword.','The '+r.variant+' is required Act.','The '+r.variant+' is required for Nevada.','Named The '+r.variant+' is required.','The '+r.variant[0].toUpperCase()+r.variant.slice(1)+' is required.','The x'+r.variant+' is required.','The '+r.variant+'é is required.','The '+r.variant+'\u0301 is required.','The '+r.variant+' is required\u0301.','The '+r.variant+' is requiredé.','The '+r.variant+'/key is required.','The '+r.variant+'-identifier is required.','The '+r.variant+'.2 is required.','The '+r.variant.replace('-','—')+' is required.'])assert.equal(check(make(t)).length,0,t);
 assert.equal(check(make('The school-year calendar begins in August.')).length,0);assert.equal(check(make('The school-year begins with instruction.')).length,0);
});

test('every establishing article noun predicate and space requires original intact source evidence',()=>{
 for(const r of LCB_LISTED_OPEN_NOUN_ALIASES){const d=make('The '+r.variant+' is required.'),i=check(d)[0];for(const field of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+r.variant+' '+at);}}
 for(const field of ['struck','excluded'])for(const [t,cut]of [['The school-year calendar is required.','calendar'],['Named The floor-plan is required.','Named'],['The home-buyer is required Act.','Act']]){const d=make(t),at=d.text.indexOf(cut);d[field].push({start:at,end:at+cut.length});assert.equal(check(d).length,0,field+' '+cut);}
});

test('literal and bill-local quoted aliases protect exact forms and reset across bills',()=>{
 for(const r of LCB_LISTED_OPEN_NOUN_ALIASES)for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  assert.equal(check(make('The '+marks[0]+r.variant+marks[1]+' is required.')).length,0);
  assert.equal(check(make(marks[0]+r.variant+marks[1]+' means this noun. The '+r.variant+' is required.')).length,0);
  const d=make(marks[0]+'The '+r.variant+' is required'+marks[1]+'.');for(const field of ['struck','excluded'])for(const mark of marks){const damaged=structuredClone(d),at=damaged.text.indexOf(mark);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+mark);}
 }
 assert.equal(check(make('The floor-plan is required.')).length,1);
});

test('headings tables and actual page-head evidence preserve scope and exact physical selections',()=>{
 for(const r of LCB_LISTED_OPEN_NOUN_ALIASES){const h=makeDocument(['The '+r.variant+' is required.\nThe people do enact as follows:\nline 1 Other text.'],'Current');assert.equal(check(h).length,0);const t=make('The '+r.variant+' is required.');t.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(t).length,0);}
 const d=makeDocument(['The people do enact as follows:\nline 1 The floor-plan','AB 224 — 2 —\nline 1 is required.'],'Current'),header=d.blocks.find(b=>b.text==='AB 224 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1);assert.equal(found[0].text,'floor-plan');assert.equal(d.text.slice(found[0].evidenceStart,found[0].evidenceEnd),found[0].openNounAliasEvidence.sourceText);assert.equal(JSON.stringify(d),saved);header.runningHead=false;header.layoutLabel=false;header.formatting={};assert.equal(check(d).length,0);
});

test('outer recognized-word views restore noun role evidence without changing physical source',()=>{
 const d=make('The floor-plan is req-\nuired.');assert.ok(d.wrappedWords.length);for(const w of d.wrappedWords)w.recognized=true;const saved=JSON.stringify(d),view=styleWordDivisionView(d);assert.ok(view);const found=lcbListedOpenNounAliasIssues(view.doc,refs);assert.equal(found.length,1);const restored=view.restore(found).map(i=>restoreListedOpenNounAliasEvidence(i,view.toSource,d.text));const i=restored[0],e=i.openNounAliasEvidence;assert.equal(i.text,'floor-plan');assert.equal(d.text.slice(e.evidenceStart,e.evidenceEnd),e.sourceText);assert.equal(d.text.slice(e.predicateStart,e.predicateEnd),' is req-\nuired');assert.equal(i.evidenceEnd,e.evidenceEnd);assert.equal(JSON.stringify(d),saved);
});
