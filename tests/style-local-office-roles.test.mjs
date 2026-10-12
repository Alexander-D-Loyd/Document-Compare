import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {localOfficeIssues} from '../app/style-local-offices.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>localOfficeIssues(makeDocument([text],'Current'),refs);
test('explicit local possessives establish generic office roles without a personal title',()=>{
 for(const place of ['city','county','municipality','district'])for(const title of ['Controller','Treasurer'])for(const apostrophe of ['’',"'"]){const text='The '+place+apostrophe+'s '+title+' shall retain records.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,title.toLowerCase());assert.equal(text.slice(found[0].start,found[0].end),title);}
});
test('explicit generic plural office and court roles retain their full word selection',()=>{
 for(const text of ['The county Controllers are appointed.','The city Treasurers have authority.','Any Courts shall review records.','Each county Court shall act.','The district’s Courts are open.']){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,found[0].text.toLowerCase());assert.equal(check(text.replace(found[0].text,found[0].suggestion)).length,0);}
});
test('of and for local-jurisdiction complements need a standalone determiner and finite predicate',()=>{
 for(const title of ['Controller','Treasurer'])for(const relation of ['of','for'])for(const place of ['the county','a city','any district','each municipality','the counties','the cities']){const text='The '+title+' '+relation+' '+place+' shall retain records.';assert.deepEqual(check(text).map(i=>i.suggestion),[title.toLowerCase()],text);}
 for(const text of ['The State Controller for the county shall act.','The Controller for the county advisory board shall act.','The Controller for the County of Yolo shall act.','The Treasurer of the city John Smith shall act.'])assert.equal(check(text).length,0,text);
});
test('shared local jurisdiction binds coordinated office nouns and preserves each exact token',()=>{
 for(const body of ['county Controller and Treasurer','city’s Treasurer or Controller','district Controllers and Treasurers']){const text='The '+body+' shall retain records.',found=check(text);assert.equal(found.length,2,text);assert.ok(found.every(i=>i.suggestion===i.text.toLowerCase()));let fixed=text;for(const i of found.toReversed())fixed=fixed.slice(0,i.start)+i.suggestion+fixed.slice(i.end);assert.equal(check(fixed).length,0);}
 assert.deepEqual(check('The county controller and Treasurer shall act.').map(i=>i.suggestion),['treasurer']);
 assert.equal(check('The county controller and the State Treasurer shall act.').length,0);
});
test('named officers, extended entities, definite court referents, quotations and capital typography stay protected',()=>{
 for(const text of ['The county Controller John Smith shall act.','The city’s Treasurer Jane Doe shall act.','The County Controller Office shall act.','The Controller shall act.','The Court shall act.','The Court Appointed Special Advocate program is named.','Court shall act.','The county CONTROLLER shall act.','The literal "county Controller and Treasurer shall act" remains.','The literal “city’s Treasurer shall act” remains.'])assert.equal(check(text).length,0,text);
});
test('jurisdiction, complete coordination and finite evidence cannot cross removed wording',()=>{
 for(const text of ['The county former Controller shall act.','The county Controller former shall act.','The Controller of former the county shall act.','The county Controller and former Treasurer shall act.','The county Controller and Treasurer former shall act.','Any former Courts shall act.']){const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(localOfficeIssues(d,refs).length,0,text);}
});
test('tables and unknown ignored content cannot establish a local office qualifier',()=>{
 const t=makeDocument(['The county’s\nController shall act.'],'Current');t.blocks[0].formatting={headerGaps:[1,2]};assert.equal(localOfficeIssues(t,refs).length,0);
 const u=makeDocument(['The county\nunknown marker\nController shall act.'],'Current'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(localOfficeIssues(u,refs).length,0);
});
test('identified interior page heads preserve whole office tokens and exact shared jurisdiction evidence',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 The county’s Controller and','AB 9999 — 2 —\nline 1 Treasurers shall act.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=localOfficeIssues(d,refs);assert.deepEqual(found.map(i=>i.suggestion),['controller','treasurers']);assert.ok(found.every(i=>i.text===d.text.slice(i.start,i.end)));
});
test('wrapped literal jurisdiction and rechecked table metadata remain protected',()=>{
 assert.equal(check('The literal "county’s\nController shall act" remains.').length,0);
 const d=makeDocument(['The county’s\nController shall act.'],'Current');assert.equal(localOfficeIssues(d,refs).length,1);d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(localOfficeIssues(d,refs).length,0);delete d.blocks[0].formatting;assert.equal(localOfficeIssues(d,refs).length,1);
});
test('existing county fund and federal court checks require intact jurisdiction and predicates',()=>{
 for(const text of ['The county’s former General Fund shall act.','Each federal former Court of Appeals shall act.','Each federal Court of Appeals former shall act.']){const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(localOfficeIssues(d,refs).length,0,text);}
 const d=makeDocument(['The county’s\nGeneral Fund shall act.'],'Current');d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(localOfficeIssues(d,refs).length,0);
});

test('exact-case source-defined local office aliases stay scoped while lowercase aliases remain checkable',()=>{
 for(const title of ['Controller','Treasurer','Court'])assert.equal(check('“'+title+'” means the locally designated officer. The county’s '+title+' shall act.').length,0,title);
 assert.deepEqual(check('“controller” means the locally designated officer. The county Controller shall act.').map(i=>i.suggestion),['controller']);
 const sec=(n,code,body)=>'SEC. '+n+'. Section '+(100+n)+' of the '+code+' is amended to read:\n'+body+'\n';
 const text=sec(1,'Government Code','For purposes of this section, “Controller” means the locally designated officer. The county Controller shall act.')+sec(2,'Government Code','The county Controller shall act.');const found=check(text);assert.equal(found.length,1);assert.ok(found[0].start>text.indexOf('SEC. 2.'));
});
