import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {GENERAL_MODIFIER_REVIEW_RULE}from '../app/offline-rules.mjs';
import {inStatePrepositionalEvidence}from '../app/style-in-state-evidence.mjs';import {nonNominalModifierHeadEvidence}from '../app/style-modifier-head-evidence.mjs';
import {listedModifierWitness}from './helpers/listed-modifier-witness.mjs';
const make=text=>makeDocument([text],'Current');
function raw(plan,phrase,head,listed=false){const start=plan.text.indexOf(phrase),headStart=plan.text.indexOf(head,start+phrase.length);assert.ok(start>=0&&headStart>=start);const issue={start,end:start+phrase.length,headStart,headEnd:headStart+head.length,head,evidenceStart:0,evidenceEnd:plan.text.length,suggestion:listed?'in-state':null,engine:'spaCy',engineRule:listed?'LCB_IN_STATE_MODIFIER':GENERAL_MODIFIER_REVIEW_RULE,reviewSuggested:!listed,...(listed?{attachmentMethod:'direct'}:{reviewVariant:'open-modifier'})};if(listed)issue.modifierRoleEvidence=listedModifierWitness(plan,issue);return issue;}
const mapped=(text,phrase,head,listed=false)=>{const doc=make(text),before=JSON.stringify(doc),plan=prepareOfflineLanguage(doc),out=mapOfflineIssues(doc,plan,[raw(plan,phrase,head,listed)],'style');assert.equal(JSON.stringify(doc),before);return out;};

test('in plus state-qualified objects retain complete nominal and verbal source roles',()=>{
 for(const [text,head]of [['The bill includes a change in state statute.','statute'],['There is a reduction in state funding.','funding'],['Drive efficiencies in state transmission development efforts.','efforts'],['Offenders were incarcerated in state prison.','prison'],['Fees arise from actions in state courts.','courts'],['The workers participate in state programs.','programs']]){const doc=make(text),start=text.indexOf('in state');assert.ok(inStatePrepositionalEvidence(doc,styleContext(doc),start,start+8,text.lastIndexOf(head)+head.length),text+' direct source witness');assert.equal(mapped(text,'in state',head,true).length,0,text);}
});

test('printed in-state modifiers require full role proof and generic questions stay disabled',()=>{
 for(const [text,head]of [['The in state provider serves applicants.','provider'],['The board supports in state tuition.','tuition'],['An in state program applies.','program'],['Applications for in state permits are accepted.','permits'],['The agency operates in state casinos.','casinos'],['The agency serves in state clients.','clients']]){const found=mapped(text,'in state',head,true);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,'in-state');}
 const changing=make('The agency changes in state program requirements.'),stateAt=changing.text.indexOf('in state');assert.equal(inStatePrepositionalEvidence(changing,styleContext(changing),stateAt,stateAt+8,changing.text.indexOf('requirements')+12),null,'An ambiguous transitive verb is not proof of a prepositional reading');
 for(const [text,phrase,head]of [['The board provides person centered care.','person centered','care'],['The board supports community based programs.','community based','programs']])assert.equal(mapped(text,phrase,head).length,0,text);
 const doc=make('The community college district services continue pursuant to Section 1.'),start=doc.text.indexOf('services');assert.equal(nonNominalModifierHeadEvidence(doc,styleContext(doc),{start,end:start+8}),null,'a later connector does not change a real noun head');
});

test('allocated state tax credits need an intact amount, named budget year and complete credit object',()=>{
 const text='The committee may allocate up to $500,000,000 for the 2027 calendar year in state low-income housing tax credits.',doc=make(text),at=text.indexOf('in state');assert.ok(inStatePrepositionalEvidence(doc,styleContext(doc),at,at+8,text.lastIndexOf('credits')+7));assert.equal(mapped(text,'in state','credits',true).length,0);
 for(const changed of [text.replace('allocate','identify'),text.replace('$500,000,000','funding'),text.replace('$500,000,000','$500,00'),text.replace('2027 calendar year','calendar year'),text.replace('tax credits','programs')]){const doc=make(changed),ctx=styleContext(doc),start=changed.indexOf('in state'),end=changed.lastIndexOf('.');assert.equal(inStatePrepositionalEvidence(doc,ctx,start,start+8,end),null,changed);}
});

test('in-state role witnesses preserve recognized PDF rows and reject unknown masked evidence',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 There is a reduction\n97','AB 121 — 2 —\nline 1 in state funding.'],'Current'),plan=prepareOfflineLanguage(doc),before=JSON.stringify(doc);assert.equal(mapOfflineIssues(doc,plan,[raw(plan,'in state','funding',true)],'style').length,0);assert.equal(JSON.stringify(doc),before);
 const long=make('There is a reduction'+' '.repeat(1000)+'in state funding.'),start=long.text.indexOf('in state');assert.ok(inStatePrepositionalEvidence(long,styleContext(long),start,start+8,long.text.indexOf('funding')+7));
 for(const property of ['struck','excluded']){const text='There is a reduction x in state funding.',d=make(text),at=text.indexOf(' x ')+1;d[property].push({start:at,end:at+1});const atState=text.indexOf('in state');assert.equal(inStatePrepositionalEvidence(d,styleContext(d),atState,atState+8,text.indexOf('funding')+7),null);}
});

