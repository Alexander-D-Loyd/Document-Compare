import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {guideById,STYLE_GUIDES} from '../app/style-guides.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));

test('county references participate in production review alongside independent Codes, LCB and GPO findings',()=>{
 const d=makeDocument(['The people do enact as follows:\nLos Angeles County provides services. The county of orange receives funds. Counties of Alameda, Orange, and Yolo participate. Government Code (CIV) applies. The healthcare is provided. Use 25 bbls. Apply the formula A + 1,000.'],'Current');
 const before=JSON.stringify(d),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true}),county=issues.filter(i=>i.guideId==='california-counties');
 assert.deepEqual(county.map(i=>i.suggestion),['County of Los Angeles','County of Orange']);
 for(const i of county){assert.ok(i.countySource);assert.match(i.reviewTask,/supplied county list/u);assert.ok(!i.references?.some(r=>['lcb','gpo'].includes(r.guideId)));}
 for(const [guideId,suggestion]of [['california-codes','GOV'],['lcb','health care'],['gpo','25 bbl'],['gpo','A+1,000']])assert.ok(issues.some(i=>i.guideId===guideId&&i.suggestion===suggestion),suggestion);
 for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);assert.deepEqual(issues.map(i=>i.id),issues.map((_,id)=>id));
 const repeated=reviewStyleIssues(makeDocument(['The county of riverside receives funds.'],'Current'),refs,{includeReviewSuggestions:true}).filter(i=>i.suggestion==='County of Riverside');assert.equal(repeated.length,1);assert.equal(repeated[0].guideId,'california-counties');
});

test('unknown county review survives production evidence attachment without a guessed replacement',()=>{
 assert.equal(guideById('california-counties').title,'California Counties');assert.equal(STYLE_GUIDES.length,2);
 const d=makeDocument(['County of Atlantis receives funds. County of Alameda receives funds.'],'Current'),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.guideId==='california-counties');
 assert.equal(issues.length,1);assert.equal(issues[0].suggestion,null);assert.ok(issues[0].reviewSuggested);assert.ok(issues[0].countySource);assert.match(issues[0].reviewTask,/before editing/u);assert.equal(d.text.slice(issues[0].start,issues[0].end),issues[0].text);
});
