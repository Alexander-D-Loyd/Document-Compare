import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import{CALIFORNIA_ENTITIES}from '../app/data/california-entities.mjs';
import{ENTITY_AUTHORITY_FORMAT,ENTITY_AUTHORITY_STORE,ENTITY_AUTHORITY_MAX_BYTES,ENTITY_AUTHORITY_MAX_ENTRIES,ENTITY_AUTHORITY_SCOPE,validateEntityAuthority,validateInstalledEntityAuthority,prepareEntityAuthorityImport,searchEntityAuthority,entityAuthorityStore,foldEntityAuthorityName}from '../app/offline-entity-authority.mjs';
const fixture=()=>({format:ENTITY_AUTHORITY_FORMAT,version:1,source:{title:'California Entities',authority:CALIFORNIA_ENTITIES.source.authority,citation:'LCB Style Manual, page 17, item 7: supplied California Entities export',asOfDate:null,permissions:'User-supplied export, authorized offline test use.',rightsAttested:true,originalFile:CALIFORNIA_ENTITIES.source.file,declaredSourceSHA256:CALIFORNIA_ENTITIES.source.sha256},entries:structuredClone(CALIFORNIA_ENTITIES.entries)}),bytes=data=>new TextEncoder().encode(JSON.stringify(data)),time='2026-10-16T12:34:56.789Z',prepare=data=>prepareEntityAuthorityImport(bytes(data),{inputFile:'office-entities.json',importedAt:time});

// This backend models IndexedDB atomic commit, including an abort after the
// individual request succeeds. Native persistence is verified separately.
function memoryFactory(){const maps=new Map(),state={failNextWrite:false,failOpen:false,blockOpen:false,opens:0,closes:0},factory={open(name,version){state.opens++;if(state.failOpen)throw Error('storage denied');assert.equal(name,ENTITY_AUTHORITY_STORE);assert.equal(version,1);const request={},fresh=!maps.has(name);if(fresh)maps.set(name,new Map());const db={objectStoreNames:{contains:key=>key==='data'&&!fresh},createObjectStore:key=>assert.equal(key,'data'),close:()=>state.closes++,transaction(key,mode){assert.equal(key,'data');const tx={},base=maps.get(name),draft=new Map([...base].map(([k,v])=>[k,structuredClone(v)])),store={get(k){return operation('get',k);},put(v,k){return operation('put',k,v);},delete(k){return operation('delete',k);}};function operation(kind,k,v){const r={};queueMicrotask(()=>{if(kind==='get')r.result=structuredClone(base.get(k));else if(kind==='put')draft.set(k,structuredClone(v));else draft.delete(k);r.onsuccess?.();queueMicrotask(()=>{if(mode==='readwrite'&&state.failNextWrite){state.failNextWrite=false;tx.onabort?.();}else{if(mode==='readwrite')maps.set(name,draft);tx.oncomplete?.();}});});return r;}tx.objectStore=()=>store;return tx;}};request.result=db;queueMicrotask(()=>{if(state.blockOpen){request.onblocked?.();queueMicrotask(()=>request.onsuccess?.());return;}if(fresh)request.onupgradeneeded?.();request.onsuccess?.();});return request;}};return {factory,state,corrupt:record=>maps.set(ENTITY_AUTHORITY_STORE,new Map([['active',structuredClone(record)]]))};}

test('the existing supplied snapshot validates without inventing names or changing eligibility',()=>{
 const data=fixture(),saved=JSON.stringify(data),valid=validateEntityAuthority(data);assert.equal(valid.entries.length,512);assert.equal(valid.entries.filter(e=>e.checkEligible).length,482);assert.deepEqual(valid.entries.map(e=>e.name),CALIFORNIA_ENTITIES.entries.map(e=>e.name));assert.equal(valid.source.asOfDate,null);assert.equal(valid.source.declaredSourceSHA256,CALIFORNIA_ENTITIES.source.sha256);assert.equal(JSON.stringify(data),saved);assert.ok(Object.isFrozen(valid)&&Object.isFrozen(valid.source)&&Object.isFrozen(valid.entries)&&Object.isFrozen(valid.entries[0]));assert.throws(()=>valid.entries.push({}),TypeError);assert.match(ENTITY_AUTHORITY_SCOPE,/do not authenticate/);
});