test('complete nonnominal connector and adverb constructions cannot supply a modifier noun head',()=>{
 for(const [text,phrase,head]of [['The number issued pursuant to Section 1 applies.','number issued','pursuant'],['The guidance issued thereunder.','guidance issued','thereunder'],['The prescription drugs complies with the sections.','prescription drugs','complies'],['The amounts appropriated therefor as a result of complying with the order apply.','amounts appropriated','therefor']])assert.equal(mapped(text,phrase,head).length,0,text);
});

test('printed data-processing still rejects a mislabelled nonnominal head and invented data-sharing is disabled',()=>{
 const phrase='data processing',engineRule='LCB_DATA_PROCESSING_MODIFIER',suggestion='data-processing';
 const bad=make('The '+phrase+' complies with the rules.'),plan=prepareOfflineLanguage(bad),issue={...raw(plan,phrase,'complies'),engineRule,suggestion,reviewSuggested:false,attachmentMethod:'direct'};issue.modifierRoleEvidence=listedModifierWitness(plan,issue);
 // Supply an otherwise complete fixture with the real finite verb. The
 // source guard must reject complies as a nominal head, independently.
 if(!issue.modifierRoleEvidence){const headAt=plan.text.indexOf('complies'),node={start:headAt,end:headAt+8,text:'complies',pos:'VERB',tag:'VBZ',dep:'ROOT',headStart:headAt,headEnd:headAt+8,headText:'complies',finiteAuxiliaries:[]};issue.modifierRoleEvidence={kind:'exact-listed-attributive',components:[{start:issue.start,end:issue.start+4,text:'data',pos:'NOUN',tag:'NN',dep:'compound',headStart:headAt,headEnd:headAt+8,headText:'complies'},{start:issue.start+5,end:issue.end,text:'processing',pos:'NOUN',tag:'NN',dep:'compound',headStart:headAt,headEnd:headAt+8,headText:'complies'}],head:{...node,pos:'NOUN',tag:'NNS',dep:'dobj'},predicate:node};}
 assert.equal(mapOfflineIssues(bad,plan,[issue],'style').length,0);
 const good=make('The agency supports data processing systems.'),goodPlan=prepareOfflineLanguage(good),valid={...raw(goodPlan,phrase,'systems'),engineRule,suggestion,reviewSuggested:false,attachmentMethod:'direct'};valid.modifierRoleEvidence=listedModifierWitness(goodPlan,valid);assert.equal(mapOfflineIssues(good,goodPlan,[valid],'style').length,1);
 assert.equal(mapped('The agency supports data sharing systems.','data sharing','systems').length,0);
});

test('head role guards do not infer function words from damaged or partial original constructions',()=>{
 for(const text of ['The number issued pursuant toward the section.','The guidance issued thereunderArchive.','The drugs complies withhold the rule.','The amounts appropriated therefor as a consequence of the rule apply.','The number issued pursuant toα Section 1.']){const d=make(text),word=text.includes('pursuant')?'pursuant':text.includes('thereunder')?'thereunder':text.includes('complies')?'complies':'therefor',start=text.indexOf(word);assert.equal(nonNominalModifierHeadEvidence(d,styleContext(d),{start,end:start+word.length}),null,text);}
 for(const property of ['struck','excluded']){const text='The number issued pursuant x to Section 1 applies.',d=make(text),at=text.indexOf(' x ')+1,start=text.indexOf('pursuant');d[property].push({start:at,end:at+1});assert.equal(nonNominalModifierHeadEvidence(d,styleContext(d),{start,end:start+8}),null,property);}
 const table=make('The number issued pursuant to Section 1 applies.');table.blocks[0].formatting={headerGaps:[12,24]};const start=table.text.indexOf('pursuant');assert.equal(nonNominalModifierHeadEvidence(table,styleContext(table),{start,end:start+8}),null);
});

test('reader-recognized head divisions and posthead connectors preserve full source evidence',()=>{
 const d=makeDocument(['line 1 The number issued pur-\nline 2 suant\nline 3 to Section 1 applies.'],'Current',[],[],new Set(['pursuant'])),before=JSON.stringify(d),plan=prepareOfflineLanguage(d);assert.equal(mapOfflineIssues(d,plan,[raw(plan,'number issued','pursuant')],'style').length,0);assert.equal(JSON.stringify(d),before);
 const unknown=makeDocument(['line 1 The number issued pur-\nline 2 suant to Section 1 applies.'],'Current'),headStart=unknown.text.indexOf('pur-'),headEnd=unknown.text.indexOf('suant')+5;assert.equal(nonNominalModifierHeadEvidence(unknown,styleContext(unknown),{start:headStart,end:headEnd}),null,'a bare unrecognized division supplies no lexical head');
});
