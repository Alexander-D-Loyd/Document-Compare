export const ENTITY_AUTHORITY_FORMAT='document-compare.california-entities';
export const ENTITY_AUTHORITY_STORE='document-compare.entity-authority.v1';
export const ENTITY_AUTHORITY_MAX_BYTES=50*1024*1024;
export const ENTITY_AUTHORITY_MAX_ENTRIES=10000;
export const ENTITY_AUTHORITY_SCOPE='Authorized user-selected offline California Entities export readiness. Exact supplied names and stated eligibility remain immutable; source citation, explicit authoritative as-of date or unknown, rights attestation, actual raw import-file SHA-256 and import time remain distinct. Metadata and hashes identify the selected data; they do not authenticate its truth, legal status or freshness. Transactional local storage replaces the installed dataset only after commit; removal permits the caller to revert to the bundled snapshot. This module does not fetch names, parse DOCX, alter the production matcher/UI or install a global mutable registry. Unknown/missing names remain no evidence of error.';
const hash=/^[a-f0-9]{64}$/u,controls=/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
export const foldEntityAuthorityName=name=>name.replace(/[’‘]/gu,"'").replace(/[\u2010-\u2015]/gu,'-').replace(/\s+/gu,' ').trim().toLowerCase();
function text(value,label,max,{empty=false}={}){if(typeof value!=='string'||value.length>max||controls.test(value)||!empty&&!value.trim())throw Error('Entity authority '+label+' is invalid.');return value.trim();}
function date(value){if(value===null)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(value))throw Error('Entity source asOfDate must be a valid YYYY-MM-DD date or null for unknown.');const [y,m,d]=value.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];if(y<1||m<1||m>12||d<1||d>days[m-1])throw Error('Entity source asOfDate must be a valid YYYY-MM-DD date or null for unknown.');return value;}
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw Error('Entity import time must be a complete UTC ISO timestamp.');return value;}

export function validateEntityAuthority(data){
 if(!data||data.format!==ENTITY_AUTHORITY_FORMAT||data.version!==1||!data.source||!Array.isArray(data.entries)||!data.entries.length||data.entries.length>ENTITY_AUTHORITY_MAX_ENTRIES)throw Error('Use a version 1 California Entities authority JSON with source metadata and 1–10,000 exact names.');
 const s=data.source;if(!Object.hasOwn(s,'asOfDate'))throw Error('Entity source asOfDate is required; use null when the authoritative date is unknown.');if(s.rightsAttested!==true)throw Error('An explicit rightsAttested:true and offline-use permissions statement are required.');
 const source={title:text(s.title,'source title',300),authority:text(s.authority,'source authority',1000),citation:text(s.citation,'source citation',2000),asOfDate:date(s.asOfDate),permissions:text(s.permissions,'permissions statement',2000),rightsAttested:true};
 if(s.originalFile!==undefined)source.originalFile=text(s.originalFile,'original source file',260);
 if(s.declaredSourceSHA256!==undefined){if(typeof s.declaredSourceSHA256!=='string'||!hash.test(s.declaredSourceSHA256))throw Error('The declared original-source SHA-256 must have 64 lowercase hexadecimal characters.');source.declaredSourceSHA256=s.declaredSourceSHA256;}
 // JSON cannot contain array holes, but corrupted storage or structured-cloned
 // worker payloads can. Do not let Array.map silently skip an unchecked row.
 for(let n=0;n<data.entries.length;n++)if(!Object.hasOwn(data.entries,n))throw Error('Entity authority entries must contain a complete row at entry '+(n+1)+'.');
 const seen=new Set();let total=0;
 const entries=data.entries.map((row,n)=>{
  if(!row||typeof row.name!=='string'||!row.name||row.name.length>600||row.name!==row.name.trim()||controls.test(row.name)||/[<>]/u.test(row.name)||!/[\p{L}]/u.test(row.name)||typeof row.checkEligible!=='boolean')throw Error('Invalid exact entity name or explicit eligibility at entry '+(n+1)+'.');
  if(row.checkEligible&&(/[\[\]]|\.{3}|\betc\./iu.test(row.name)||row.name.split(/\s+/u).length<3))throw Error('Placeholder/template and short entity names must remain ineligible at entry '+(n+1)+'.');
  const key=foldEntityAuthorityName(row.name);if(seen.has(key))throw Error('Duplicate or case/typography-conflicting entity names at entry '+(n+1)+'.');seen.add(key);
  const item={name:row.name,category:text(row.category,'category at entry '+(n+1),200),citation:text(row.citation,'citation at entry '+(n+1),2000,{empty:true}),annotation:text(row.annotation,'annotation at entry '+(n+1),4000,{empty:true}),checkEligible:row.checkEligible};
  if(row.paragraph!==undefined){if(!Number.isSafeInteger(row.paragraph)||row.paragraph<1||row.paragraph>1000000)throw Error('Invalid source paragraph at entry '+(n+1)+'.');item.paragraph=row.paragraph;}
  total+=item.name.length+item.category.length+item.citation.length+item.annotation.length;if(total>20000000)throw Error('Entity authority exceeds the bounded text-content limit.');
  return Object.freeze(item);
 });
 return Object.freeze({format:ENTITY_AUTHORITY_FORMAT,version:1,source:Object.freeze(source),entries:Object.freeze(entries)});
}

