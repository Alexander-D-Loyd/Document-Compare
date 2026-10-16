import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';
import {prepareEntityAuthorityImport,ENTITY_AUTHORITY_FORMAT}from '../app/offline-entity-authority.mjs';
import {selectedEntityAuthority}from '../app/style-selected-entity-authority.mjs';
import {californiaEntityReview,CALIFORNIA_ENTITIES}from '../app/style-california-entities.mjs';
import {officialHeadTitleReviewIssues}from '../app/style-official-head-titles.mjs';
import {entityNameBoundaryBlocked}from '../app/style-entity-name-boundaries.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const name='Department of Coastal Textbook Services',other='Regional Historical Records Commission',doc=text=>makeDocument([text],'Current');
const row=(name,checkEligible=true)=>({name,category:'Controlled test entries',citation:'Controlled fixture citation',annotation:'Not a claim about an existing institution',paragraph:3,checkEligible});
async function receipt(entries=[row(name)]){return prepareEntityAuthorityImport(new TextEncoder().encode(JSON.stringify({format:ENTITY_AUTHORITY_FORMAT,version:1,source:{title:'Controlled selected list',authority:'Office test source',citation:'LCB17 item7 test export',asOfDate:null,permissions:'Controlled test use only',rightsAttested:true,originalFile:'original-source.docx',declaredSourceSHA256:'a'.repeat(64)},entries})),{inputFile:'selected-office-list.json',importedAt:'2026-10-16T12:34:56.789Z'});}
const selected=await receipt(),second=await receipt([row(other)]),ineligible=await receipt([row(name,false)]);

test('selection preserves bundled metadata and refreezes a cloned import without caller mutation',()=>{
 const bundled=selectedEntityAuthority();assert.equal(bundled.kind,'bundled');assert.deepEqual(bundled.source,CALIFORNIA_ENTITIES.source);assert.deepEqual(bundled.entries,CALIFORNIA_ENTITIES.entries);
 const clone=structuredClone(selected),before=JSON.stringify(clone),s=selectedEntityAuthority(clone);assert.equal(s.kind,'imported');assert.equal(JSON.stringify(clone),before);assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.entries)&&Object.isFrozen(s.entries[0])&&Object.isFrozen(s.source));clone.entries[0].name='Caller mutation';assert.equal(s.entries[0].name,name);assert.throws(()=>s.entries.push(row(other)),TypeError);
});

test('actual selected-file provenance stays distinct from declared original hash and unknown source date',()=>{
 const s=selectedEntityAuthority(selected).source;assert.equal(s.file,'selected-office-list.json');assert.equal(s.sha256,selected.datasetId);assert.equal(s.datasetId,selected.datasetId);assert.equal(s.originalFile,'original-source.docx');assert.equal(s.declaredSourceSHA256,'a'.repeat(64));assert.notEqual(s.sha256,s.declaredSourceSHA256);assert.equal(s.asOfDate,null);assert.equal(s.importedAt,'2026-10-16T12:34:56.789Z');assert.equal(s.sourceCitation,'LCB17 item7 test export');assert.match(s.limitations,/do not authenticate/);
 for(const bad of [{...selected,datasetId:'bad'},{...selected,importedAt:'today'},{...selected,inputFile:''}])assert.throws(()=>selectedEntityAuthority(bad));
});

test('selected exact matching uses only whole names and exposes the selected receipt',()=>{
 const d=doc('The '+name.toLowerCase()+' shall act.'),before=d.text,result=californiaEntityReview(d,refs,{entityAuthority:selected});assert.equal(result.issues.length,1);const i=result.issues[0];assert.equal(i.suggestion,name);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.entitySource.datasetId,selected.datasetId);assert.equal(i.entitySource.sha256,selected.datasetId);assert.equal(i.entitySource.citation,'Controlled fixture citation');assert.equal(i.entitySource.sourceCitation,'LCB17 item7 test export');assert.equal(d.text,before);assert.equal(californiaEntityReview(doc('The '+name+' shall act.'),refs,{entityAuthority:selected}).issues.length,0);
 for(const text of ['The Department of Coastal Textbook Service shall act.','The Department for Coastal Textbook Services shall act.','The Department of Coastal Textbook Services Advisory Committee shall act.'])assert.deepEqual(californiaEntityReview(doc(text),refs,{entityAuthority:selected}),{issues:[],ranges:[]},text);
});

test('selection replaces bundled data and interleaved requests cannot leak registry state',()=>{
 const d=doc('The department of finance shall act. The '+name.toLowerCase()+' shall act.');
 assert.deepEqual(californiaEntityReview(d,refs).issues.map(i=>i.suggestion),['Department of Finance']);assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}).issues.map(i=>i.suggestion),[name]);assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:second}).issues,[]);assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}).issues.map(i=>i.suggestion),[name]);assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:null}).issues.map(i=>i.suggestion),['Department of Finance']);
 const [i]=californiaEntityReview(doc('The department of finance shall act.'),refs).issues;assert.deepEqual(i.entitySource,{file:CALIFORNIA_ENTITIES.source.file,sha256:CALIFORNIA_ENTITIES.source.sha256,category:'Departments',citation:'Sec. 13000, Gov. C.'});
});

