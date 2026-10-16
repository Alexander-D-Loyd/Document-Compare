import {CALIFORNIA_ENTITIES}from './data/california-entities.mjs';
import {validateInstalledEntityAuthority}from './offline-entity-authority.mjs';

// Selection belongs to one check request. Never install the import in a global
// registry or merge it with the bundled snapshot: absence supplies no error.
const bundled=Object.freeze({kind:'bundled',entries:Object.freeze(CALIFORNIA_ENTITIES.entries.map(e=>Object.freeze({...e}))),source:Object.freeze({...CALIFORNIA_ENTITIES.source})});
const limitations='Exact names and eligibility are retained from the selected offline export. Source metadata and hashes do not authenticate truth, legal status or freshness. Absence from this list is not evidence of an incorrect or obsolete name.';
export function selectedEntityAuthority(receipt=null){
 if(receipt===null||receipt===undefined)return bundled;
 // A worker structured clone is mutable again. Revalidate the actual receipt
 // and take an immutable copy before deriving any matcher state.
 const data=validateInstalledEntityAuthority(receipt),s=data.source;
 const source=Object.freeze({file:data.inputFile,sha256:data.datasetId,datasetId:data.datasetId,inputFile:data.inputFile,importedAt:data.importedAt,sourceTitle:s.title,sourceAuthority:s.authority,sourceCitation:s.citation,asOfDate:s.asOfDate,permissions:s.permissions,rightsAttested:s.rightsAttested,...(s.originalFile!==undefined?{originalFile:s.originalFile}:{}),...(s.declaredSourceSHA256!==undefined?{declaredSourceSHA256:s.declaredSourceSHA256}:{}),limitations});
 return Object.freeze({kind:'imported',entries:data.entries,source});
}
