import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {numeralIssues}from '../app/style-numerals.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {correlativeSpreads}from '../app/style-correlative-spreads.mjs';import {styleContext}from '../app/style-context.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),check=(text,doc=makeDocument([text],'Current'))=>jointStylisticIssues(doc,refs).filter(i=>['numerals','compound-cardinals'].includes(i.checkId));
test('all teens and canonical larger peers assign figures to the complete shared-head spread',()=>{
 for(const peer of ['thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','one hundred','one thousand'])for(const head of ['years','permits']){const text='The term includes one or '+peer+' '+head+'.',found=check(text);assert.deepEqual(found.map(i=>i.suggestion),['1',String(peer==='one hundred'?100:peer==='one thousand'?1000:13+['thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'].indexOf(peer))]);assert.ok(found.every(i=>text.slice(i.start,i.end)===i.text));}
});
test('a correct small figure is retained rather than incorrectly spelled out beside a written large peer',()=>{
 for(const peer of ['thirteen','one hundred','one hundred and two']){const found=check('The term is 1 or '+peer+' years.');assert.equal(found.length,1);assert.equal(found[0].text,peer);}
});
test('complete scale-and-remainder peers retain their own correction and establish the small count relationship',()=>{
 const found=check('The term is two or one hundred and two years.');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['two','2'],['one hundred and two','102']]);
});
test('every member remains checked beyond the former character and item limits',()=>{
 for(const size of [40,750]){const text='The term is '+Array(size).fill('one').join(', ')+', or 13 years.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=numeralIssues(doc,refs).filter(i=>!i.conflict);assert.equal(found.length,size);assert.ok(found.every(i=>i.text==='one'&&i.suggestion==='1'&&doc.text.slice(i.start,i.end)==='one'));assert.equal(JSON.stringify(doc),before);}
});
test('all explicit spread connectors and qualified final day units retain the full count scope',()=>{
 for(const link of [' or ',' and ',' to ',' through ',', ',', or '])assert.deepEqual(check('The term is one'+link+'thirteen calendar years.').map(i=>i.suggestion),['1','13']);
});
test('small-figure peers do not incorrectly become a threshold of ten',()=>{
 for(let n=0;n<=9;n++){const found=check('The office grants one or '+n+' permits.');assert.ok(!found.some(i=>i.text==='one'&&i.suggestion==='1'));if(n>0)assert.ok(found.some(i=>i.text===String(n)));}
});
test('exact arbitrarily large integer peers retain source digits and do not round the threshold witness',()=>{
 const text='The office grants two or 9007199254740993 permits.';assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['two','2']]);
});
test('distinct units and identifier lists leave neighboring quantities independently checkable',()=>{
 assert.deepEqual(check('The office grants 2 permits or 13 years.').map(i=>[i.text,i.suggestion]),[['2','two']]);
 assert.deepEqual(check('The board includes 4 veterinarians under Article 4, 1 technician under Section 1, and 3 members under Sections 3 and 4.').map(i=>[i.text,i.suggestion]),[['4','four'],['1','one'],['3','three']]);
});
test('sentence-opening and Digest related counts follow distinct LCB forms',()=>{
 assert.deepEqual(check('One or thirteen years is allowed.').filter(i=>i.text==='thirteen').map(i=>i.suggestion),['13']);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThe term is one or 13 years.').filter(i=>i.text==='one').length,0,'LCB Digest retains its printed one exception');
});
test('every interior source strike or unknown exclusion prevents a fabricated shared-unit relationship',()=>{
 const text='The term is one or thirteen years.';for(const field of ['struck','excluded'])for(let at=text.indexOf('one');at<text.indexOf('years')+5;at++){const doc=makeDocument([text],'Current');doc[field].push({start:at,end:at+1});assert.ok(!numeralIssues(doc,refs).some(i=>i.text==='one'&&i.suggestion==='1'),field+' '+at);}
});
test('quotations and tables do not supply a hidden shared quantity relationship',()=>{
 for(const text of ['The office quotes “one or thirteen years”.','The term is one or thirteen years........20.'])assert.ok(!check(text).some(i=>i.text==='one'));
});
test('the complete shared-head proof keeps every original quantity and identifies an intact known interior header',()=>{
 const doc=makeDocument(['The term is one or','AB 192 — 2 —\nline 1 thirteen years.'],'Current'),h=doc.blocks.find(b=>b.text==='AB 192 — 2 —');h.formatting={headerParts:[{start:0,end:h.text.length,anchor:'left'}]};const found=check('',doc);assert.deepEqual(found.map(i=>i.suggestion),['1','13']);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);
 const plain=makeDocument(['The term is one or thirteen years.'],'Current'),ctx=styleContext(plain),start=plain.text.indexOf('one'),peer=plain.text.indexOf('thirteen'),proof=correlativeSpreads(plain,ctx,[{start,end:start+3,text:'one',figure:false,ordinal:false,value:1},{start:peer,end:peer+8,text:'thirteen',figure:false,ordinal:false,value:13}]);assert.equal(proof.groups.length,1);assert.ok(proof.groups[0].atLeastTen);for(const m of proof.groups[0].members)assert.equal(plain.text.slice(m.start,m.end),m.sourceText);
});