test('source date is explicit and distinct from import time and actual raw file hash',async()=>{
 const data=fixture();data.datasetId='b'.repeat(64);data.importedAt='1999-01-01T00:00:00.000Z';const raw=bytes(data),receipt=await prepareEntityAuthorityImport(raw,{inputFile:'chosen-source.json',importedAt:time});assert.equal(receipt.datasetId,crypto.createHash('sha256').update(raw).digest('hex'));assert.equal(receipt.importedAt,time);assert.equal(receipt.source.asOfDate,null);assert.equal(receipt.inputFile,'chosen-source.json');assert.equal(receipt.source.declaredSourceSHA256,CALIFORNIA_ENTITIES.source.sha256);assert.notEqual(receipt.datasetId,receipt.source.declaredSourceSHA256);
 const dated=fixture();dated.source.asOfDate='2024-02-29';assert.equal((await prepare(dated)).source.asOfDate,'2024-02-29');const pretty=new TextEncoder().encode(JSON.stringify(data,null,2)),other=await prepareEntityAuthorityImport(pretty,{inputFile:'chosen-source.json',importedAt:time});assert.notEqual(receipt.datasetId,other.datasetId);assert.deepEqual(receipt.entries,other.entries);
});

test('entry and source validation rejects incomplete metadata conflicting names and unsafe placeholders',()=>{
 const mutations=[d=>d.version=2,d=>d.format='other',d=>delete d.source,d=>delete d.source.asOfDate,d=>d.source.asOfDate='2025-02-29',d=>d.source.asOfDate='2026-13-01',d=>d.source.asOfDate='2026-04-31',d=>d.source.asOfDate='0000-01-01',d=>d.source.asOfDate='unknown',d=>d.source.rightsAttested=false,d=>d.source.permissions='',d=>d.source.citation='',d=>d.source.authority='',d=>d.source.declaredSourceSHA256='not a hash',d=>d.entries=[],d=>d.entries[0].name=' '+d.entries[0].name,d=>d.entries[0].name='<script>',d=>d.entries[0].name='Office\nDepartment',d=>d.entries[0].name='Office\u202eDepartment',d=>d.entries[0].name='x'.repeat(601),d=>delete d.entries[0].checkEligible,d=>d.entries[0].checkEligible='yes',d=>d.entries[0].paragraph=-1,d=>d.entries.push({...d.entries[0],name:d.entries[0].name.toLowerCase()}),d=>d.entries.find(e=>e.name.includes('[name of region]')).checkEligible=true];
 for(const mutate of mutations){const d=fixture();mutate(d);assert.throws(()=>validateEntityAuthority(d));}
 const d=fixture(),row=d.entries.find(e=>e.name.includes("'"));if(row){d.entries.push({...row,name:row.name.replaceAll("'",'’')});assert.throws(()=>validateEntityAuthority(d),/Duplicate/);}
 assert.equal(foldEntityAuthorityName(' Governor’s  Office '),"governor's office");assert.equal(ENTITY_AUTHORITY_MAX_ENTRIES,10000);
});

test('raw local import validates bytes UTC receipt and hashing before any installation',async()=>{
 await assert.rejects(prepareEntityAuthorityImport(new Uint8Array(0),{inputFile:'x.json'}),/50 MB/);await assert.rejects(prepareEntityAuthorityImport(new Uint8Array(ENTITY_AUTHORITY_MAX_BYTES+1),{inputFile:'x.json'}),/50 MB/);await assert.rejects(prepareEntityAuthorityImport(new Uint8Array([255]),{inputFile:'x.json'}),/UTF-8 JSON/);await assert.rejects(prepareEntityAuthorityImport(new TextEncoder().encode('{broken'),{inputFile:'x.json'}),/UTF-8 JSON/);await assert.rejects(prepareEntityAuthorityImport('not bytes',{inputFile:'x.json'}),/file bytes/);await assert.rejects(prepareEntityAuthorityImport(bytes(fixture()),{inputFile:'x.json',importedAt:'2026-02-30T12:34:56.789Z'}),/UTC/);await assert.rejects(prepareEntityAuthorityImport(bytes(fixture()),{inputFile:'',importedAt:time}),/file label/);await assert.rejects(prepareEntityAuthorityImport(bytes(fixture()),{inputFile:'x.json',importedAt:time,crypto:null}),/SHA-256/);
 const raw=bytes(fixture()),copy=raw.slice();await prepareEntityAuthorityImport(raw.buffer,{inputFile:'source.json',importedAt:time});assert.deepEqual(raw,copy);
});

