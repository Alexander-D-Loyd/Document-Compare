import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import vm from'node:vm';
import{makeDocument}from'../app/core.mjs';
import{prepareEntityAuthorityImport,ENTITY_AUTHORITY_FORMAT}from'../app/offline-entity-authority.mjs';
import{selectedEntityAuthority}from'../app/style-selected-entity-authority.mjs';
import{californiaEntityReview}from'../app/style-california-entities.mjs';
import{officialHeadTitleReviewIssues}from'../app/style-official-head-titles.mjs';
import{createEntityAuthorityPanel}from'../app/entity-authority-ui.mjs';
import {reviewStyleIssues}from '../app/style-review.mjs';
import{jointStylisticIssues}from'../app/joint-style.mjs';
import{createReviewIgnores}from'../app/review-ignores.mjs';
import{normalizeStyleDocumentType}from'../app/style-document-type.mjs';
import{lcbReviewReadiness}from'../app/lcb-review-readiness.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const name='Department of Specimen Review Services',other='Bureau of Independent Example Records',mk=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Independent current');
async function receipt(names){return prepareEntityAuthorityImport(new TextEncoder().encode(JSON.stringify({format:ENTITY_AUTHORITY_FORMAT,version:1,source:{title:'Independent controlled authority',authority:'Fixture owner',citation:'LCB17 item7 controlled fixture only',asOfDate:null,permissions:'Authorized isolated test use',rightsAttested:true},entries:names.map(([name,checkEligible=true])=>({name,category:'Fixture only',citation:'Controlled exact name',annotation:'No claim of real entity identity',checkEligible}))})),{inputFile:'independent-entities.json',importedAt:'2026-10-16T12:00:00.000Z'});}
const a=await receipt([[name]]),b=await receipt([[other]]),off=await receipt([[name,false]]);
function direct(doc,authority){const saved=JSON.stringify(doc),result={exact:californiaEntityReview(doc,refs,{entityAuthority:authority}),head:officialHeadTitleReviewIssues(doc,refs,{entityAuthority:authority})};assert.equal(JSON.stringify(doc),saved);for(const i of[...result.exact.issues,...result.head])assert.equal(doc.text.slice(i.start,i.end),i.text);return result;}

test('independent selected receipts isolate exact names and head witnesses across interleaved documents',()=>{
 const first=mk('The '+name.toLowerCase()+' shall act. The director Jane Doe of the '+name+' shall act.'),second=mk('The '+other.toLowerCase()+' shall act. The commissioner John Smith of the '+other+' shall act.');
 for(const [doc,authority,wanted]of[[first,a,name],[second,b,other],[first,a,name],[second,b,other]]){const r=direct(doc,authority);assert.deepEqual(r.exact.issues.map(i=>i.suggestion),[wanted]);assert.equal(r.head.length,1);assert.equal(r.head[0].officialHeadEvidence.entityName,wanted);assert.equal(r.exact.issues[0].entitySource.datasetId,authority.datasetId);assert.equal(r.head[0].officialHeadEvidence.registry.datasetId,authority.datasetId);}
 for(const[doc,authority]of[[first,b],[second,a],[first,off],[first,null],[second,null]]){const r=direct(doc,authority);assert.equal(r.exact.issues.length,0);assert.equal(r.head.length,0);}
});

test('independent selected data is copied before matching and source provenance never becomes freshness proof',()=>{
 const transport=structuredClone(a),selected=selectedEntityAuthority(transport),snapshot=JSON.stringify(a);transport.entries[0].name=other;transport.source.title='Changed by caller';assert.equal(selected.entries[0].name,name);assert.equal(selected.source.sourceTitle,a.source.title);assert.equal(selected.source.asOfDate,null);assert.equal(selected.source.importedAt,a.importedAt);assert.equal(selected.source.sha256,a.datasetId);assert.match(selected.source.limitations,/do not authenticate/);assert.equal(JSON.stringify(a),snapshot);
 const d=mk('The '+name.toLowerCase()+' shall act.');assert.equal(direct(d,a).exact.issues.length,1);assert.equal(direct(d,transport).exact.issues.length,0);assert.equal(direct(d,a).exact.issues.length,1);
});

test('independent selected authority retains bill-local quoted spelling without carrying that exception to the next bill',()=>{
 const exact=doc=>jointStylisticIssues(doc,refs,{entityAuthority:a,includeReviewSuggestions:true}).filter(i=>i.checkId==='california-entities');
 for(const quote of[['“','”'],['"','"'],['‘','’'],["'","'"]]){const quoted=mk(quote[0]+name.toLowerCase()+quote[1]+' means the locally defined body. The '+name.toLowerCase()+' shall act.');assert.equal(exact(quoted).length,0,quote.join(''));assert.equal(exact(mk('The '+name.toLowerCase()+' shall act.')).length,1);}
});