// Import receipts are app-generated transport metadata, never source claims.
// Source as-of date may be unknown even when import time and file hash are known.
export function validateInstalledEntityAuthority(data){
 const valid=validateEntityAuthority(data);if(typeof data.datasetId!=='string'||!hash.test(data.datasetId))throw Error('Entity authority needs its actual raw-file SHA-256 import receipt.');
 return Object.freeze({...valid,datasetId:data.datasetId,importedAt:timestamp(data.importedAt),inputFile:text(data.inputFile,'import file label',260)});
}
export async function prepareEntityAuthorityImport(bytes,{inputFile,importedAt=new Date().toISOString(),crypto=globalThis.crypto}={}){
 let buffer;if(bytes instanceof Uint8Array)buffer=bytes;else if(bytes instanceof ArrayBuffer)buffer=new Uint8Array(bytes);else throw Error('Entity import requires local file bytes.');
 if(!buffer.byteLength||buffer.byteLength>ENTITY_AUTHORITY_MAX_BYTES)throw Error('Entity files must contain UTF-8 JSON and be at most 50 MB.');
 const raw=buffer.slice();let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw Error('Entity import must be valid UTF-8 JSON.');}
 const valid=validateEntityAuthority(parsed),file=text(inputFile,'import file label',260),time=timestamp(importedAt);if(!crypto?.subtle?.digest)throw Error('SHA-256 is unavailable; the entity data was not prepared for installation.');
 const datasetId=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(b=>b.toString(16).padStart(2,'0')).join('');
 return validateInstalledEntityAuthority({...valid,datasetId,importedAt:time,inputFile:file});
}

export function searchEntityAuthority(data,query='',{offset=0,limit=100,includeIneligible=true}={}){
 if(!data?.entries||!Array.isArray(data.entries)||typeof query!=='string'||query.length>500||!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100||typeof includeIneligible!=='boolean')throw Error('Invalid bounded entity search.');
 const key=query.trim().toLowerCase(),entries=[];let total=0;
 for(const row of data.entries){if(!includeIneligible&&!row.checkEligible)continue;if(key&&![row.name,row.category,row.citation,row.annotation].some(v=>v.toLowerCase().includes(key)))continue;if(total>=offset&&entries.length<limit)entries.push({...row});total++;}
 return {query:key,total,offset,limit,entries};
}

export function entityAuthorityStore(factory=globalThis.indexedDB){
 async function database(){
  if(!factory)throw Error('Offline entity authority storage is unavailable.');
  return new Promise((resolve,reject)=>{let settled=false;const request=factory.open(ENTITY_AUTHORITY_STORE,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('data'))request.result.createObjectStore('data');};
   request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}settled=true;db.onversionchange=()=>db.close();resolve(db);};
   request.onerror=()=>{if(!settled){settled=true;reject(Error('Offline entity authority storage could not open.'));}};
   request.onblocked=()=>{if(!settled){settled=true;reject(Error('Offline entity authority storage is busy; the previous installed data is unchanged.'));}};
  });
 }
 async function transact(mode,value,remove=false){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('data',mode),store=tx.objectStore('data'),request=mode==='readonly'?store.get('active'):remove?store.delete('active'):store.put(value,'active');let result,failed=false;request.onsuccess=()=>{result=request.result;};request.onerror=()=>{failed=true;};tx.oncomplete=()=>failed?reject(Error('Entity authority transaction failed; the previous installed data is unchanged.')):resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Entity authority data could not be saved/read; the previous installed data is unchanged.'));});}finally{db.close();}}
 return {
  load:async()=>{const data=await transact('readonly');return data===undefined||data===null?null:validateInstalledEntityAuthority(data);},
  save:async data=>{const valid=validateInstalledEntityAuthority(data);await transact('readwrite',valid);return valid;},
  remove:()=>transact('readwrite',null,true)
 };
}
