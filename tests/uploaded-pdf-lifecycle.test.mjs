import test from 'node:test';
import assert from 'node:assert/strict';
import {createUploadedPdfViewer} from '../app/uploaded-pdf.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const settle=async()=>{for(let n=0;n<8;n++)await new Promise(r=>setImmediate(r));};
function fixture(t){
 const prior=globalThis.document,elements=new Map(),renders=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'1',textContent:'',width:0,height:0,open:false,handlers:new Map(),addEventListener(name,callback){this.handlers.set(name,callback);},showModal(){this.open=true;},close(){this.open=false;this.handlers.get('close')?.();},getContext(){return {};}});return elements.get(id);};
 globalThis.document={getElementById:element};t.after(()=>{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});
 const requests=[],files=new Map(['base','a','b'].map(key=>[key,{name:key+'.pdf',arrayBuffer:async()=>new Uint8Array([key==='base'?0:key==='a'?1:2]).buffer}]));
 const pdfjs={getDocument(){const request={...deferred(),destroy:async()=>{}};request.task={promise:request.promise,destroy:()=>request.destroy()};requests.push(request);return request.task;}};
 const pdf=name=>({numPages:3,getPage:async page=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>{renders.push({name,page});return {promise:Promise.resolve(),cancel(){}};},cleanup(){}})});
 return {open:createUploadedPdfViewer(pdfjs,files),element,requests,renders,pdf};
}

test('an older pending PDF load cannot replace the document used by viewer navigation',async t=>{
 const f=fixture(t),a=f.open('a');await settle();assert.equal(f.requests.length,1);
 const b=f.open('b');await settle();assert.equal(f.requests.length,2);
 f.requests[1].resolve(f.pdf('b'));await b;
 f.requests[0].resolve(f.pdf('a'));await a;
 f.element('uploaded-pdf-next').handlers.get('click')();await settle();
 assert.equal(f.element('uploaded-pdf-title').textContent,'b.pdf');
 assert.deepEqual(f.renders,[{name:'b',page:1},{name:'b',page:2}]);
});

test('a slow prior destroy cannot let an earlier click supersede a later PDF opening',async t=>{
 const f=fixture(t),base=f.open('base');await settle();f.requests[0].resolve(f.pdf('base'));await base;
 const destroy=deferred();f.requests[0].destroy=()=>destroy.promise;
 const a=f.open('a');await settle();
 const b=f.open('b');await settle();assert.equal(f.requests.length,2);
 f.requests[1].resolve(f.pdf('b'));await b;destroy.resolve();await a;
 assert.equal(f.requests.length,2);assert.equal(f.element('uploaded-pdf-title').textContent,'b.pdf');
 assert.deepEqual(f.renders,[{name:'base',page:1},{name:'b',page:1}]);
});

test('closing while a PDF loads prevents a stale render or navigation state',async t=>{
 const f=fixture(t),a=f.open('a');await settle();f.element('uploaded-pdf-dialog').close();
 f.requests[0].resolve(f.pdf('a'));await a;
 f.element('uploaded-pdf-next').handlers.get('click')();await settle();
 assert.equal(f.element('uploaded-pdf-dialog').open,false);assert.deepEqual(f.renders,[]);
});
