import {CALIFORNIA_ENTITIES} from './data/california-entities.mjs';
import {entityAuthorityStore,prepareEntityAuthorityImport,validateInstalledEntityAuthority,searchEntityAuthority,ENTITY_AUTHORITY_MAX_BYTES} from './offline-entity-authority.mjs';

// A local profile choice, separate from bill text and its quoted-term authority.
export function createEntityAuthorityPanel({$,document=globalThis.document,store=entityAuthorityStore(),onChange=()=>{},getQuery=()=>'',isActive=()=>false,crypto=globalThis.crypto}={}){
 let active=null,busy=false,loaded=false,loadError=false,status='',query='';
 const notify=()=>{try{onChange(active);}catch{status='The entity data was saved, but the view could not refresh. Run Stylistic Check again.';}};
 function render(nextQuery=query){
  query=nextQuery;
  $('entity-import').disabled=busy||!loaded;$('entity-file').disabled=busy||!loaded;$('entity-remove').disabled=busy||!loaded||!active&&!loadError;
  $('entity-status').textContent=status;
  const data=active||CALIFORNIA_ENTITIES,source=active?active.source:null,eligible=data.entries.filter(e=>e.checkEligible).length;
  $('entity-source').textContent=!loaded?'Loading saved entity authority…':active?`${source.title} · ${source.authority} · Source as-of: ${source.asOfDate||'unknown'} · Imported: ${active.importedAt} · ${data.entries.length} listed names / ${eligible} eligible for exact case checks.`:`Bundled California Entities snapshot · Authoritative source date: unknown · Imported: ${data.source.imported} · ${data.entries.length} listed names / ${eligible} eligible for exact case checks.`;
  $('entity-citation').textContent=active?source.citation:data.source.authority;
  $('entity-hash').textContent=active?`Imported file: ${active.inputFile} · SHA-256: ${active.datasetId}${source.declaredSourceSHA256?' · Declared original-source SHA-256: '+source.declaredSourceSHA256:''}`:`Bundled original file: ${data.source.file} · SHA-256: ${data.source.sha256}`;
  const root=$('entity-results');root.replaceChildren();
  if(typeof query!=='string'||query.length>500){if(isActive())$('guide-search-status').textContent='Use at most 500 characters to search entity data.';return;}
  const result=searchEntityAuthority(data,query,{limit:100});
  if(isActive())$('guide-search-status').textContent=`${result.total} listed name${result.total===1?'':'s'} matched · showing ${result.entries.length}. A missing name is not evidence of an error.`;
  for(const row of result.entries){const card=document.createElement('article');card.className='guide-rule-card';const name=document.createElement('strong');name.textContent=row.name;const detail=document.createElement('p');detail.textContent=[row.category,row.checkEligible?'Eligible for exact case comparison':'Reference only; no unconditional case check',row.citation,row.annotation].filter(Boolean).join(' · ');card.append(name,detail);root.append(card);}
 }
 const ready=Promise.resolve().then(()=>store.load()).then(data=>{active=data?validateInstalledEntityAuthority(data):null;}).catch(error=>{loadError=true;status=error.message+' Bundled entity data remains active.';}).finally(()=>{loaded=true;render(getQuery());});
 async function importFile(file){
  if(!file||busy)return false;busy=true;status='Reading authorized local entity data…';render(getQuery());let installed=false;
  try{await ready;if(file.size>ENTITY_AUTHORITY_MAX_BYTES)throw Error('Entity files must be at most 50 MB.');const prepared=await prepareEntityAuthorityImport(new Uint8Array(await file.arrayBuffer()),{inputFile:file.name,crypto});await store.save(prepared);active=prepared;loadError=false;status='Imported entity data is active. The source date and file hash identify the supplied export; they do not verify its freshness.';installed=true;notify();}
  catch(error){status=error.message+' The previously active entity data is retained.';}
  finally{busy=false;$('entity-file').value='';render(getQuery());}
  return installed;
 }
 async function remove(){
  if(busy)return false;busy=true;status='Restoring bundled entity data…';render(getQuery());let removed=false;
  try{await ready;await store.remove();active=null;loadError=false;status='Bundled entity data is active. Its authoritative source date remains unknown.';removed=true;notify();}
  catch(error){status=error.message+' The previously active entity data is retained.';}
  finally{busy=false;render(getQuery());}return removed;
 }
 $('entity-import').addEventListener('click',()=>$('entity-file').click());
 $('entity-file').addEventListener('change',event=>importFile(event.target.files?.[0]));
 $('entity-remove').addEventListener('click',remove);
 render();
 return {ready,render,importFile,remove,selected:()=>active,warning:()=>loadError?'Saved entity authority could not load; the bundled snapshot is being used.':''};
}
