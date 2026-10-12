import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {dimensionMarkParts} from '../app/style-dimension-marks.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),find=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('complete physical prime/quote-mark units never receive isolated count-word replacements',()=>{
 for(const t of ['The panel is 2" wide.','The board is 3′ long.','The person is 5\' 6" tall.','The person is 5′ 6″ tall.','Use a 4 ″-diameter pipe.','The panel is 2.5″ thick.','Use a 4" board.','The range is 5′–7′ long.'])assert.equal(find(t).length,0,t);
});
test('single integer dimensions opening a sentence expand the complete number and unit',()=>{
 for(const [text,term,suggestion]of [['2" wide panels are required.','2"','Two inches'],['1′ long boards are required.','1′','One foot'],['3\' long boards are required.',"3'",'Three feet'],['1″ thick panels are required.','1″','One inch']]){const found=find(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[term,suggestion]],text);assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===21));assert.ok(found[0].references.some(r=>r.guideId==='gpo'&&r.rule==='12.16'));}
 assert.equal(find('The phrase "2\" wide" is literal.').some(i=>i.checkId==='opening-measures'),false);
});
test('missing initial range marks retain full values and source connectors under GPO10.6',()=>{
 for(const [term,suggestion]of [['5–7′','5′–7′'],['3 to 4"','3" to 4"'],['2 or 3″','2″ or 3″'],['3.5 through 4.5′','3.5′ through 4.5′']]){const text='The panels are '+term+' long.',found=find(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[term,suggestion]],text);assert.equal(found[0].rule,'10.6');assert.equal(found[0].references[0].guidePage,277);assert.equal(text.slice(found[0].start,found[0].end),term);assert.equal(find(text.replace(term,suggestion)).length,0);}
});
test('quoted labels, ordinary prose quantities and unknown mark meanings stay independently reviewed',()=>{
 for(const [text,term,suggestion]of [['The list contains 2 "wide" labels.','2','two'],['The list contains 4 parts.','4','four'],['There are 3 panels, each 2" wide.','3','three'],['The term is 2" unknown.','2','two']])assert.ok(find(text).some(i=>i.text===term&&i.suggestion===suggestion),text);
 assert.equal(dimensionMarkParts('The tag is 2"wide".' ).length,0);assert.equal(find('Use 3 inches of material.').length,0,'Written measure conflict remains excluded');
});
test('mixed-unit endpoints, angles, chemistry and incomplete expressions do not infer a repeated physical unit',()=>{
 for(const t of ['The range is 5′–7″ long.','The coordinates are 33°15′21″ N.','The compound is 1′,2′-biphenyl.','The range is 5 to 7".','The value is 1,005–7′ long.','The reading is 3.5.2" wide.'])assert.equal(find(t).some(i=>i.rule==='10.6'),false,t);
});
test('whole ranges cross trusted running heads without changing source offsets or quoted copy',()=>{
 const doc=makeDocument(['The width is 3 to','AB 1 — 2 —\n4″ wide.'],'Current'),head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};const found=jointStylisticIssues(doc,refs).filter(i=>i.rule==='10.6');assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('3'));assert.equal(found[0].end,doc.text.indexOf('4″')+2);assert.equal(found[0].suggestion,'3″ to 4″');head.formatting={};assert.equal(jointStylisticIssues(doc,refs).some(i=>i.rule==='10.6'),false);assert.equal(find('The phrase “5–7′ long” is literal.').length,0);assert.equal(find('The phrase "5–7′\nlong" is literal.').length,0);
});
test('removed dimension cues and table context do not establish a symbol correction',()=>{
 const doc=makeDocument(['The range is 5–7′ long.'],'Current'),start=doc.text.indexOf('long');doc.struck=[{start,end:start+4}];assert.equal(jointStylisticIssues(doc,refs).some(i=>i.rule==='10.6'),false);const table=makeDocument(['The range is 5–7′\nlong.'],'Current');table.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(jointStylisticIssues(table,refs).some(i=>i.rule==='10.6'),false);
});
