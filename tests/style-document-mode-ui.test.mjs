import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createReviewIgnores}from '../app/review-ignores.mjs';import {normalizeStyleDocumentType}from '../app/style-document-type.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const source=fs.readFileSync(new URL('../app/app.mjs',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)+from.length));
function harness({pending=false,deferredAuthority=false}={}){
 const elements=new Map(),workers=[],requests=[],resolvers=[],ignores=createReviewIgnores();
 const $=id=>{if(!elements.has(id))elements.set(id,{value:id==='style-document-type'?'bill':'',disabled:false,textContent:'',addEventListener(type,fn){this[type]=fn;}});return elements.get(id);};
 let resolveAuthority;const authority=deferredAuthority?new Promise(resolve=>{resolveAuthority=resolve;}):Promise.resolve();
 const context=vm.createContext({$,normalizeStyleDocumentType,reviewIgnores:ignores,crypto:{randomUUID:()=>String(requests.length)},cancelOfflineLanguage(){},updateIgnoreControls(){},setReviewMode(){},renderDocuments(){},applyStyleReviewView(){},authorityReady:authority,entityPanel:{ready:Promise.resolve(),warning:()=>'',selected:()=>null},customTerms:[],offlineAuthority:null,docs:[{text:'Previous'},{text:'Current',blocks:[],excluded:[],struck:[],wrappedWords:[]}],loading:{0:false,1:false},loadingLanguage:false,amendmentsDoc:null,digestDoc:null,externalDocs:{},referenceBill:null,hasAmendments:()=>false,compareWorker:null,amendmentWorker:null,reviewOfflineLanguage(doc,kind,id){requests.push({doc,kind,id});return pending?new Promise(resolve=>resolvers.push(resolve)):Promise.resolve({issues:[],warning:''});},Worker:class{constructor(){this.messages=[];workers.push(this);}terminate(){this.terminated=true;}postMessage(data){this.messages.push(data);}}});
 vm.runInContext("let compared=true,stylePending=false,styleChecked=false,styleIndex=-1,styleWorker=null,styleSequence=0,styleRequestId=null,styleEngineWarning='',allStyleIssues=[],styleIssues=[];",context);
 vm.runInContext(section('function availability()', 'function invalidateAmendments()')+section('function resetStyle()', 'function selectStyle(')+section('async function checkStyle()', 'function loadGuideReference('),context);
 const handler=/\$\('style-document-type'\)\.addEventListener\('change',[\s\S]*?\n\}\);/u.exec(source)[0];vm.runInContext(handler,context);
 return {$,context,workers,requests,resolvers,ignores,resolveAuthority,check:()=>vm.runInContext('checkStyle()',context)};
}
test('document-type selector is explicit and the actual app sends its choice only with the Current style model',async()=>{
 assert.match(html,/<label for="style-document-type">Style rules for<\/label>/u);for(const value of ['bill','opinion','cover-letter'])assert.ok(html.includes('value="'+value+'"'));
 const h=harness();h.$('style-document-type').value='cover-letter';await h.check();assert.equal(h.workers[0].messages.length,1);assert.equal(h.workers[0].messages[0].doc.styleDocumentType,'cover-letter');assert.equal(h.requests[0].doc.styleDocumentType,'cover-letter');assert.equal(h.context.docs[1].styleDocumentType,undefined);assert.equal(h.context.docs[0].styleDocumentType,undefined);
});
test('changing document type cancels the old worker and rejects its late native/style results',async()=>{
 const h=harness({pending:true}),old=h.check();await flush();assert.equal(h.workers.length,1);const stale=h.workers[0];
 h.$('style-document-type').value='opinion';h.$('style-document-type').change();await flush();assert.equal(stale.terminated,true);assert.equal(h.workers.length,2);
 h.resolvers[0]({issues:[],warning:''});await old;assert.equal(stale.messages.length,0);stale.onmessage({data:{issues:[{text:'stale'}]}});assert.equal(vm.runInContext('styleChecked',h.context),false);
 h.resolvers[1]({issues:[],warning:''});await flush();assert.equal(h.workers[1].messages[0].doc.styleDocumentType,'opinion');
});
test('mode changes clear style Ignore and Undo state while retaining language decisions',async()=>{
 const h=harness(),text='word word',style={start:0,end:4,text:'word',rule:'Style',suggestion:'form'},spelling={start:0,end:4,word:'word'};
 h.ignores.ignore('spelling',spelling,text,true);h.ignores.ignore('style',style,text);h.ignores.ignore('style',style,text,true);h.$('style-document-type').change();assert.equal(h.ignores.has('style',style,text),false);assert.equal(h.ignores.has('spelling',spelling,text),true);assert.equal(h.ignores.undo().kind,'spelling');assert.equal(h.ignores.canUndo,false);
});

test('mode changes during authority loading restart the requested check once using the latest type',async()=>{
 const h=harness({deferredAuthority:true}),first=h.check();await flush();assert.equal(h.workers.length,0);assert.equal(vm.runInContext('stylePending',h.context),true);
 h.$('style-document-type').value='opinion';h.$('style-document-type').change();await h.check();h.resolveAuthority();await first;await flush();assert.equal(h.workers.length,1);assert.equal(h.requests.length,1);assert.equal(h.workers[0].messages[0].doc.styleDocumentType,'opinion');
});