test('all-ineligible selected names produce no empty regex candidates or blanket protected ranges',()=>{
 for(const text of ['',name,'The department of finance shall act.','The director John Smith of the '+name+' shall act.'])assert.deepEqual(californiaEntityReview(doc(text),refs,{entityAuthority:ineligible}),{issues:[],ranges:[]});assert.deepEqual(officialHeadTitleReviewIssues(doc('The director John Smith of the '+name+' shall act.'),refs,{entityAuthority:ineligible}),[]);
});

test('selected official-head review uses the same registry and full source person-role evidence',()=>{
 const d=doc('The director John Smith of the '+name+' shall act.'),before=d.text,[i]=officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected});assert.ok(i);assert.equal(i.suggestion,null);assert.equal(i.text,'director John Smith of the '+name);assert.equal(i.officialHeadEvidence.entityName,name);assert.equal(i.officialHeadEvidence.witnessKind,'Selected offline California Entities export');assert.equal(i.officialHeadEvidence.registry.sourceFile,selected.inputFile);assert.equal(i.officialHeadEvidence.registry.sourceSHA256,selected.datasetId);assert.equal(i.officialHeadEvidence.registry.declaredSourceSHA256,'a'.repeat(64));assert.equal(i.officialHeadEvidence.registry.asOfDate,null);assert.equal(d.text,before);assert.deepEqual(officialHeadTitleReviewIssues(d,refs),[]);assert.deepEqual(officialHeadTitleReviewIssues(d,refs,{entityAuthority:second}),[]);
 const alternate=doc('The director of the '+name+' John Smith shall act.'),[a]=officialHeadTitleReviewIssues(alternate,refs,{entityAuthority:selected});assert.ok(a);assert.equal(a.officialHeadEvidence.sourcePerson,'John Smith');assert.deepEqual(officialHeadTitleReviewIssues(doc('The director John Smith of the Department of Finance shall act.'),refs,{entityAuthority:selected}),[]);
});

test('selected exact names preserve divided physical source offsets and margins',()=>{
 const d=doc('line 1 The department of coastal text-\nline 2 book services shall act.'),before=d.text,[i]=californiaEntityReview(d,refs,{entityAuthority:selected}).issues;assert.ok(i);assert.equal(i.suggestion,name);assert.equal(i.text,d.text.slice(i.start,i.end));assert.match(i.text,/text-\nline 2 book/u);assert.equal(d.text,before);
});

test('selected official-head known words retain divided name evidence and restore all nested ranges',()=>{
 const text='line 1 The director John Smith of the Department of Coa-\nline 2 stal Textbook Services shall act.',d=doc(text),start=text.indexOf('Coa-'),end=text.indexOf('stal')+4;d.wrappedWords=[{word:'Coastal',parts:['Coa','stal'],spans:[{start,end:start+3},{start:text.indexOf('stal'),end}],start,end,recognized:false}];
 const [i]=officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected});assert.ok(i);const e=i.officialHeadEvidence;assert.equal(text.slice(i.start,i.end),i.text);assert.equal(e.entityName,name);assert.equal(text.slice(e.entityStart,e.entityEnd),e.sourceEntity);assert.match(e.sourceEntity,/Coa-\nline 2 stal/u);assert.equal(text.slice(e.personStart,e.personEnd),'John Smith');assert.ok(e.roleEvidence.every(r=>text.slice(r.start,r.end)===r.text));
});

test('selected entity guards reject quoted table struck excluded and extended source evidence',()=>{
 for(const text of ['The text quotes “'+name.toLowerCase()+'”.','The '+name.toLowerCase()+' Advisory Committee shall act.','The α'+name.toLowerCase()+' shall act.','The '+name.toLowerCase()+'α shall act.'])assert.deepEqual(californiaEntityReview(doc(text),refs,{entityAuthority:selected}),{issues:[],ranges:[]},text);
 for(const property of ['struck','excluded']){const d=doc('The '+name.toLowerCase()+' shall act.'),start=d.text.indexOf('coastal');d[property]=[{start,end:start+7}];assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}),{issues:[],ranges:[]});}
 const table=doc('The '+name.toLowerCase()+' shall act.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(californiaEntityReview(table,refs,{entityAuthority:selected}),{issues:[],ranges:[]});
 for(const text of ['The text quotes “director John Smith of the '+name+'”.','The text quotes ‘director John Smith of the '+name+'’.','The director John Smith of the '+name+' Advisory Committee shall act.'])assert.deepEqual(officialHeadTitleReviewIssues(doc(text),refs,{entityAuthority:selected}),[],text);
 for(const property of ['struck','excluded'])for(const fragment of ['director','John','Coastal']){const d=doc('The director John Smith of the '+name+' shall act.'),start=d.text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.deepEqual(officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected}),[]);}
});

