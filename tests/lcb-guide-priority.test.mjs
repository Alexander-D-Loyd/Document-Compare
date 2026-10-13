import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {applyLcbGuidePriority} from '../app/style-guide-priority.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
const controls=[
 ['The Federal Government shall provide healthcare.',['federal government','health care']],
 ['The ground water reaches the wild land.',['groundwater','wildland']],
 ['The horse-races shall begin.',['horse races']],
 ['The before- and after-school programs are provided.',['before and after school']],
 ['The before-and-after-school programs are provided.',['before and after school']],
 ['The African-American program supports collective-bargaining agreements.',['African American','collective bargaining']],
 ['The California secretary of state and state attorney general shall act.',['Secretary of State','Attorney General']],
 ['The secretary of state of California shall act.',['Secretary of State']],
 ['The Central Valley of California shall qualify.',['central valley']],
 ['California’s Central Valley shall qualify.',['central valley']],
 ['The 2025–26 regular session shall begin.',['Regular Session']],
 ['The subchapter 7 of the California Code of Regulations applies.',['Subchapter']],
 ['The Code of Federal Regulations subchapter 7 applies.',['Subchapter']],
 ['The degrees Centigrade are reported.',['centigrade']],
 ['See section 7 and schedule 1.',['Section','Schedule']],
 ['See section 7 (a).',['Section 7(a)']],
];
test('printed applicable LCB choices take priority and preserve exact source selections',()=>{
 for(const [text,wanted] of controls){const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs);assert.deepEqual(issues.map(i=>i.suggestion),wanted,text);for(const issue of issues){assert.equal(issue.guideId,'lcb');assert.equal(issue.conflict,false);assert.ok(issue.references.some(r=>r.guideId==='lcb'));assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.ok(issue.references.filter(r=>r.guideId==='lcb').every(r=>r.sourcePassage?.text));}assert.equal(JSON.stringify(doc),before);}
});
test('compliant listed LCB forms and their sentence-opening capitals remain quiet',()=>{
 for(const text of ['The federal government provides health care.','Federal government provides health care.','The groundwater reaches the wildland.','The horse races shall begin.','The before and after school programs are provided.','The African American program supports collective bargaining agreements.','The California Secretary of State and state Attorney General shall act.','The central valley of California shall qualify.','Central valley of California shall qualify.','The 2025–26 Regular Session shall begin.','The Code of Federal Regulations Subchapter 7 applies.','The degrees centigrade are reported.','See Section 7(a) and Schedule 1.'])assert.equal(check(text).length,0,text);
});
test('the complete supporting region and jurisdiction evidence cannot be manufactured by deletion or masking',()=>{
 for(const [text,damaged] of [['The Central Valley not of California shall qualify.','not'],['California’s unrelated Central Valley shall qualify.','unrelated'],['The subchapter 3 not of the California Code of Regulations applies.','not']])for(const field of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=doc.text.indexOf(damaged);doc[field].push({start,end:start+damaged.length});assert.equal(applyLcbGuidePriority(doc,refs,[]).length,0,text+' '+field);}
 for(const [text,term] of [['The before- and after-school programs are provided.','programs'],['The subchapter 3 of the California Code of Regulations applies.','Regulations'],['The Central Valley of California shall qualify.','California']]){const doc=makeDocument([text],'Current'),start=doc.text.indexOf(term);doc.struck.push({start,end:start+term.length});assert.equal(applyLcbGuidePriority(doc,refs,[]).length,0,text);}
});
test('bill-local quoted terms, actual names, tables and genuine body dashes retain protections',()=>{
 for(const text of ['“Healthcare” means a service. The healthcare is provided.','“before- and after-school” means a program. The before- and after-school programs are provided.','The Department of Healthcare Access and Information shall act.','The State Government Act shall apply.','The wild—land is described.','The ground—water is discussed.','The before—and—after—school programs are provided.'])assert.equal(check(text).length,0,text);
 const next=check('The healthcare is provided.');assert.equal(next.length,1);assert.equal(next[0].suggestion,'health care');
 const doc=makeDocument(['The healthcare is provided.'],'Current');doc.blocks[0].formatting={headerGaps:[10,30]};assert.equal(applyLcbGuidePriority(doc,refs,[]).length,0);
});
test('qualifier boundaries and Unicode fragments do not establish listed roles',()=>{
 for(const text of ['The Central Valley of Californiax shall qualify.','The before- and after-school programsα are provided.','The Code of Federal Regulations subchapter 3α applies.','The wildlandα is described.','The wild landα is described.'])assert.equal(applyLcbGuidePriority(makeDocument([text],'Current'),refs,[]).length,0,text);
});
test('source-backed Bill and Digest numeral differences follow LCB without flagging its compliant form',()=>{
 for(const [text,wanted] of [['The people do enact as follows:\nThe child is 2 years of age.',['two']],['The people do enact as follows:\nThe board measures 2 feet.',['two']],['LEGISLATIVE COUNSEL’S DIGEST\nThe agency issues three permits.',['3']],['LEGISLATIVE COUNSEL’S DIGEST\nThe agency reviews the third application.',['3rd']],['LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.',['5%']]]){const found=check(text);assert.deepEqual(found.map(i=>i.suggestion),wanted,text);assert.ok(found.every(i=>i.guideId==='lcb'&&!i.conflict));}
 for(const text of ['The people do enact as follows:\nThe child is two years of age.','LEGISLATIVE COUNSEL’S DIGEST\nThe agency issues 3 permits.','LEGISLATIVE COUNSEL’S DIGEST\nThe agency reviews the 3rd application.','LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5%.'])assert.equal(check(text).length,0,text);
});
