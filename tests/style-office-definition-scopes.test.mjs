import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {officeTitleIssues} from '../app/style-office-titles.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const section=(n,code,body)=>'SEC. '+n+'. Section '+(100+n)+' of the '+code+' is amended to read:\n'+(100+n)+'. '+body+'\n';
const check=text=>officeTitleIssues(makeDocument([text],'Current'),refs);
test('a defined office alias does not protect unrelated amended code provisions',()=>{
 const text=section(1,'Health and Safety Code','“Department” means the Department of Managed Health Care. The Department shall act.')+section(2,'Government Code','The Department shall act.');
 const found=check(text);assert.equal(found.length,1);assert.equal(found[0].suggestion,'department');assert.ok(found[0].start>text.indexOf('SEC. 2.'));
});
test('an explicit this-section definition remains local within one code',()=>{
 const text=section(1,'Government Code','For purposes of this section, “Commission” means the California Commission. The Commission shall act.')+section(2,'Government Code','The Commission shall act.');
 assert.deepEqual(check(text).map(i=>i.suggestion),['commission']);
});
test('an explicit this-code alias extends only to identified provisions of that code',()=>{
 const text=section(1,'Government Code','For purposes of this code, “Department” means the Department of Finance.')+section(2,'Government Code','The Department shall act.')+section(3,'Education Code','The Department shall act.');
 const found=check(text);assert.equal(found.length,1);assert.ok(found[0].start>text.indexOf('SEC. 3.'));
});
test('the Superintendent exception cannot inherit an unscoped definition from another section',()=>{
 const text=section(1,'Education Code','“superintendent” means the Superintendent of Public Instruction. The superintendent shall act.')+section(2,'Education Code','“superintendent” means the county superintendent. The superintendent shall act.');
 const found=check(text);assert.equal(found.length,1);assert.equal(found[0].suggestion,'Superintendent');assert.ok(found[0].start<text.indexOf('SEC. 2.'));
});
test('a local conflicting Superintendent definition overrides a this-code referent',()=>{
 const text=section(1,'Education Code','As used in this code, “superintendent” means the Superintendent of Public Instruction.')+section(2,'Education Code','The superintendent shall act.')+section(3,'Education Code','For purposes of this section, “superintendent” means the county superintendent. The superintendent shall act.');
 const found=check(text);assert.equal(found.length,1);assert.ok(found[0].start>text.indexOf('SEC. 2.')&&found[0].start<text.indexOf('SEC. 3.'));
});
test('ambiguous local referents and unresolved subdivision scopes remain manual',()=>{
 for(const body of ['“superintendent” means the Superintendent of Public Instruction. “superintendent” means the county superintendent. The superintendent shall act.','For purposes of this subdivision, “superintendent” means the Superintendent of Public Instruction. The superintendent shall act.'])assert.equal(check(section(1,'Education Code',body)).length,0,body);
});
test('source strikes or a table cannot establish the Public Instruction definition',()=>{
 for(const text of [section(1,'Education Code','“superintendent” means former the Superintendent of Public Instruction. The superintendent shall act.'),section(1,'Education Code','“superintendent” means the Superintendent of Public former Instruction. The superintendent shall act.')]){
  const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(officeTitleIssues(d,refs).length,0);
 }
 const d=makeDocument([section(1,'Education Code','“superintendent” means the Superintendent of Public Instruction.\nThe superintendent shall act.')],'Current');d.blocks.find(b=>b.text.includes('means')).formatting={headerGaps:[1,2]};assert.equal(officeTitleIssues(d,refs).length,0);
});
test('source scope offsets survive a known interior page head and reject unknown bridges',()=>{
 const first=section(1,'Education Code','For purposes of this code, “superintendent” means the Superintendent of Public'),last='line 1 Instruction.\n'+section(2,'Education Code','The superintendent shall act.');
 const d=makeDocument([first,'AB 9999 — 2 —\n'+last],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};assert.equal(officeTitleIssues(d,refs).length,1);
 const u=makeDocument([first+'unknown marker\n'+last],'Current'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(officeTitleIssues(u,refs).length,0);
});
test('unsectioned aliases preserve the existing interpretation and exact quoted case',()=>{
 assert.equal(check('“Department” means the Department of Finance. The Department shall act.').length,0);
 assert.equal(check('“department” means the Department of Finance. The Department shall act.').length,1);
 assert.equal(check(section(1,'Government Code','“superintendent” means the Superintendent of Public Instruction. The superintendent shall act.')).length,0);
});

test('digest and literal examples cannot define an office in ordinary bill prose',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\n“Department” means the Department of Finance.\nThe people of the State of California do enact as follows:\nThe Department shall act.';
 assert.deepEqual(check(text).map(i=>i.suggestion),['department']);
 assert.deepEqual(check('The literal "“Department” means the Department of Finance." remains. The Department shall act.').map(i=>i.suggestion),['department']);
});
test('a this-code scope clause cannot cross removed or unknown source wording',()=>{
 const body='For purposes of this code, former “superintendent” means the Superintendent of Public Instruction.',text=section(1,'Education Code',body)+section(2,'Education Code','The superintendent shall act.');
 const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(officeTitleIssues(d,refs).length,0);
 const u=makeDocument([section(1,'Education Code','For purposes of this code,\nunknown marker\n“superintendent” means the Superintendent of Public Instruction.')+section(2,'Education Code','The superintendent shall act.')],'Current'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(officeTitleIssues(u,refs).length,0);
});

test('office role cues reject masked strikes and table evidence',()=>{
 for(const text of ['The former Department shall act.','The Department former shall act.']){const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(officeTitleIssues(d,refs).length,0);}
 const d=makeDocument(['The Department\nshall act.'],'Current');d.blocks[1].formatting={headerGaps:[1,2]};assert.equal(officeTitleIssues(d,refs).length,0);
});
test('an exact office selection retains both body pieces across an identified page head',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 The Board of','AB 9999 — 2 —\nline 1 Supervisors shall act.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=officeTitleIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'board of supervisors');assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.ok(found[0].text.includes('AB 9999'));
});
test('edited definition scope metadata is rechecked and genuine standalone warnings remain',()=>{
 const d=makeDocument([section(1,'Education Code','“superintendent” means the Superintendent of Public Instruction.\nThe superintendent shall act.')],'Current');assert.equal(officeTitleIssues(d,refs).length,1);const b=d.blocks.find(b=>b.text.includes('means'));b.formatting={headerGaps:[1,2]};assert.equal(officeTitleIssues(d,refs).length,0);delete b.formatting;assert.equal(officeTitleIssues(d,refs).length,1);
 assert.deepEqual(check('The Department shall act. Each Trustee is appointed.').map(i=>i.suggestion),['department','trustee']);
});

test('explicit source code titles establish identical-code scope without a finite title whitelist',()=>{
 const text='SEC. 1. Section 101 is added to the Financial Code, to read:\n101. For purposes of this code, “Department” means the Department of Finance.\n'+section(2,'Financial Code','The Department shall act.')+section(3,'Government Code','The Department shall act.');
 const found=check(text);assert.equal(found.length,1);assert.ok(found[0].start>text.indexOf('SEC. 3.'));
});
test('multiple different code titles in one introduction do not select a this-code Superintendent referent',()=>{
 const text='SEC. 1. Sections 101 of the Education Code and 102 of the Government Code are amended to read:\n101. For purposes of this code, “superintendent” means the Superintendent of Public Instruction.\n'+section(2,'Education Code','The superintendent shall act.');assert.equal(check(text).length,0);
});