test('independent no name absence or differing title wording becomes an entity discrepancy',()=>{
 for(const body of['The Department of Specimen Review Service shall act.','The Department for Specimen Review Services shall act.','The Department of Specimen Review Services Advisory Board shall act.','The Office of Unlisted Reader Services shall act.','The director Jane Doe of the Office of Unlisted Reader Services shall act.']){const r=direct(mk(body),a);assert.equal(r.exact.issues.length,0,body);assert.equal(r.head.length,0,body);}
});

test('independent every original body character supporting a selected exact entity remains necessary',()=>{
 const original=mk('The '+name.toLowerCase()+' shall act.'),start=original.text.indexOf(name.toLowerCase()),end=start+name.length;
 for(const key of['struck','excluded'])for(let at=start;at<end;at++){const d=structuredClone(original);d[key].push({start:at,end:at+1});assert.equal(direct(d,a).exact.issues.length,0,key+' '+at);}
 const head=mk('The director Jane Doe of the '+name+' shall act.'),r=direct(head,a);assert.equal(r.head.length,1);for(const key of['struck','excluded'])for(let at=r.head[0].start;at<r.head[0].end;at++){const d=structuredClone(head);d[key].push({start:at,end:at+1});assert.equal(direct(d,a).head.length,0,key+' '+at);}
});

