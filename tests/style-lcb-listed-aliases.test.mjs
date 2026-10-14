import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbListedAliasIssues,restoreListedAliasEvidence,LCB_LISTED_ALIAS_SCOPE} from '../app/style-lcb-listed-aliases.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=body=>makeDocument(['The people do enact as follows:\n'+body],'Current'),check=doc=>lcbListedAliasIssues(doc,refs);

test('exact solid phasein after the finite source modal role receives only the printed open verb form',()=>{
 assert.ok(refs.lcb.pages[11].text.includes('phase in (v.)'));
 for(const modal of ['shall','must','should','will','would','could','can','may']){const doc=make('The agency '+modal+' phasein the program.'),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,modal);const i=issues[0];assert.equal(i.text,'phasein');assert.equal(i.suggestion,'phase in');assert.equal(i.guidePage,12);assert.equal(i.checkId,'lcb-phasein-alias');assert.equal(doc.text.slice(i.start,i.end),'phasein');assert.equal(i.listedAliasEvidence.cue.text,modal);assert.equal(refs.lcb.pages[11].text.slice(i.listedAliasEvidence.sourceExample.start,i.listedAliasEvidence.sourceExample.end),i.listedAliasEvidence.sourceExample.text);assert.equal(JSON.stringify(doc),before);}
});

test('the exact separated Medi Cal program alias owns only the printed name before its intact head',()=>{
 assert.ok(refs.lcb.pages[10].text.includes('Medi-Cal'));assert.ok(refs.lcb.pages[18].text.includes('Medi-Cal program'));
 for(const alias of ['Medi Cal','Medi cal','medi Cal','medi cal']){const doc=make('The '+alias+' program applies.'),before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1,alias);const i=issues[0];assert.equal(i.text,alias);assert.equal(i.suggestion,'Medi-Cal');assert.equal(i.guidePage,11);assert.equal(i.checkId,'lcb-listed-program-alias');assert.equal(i.listedAliasEvidence.cue.text,'program');assert.equal(doc.text.slice(i.listedNameEvidence.start,i.listedNameEvidence.end),alias+' program');assert.equal(i.listedNameEvidence.sourcePage,11);assert.equal(i.listedNameEvidence.printedName,'Medi-Cal');assert.equal(i.listedNameEvidence.agencyEnd,i.end);assert.equal(i.listedNameEvidence.headStart,i.end);assert.equal(JSON.stringify(doc),before);}
});

test('existing hyphen/open verb and program spellings retain their owners and unencoded roles remain quiet',()=>{
 for(const body of ['The agency shall phase in the program.','The agency shall phase-in the program.','The phasein is required.','The agency phasein the program.','The agency shall phasingin the program.','The agency shall phasein’s program.','The agency shall Phasein the program.','The agency shall PHASEIN the program.','The agency shall xphasein the program.','The agency shall phaseinα the program.','The agency shall phasein\u0301 the program.','The agency shallphasein the program.','The agency shall phasein Program Act.','The agency shall phasein-program.','The code/shall phasein applies.','The Medi-Cal program applies.','The MediCal program applies.','The MEDI CAL program applies.','The Medi Cal Program applies.','The Medi Cal projects apply.','The Medi Cal programs apply.','The xMedi Cal program applies.','The Medi Calé program applies.','The Medi Cal\u0301 program applies.','The Medi Cal programé applies.','The Medi Cal program Act applies.','The Nevada Medi Cal program applies.','The identifier/Medi Cal program applies.','The Medi Cal program/key applies.','The Medi Cal program.2 applies.'])assert.equal(check(make(body)).length,0,body);
 assert.match(LCB_LISTED_ALIAS_SCOPE,/No new phrasal inflection/);
});

test('each modal alias head and connecting character requires complete undamaged source evidence',()=>{
 for(const phrase of ['shall phasein','Medi Cal program']){const doc=make(phrase==='shall phasein'?'The agency shall phasein the program.':'The Medi Cal program applies.'),start=doc.text.indexOf(phrase),end=start+phrase.length;assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+phrase+' '+at);}}
 for(const [body,damage] of [['The Nevada Medi Cal program applies.','Nevada'],['The Medi Cal program Act applies.','Act']])for(const field of ['struck','excluded']){const doc=make(body),at=doc.text.indexOf(damage);doc[field].push({start:at,end:at+damage.length});assert.equal(check(doc).length,0,'Removed title context is negative evidence: '+body);}
});

