import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {EventEmitter}from 'node:events';import {PassThrough}from 'node:stream';import {createRequire}from 'node:module';import {setTimeout as delay}from 'node:timers/promises';
const {createEngineHost}=createRequire(import.meta.url)('../engine-host.cjs');
const request=(id='one')=>({id,kind:'grammar',chunks:[{text:'The reports is available.',start:0,completeStart:true,completeEnd:true}]});
function fixture(t,options={}){
 const runtimeRoot=fs.mkdtempSync(path.join(os.tmpdir(),'document-compare-engine-test-'));fs.mkdirSync(path.join(runtimeRoot,'python'));fs.writeFileSync(path.join(runtimeRoot,'python/python.exe'),'');fs.writeFileSync(path.join(runtimeRoot,'offline-worker.py'),'');
 const children=[],killed=[],spawnProcess=(exe,args,settings)=>{assert.equal(settings.windowsHide,true);assert.deepEqual(settings.stdio,['pipe','pipe','ignore']);assert.deepEqual(args.slice(0,3),['-I','-B','-u']);const child=new EventEmitter();Object.assign(child,{stdin:new PassThrough(),stdout:new PassThrough(),messages:[],kill:()=>{child.killed=true;child.emit('exit',1);}});let buffered='';child.stdin.on('data',b=>{buffered+=b;let end;while((end=buffered.indexOf('\n'))>=0){child.messages.push(JSON.parse(buffered.slice(0,end)));buffered=buffered.slice(end+1);}});children.push(child);return child;};
 const host=createEngineHost({runtimeRoot,spawnProcess,killProcess:pid=>killed.push(pid),stopGraceMs:15,...options});t.after(()=>{host.stop();for(const child of children)child.emit('exit',0);fs.rmSync(runtimeRoot,{recursive:true,force:true});});return {host,children,killed};
}
const reply=(child,data)=>child.stdout.write(JSON.stringify(data)+'\n');
test('private host validates requests before launching a runtime',async t=>{
 const {host,children}=fixture(t);for(const value of [undefined,{...request(),id:'../path'},{...request(),kind:'command'},{...request(),chunks:[{...request().chunks[0],text:'x'.repeat(11001)}]},{...request(),chunks:[{...request().chunks[0],start:-1}]},{...request(),chunks:[{...request().chunks[0],completeEnd:null}]}])assert.match((await host.review(value)).error,/Invalid/);assert.equal(children.length,0);
});
test('missing native files return an explicit incomplete-check warning',async()=>{
 const host=createEngineHost({runtimeRoot:path.join(os.tmpdir(),'document-compare-absent-native-files')});assert.match((await host.review(request())).error,/unavailable/);assert.equal(host.running,false);
});
test('host reuses one process and resolves only matching request ids',async t=>{
 const {host,children}=fixture(t),progress=[];const a=host.review(request(),{progress:(done,total)=>progress.push([done,total])}),child=children[0];assert.match((await host.review(request())).error,/already/);reply(child,{id:'unknown',issues:[{}]});reply(child,{id:'one',event:'progress',completed:1,total:2});reply(child,{id:'one',issues:[{start:12,end:14}]});assert.equal((await a).issues.length,1);assert.deepEqual(progress,[[1,2]]);const b=host.review(request('two'));reply(child,{id:'two',issues:[]});assert.deepEqual((await b).issues,[]);assert.equal(children.length,1);
});
test('cancel settles immediately and a stale result cannot enter the next review',async t=>{
 const {host,children}=fixture(t),a=host.review(request());host.cancel('one');assert.equal((await a).cancelled,true);const b=host.review(request('two'));reply(children[0],{id:'one',issues:[{start:1,end:2}]});reply(children[0],{id:'two',issues:[]});assert.deepEqual((await b).issues,[]);assert.ok(children[0].messages.some(m=>m.type==='cancel'&&m.id==='one'));
});
test('timeout resolves every pending check as unavailable and permits recovery',async t=>{
 const {host,children}=fixture(t,{timeoutMs:20});const a=host.review(request()),b=host.review(request('two'));for(const r of await Promise.all([a,b,delay(30)]).then(v=>v.slice(0,2)))assert.match(r.error,/unavailable/);await delay(25);assert.equal(host.running,false);assert.equal(children[0].killed,true);const recovered=host.review(request('three'));reply(children[1],{id:'three',issues:[]});assert.deepEqual((await recovered).issues,[]);
});
test('crash and graceful shutdown clean up only the reported owned Java process',async t=>{
 const {host,children,killed}=fixture(t);const a=host.review(request());reply(children[0],{event:'java-started',pid:314159});children[0].emit('exit',1);assert.match((await a).error,/unavailable/);assert.deepEqual(killed,[314159]);const b=host.review(request('two'));reply(children[1],{event:'java-started',pid:271828});host.stop();assert.match((await b).error,/unavailable/);children[1].emit('exit',0);assert.deepEqual(killed,[314159,271828]);assert.equal(children[1].messages.at(-1).type,'shutdown');
});
