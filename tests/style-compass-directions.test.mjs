import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {stylisticIssues} from '../app/gpo-style.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>jointStylisticIssues(d,refs).filter(i=>i.rule==='6.14'),doc=t=>makeDocument([t],'Current');
test('source-listed three-point compass spellings select the whole direction',()=>{
 for(const [text,raw,preferred]of [['The road turns north north-east.','north north-east','north-northeast'],['The channel flows south south west.','south south west','south-southwest'],['A northnorth-east bearing is recorded.','northnorth-east','north-northeast'],['North north east direction applies.','North north east','North-northeast']]){
  const d=doc(text),issues=check(d);assert.equal(issues.length,1,text);assert.equal(issues[0].text,raw);assert.equal(issues[0].suggestion,preferred);assert.equal(issues[0].guidePage,114);assert.equal(issues[0].start,text.indexOf(raw));assert.equal(issues[0].end,text.indexOf(raw)+raw.length);
  assert.equal(check(doc(text.replace(raw,preferred))).length,0);assert.equal(stylisticIssues(d,refs.gpo).filter(i=>i.rule==='6.14').length,1);
 }
});
test('finite eight three-point combinations follow the printed compounding principle',()=>{
 for(const preferred of ['north-northeast','east-northeast','east-southeast','south-southeast','south-southwest','west-southwest','west-northwest','north-northwest']){
  const first=preferred.split('-')[0],second=preferred.split('-')[1],open=first+' '+second,text='The '+open+' bearing is recorded.',found=check(doc(text));assert.equal(found.length,1,text);assert.equal(found[0].suggestion,preferred);assert.equal(found[0].text,open);assert.equal(check(doc(text.replace(open,preferred))).length,0);
 }
});
test('correct three-point directions and ambiguous or named uses do not fall back to suffix-only corrections',()=>{
 for(const text of ['The north-northeast bearing applies.','The south-southwest direction applies.','The North North-East Company acts.','The North-North-East Company acts.','The literal “north north-east” appears.','A north north-east phrase appears.','NORTH NORTH EAST HEADING','North East-South Company acts.','A northnortheastward route appears.'])assert.equal(check(doc(text)).length,0,text);
});
test('complete direction and cue evidence cannot cross source removals or table rows',()=>{
 for(const [text,word]of [['The road turns north former northeast.','former'],['The road turns former north northeast.','former'],['The north northeast former bearing applies.','former']]){const d=doc(text),start=text.indexOf(word);d.struck=[{start,end:start+word.length}];assert.equal(check(d).length,0,text);}
 const table=doc('The north northeast\nbearing................ 100');assert.equal(check(table).length,0);
});
test('whole compass expressions retain page-divided body offsets and protect unknown ignored content',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 The road turns north','AB 9999 — 2 —\nline 1 north-east.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const issues=check(d);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'north-northeast');assert.equal(issues[0].start,d.text.indexOf('north'));assert.equal(issues[0].end,d.text.indexOf('north-east')+10);assert.equal(issues[0].text,d.text.slice(issues[0].start,issues[0].end));
 const unknown=doc('The road turns north\nunknown marker\nnorth-east.'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(check(unknown).length,0);
});
test('wrapped literal directions stay literal while independent numeral checking continues',()=>{
 const d=doc('The literal "The road turns north\nnorth-east" remains. Funds support 1 claimant.');assert.equal(check(d).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='one'));
});
test('existing two-point compass corrections remain separate from a genuine three-point correction',()=>{
 const d=doc('The north-east corner and north-west corner bound a north northeast bearing.');assert.deepEqual(check(d).map(i=>i.suggestion),['northeast','northwest','north-northeast']);
});

test('an unfamiliar extra cardinal point cannot become a partial three-point correction',()=>{
 for(const text of ['A north north north east bearing applies.','A south north north-east bearing applies.','An east south south west direction applies.','A northnorth-east-east bearing applies.'])assert.equal(check(doc(text)).length,0,text);
 const d=doc('The north northeast bearing and south southwest bearing apply.');assert.deepEqual(check(d).map(i=>i.suggestion),['north-northeast','south-southwest']);
});
