import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{lcbExplicitMeaningContextReviewIssues,lcbExplicitMeaningContextProtectionRanges,restoreExplicitMeaningContextEvidence,LCB_EXPLICIT_MEANING_CONTEXT_SCOPE}from '../app/style-lcb-explicit-meaning-contexts.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current'),check=d=>lcbExplicitMeaningContextReviewIssues(d,refs),protect=d=>lcbExplicitMeaningContextProtectionRanges(d,refs);
const cases=[['The city council adopted an ordnance.','The city council adopted an ordinance.','ordnance','ordinance','ordinance-ordnance',4],['The county council enacts the ordnance.','The county council enacts the ordinance.','ordnance','ordinance','ordinance-ordnance',4],['The board of supervisors enacted an ordnance.','The board of supervisors enacted an ordinance.','ordnance','ordinance','ordinance-ordnance',4],['The ordinance consists of military supplies, including weapons.','The ordnance consists of military supplies, including weapons.','ordinance','ordnance','ordinance-ordnance',4],['The tenet occupies the dwelling.','The tenant occupies the dwelling.','tenet','tenant','tenant-tenet',5],['The tenet occupies a rental unit.','The tenant occupies a rental unit.','tenet','tenant','tenant-tenet',5],['A fundamental tenant of the doctrine applies.','A fundamental tenet of the doctrine applies.','tenant','tenet','tenant-tenet',5]];

test('explicit LCB meaning clauses receive conditional guidance and exact source definition evidence',()=>{
 for(const [bad,good,term,wanted,family,page]of cases){const doc=make(bad),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,bad);const i=found[0];assert.equal(i.text,term);assert.equal(i.suggestion,null);assert.equal(i.conditionalSuggestion,wanted);assert.equal(i.meaningFamily,family);assert.equal(i.guidePage,page);assert.equal(i.reviewSuggested,true);assert.deepEqual(i.supersedesCheckIds,['lcb-semantic-review:'+family]);for(const w of i.meaningContextEvidence.sourceWitnesses)assert.equal(refs.lcb.pages[w.page-1].text.slice(w.start,w.end),w.text);assert.equal(JSON.stringify(doc),saved);assert.equal(protect(doc).length,0);}
 assert.match(LCB_EXPLICIT_MEANING_CONTEXT_SCOPE,/same-family generic/);
});

test('supported matching meaning forms protect only their precise generic family owner',()=>{
 for(const [,good,,wanted,family]of cases){const doc=make(good),saved=JSON.stringify(doc),ranges=protect(doc);assert.equal(check(doc).length,0,good);assert.equal(ranges.length,1,good);assert.equal(ranges[0].text,wanted);assert.deepEqual(ranges[0].supersedesCheckIds,['lcb-semantic-review:'+family]);assert.equal(JSON.stringify(doc),saved);}
});

test('existing precise owners retain precedence while generic review owners can be refined',()=>{
 const doc=make(cases[0][0]),at=doc.text.indexOf('ordnance');for(const checkId of ['word-choice','other-precise']){const existingIssues=[{start:at,end:at+8,checkId,reviewSuggested:false}];assert.equal(lcbExplicitMeaningContextReviewIssues(doc,refs,{existingIssues}).length,0);}
 assert.equal(lcbExplicitMeaningContextReviewIssues(doc,refs,{existingIssues:[{start:at,end:at+8,checkId:'lcb-semantic-review:ordinance-ordnance',suggestion:null,reviewSuggested:true}]}).length,1);
});

test('unknown negative metaphorical extended-title and nonterminal contexts do not establish a meaning',()=>{
 for(const text of ['The city council did not adopt an ordnance.','The city council has adopted an ordnance.','The private council adopted an ordnance.','The city council adopted an ordnance program.','The City Council adopted an ordnance.','The city council adopted an Ordnance.','The school tenant adopted an ordnance.','The ordinance regulates military supplies, including weapons.','The ordinance consists of military supplies, including weapons standards.','The tenet occupies the debate.','The tenet occupies the dwelling figuratively.','The Tenet occupies the dwelling.','The tenant occupies the office of chairperson.','A fundamental tenant of the company applies.','A fundamental tenant of the doctrine applies to the new rule.','Unknown source The city council adopted an ordnance.','identifier/The city council adopted an ordnance.','The city council adopted an ordnance.2 applies.']){assert.equal(check(make(text)).length,0,text);assert.equal(protect(make(text)).length,0,text);}
});

test('every full source clause and terminal character must remain intact for both findings and protection',()=>{
 for(const [bad,good]of cases)for(const text of [bad,good]){const doc=make(text),start=doc.text.indexOf(text),eligible=text===bad?check:protect;assert.equal(eligible(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<start+text.length;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(eligible(damaged).length,0,text+' '+field+' '+at);}}
});

test('original masked prefixes, suffixes and qualifier words cannot create a complete supported clause',()=>{
 for(const [text,remove]of [['Not The city council adopted an ordnance.','Not'],['The city council never adopted an ordnance.','never'],['The tenet occupies the dwelling figuratively.','figuratively'],['The city council adopted an ordnancez.','z'],['The tenet occupies the dwellingz.','z']])for(const field of ['struck','excluded']){const doc=make(text),start=doc.text.indexOf(remove);doc[field].push({start,end:start+remove.length});assert.equal(check(doc).length,0,text+' '+field);}
 for(const text of ['αThe city council adopted an ordnance.','The city council adopted an ordnance\u0301.','The tenet occupies the dwelling\u0301.'])assert.equal(check(make(text)).length,0,text);
});

test('original quote enclosures, bill-local quoted forms and per-bill reset remain authoritative',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const [bad,good,term]of cases){assert.equal(check(make('The instruction states '+open+bad+close)).length,0);assert.equal(protect(make('The instruction states '+open+good+close)).length,0);assert.equal(check(make(open+term+close+' means the local term. '+bad)).length,0);for(const field of ['struck','excluded'])for(const side of ['open','close']){const doc=make('The instruction states '+open+bad+close),start=side==='open'?doc.text.indexOf(open):doc.text.lastIndexOf(close);doc[field].push({start,end:start+1});assert.equal(check(doc).length,0,field+' '+side+' '+bad);}}
 assert.equal(check(make(cases[0][0])).length,1);
});

test('headings tables and unknown source gaps protect meaning and acceptance alike',()=>{
 for(const [bad,good]of cases)for(const text of [bad,good]){const doc=make(text);doc.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(doc).length+protect(doc).length,0);const heading=makeDocument([text+'\nThe people do enact as follows:\nOther text applies.'],'Current');assert.equal(check(heading).length+protect(heading).length,0);}
});

test('physical page heads preserve complete nested review and protection evidence',()=>{
 for(const correct of [false,true]){const doc=makeDocument(['The people do enact as follows:\nline 1 The city council adopted an','AB 224 — 2 —\nline 1 '+(correct?'ordinance':'ordnance')+'.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),found=(correct?protect:check)(doc);assert.equal(found.length,1);const e=found[0].meaningContextEvidence,copy=JSON.stringify(e),restored=restoreExplicitMeaningContextEvidence(e,x=>x,doc.text);assert.equal(restored.sourceText,doc.text.slice(restored.start,restored.end));for(const r of [restored.selection,restored.boundary])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.deepEqual(restored.sourceWitnesses,e.sourceWitnesses);assert.equal(JSON.stringify(e),copy);assert.equal(JSON.stringify(doc),saved);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(check(doc).length+protect(doc).length,0);}
});
