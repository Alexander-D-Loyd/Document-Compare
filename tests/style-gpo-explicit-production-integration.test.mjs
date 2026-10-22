import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const options={includeReviewSuggestions:true,includeCompleteLcbReview:true};
const make=t=>makeDocument(['The people do enact as follows:\n'+t],'Current');
const review=(input,opts={})=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),out=reviewStyleIssues(d,refs,{...options,...opts});assert.equal(JSON.stringify(d),before);for(const i of out)assert.equal(d.text.slice(i.start,i.end),i.text);return out;};
const cases=[
 ['The hearing is on June 29th, 1985.','June 29th, 1985','June 29, 1985','gpo-literal-date-time',289],
 ['The event occurred in the year 2,000.','in the year 2,000','in the year 2000','gpo-literal-date-time',289],
 ['The hearing begins at 2 p.m. in the afternoon.','2 p.m. in the afternoon','2 p.m.','gpo-literal-date-time',289],
 ['Keep inflammable liquids separate.','inflammable','flammable','gpo-explicit-spelling',97],
 ['The thickness is .2500 inch.','.2500 inch','0.2500 inch','gpo-literal-date-time',289],
 ['The program runs from March 6, 1990, to April 15, 1990.','March 6, 1990, to April 15, 1990','March 6 to April 15, 1990','gpo-literal-date-time',289],
 ['The energy is 25 gigaelectronvolt (GEV).','GEV','GeV','gpo-explicit-table-definitions',263],
 ['The notice specifies cardiopulmonary resuscitation (cpr).','cpr','CPR','gpo-standard-abbreviation-definitions',254],
 ['The notice specifies Application Programming Interface (api).','api','API','gpo-it-abbreviation-definitions',270],
 ['The notice specifies exempli gratia (E G).','E G','e.g.','gpo-explicit-table-definitions',267],
 ['The notice specifies chlorine (CL).','CL','Cl','gpo-explicit-table-definitions',279],
 ['The account specifies U.S. dollar (Next day) (usn).','usn','USN','gpo-explicit-table-definitions',358],
 ['The notice specifies United States Army rank Second Lieutenant (2lt).','2lt','2LT','gpo-military-rank-definitions',242],
 ['The 12 aide-de-camps shall report.','aide-de-camps','aides-de-camp','compound-plurals',103],
 ['The notice specifies adobe acrobat reader.','adobe acrobat reader','Adobe Acrobat Reader','gpo-printed-full-name',59],
 ['The cyber security is recorded.','cyber security','cybersecurity','gpo-listed-compounds',142]
];

test('completed finite GPO groups survive the full production review as one exact source-backed finding each',()=>{
 for(const [text,selected,suggestion,checkId,page]of cases){const out=review(text);assert.equal(out.length,1,text+' '+JSON.stringify(out.map(i=>[i.text,i.suggestion,i.checkId])));const [i]=out;assert.deepEqual([i.text,i.suggestion,i.checkId,i.guidePage,i.context],[selected,suggestion,checkId,page,'Bill']);assert.equal(i.guideId,'gpo');assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.sourcePassage?.text));}
});

test('automatic Digest/Bill routing and independent LCB priorities remain effective in one combined production pass',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 8001\nLEGISLATIVE COUNSEL’S DIGEST\nThe hearing is on June 29th, 1985.\nThe people do enact as follows:\nThe energy is 25 gigaelectronvolt (GEV).\nThe office shall file 2 reports.\nThe advisor shall act.'],'Current');
 const out=review(d);assert.ok(out.some(i=>i.text==='June 29th, 1985'&&i.context==='Digest'));assert.ok(out.some(i=>i.text==='GEV'&&i.suggestion==='GeV'&&i.context==='Bill'));assert.ok(out.some(i=>i.text==='2'&&i.suggestion==='two'&&i.guideId==='lcb'));assert.ok(out.some(i=>i.text==='advisor'&&i.suggestion==='adviser'&&i.guideId==='lcb'));
 for(const i of out)if(i.evidenceStart!==undefined)assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd>=i.end);
});

