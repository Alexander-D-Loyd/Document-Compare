import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {PARSED_NUMBER_RELATION_RULE}from '../app/style-parsed-number-relations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const source='The laboratory receives three eligible zygotes from each office and 12 eligible zygotes from the department.';
function raw(plan,{term='three',peer='12',head='zygotes',peerHead=head}={}){
 const start=plan.text.indexOf(term),end=start+term.length,peerStart=plan.text.indexOf(peer,end),peerEnd=peerStart+peer.length,headStart=plan.text.indexOf(head,end),peerHeadStart=plan.text.indexOf(peerHead,peerEnd);
 return {start,end,headStart,headEnd:headStart+head.length,head,headLemma:'zygote',peerStart,peerEnd,peerHeadStart,peerHeadEnd:peerHeadStart+peerHead.length,peerHead,peerHeadLemma:'zygote',evidenceStart:0,evidenceEnd:plan.text.length,conditionalSuggestion:'3',suggestion:null,reviewSuggested:true,engine:'spaCy',engineRule:PARSED_NUMBER_RELATION_RULE};
}
const map=(doc,options)=>{const p=prepareOfflineLanguage(doc);return mapOfflineIssues(doc,p,[raw(p,options)],'style');};

test('parser-backed noncontiguous counts retain independent source and noun witnesses',()=>{
 const doc=makeDocument([source],'Current'),saved=JSON.stringify(doc),mapped=map(doc);assert.equal(mapped.length,1);const i=mapped[0];assert.equal(i.text,'three');assert.equal(i.suggestion,null);assert.equal(i.conditionalSuggestion,'3');assert.deepEqual(i.relationshipEvidence.members.map(m=>m.value),[3,12]);
 for(const m of i.relationshipEvidence.members){assert.equal(doc.text.slice(m.start,m.end),m.sourceText);assert.equal(doc.text.slice(m.headStart,m.headEnd),m.head);}assert.equal(JSON.stringify(doc),saved);
 const precise=jointStylisticIssues(doc,refs,{engineIssues:mapped});assert.equal(precise.filter(i=>i.checkId==='lcb-parsed-number-relation-review').length,0);
 const found=jointStylisticIssues(doc,refs,{engineIssues:mapped,includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-parsed-number-relation-review');assert.equal(found.length,1);assert.deepEqual(found[0].references.map(r=>r.guideId),['lcb','gpo']);assert.equal(found[0].suggestion,null);
});

test('same-sentence relationships may span a relative clause and ordinary singular/plural heads',()=>{
 const doc=makeDocument(['The laboratory receives three zygotes, of which 12 zygote require review.'],'Current'),p=prepareOfflineLanguage(doc),issue=raw(p,{peerHead:'zygote'});issue.peerHeadStart=p.text.indexOf('zygote',issue.peerEnd);issue.peerHeadEnd=issue.peerHeadStart+6;assert.equal(mapOfflineIssues(doc,p,[issue],'style').length,1);
});

test('different noun lemmas, sentence openings and separate sentences cannot establish a relationship',()=>{
 for(const text of ['Three zygotes from each office and 12 zygotes from the department arrive.','The laboratory receives three zygotes. It receives 12 zygotes.']){const d=makeDocument([text],'Current');assert.equal(map(d,{term:text.startsWith('Three')?'Three':'three'}).length,0,text);}
 const d=makeDocument(['The laboratory receives three zygotes within 12 days.'],'Current'),p=prepareOfflineLanguage(d),issue=raw(p,{peerHead:'days'});issue.peerHeadLemma='day';assert.equal(mapOfflineIssues(d,p,[issue],'style').length,0);
});

test('malformed engine witnesses never become asserted corrections or detached count findings',()=>{
 const d=makeDocument([source],'Current'),p=prepareOfflineLanguage(d),base=raw(p);
 for(const delta of [{engine:'LanguageTool'},{suggestion:'3'},{conditionalSuggestion:'4'},{reviewSuggested:false},{head:'applications'},{headLemma:'Zygote'},{peerHeadLemma:'application'},{peerHeadStart:0},{headStart:base.start},{peerStart:base.start,peerEnd:base.end}])assert.equal(mapOfflineIssues(d,p,[{...base,...delta}],'style').length,0,JSON.stringify(delta));
});

test('complete written large peers remain whole quantities, including scale-and-remainder counts',()=>{
 for(const peer of ['twenty','twenty-one','one hundred and two']){const d=makeDocument([source.replace('12',peer)],'Current'),found=map(d,{peer});assert.equal(found.length,1,peer);assert.equal(found[0].relationshipEvidence.members[1].sourceText,peer);assert.ok(found[0].relationshipEvidence.members[1].value>=10);}
 for(const peer of ['five','one and two','one hundred and and two']){const d=makeDocument([source.replace('12',peer)],'Current');assert.equal(map(d,{peer}).length,0,peer);}
});

test('partial mathematical and cardinal expressions cannot supply numerical evidence',()=>{
 for(const peer of ['-12','12.5','12/15','12α','12%']){const d=makeDocument([source.replace('12',peer)],'Current');assert.equal(map(d).length,0,peer);}
 for(const target of ['threefold','one hundred and three','minus three']){const d=makeDocument([source.replace('three',target)],'Current');assert.equal(map(d).length,0,target);}
});

test('every source sentence character protects relationships from strikeout and unknown excluded gaps',()=>{
 const base=makeDocument([source],'Current'),p=prepareOfflineLanguage(base),issue=raw(p);
 for(const field of ['struck','excluded'])for(let at=0;at<base.text.length;at++){const d=makeDocument([source],'Current');d[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(d,p,[issue],'style').length,0,field+' '+at);}
});

test('digest conflicts, quotations, tables and legal numbered references retain protections',()=>{
 for(const text of ['LEGISLATIVE COUNSEL’S DIGEST\n'+source,'The laboratory quotes “three zygotes from each office and 12 zygotes from the department”.','The laboratory receives three zygotes from the office and 12 zygotes........20.']){const d=makeDocument([text],'Current');assert.equal(map(d).length,0,text);}
 const d=makeDocument(['The laboratory cites paragraph three for zygotes and paragraph 12 for zygotes.'],'Current');assert.equal(map(d).length,0);
});

test('precise and intact contiguous-series checks retain ownership of their selections',()=>{
 for(const [text,head,lemma]of [['The laboratory receives three zygotes and 12 zygotes.','zygotes','zygote'],['The agency receives three permits and 12 permits.','permits','permit']]){const d=makeDocument([text],'Current'),p=prepareOfflineLanguage(d),r=raw(p,{head});r.headLemma=r.peerHeadLemma=lemma;const mapped=mapOfflineIssues(d,p,[r],'style');assert.equal(mapped.length,1);const before=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),after=jointStylisticIssues(d,refs,{includeReviewSuggestions:true,engineIssues:mapped});assert.ok(before.some(i=>i.start===mapped[0].start&&i.end===mapped[0].end));assert.ok(!after.some(i=>i.checkId==='lcb-parsed-number-relation-review'));}
});

test('outer word-division restoration preserves count and both noun-head coordinates',()=>{
 const d=makeDocument(['The Elig-\nible laboratory receives three eligible zygotes from each office and','AB 192 — 2 —\nline 1 12 eligible zygotes from the department.'],'Current',[],[],new Set(['eligible'])),header=d.blocks.find(b=>b.text==='AB 192 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};
 const mapped=map(d);assert.equal(mapped.length,1);const found=jointStylisticIssues(d,refs,{engineIssues:mapped,includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-parsed-number-relation-review');assert.equal(found.length,1);const i=found[0];assert.equal(d.text.slice(i.start,i.end),'three');
 for(const m of i.relationshipEvidence.members){assert.equal(d.text.slice(m.start,m.end),m.sourceText);assert.equal(d.text.slice(m.headStart,m.headEnd),m.head);}assert.ok(d.text.slice(i.relationshipEvidence.start,i.relationshipEvidence.end).includes(header.text));
});

test('plain counts and per-unit densities or different rates are different numerical expressions',()=>{
 for(const text of ['The laboratory receives three zygotes from each office and 12 zygotes per acre.','The laboratory receives three zygotes per acre and 12 zygotes from the office.','The laboratory receives three zygotes per acre and 12 zygotes per hectare.','The laboratory receives three zygotes per eligible acre and 12 zygotes per eligible acre.'])assert.equal(map(makeDocument([text],'Current')).length,0,text);
 const found=map(makeDocument(['The laboratory receives three zygotes per acre and 12 zygotes per acre.'],'Current'));assert.equal(found.length,1);assert.deepEqual(found[0].relationshipEvidence.members.map(m=>m.perUnit),['acre','acre']);
});

test('invalid mapped relationship payloads are rejected without crashing the shared checker',()=>{
 const d=makeDocument([source],'Current'),valid=map(d)[0];assert.ok(valid);
 for(const invalid of [{...valid,relationshipEvidence:null},{...valid,relationshipEvidence:{...valid.relationshipEvidence,members:[]}},{...valid,conditionalSuggestion:'9'},{...valid,relationshipEvidence:{...valid.relationshipEvidence,members:valid.relationshipEvidence.members.map(m=>({...m,value:99}))}}])assert.ok(!jointStylisticIssues(d,refs,{engineIssues:[invalid],includeReviewSuggestions:true}).some(i=>i.checkId==='lcb-parsed-number-relation-review'));
});

test('recognized divisions inside both noun heads preserve the complete original source locations',()=>{
 const doc=makeDocument(['The laboratory receives three zy-\ngotes from each office and 12 zy-\ngotes from the department.'],'Current',[],[],new Set(['zygotes'])),mapped=map(doc);assert.equal(mapped.length,1);
 const found=jointStylisticIssues(doc,refs,{engineIssues:mapped,includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-parsed-number-relation-review');assert.equal(found.length,1);
 for(const member of found[0].relationshipEvidence.members){assert.equal(doc.text.slice(member.start,member.end),member.sourceText);assert.equal(doc.text.slice(member.headStart,member.headEnd),'zy-\ngotes');assert.equal(member.head,'zygotes');}
});
