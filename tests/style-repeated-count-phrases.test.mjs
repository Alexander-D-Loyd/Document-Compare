import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {repeatedCountPhraseReviewIssues,REPEATED_COUNT_PHRASE_SCOPE}from '../app/style-repeated-count-phrases.mjs';import {styleRuleInventory}from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
import {lcbNumberRelationReviewIssues}from '../app/style-lcb-review-number-relations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument([t],'Current'),all=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),find=d=>all(d).filter(i=>i.checkId==='lcb-repeated-count-phrase-review'),base='The laboratory receives three specially commissioned demographers and 12 specially commissioned demographers.';
function exact(d,i){const e=i.repeatedCountEvidence,r=i.relationshipEvidence;assert.equal(i.suggestion,null);assert.ok(i.references.every(c=>c.preferred===null));assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(e.evidenceStart,e.evidenceEnd),e.text);for(const span of [...e.phrases,...e.connectors,e.finalBoundary])assert.equal(d.text.slice(span.start,span.end),span.text);for(const member of r.members){assert.equal(d.text.slice(member.start,member.end),member.sourceText);assert.equal(d.text.slice(member.headStart,member.headEnd),e.phrases[r.members.indexOf(member)].text);}}
test('unfamiliar multiple qualifiers retain the complete repeated phrase as conditional evidence',()=>{
 const d=make(base),before=JSON.stringify(d),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.text,'three');assert.equal(i.conditionalSuggestion,'3');assert.equal(i.repeatedCountEvidence.phraseLabel,'specially commissioned demographers');assert.match(i.message,/does not prove/);assert.equal(JSON.stringify(d),before);
});
test('long phrases and many repeated members have no fixed word or source length cap',()=>{
 const phrase='specially '+('commissioned '.repeat(40))+'demographers',d=make('The laboratory receives '+Array(25).fill('three '+phrase).join(', ')+' and 12 '+phrase+'.'),found=find(d);assert.equal(found.length,25);for(const i of found){exact(d,i);assert.equal(i.repeatedCountEvidence.phrases.length,26);assert.ok(i.repeatedCountEvidence.text.length>10000);}
});
test('large integer peers retain exact digits with no rounded numeric metadata',()=>{
 for(const peer of ['9007199254740993','9,007,199,254,740,993','1'+'0'.repeat(400)]){const d=make(base.replace('12',peer)),[i]=find(d);assert.ok(i,peer);exact(d,i);const member=i.relationshipEvidence.members[1];assert.equal(member.sourceText,peer);assert.equal(member.value,null);assert.equal(member.exactSourceInteger,peer.replaceAll(',',''));assert.equal(member.atLeastTen,true);assert.ok(!JSON.stringify(i).includes('9007199254740992'));}
});
test('safe peers preserve numeric values while whole written scale counts stay intact',()=>{
 for(const [peer,value]of [['12',12],['twenty-one',21],['one hundred and two',102]]){const d=make(base.replace('12',peer)),[i]=find(d);assert.ok(i,peer);exact(d,i);assert.equal(i.relationshipEvidence.members[1].value,value);assert.equal(i.relationshipEvidence.members[1].sourceText,peer);}
});
test('each smaller written count receives independent review with one ownership stop',()=>{
 const d=make('The laboratory receives three specially commissioned demographers, four specially commissioned demographers, and 12 specially commissioned demographers.'),found=find(d);assert.deepEqual(found.map(i=>i.text),['three','four']);for(const i of found)exact(d,i);const start=d.text.indexOf('three');assert.deepEqual(repeatedCountPhraseReviewIssues(d,refs,{existingIssues:[{start,end:start+5}]}).map(i=>i.text),['four']);
 const known=make('The laboratory receives three eligible zygotes and 12 eligible zygotes.');assert.equal(find(known).length,0);assert.ok(all(known).some(i=>i.checkId==='lcb-number-relation-review'));
});
test('all-small figured different phrases and unstated shared heads stay protected',()=>{
 for(const text of [base.replace('12','four'),base.replace('three','3'),base.replace(/12 specially commissioned/,'12 newly appointed'),'The laboratory receives three, four, and 12 specially commissioned demographers.','The laboratory receives three specially commissioned demographers and 12 specially commissioned assistants.'])assert.equal(repeatedCountPhraseReviewIssues(make(text),refs).length,0,text);
});
test('different per-unit wording and unestablished larger noun continuations stay protected',()=>{
 for(const text of [base.replace('three specially commissioned demographers','three specially commissioned demographers per acre'),base.replace('12 specially commissioned demographers','12 specially commissioned demographers per acre'),base.replace(/\.$/,' assistants.'),base.replace(/\.$/,' proliferating rapidly.')])assert.equal(repeatedCountPhraseReviewIssues(make(text),refs).length,0,text);
 const text='The laboratory receives three specially commissioned demographers per acre and 12 specially commissioned demographers per acre.',d=make(text),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.repeatedCountEvidence.phraseLabel,'specially commissioned demographers per acre');
});
test('supported finite final boundaries are whole evidence while openings and Digest conflicts remain clear',()=>{
 const d=make(base.replace(/\.$/,' arrive.')),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.repeatedCountEvidence.finalBoundary.text,' arrive');
 for(const text of ['Three specially commissioned demographers and 12 specially commissioned demographers arrive.','LEGISLATIVE COUNSEL’S DIGEST\n'+base])assert.equal(find(make(text)).length,0,text);
});
test('signs fractions decimals ordinals noncanonical grouping and whole cardinal fragments stay protected',()=>{
 for(const peer of ['-12','+12','12.5','12/15','12%','012','1,23','12th','12α'])assert.equal(repeatedCountPhraseReviewIssues(make(base.replace('12',peer)),refs).length,0,peer);
 for(const term of ['minus three','one hundred and three','one hundred and and three','threefold'])assert.equal(repeatedCountPhraseReviewIssues(make(base.replace('three',term)),refs).length,0,term);
});
test('every count phrase connector boundary and internal space retains whole-source guards',()=>{
 const d=make(base),start=d.text.indexOf('three'),end=d.text.lastIndexOf('.')+1;
 for(const property of ['struck','excluded'])for(let n=start;n<end;n++){const clone=structuredClone(d);clone[property]=[{start:n,end:n+1}];assert.equal(repeatedCountPhraseReviewIssues(clone,refs).length,0,property+' '+n);}
 const q=make(base.replace(/\.$/,' arrive.')),at=q.text.indexOf('arrive');q.struck=[{start:at,end:at+6}];assert.equal(repeatedCountPhraseReviewIssues(q,refs).length,0);
});
test('quotes including removed openers names tables and partial Unicode endings stay protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const d=make('The officer’s report states '+open+base+close);assert.equal(repeatedCountPhraseReviewIssues(d,refs).length,0);const at=d.text.indexOf(open);d.struck=[{start:at,end:at+1}];assert.equal(repeatedCountPhraseReviewIssues(d,refs).length,0,'removed '+open);}
 for(const text of [base.replaceAll('specially','Specially'),base.replace(/\.$/,'-')])assert.equal(repeatedCountPhraseReviewIssues(make(text),refs).length,0,text);
 const d=make(base);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(find(d).length,0);
});
test('recognized page and word divisions restore every nested source span without mutation',()=>{
 const d=makeDocument(['The laboratory receives three specially commis-','AB 192 — 2 —\nline 1 sioned demographers and 12 specially commissioned demographers.'],'Current',[],[],new Set(['commissioned'])),header=d.blocks.find(b=>b.text==='AB 192 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const before=JSON.stringify(d),[i]=find(d);assert.ok(i);exact(d,i);assert.ok(i.repeatedCountEvidence.phrases[0].text.includes('AB 192'));assert.equal(JSON.stringify(d),before);header.formatting={};header.runningHead=false;header.layoutLabel=false;assert.equal(repeatedCountPhraseReviewIssues(d,refs).length,0);
});
test('legal identifiers and reader opt-out keep their existing behavior',()=>{
 const d=make(base);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-repeated-count-phrase-review').length,0);assert.equal(repeatedCountPhraseReviewIssues(d,{lcb:refs.lcb}).length,0);
 for(const text of ['Sections three specially commissioned demographers and 12 specially commissioned demographers apply.','The rule applies to Article three specially commissioned demographers and 12 specially commissioned demographers.'])assert.equal(repeatedCountPhraseReviewIssues(make(text),refs).length,0,text);
});
test('the actual LCB Bill item3 and GPO12.5 expose the partial repeated phrase method',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-21-bill-3','gpo-12.5']){const r=rows.find(r=>r.id===id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/no fixed qualifier vocabulary/);assert.match(r.scope,/not full numerical or noun-role automation/);}assert.equal(CHECK_COVERAGE.find(r=>r.title==='Whole repeated count phrases').text,REPEATED_COUNT_PHRASE_SCOPE);
});
test('whole Unicode phrase words remain whole while masked suffixes cannot manufacture fragments',()=>{
 for(const suffix of ['α','\u0301']){const d=make(base.replaceAll('demographers','demographers'+suffix)),[i]=find(d);assert.ok(i);exact(d,i);assert.ok(i.repeatedCountEvidence.phraseLabel.endsWith(suffix));for(const property of ['struck','excluded']){const a=structuredClone(d),at=a.text.lastIndexOf(suffix);a[property]=[{start:at,end:at+suffix.length}];assert.equal(repeatedCountPhraseReviewIssues(a,refs).length,0);}}
});
test('removed written reference labels stay negative identifier evidence',()=>{
 const text='The rule applies to Article three specially commissioned demographers and 12 specially commissioned demographers.',d=make(text),at=text.indexOf('Article');for(const property of ['struck','excluded']){const a=structuredClone(d);a[property]=[{start:at,end:at+7}];assert.equal(repeatedCountPhraseReviewIssues(a,refs).length,0,property);}
});
test('the existing single-head method retains exact large figure threshold evidence',()=>{
 for(const peer of ['9007199254740993','9,007,199,254,740,993','1'+'0'.repeat(400)]){const d=make('The laboratory receives three zygotes and '+peer+' zygotes.'),[i]=lcbNumberRelationReviewIssues(d,refs);assert.ok(i,peer);assert.equal(i.text,'three');assert.equal(i.suggestion,null);const m=i.relationshipEvidence.members[1];assert.equal(m.value,null);assert.equal(m.exactSourceInteger,peer.replaceAll(',',''));assert.equal(m.atLeastTen,true);assert.equal(all(d).filter(i=>i.checkId==='lcb-number-relation-review').length,1);}
 for(const peer of ['012','1,23','1234,567','-9007199254740993','9007199254740993.5'])assert.equal(lcbNumberRelationReviewIssues(make('The laboratory receives three zygotes and '+peer+' zygotes.'),refs).length,0,peer);
});
test('canonical zero remains an intervening member while invalid zero-leading figures cannot create a series',()=>{
 const d=make('The laboratory receives three specially commissioned demographers, 0 specially commissioned demographers, and 12 specially commissioned demographers.'),[i]=find(d);assert.ok(i);exact(d,i);assert.deepEqual(i.relationshipEvidence.members.map(m=>m.value),[3,0,12]);
 const single=make('The laboratory receives three zygotes, 0 zygotes, and 12 zygotes.'),[old]=lcbNumberRelationReviewIssues(single,refs);assert.ok(old);assert.deepEqual(old.relationshipEvidence.members.map(m=>m.value),[3,0,12]);
});