test('a source list does not opt ambiguous short office names into unconditional entity case checking',()=>{
 for(const name of ['Controller','Treasurer','Transportation Agency','Insurance Commissioner']){const d=fixture(),row=d.entries.find(e=>e.name===name);assert.ok(row&&!row.checkEligible);row.checkEligible=true;assert.throws(()=>validateEntityAuthority(d),/short entity names/);row.checkEligible=false;assert.ok(validateEntityAuthority(d).entries.some(e=>e.name===name&&!e.checkEligible));}
});

test('bounded search finds exact names categories citations and notes while leaving installed state immutable',async()=>{
 const data=await prepare(fixture()),all=searchEntityAuthority(data);assert.equal(all.total,512);assert.equal(all.entries.length,100);assert.deepEqual(searchEntityAuthority(data,'',{includeIneligible:false}).total,482);const list=searchEntityAuthority(data,'consumer affairs');assert.ok(list.entries.some(e=>e.name==='Department of Consumer Affairs'));assert.ok(searchEntityAuthority(data,'Sec. 100').total>0);assert.ok(searchEntityAuthority(data,'Agencies').total>0);assert.ok(searchEntityAuthority(data,'',{offset:100,limit:10}).entries.length===10);all.entries[0].name='Local caller change';assert.equal(data.entries[0].name,CALIFORNIA_ENTITIES.entries[0].name);
 for(const options of [{limit:101},{limit:0},{offset:-1},{includeIneligible:'yes'}])assert.throws(()=>searchEntityAuthority(data,'',options));assert.throws(()=>searchEntityAuthority(data,'x'.repeat(501)));assert.throws(()=>searchEntityAuthority(null));
});

test('transactional save reopen and removal keep the exact receipt and supplied names',async()=>{
 const backend=memoryFactory(),store=entityAuthorityStore(backend.factory),data=await prepare(fixture());assert.equal(await store.load(),null);const saved=await store.save(data);assert.equal(saved.datasetId,data.datasetId);const loaded=await entityAuthorityStore(backend.factory).load();assert.deepEqual(loaded,data);assert.ok(Object.isFrozen(loaded)&&Object.isFrozen(loaded.entries));await entityAuthorityStore(backend.factory).remove();assert.equal(await store.load(),null);assert.equal(backend.state.opens,backend.state.closes);
});

test('abort after request success preserves previous installed dataset for save and clear',async()=>{
 const backend=memoryFactory(),store=entityAuthorityStore(backend.factory),first=await prepare(fixture());await store.save(first);const next=fixture();next.source.asOfDate='2026-10-01';const second=await prepare(next);backend.state.failNextWrite=true;await assert.rejects(store.save(second),/previous installed/);assert.deepEqual(await store.load(),first);backend.state.failNextWrite=true;await assert.rejects(store.remove(),/previous installed/);assert.deepEqual(await entityAuthorityStore(backend.factory).load(),first);
});

test('invalid receipts cannot open a write and corrupt persisted data is reported without deletion',async()=>{
 const backend=memoryFactory(),store=entityAuthorityStore(backend.factory);await assert.rejects(store.save(fixture()),/raw-file/);assert.equal(backend.state.opens,0);const valid=await prepare(fixture());await store.save(valid);const bad={...valid,datasetId:'wrong'};backend.corrupt(bad);await assert.rejects(store.load(),/raw-file/);assert.equal(backend.state.opens,backend.state.closes);backend.corrupt(valid);assert.deepEqual(await store.load(),valid);
});

test('unavailable denied and blocked stores never silently install or clear authority data',async()=>{
 await assert.rejects(entityAuthorityStore(null).load(),/unavailable/);const backend=memoryFactory(),valid=await prepare(fixture()),store=entityAuthorityStore(backend.factory);await store.save(valid);backend.state.failOpen=true;await assert.rejects(store.save(valid),/storage denied/);backend.state.failOpen=false;backend.state.blockOpen=true;await assert.rejects(store.remove(),/storage is busy/);await new Promise(resolve=>setTimeout(resolve,0));backend.state.blockOpen=false;assert.deepEqual(await store.load(),valid);assert.equal(backend.state.opens-1,backend.state.closes);
});

