import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {fractionOpeningReviewIssues}from '../app/style-fraction-openings.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),digest='LEGISLATIVE COUNSEL’S DIGEST\n',make=text=>makeDocument([text],'Current',[],[],words),check=d=>fractionOpeningReviewIssues(d,refs),joint=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-fraction-opening-review');
const evidence=(d,i)=>{assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.openingClauseText);assert.equal(i.start,i.evidenceStart);assert.ok(i.evidenceEnd>i.end);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.ok(i.references.every(r=>r.preferred===null));assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.rule==='Numerals, general item 1'));assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.rule==='12.16'));};
test('complete proper fractions in Digest openings receive source clause questions without forced wording',()=>{
 for(const fraction of ['1/2','2⁄3','12/37','1/1000','1,000/2,001','½','⅓','⅞']){const d=make(digest+fraction+' of the funds shall remain.'),before=JSON.stringify(d),[i]=joint(d);assert.ok(i,fraction);assert.equal(i.text,fraction);assert.equal(i.context,'Digest');evidence(d,i);assert.equal(JSON.stringify(d),before);}
});
test('unhandled proper Bill fractions expand coverage while existing precise fraction corrections keep one stop',()=>{
 for(const fraction of ['1/101','1001/1003','9007199254740992/9007199254740993']){const d=make(fraction+' of the funds shall remain.'),[i]=joint(d);assert.ok(i,fraction);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.rule==='Numerals, bill item 1'));evidence(d,i);}
 for(const fraction of ['1/2','2/3','½','12/37','21/40']){const d=make(fraction+' of the funds shall remain.'),previous=jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeFractionOpeningReview:false}),now=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.deepEqual(now,previous);assert.ok(now.some(i=>i.checkId==='fractions'));assert.equal(joint(d).length,0);}
});
test('exact proper comparison has no floating point or single-digit numerator and denominator limit',()=>{
 for(const [n,d,expected]of [['9007199254740992','9007199254740993',1],['9007199254740993','9007199254740992',0],['99999999999999999999999999999999999999','100000000000000000000000000000000000000',1],['100000000000000000000000000000000000000','99999999999999999999999999999999999999',0],['37','37',0]])assert.equal(check(make(digest+n+'/'+d+' of the funds shall remain.')).length,expected,n+'/'+d);
});
test('a whole fraction and unit can be selected without including the establishing predicate',()=>{
 const d=make(digest+'12/37 hours are required.'),[i]=joint(d);assert.ok(i);assert.equal(i.text,'12/37 hours');assert.equal(i.openingClauseText,'12/37 hours are required');evidence(d,i);
});
test('mixed improper signed ranged decimal and technical fractional forms stay protected',()=>{
 for(const text of ['1 1/2 hours are required.','1½ hours are required.','1 ½ hours are required.','70½ years of age is the minimum.','2/1 of the funds shall remain.','0/2 of the funds shall remain.','1/0 of the funds shall remain.','-1/2 of the funds shall remain.','+ 1/2 of the funds shall remain.','1/2 to 3/4 of the funds shall remain.','1/2–3/4 of the funds shall remain.','1.5/2 of the funds shall remain.','1e3/2e3 of the funds shall remain.','1/2-inch pipe is required.','1/2 of 1 percent is available.','1/2/2026 is the date.','01/02 of the funds shall remain.','1,00/2,00 of the funds shall remain.']){assert.equal(check(make(digest+text)).length,0,text);assert.equal(joint(make(digest+text)).length,0,text);}
});
test('ordinary Digest figures written fractions and identifiers receive no new opening question',()=>{
 for(const text of ['The program retains 1/2 of the funds.','One-half of the funds shall remain.','Section 1/2 applies.','Article 12/37 applies.','Version 1/2 is available.','Item 1/2 of the funds shall remain.','1/2. The program shall act.','1/2 of the funds','1/2 of the funds are','1/2 of the funds that are available shall remain.','1/2 of the funds if approved shall remain.'])assert.equal(joint(make(digest+text)).length,0,text);
 const authenticHead=make('ASSEMBLY BILL No. 1\nVote: 2/3\n'+digest+'A bill.');assert.equal(joint(authenticHead).length,0);
});
test('whole source evidence protects every numeral partitive unit and predicate character against removal',()=>{
 for(const text of [digest+'12/37 of the available funds shall remain.',digest+'½ hours are required.'])for(const property of ['struck','excluded'])for(let at=digest.length;at<text.length-1;at++){const d=make(text);d[property].push({start:at,end:at+1});assert.equal(check(d).length,0,property+' '+at+' '+text);}
});
test('hidden original numeric components or preceding words cannot manufacture a proper sentence opening',()=>{
 for(const property of ['struck','excluded'])for(const prefix of ['The program retains ','1 ','− ','0']){const d=make(digest+prefix+'1/2 of the funds shall remain.'),start=digest.length;d[property].push({start,end:start+prefix.length});assert.equal(check(d).length,0,property+' '+prefix);}
});
test('full predicate boundaries reject visible and masked Unicode suffixes digits marks and hyphens',()=>{
 for(const suffix of ['α','é','\u0301','9','_role','-by'])for(const property of [null,'struck','excluded']){const base=digest+'12/37 of the funds are required',d=make(base+suffix+'.');if(property)d[property].push({start:base.length,end:base.length+suffix.length});assert.equal(check(d).length,0,suffix+' '+property);}
});
test('quoted fractions and clauses tables unknown ignored bridges and damaged quotation delimiters remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"],['‘','’']]){const text=digest+open+'12/37 of the funds shall remain.'+close;assert.equal(check(make(text)).length,0,text);for(const property of ['struck','excluded']){const d=make(text);d[property].push({start:digest.length,end:digest.length+1});d[property].push({start:text.length-1,end:text.length});assert.equal(check(d).length,0,property+' '+text);}}
 assert.equal(check(make(digest+'12/37 of the funds shall remain............10')).length,0);const d=make(digest+'12/37 of the funds shall remain.');d.blocks.at(-1).ignored=true;assert.equal(check(d).length,0);const table=make(digest+'12/37 hours are required.');table.blocks.at(-1).formatting={headerGaps:[1,2]};assert.equal(check(table).length,0);
});
test('recognized word divisions line breaks slash spacing and page breaks keep complete original coordinates',()=>{
 for(const pages of [[digest+'12 /','37 of the avail-','able funds shall remain.'],[digest+'½ kil-','ograms are re-','quired.']]){const d=makeDocument(pages,'Current',[],[],words),before=JSON.stringify(d),[i]=joint(d);assert.ok(i,pages.join('|'));assert.ok(i.openingClauseText.includes('\n'));evidence(d,i);const [standalone]=check(d);evidence(d,standalone);assert.equal(i.start,standalone.start);assert.equal(i.end,standalone.end);assert.equal(JSON.stringify(d),before);}
});
test('feature and review switches missing sources and prior numeric ownership preserve old callers',()=>{
 const d=make(digest+'12/37 of the funds shall remain.');assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-fraction-opening-review').length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true,includeFractionOpeningReview:false}).filter(i=>i.checkId==='lcb-fraction-opening-review').length,0);const [i]=check(d);assert.equal(fractionOpeningReviewIssues(d,refs,{existingIssues:[i]}).length,0);assert.equal(fractionOpeningReviewIssues(d,{lcb:refs.lcb}).length,0);const incomplete={...refs.gpo,pages:refs.gpo.pages.slice()};incomplete.pages[293]=null;assert.equal(fractionOpeningReviewIssues(d,{...refs,gpo:incomplete}).length,0);
});
