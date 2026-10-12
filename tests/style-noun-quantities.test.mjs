import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {listedNounIssues} from '../app/style-listed-nouns.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>listedNounIssues(d,refs),numeric=['2.5','.5','1,234.5','2/3','2 / 3','2⁄3','2 1/2','2 1 / 2','2½','2 ½','⅔','-2.5','+2.5','− 2.5'];
test('complete decimal fraction mixed vulgar and signed quantities establish the schoolday noun',()=>{
 for(const n of numeric){const text='Operate '+n+' school days and report attendance.',d=make(text),r=check(d);assert.deepEqual(r.map(i=>[i.text,i.suggestion]),[['school days','schooldays']],n);assert.equal(d.text.slice(r[0].start,r[0].end),'school days');assert.match(r[0].message,/explicit quantity/);assert.equal(check(make(text.replace('school days','schooldays'))).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.checkId==='listed-nouns'));}
});
test('whole canonical written quantities establish noun evidence beyond a final small word',()=>{
 for(const n of ['eleven','twenty-one','one hundred twenty-three','two thousand three hundred forty-five','one million','one hundred and two']){const d=make('Operate '+n+' school days and report attendance.');assert.deepEqual(check(d).map(i=>i.suggestion),['schooldays'],n);}
 for(const n of ['2.5','2/3','two hundred thirty-five'])assert.deepEqual(check(make('Review '+n+' time frames.')).map(i=>i.suggestion),['timeframes'],n);
});
test('malformed whole quantities cannot yield an isolated numeric suffix',()=>{
 for(const n of ['12,34','2.5.3','2/3/4','2/0','2 7/3','2..5','2e3','175a','α175','2:30'])assert.equal(check(make('Operate '+n+' school days and report attendance.')).length,0,n);
 for(const label of ['Section','Article','Chapter','No.','ID','Model','Version','Item','Schedule','Page'])assert.equal(check(make('See '+label+' 2.5 school days and report attendance.')).length,0,label);
});
test('whole quantity components and connecting spaces retain original source evidence',()=>{
 for(const n of ['2.5','1,234.5','2/3','2 1/2','2 1 / 2','− 2.5','one hundred twenty-three']){const text='Operate '+n+' school days and report attendance.';for(const field of ['struck','excluded'])for(let offset=0;offset<n.length;offset++){const d=make(text),start=text.indexOf(n)+offset;d[field].push({start,end:start+1});assert.equal(check(d).length,0,n+' '+field+' '+offset);}}
});
test('quantity boundaries protect masked Unicode suffixes and identifiers with uncertain labels',()=>{
 for(const n of ['2.5','2/3','2½','twenty-one'])for(const c of ['α','\u0301']){const text='Operate '+n+c+' school days and report attendance.',d=make(text),at=text.indexOf(n)+n.length;d.excluded.push({start:at,end:at+c.length});assert.equal(check(d).length,0,n+c);}
 for(const field of ['struck','excluded']){const d=make('See Section 2.5 school days and report attendance.'),at=d.text.indexOf('Section')+2;d[field].push({start:at,end:at+1});assert.equal(check(d).length,0,field+' original identifier');}
});
test('known page heads inside complete mixed and written counts preserve exact selected noun offsets',()=>{
 for(const [before,after]of [['Operate 2','1/2 school days and report attendance.'],['Operate one hundred','twenty-three school days and report attendance.']]){const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+before,'AB 9999 — '+('recognized page label '.repeat(15))+'2 —\nline 1 '+after]);const b=d.blocks.find(b=>b.page===2&&!b.margin);b.ignored=true;b.layoutLabel=true;b.formatting={headerParts:[{}]};d.excluded.push({start:b.start,end:b.end});const saved=JSON.stringify(d),r=check(d);assert.equal(r.length,1,after);assert.equal(r[0].suggestion,'schooldays');assert.equal(d.text.slice(r[0].start,r[0].end),'school days');assert.equal(JSON.stringify(d),saved);}
});
test('complete count evidence protects wrapped literals tables unknown gaps and unrelated noun paths',()=>{
 for(const t of ['The title "Operate 2\n1/2 school days" is literal.','Operate 2.5 school days.................100','Operate 2 unknown 1/2 school days and report attendance.']){const d=make(t);if(t.includes('unknown')){const start=t.indexOf('unknown');d.excluded.push({start,end:start+7});}assert.equal(check(d).length,0,t);}
 const d=make('Review 2.5 time frames program.'),at=d.text.indexOf('2.5');d.struck.push({start:at,end:at+3});assert.deepEqual(check(d).map(i=>i.suggestion),['timeframes'],'independent intact program head');
 const p=make('line 1 Operate 2\nline 2 1/2 school days and report attendance.');p.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(check(p).length,0,'whole establishing count crosses table');
});

test('source-listed open noun plurals use the same complete quantity evidence without numeric suffix guesses',()=>{
 const forms=[['councilmembers','council members'],['loan-sharks','loan sharks'],['offramps','off ramps'],['onramps','on ramps'],['taskforces','task forces'],['vicechairpersons','vice chairpersons']];
 for(const [bad,good]of forms)for(const n of ['eleven','twenty-one','1,234','2.5','2/3','2 1/2']){const d=make('Review '+n+' '+bad+'.'),r=lcbRoleFormIssues(d,refs);assert.deepEqual(r.map(i=>i.suggestion),[good],n+' '+bad);assert.equal(d.text.slice(r[0].start,r[0].end),bad);assert.equal(lcbRoleFormIssues(make('Review '+n+' '+good+'.'),refs).length,0);}
 for(const n of ['12,34','2.5.3','2/3/4','2/0'])assert.equal(lcbRoleFormIssues(make('Review '+n+' councilmembers.'),refs).length,0,n);
 const d=make('Review 2 1/2 councilmembers.'),at=d.text.indexOf('2');d.struck.push({start:at,end:at+1});assert.equal(lcbRoleFormIssues(d,refs).length,0,'struck whole part');
});

test('quantity scope states complete original evidence and remaining numerical meaning limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete quantity noun evidence');assert.ok(row);for(const word of ['decimal','mixed','signed','original quantity','identifier','numerical meaning','spelling-authority'])assert.ok(row.text.includes(word),word);
 const rows=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.scope?.includes('Complete adjacent integer/grouped'));assert.ok(rows.some(r=>r.text.includes('schoolday')));assert.ok(rows.some(r=>r.text.includes('council member')));assert.ok(rows.every(r=>r.status==='Partially automated'));
});