test('source and persisted receipt hashes require strings rather than coercible JSON values',async()=>{
 const valid=await prepare(fixture());
 for(const value of [[valid.datasetId],{toString:()=>valid.datasetId},true,null,64]){
  const source=fixture();source.source.declaredSourceSHA256=value;assert.throws(()=>validateEntityAuthority(source),/declared original-source SHA-256/);
  const record={...valid,datasetId:value};assert.throws(()=>validateInstalledEntityAuthority(record),/raw-file SHA-256/);
 }
 const json=fixture();json.source.declaredSourceSHA256=[CALIFORNIA_ENTITIES.source.sha256];await assert.rejects(prepare(json),/declared original-source SHA-256/);
 const backend=memoryFactory(),store=entityAuthorityStore(backend.factory);await store.save(valid);backend.corrupt({...valid,datasetId:[valid.datasetId]});await assert.rejects(store.load(),/raw-file SHA-256/);assert.equal(backend.state.opens,backend.state.closes);
});

test('single-line names metadata and receipt labels reject hidden Unicode controls and lone surrogates',async()=>{
 const valid=await prepare(fixture());
 for(const character of ['\u0080','\u0085','\u009f','\u2028','\u2029','\ud800','\udfff']){
  for(const field of ['title','authority','citation','permissions','originalFile']){const data=fixture();data.source[field]='Source'+character+'Label';assert.throws(()=>validateEntityAuthority(data),/invalid/);}
  for(const field of ['name','category','citation','annotation']){const data=fixture();data.entries[0][field]='California'+character+'Environmental Protection Agency';assert.throws(()=>validateEntityAuthority(data),/invalid|Invalid/);}
  assert.throws(()=>validateInstalledEntityAuthority({...valid,inputFile:'source'+character+'.json'}),/file label/);
 }
 const data=fixture();data.source.title='Supplied source \u{1f4da}';assert.equal(validateEntityAuthority(data).source.title,data.source.title);
});

test('sparse structured-cloned rows are rejected before worker activation or storage',async()=>{
 const valid=await prepare(fixture());
 for(const index of [0,10,valid.entries.length-1]){const sparse=structuredClone(valid);delete sparse.entries[index];assert.throws(()=>validateEntityAuthority(sparse),/complete row/);assert.throws(()=>validateInstalledEntityAuthority(sparse),/complete row/);}
 const backend=memoryFactory(),store=entityAuthorityStore(backend.factory),sparse=structuredClone(valid);delete sparse.entries[0];await assert.rejects(store.save(sparse),/complete row/);assert.equal(backend.state.opens,0);backend.corrupt(sparse);await assert.rejects(store.load(),/complete row/);assert.equal(backend.state.opens,backend.state.closes);
 const emptySlots=fixture();emptySlots.entries=Array(2);assert.throws(()=>validateEntityAuthority(emptySlots),/complete row/);
});

test('worker receipt normalization preserves provenance and freezes independent selected data',async()=>{
 const valid=await prepare(fixture()),transport=structuredClone(valid),normalized=validateInstalledEntityAuthority(transport);assert.deepEqual(normalized,valid);assert.equal(normalized.datasetId,valid.datasetId);assert.equal(normalized.importedAt,time);assert.equal(normalized.source.asOfDate,null);assert.ok(Object.isFrozen(normalized)&&Object.isFrozen(normalized.source)&&Object.isFrozen(normalized.entries)&&Object.isFrozen(normalized.entries[0]));
 transport.entries[0].name='Locally changed transport';transport.source.title='Locally changed source';assert.equal(normalized.entries[0].name,valid.entries[0].name);assert.equal(normalized.source.title,valid.source.title);assert.equal(Object.hasOwn(validateEntityAuthority(transport),'datasetId'),false);
 for(const mutation of [d=>delete d.datasetId,d=>d.importedAt='2026-10-16',d=>d.inputFile='']){const invalid=structuredClone(valid);mutation(invalid);assert.throws(()=>validateInstalledEntityAuthority(invalid));}
});