test('valid GPO counterparts, isolated acronyms, unknown families and explicit local wording stay quiet through the full review',()=>{
 const controls=['The hearing is on June 29, 1985.','The event occurred in the year 2000.','The hearing begins at 2 p.m.','Keep flammable liquids separate.','The thickness is 0.2500 inch.','The program runs from March 6 to April 15, 1990.','The energy is 25 gigaelectronvolt (GeV).','The notice specifies cardiopulmonary resuscitation (CPR).','The notice specifies Application Programming Interface (API).','The notice specifies exempli gratia (e.g.).','The notice specifies chlorine (Cl).','The account specifies U.S. dollar (Next day) (USN).','The notice specifies United States Army rank Second Lieutenant (2LT).','The 12 aides-de-camp shall report.','The quoted wording is “sodium (NA).”','The chlorine (CL) Program is hereby created.','For this section, “gold (AU)” means the specified label.\nThe notice specifies gold (AU).','Label ............................................ chlorine (CL).','The notice specifies chlorine (XYZ).','The notice specifies U.S. Army rank Staff Sergeant (SSgt).','The notice specifies Army rank Staff Sergeant (ssg).','The label reads API, CL, USN, and SSG.'];
 for(const text of controls)assert.equal(review(text).length,0,text);
});

test('lumber x/by controls own both figures while the precise forbidden sign receives only its literal replacement',()=>{
 for(const text of ['The board is 2 x 4 lumber.','The board is 2 by 4 lumber.','The board is 2x4 lumber.','The board is 2 x 4 (lumber).'])assert.equal(review(text).length,0,text);
 for(const text of ['The board is 2 × 4 lumber.','The board is 2×4 lumber.','The board is 2 × 4 (lumber).']){const out=review(text);assert.equal(out.length,1,text);assert.deepEqual([out[0].text,out[0].suggestion,out[0].checkId,out[0].guidePage],['×','x','gpo-lumber-source-form',290]);assert.ok(out[0].references[0].sourcePassage.text.includes('(not 2/H115034)'));}
 const d=make('Use 2 x 4 lumber and 2 reports.'),out=review(d);assert.equal(out.length,1);assert.equal(out[0].start,d.text.indexOf('2 reports'));assert.deepEqual([out[0].text,out[0].suggestion,out[0].checkId],['2','two','numerals']);
});

test('sentence-opening lumber preserves an LCB whole-designation review and never proposes a component-only count rewrite',()=>{
 for(const op of ['x','by','×']){const text='2 '+op+' 4 lumber is used.',d=make(text),out=review(d);assert.equal(out.length,1,text);const [i]=out;assert.equal(i.text,'2 '+op+' 4');assert.equal(i.suggestion,null);assert.equal(i.checkId,'gpo-lumber-opening-review');assert.equal(i.guideId,'lcb');assert.equal(i.guidePage,21);assert.equal(i.reviewSuggested,true);assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.guidePage===290));assert.ok(!out.some(r=>['numerals','numerical-relationship'].includes(r.checkId)));}
});

test('lumber identity protects uncertain original components without manufacturing a correction or suppressing independent text',()=>{
 const raw='The board is 2 × 4 lumber.';
 // Use actual document offsets, including the enactment prefix.
 const d0=make(raw),[i]=review(d0);for(let at=i.evidenceStart;at<i.evidenceEnd;at++)for(const property of ['struck','excluded']){const d=structuredClone(d0);d[property].push({start:at,end:at+1});assert.ok(!review(d).some(r=>r.checkId==='gpo-lumber-source-form'),property+' '+at);}
 for(const text of ['Use “2 × 4 lumber.”','The 2 × 4 lumber Program is hereby created.','For this section, “2 × 4 lumber” means the specified label. Use 2 × 4 lumber.'])assert.ok(!review(text).some(i=>i.checkId==='gpo-lumber-source-form'),text);
 const opening=make('2 x 4 lumber is used.'),cue=opening.text.indexOf('lumber');opening.struck.push({start:cue,end:cue+6});assert.ok(review(opening).some(i=>i.guideId==='lcb'&&i.start===opening.text.indexOf('2 x')),'Removed lumber cue cannot suppress the independent opening-number duty');
});