test('independent exact and head authority never borrow a partial technically attached entity name',()=>{
 const exact=doc=>jointStylisticIssues(doc,refs,{entityAuthority:a,includeReviewSuggestions:true}).filter(i=>i.checkId==='california-entities'),heads=doc=>jointStylisticIssues(doc,refs,{entityAuthority:a,includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-official-head-title-review');
 for(const [body,affix]of[['The pre-'+name.toLowerCase()+' shall act.','pre-'],['The '+name.toLowerCase()+'-code shall act.','-code'],['The '+name.toLowerCase()+'/key shall act.','/key'],['The '+name.toLowerCase()+'\u0301 shall act.','\u0301'],['The director Jane Doe of the '+name+'/key shall act.','/key']])for(const field of[null,'struck','excluded']){const doc=mk(body),at=doc.text.indexOf(affix);if(field)doc[field].push({start:at,end:at+affix.length});assert.equal(exact(doc).length,0,body+' '+field);assert.equal(heads(doc).length,0,body+' '+field);}
});

test('independent complete entity identities survive ordinary possessives narrative punctuation and budget item dashes',()=>{
 // These are the forms removed by an overbroad generic role-boundary guard in
 // actual AB109/SB879 source: Finance’s approval, Services’ responsibilities,
 // Agency—in consultation, Innovation: 1), and 6051—California Tahoe Conservancy.
 for(const[prefix,suffix]of[['The ','’s approval is required.'],['The ','’ responsibilities are recorded.'],['The ','—in consultation with the county—shall act.'],['The ',': 1) The work is recorded.'],['6051—',', payable from the fund.']]){
  const valid=mk(prefix+name+suffix),result=direct(valid,a);assert.equal(result.exact.issues.length,0);assert.equal(result.exact.ranges.length,1,prefix+name+suffix);assert.equal(result.exact.ranges[0].name,name);
  const wrong=mk(prefix+name.toLowerCase()+suffix),found=jointStylisticIssues(wrong,refs,{entityAuthority:a,includeReviewSuggestions:true}).filter(i=>i.checkId==='california-entities');assert.equal(found.length,1,prefix+suffix);assert.equal(found[0].suggestion,name);assert.equal(wrong.text.slice(found[0].start,found[0].end),name.toLowerCase());
 }
});

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function elements(){const map=new Map(),node=()=>({disabled:false,value:'',textContent:'',children:[],listeners:{},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},addEventListener(name,handler){this.listeners[name]=handler;},click(){this.listeners.click?.();}});return{$:id=>{if(!map.has(id))map.set(id,node());return map.get(id);},document:{createElement:node}};}
const file=data=>{const bytes=new TextEncoder().encode(JSON.stringify(data));return{name:'independent-import.json',size:bytes.length,arrayBuffer:async()=>bytes.buffer};};

test('independent controller activates only after commit and ignores a concurrent replace or removal',async()=>{
 const dom=elements(),gate=deferred(),saveStarted=deferred(),changes=[];let saved=a,called=0;const store={load:async()=>saved,save:async data=>{called++;saveStarted.resolve();await gate.promise;saved=data;},remove:async()=>{saved=null;}};
 const panel=createEntityAuthorityPanel({...dom,store,onChange:data=>changes.push(data)});await panel.ready;assert.equal(panel.selected().datasetId,a.datasetId);const pending=panel.importFile(file(b));await saveStarted.promise;assert.equal(called,1);assert.equal(panel.selected().datasetId,a.datasetId);assert.equal(changes.length,0);assert.equal(dom.$('entity-import').disabled,true);assert.equal(await panel.remove(),false);assert.equal(await panel.importFile(file(a)),false);gate.resolve();assert.equal(await pending,true);assert.deepEqual(panel.selected().entries,b.entries);assert.equal(changes.length,1);assert.equal(dom.$('entity-import').disabled,false);
});

test('independent rejected import save and removal preserve live selected dataset and notify no false success',async()=>{
 const dom=elements(),changes=[];let saveFails=true,removeFails=true,stored=a;const store={load:async()=>stored,save:async data=>{if(saveFails)throw Error('Commit aborted');stored=data;},remove:async()=>{if(removeFails)throw Error('Clear aborted');stored=null;}};
 const panel=createEntityAuthorityPanel({...dom,store,onChange:data=>changes.push(data)});await panel.ready;assert.equal(await panel.importFile(file({bad:true})),false);assert.equal(await panel.importFile(file(b)),false);assert.equal(panel.selected().datasetId,a.datasetId);assert.equal(await panel.remove(),false);assert.equal(panel.selected().datasetId,a.datasetId);assert.equal(changes.length,0);assert.match(dom.$('entity-status').textContent,/previously active/);saveFails=false;assert.equal(await panel.importFile(file(b)),true);const imported=panel.selected();assert.deepEqual(imported.entries,b.entries);removeFails=false;assert.equal(await panel.remove(),true);assert.equal(panel.selected(),null);assert.deepEqual(changes,[imported,null]);assert.equal(stored,null);
});

test('independent controller reload removal and invalid saved data have explicit source states',async()=>{
 let stored=b;const store={load:async()=>stored,save:async data=>{stored=data;},remove:async()=>{stored=null;}},dom=elements(),panel=createEntityAuthorityPanel({...dom,store});await panel.ready;assert.equal(panel.selected().datasetId,b.datasetId);assert.match(dom.$('entity-source').textContent,/Source as-of: unknown/);assert.match(dom.$('entity-hash').textContent,new RegExp(b.datasetId));assert.equal(panel.warning(),'');assert.equal(await panel.remove(),true);const reload=createEntityAuthorityPanel({...elements(),store});await reload.ready;assert.equal(reload.selected(),null);
 stored={...a,datasetId:'corrupt'};const corruptDom=elements(),corrupt=createEntityAuthorityPanel({...corruptDom,store});await corrupt.ready;assert.equal(corrupt.selected(),null);assert.match(corrupt.warning(),/bundled snapshot/);assert.equal(corruptDom.$('entity-remove').disabled,false);assert.equal(stored.datasetId,'corrupt');assert.equal(await corrupt.remove(),true);assert.equal(corrupt.warning(),'');assert.equal(stored,null);
});

const appSource=fs.readFileSync(new URL('../app/app.mjs',import.meta.url),'utf8'),slice=(from,to)=>appSource.slice(appSource.indexOf(from),appSource.indexOf(to,appSource.indexOf(from)+from.length));
function sourceHarness({waitingForEntity=false,waitingForNative=false}={}){
 const dom=elements(),gate=deferred(),workers=[],requests=[],nativeResolves=[],ignores=createReviewIgnores();let selected=a;
 const context=vm.createContext({...dom,normalizeStyleDocumentType,reviewIgnores:ignores,crypto:{randomUUID:()=>String(requests.length)},cancelOfflineLanguage(){},updateIgnoreControls(){},setReviewMode(){},renderDocuments(){},applyStyleReviewView(){},availability(){},authorityReady:Promise.resolve(),entityPanel:{ready:waitingForEntity?gate.promise:Promise.resolve(),warning:()=>'',selected:()=>selected},customTerms:[],offlineAuthority:null,docs:[{text:'Previous'},mk('The '+name.toLowerCase()+' shall act.')],compareWorker:null,reviewOfflineLanguage(doc,kind,id){requests.push({doc,kind,id});return waitingForNative?new Promise(resolve=>nativeResolves.push(resolve)):Promise.resolve({issues:[],warning:''});},Worker:class{constructor(){this.messages=[];workers.push(this);}terminate(){this.terminated=true;}postMessage(data){this.messages.push(data);}}});
 vm.runInContext("let compared=true,reviewMode='style',stylePending=false,styleChecked=false,styleIndex=-1,styleWorker=null,styleSequence=0,styleRequestId=null,styleEngineWarning='',allStyleIssues=[],styleIssues=[];",context);
 vm.runInContext(slice('function entityAuthorityChanged()', 'function selectStyle(')+slice('async function checkStyle()', 'function loadGuideReference('),context);
 return{...dom,context,workers,requests,nativeResolves,ignores,resolveEntity:gate.resolve,select:data=>{selected=data;vm.runInContext('entityAuthorityChanged()',context);},check:()=>vm.runInContext('checkStyle()',context)};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('independent actual app authority loading and replacement keep only latest pending selected receipt',async()=>{
 const h=sourceHarness({waitingForEntity:true}),pending=h.check();await flush();assert.equal(h.workers.length,0);h.select(b);h.resolveEntity();await pending;await flush();assert.equal(h.workers.length,1);assert.equal(h.workers[0].messages[0].entityAuthority.datasetId,b.datasetId);assert.equal(h.requests.length,1);assert.equal(h.context.docs[1].entityAuthority,undefined);
});

test('independent actual app selection cancels stale native work and style decisions while preserving spelling decisions',async()=>{
 const h=sourceHarness({waitingForNative:true}),body=h.context.docs[1].text,at=body.indexOf(name.toLowerCase()),style={start:at,end:at+name.length,text:name.toLowerCase(),rule:'Entity',suggestion:name},spelling={start:at,end:at+10,word:'department'};h.ignores.ignore('spelling',spelling,body,true);h.ignores.ignore('style',style,body,true);const old=h.check();await flush();assert.equal(h.workers.length,1);const stale=h.workers[0];h.select(b);await flush();assert.equal(stale.terminated,true);assert.equal(h.workers.length,2);assert.equal(h.ignores.has('style',style,body),false);assert.equal(h.ignores.has('spelling',spelling,body),true);h.nativeResolves[0]({issues:[],warning:''});await old;assert.equal(stale.messages.length,0);stale.onmessage({data:{issues:[{text:'stale'}]}});assert.equal(vm.runInContext('styleChecked',h.context),false);h.nativeResolves[1]({issues:[],warning:''});await flush();assert.equal(h.workers[1].messages[0].entityAuthority.datasetId,b.datasetId);assert.equal(h.context.docs[0].entityAuthority,undefined);assert.equal(h.context.docs[1].entityAuthority,undefined);
});

test('independent actual worker transport uses one selected authority for exact and head results and resets to bundled',async()=>{
 const workerSource=fs.readFileSync(new URL('../app/style-worker.mjs',import.meta.url),'utf8').replace(/^import .*\r?\n/gmu,''),messages=[],self={postMessage:message=>messages.push(message)},context=vm.createContext({self,reviewStyleIssues,lcbReviewReadiness,customStyleIssues:()=>[],STYLE_GUIDES:[{id:'lcb',referenceUrl:'lcb'},{id:'gpo',referenceUrl:'gpo'}],fetch:async id=>({ok:true,json:async()=>refs[id]})});vm.runInContext(workerSource,context);const doc=mk('The '+name.toLowerCase()+' shall act. The director Jane Doe of the '+name+' shall act.');await self.onmessage({data:{doc,entityAuthority:a}});assert.equal(messages[0].error,undefined);const exact=messages[0].issues.filter(i=>i.checkId==='california-entities'),heads=messages[0].issues.filter(i=>i.checkId==='lcb-official-head-title-review');assert.equal(exact.length,1);assert.equal(heads.length,1);assert.equal(exact[0].entitySource.datasetId,a.datasetId);assert.equal(heads[0].officialHeadEvidence.registry.datasetId,a.datasetId);await self.onmessage({data:{doc,entityAuthority:b}});assert.equal(messages[1].issues.filter(i=>['california-entities','lcb-official-head-title-review'].includes(i.checkId)).length,0);await self.onmessage({data:{doc:mk('The department of finance shall act.')}});assert.ok(messages[2].issues.some(i=>i.checkId==='california-entities'&&i.suggestion==='Department of Finance'));
});

test('independent selected authority production highlights restore every divided entity person and role component',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The director Jane Doe of the department of specimen re-','AB 224 — 2 —\nline 1 view services shall act.'],'Current'),header=doc.blocks.find(block=>block.text==='AB 224 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const before=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs,{entityAuthority:a,includeReviewSuggestions:true}),exact=issues.filter(i=>i.checkId==='california-entities'),heads=issues.filter(i=>i.checkId==='lcb-official-head-title-review');assert.equal(exact.length,1);assert.equal(heads.length,1);assert.equal(exact[0].suggestion,name);for(const i of[...exact,...heads])assert.equal(doc.text.slice(i.start,i.end),i.text);const evidence=heads[0].officialHeadEvidence;assert.equal(doc.text.slice(evidence.headStart,evidence.headEnd),evidence.sourceHead);assert.equal(doc.text.slice(evidence.entityStart,evidence.entityEnd),evidence.sourceEntity);assert.equal(doc.text.slice(evidence.personStart,evidence.personEnd),evidence.sourcePerson);for(const part of evidence.roleEvidence)assert.equal(doc.text.slice(part.start,part.end),part.text);assert.match(evidence.sourceEntity,/re-\nAB 224 — 2 —\nline 1 view/u);assert.equal(JSON.stringify(doc),before);
});