test('earlier guarded bill-local creation remains independent of selected registry eligibility',()=>{
 const d=doc('The Regional Transportation Accountability Council is hereby established. The director Jane Doe of the Regional Transportation Accountability Council shall act.'),[i]=officialHeadTitleReviewIssues(d,refs,{entityAuthority:ineligible});assert.ok(i);assert.equal(i.officialHeadEvidence.witnessKind,'Earlier intact entity creation');assert.equal(i.officialHeadEvidence.registry,undefined);assert.equal(i.officialHeadEvidence.creation.name,'Regional Transportation Accountability Council');
});

test('complete entity endpoints reject attached technical and Unicode source forms',()=>{
 const lower=name.toLowerCase();for(const affix of ['pre-','key/','name.','@','#','α','𐐀','\u0301']){const d=doc('The '+affix+lower+' shall act.');assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}),{issues:[],ranges:[]},affix);}
 for(const affix of ['-code','/key','.key','@key','#key','α','𐐀','\u0301']){const d=doc('The '+lower+affix+' shall act.');assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}),{issues:[],ranges:[]},affix);}
 assert.equal(californiaEntityReview(doc('The '+lower+'.'),refs,{entityAuthority:selected}).issues.length,1,'An ordinary sentence period is not a technical suffix');
});

test('struck and excluded technical affixes cannot manufacture complete imported names',()=>{
 for(const property of ['struck','excluded'])for(const [before,after] of [['pre-',''],['key/',''],['','-code'],['','/key'],['','.key'],['','\u0301']]){const d=doc('The '+before+name.toLowerCase()+after+' shall act.'),start=before?4:4+name.length,end=start+(before||after).length;d[property]=[{start,end}];assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}),{issues:[],ranges:[]},property+' '+before+after);}
});

test('official-head evidence requires complete original entity and role endpoints',()=>{
 for(const [before,after] of [['pre-',''],['key/',''],['','-code'],['','/key'],['','.key'],['','\u0301'],['','𐐀']]){const d=doc('The director John Smith of the '+before+name+after+' shall act.');assert.deepEqual(officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected}),[],before+after);}
 for(const property of ['struck','excluded'])for(const [before,after] of [['pre-',''],['key/',''],['','-code'],['','/key'],['','.key'],['','\u0301']]){const prefix='The director John Smith of the ',d=doc(prefix+before+name+after+' shall act.'),start=before?prefix.length:prefix.length+name.length,end=start+(before||after).length;d[property]=[{start,end}];assert.deepEqual(officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected}),[],property+' '+before+after);}
 for(const property of ['struck','excluded']){const d=doc('The pre-director John Smith of the '+name+' shall act.');d[property]=[{start:4,end:8}];assert.deepEqual(officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected}),[],property+' role prefix');}
});

test('ordinary entity possessives and narrative punctuation retain complete name protection',()=>{
 for(const [prefix,suffix] of [['The ',"’s approval is required."],['The ',"'s approval is required."],['The ',"’ responsibilities apply."],['The ','—in consultation with the agency shall act.'],['The ',': 1) adopt a plan.'],['6051—',' shall act.']]){const d=doc(prefix+name.toLowerCase()+suffix),r=californiaEntityReview(d,refs,{entityAuthority:selected});assert.equal(r.issues.length,1,prefix+suffix);assert.equal(r.ranges.length,1,prefix+suffix);assert.equal(r.issues[0].suggestion,name);}
 for(const suffix of ["’s approval",'—in consultation',': 1) adopt']){const d=doc('The director John Smith of the '+name+suffix+'.');assert.equal(officialHeadTitleReviewIssues(d,refs,{entityAuthority:selected}).length,1,suffix);}
 for(const property of ['struck','excluded'])for(const mark of ['’s','—',':']){const d=doc('The '+name.toLowerCase()+mark+' approval is required.'),start=4+name.length;d[property]=[{start,end:start+mark.length}];assert.deepEqual(californiaEntityReview(d,refs,{entityAuthority:selected}),{issues:[],ranges:[]},property+' '+mark);}
});

test('boundary-only checks consume precomputed strings without a document or context reconstruction',()=>{
 const cases=[['pre-','',true],['','/key',true],['','-code',true],['','\u0301',true],['',"’s approval",false],['','—in consultation',false],['',': 1) adopt',false],['6051—','',false]];
 for(const [before,after,expected]of cases){const text=before+name+after,original=text.replace(/[\u2010-\u2015]/gu,'-'),start=before.length,end=start+name.length;assert.equal(entityNameBoundaryBlocked(text,original,original,start,end),expected,before+after);if(before||after){const from=before?0:end,to=before?start:text.length,masked=original.slice(0,from)+' '.repeat(to-from)+original.slice(to);assert.equal(entityNameBoundaryBlocked(text,masked,original,start,end),true,'Masked adjacent source remains negative: '+before+after);}}
});