test('literal and bill-local quoted aliases stay authoritative only in the loaded bill',()=>{
 for(const body of ['“phasein” means the action. The agency shall phasein the program.','“Medi Cal” means the program. The medi Cal program applies.','The instruction states "The agency shall phasein the program."','The instruction states “The Medi Cal program applies.”'])assert.equal(check(make(body)).length,0,body);
 assert.equal(check(make('The agency shall phasein the program.')).length,1);assert.equal(check(make('The Medi Cal program applies.')).length,1);
});

test('struck or excluded original quotation endpoints never expose a literal alias payload',()=>{
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const payload of ['The agency shall phasein the program.','The Medi Cal program applies.'])for(const field of ['struck','excluded'])for(const mark of [open,close]){const doc=make('The instruction states '+open+payload+close),at=mark===open?doc.text.indexOf(open):doc.text.lastIndexOf(close);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0,field+' '+open+payload+close+' '+mark);}
});

test('technical identifiers headings tables and genuine body dashes cannot establish alias roles',()=>{
 for(const body of ['The agency shall phase—in the program.','The Medi—Cal program applies.','The URL https://example.gov/shall-phasein identifies a file.','The Medi Cal program.2 applies.'])assert.equal(check(make(body)).length,0,body);
 for(const body of ['The agency shall phasein the program.','The Medi Cal program applies.']){const table=make(body);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);const heading=makeDocument([body+'\nThe people do enact as follows:\nOther text applies.'],'Current');assert.equal(check(heading).length,0);}
});

test('reader-identified physical page divisions preserve exact alias and role evidence including UTF-16 positions',()=>{
 for(const pages of [['The people do enact as follows:\nline 1 The agency shall','AB 224 — 2 —\nline 1 phasein the program.'],['The people do enact as follows:\nline 1 😀 The Medi','AB 224 — 2 —\nline 1 Cal program applies.'],['The people do enact as follows:\nline 1 The Medi Cal','AB 224 — 2 —\nline 1 program applies.']]){const doc=makeDocument(pages,'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1);const i=issues[0];assert.equal(doc.text.slice(i.start,i.end),i.text);const e=i.listedAliasEvidence,copy=JSON.stringify(e),restored=restoreListedAliasEvidence(e,x=>x,doc.text);assert.equal(restored.sourceText,doc.text.slice(restored.start,restored.end));for(const r of [restored.selection,restored.cue])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.deepEqual(restored.sourceExample,e.sourceExample);assert.equal(JSON.stringify(e),copy);assert.equal(JSON.stringify(doc),before);head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(doc).length,0);}
});

test('integrated exact aliases keep source evidence and independent GPO ownership without duplicate prior verb owners',()=>{
 for(const [body,wanted,id] of [['The agency shall phasein the program.','phase in','lcb-phasein-alias'],['The Medi Cal program applies.','Medi-Cal','lcb-listed-program-alias']]){const doc=make(body+' The check up is required.'),issues=jointStylisticIssues(doc,refs),own=issues.filter(i=>i.checkId===id);assert.equal(own.length,1,body);assert.equal(own[0].suggestion,wanted);assert.ok(!issues.some(i=>i!==own[0]&&i.start<own[0].end&&i.end>own[0].start));assert.ok(issues.some(i=>i.checkId==='gpo-nominals'&&i.suggestion==='checkup'));assert.ok(own[0].references[0].sourcePassage.text.includes(id==='lcb-phasein-alias'?'phase in':'Medi-Cal'));for(const r of [own[0].listedAliasEvidence.selection,own[0].listedAliasEvidence.cue])assert.equal(doc.text.slice(r.start,r.end),r.text);}
 const prior=jointStylisticIssues(make('The agency shall phase-in the program.'),refs);assert.equal(prior.length,1);assert.equal(prior[0].checkId,'phrasal-verbs');assert.equal(prior[0].suggestion,'phase in');
});
