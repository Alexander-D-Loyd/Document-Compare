import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {makeDocument}from '../app/core.mjs';import {verifyAmendments}from '../app/amendments.mjs';import {amendmentName,digestBodyRange}from '../app/digest-amendment.mjs';import {amendmentDeletionRanges,amendmentAdditionRanges,amendmentReviewRanges,amendmentOutlineGroup}from '../app/amendment-highlights.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/legislative-stabilization-source-excerpts.json',import.meta.url))),app=fs.readFileSync(new URL('../app/app.mjs',import.meta.url),'utf8'),a=app.indexOf('function renderDocument('),b=app.indexOf('\nfunction renderDocuments()',a),renderSource=app.slice(a,b),source=id=>{const e=fixture.entries.find(e=>e.id===id);return makeDocument(e.pages.map(p=>p.text),e.sourcePDF.name,e.pages.map(p=>p.struck),structuredClone(e.pages.map(p=>p.formatting)));};
// A small element tree executes the actual production renderer. It records
// classes, groups and exact text without pretending to measure browser pixels.
class Element{
 constructor(tag){this.tag=tag;this.className='';this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.attributes={};this.children=[];this.ownText='';this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},contains:name=>this.className.split(/\s+/).includes(name)};}
 get textContent(){return this.ownText+this.children.map(c=>c.textContent).join('');}set textContent(v){this.ownText=String(v);this.children=[];}get childNodes(){return this.children;}get lastElementChild(){return this.children.at(-1);}
 append(...els){for(const el of els){if(el.parent)el.parent.children=el.parent.children.filter(e=>e!==el);el.parent=this;this.children.push(el);}}replaceChildren(...els){this.children=[];this.ownText='';this.append(...els);}setAttribute(k,v){this.attributes[k]=v;}
}
const walk=e=>[e,...e.children.flatMap(walk)];
function rendered(doc,result,side){const root=new Element('main'),context=vm.createContext({document:{createElement:tag=>new Element(tag)},sideRanges:()=>[],reviewMode:'amendments',hasAmendments:()=>true,amendmentsChecked:true,amendmentResults:[result],amendmentIndex:0,activeAmendmentIssue:null,grammarIssues:[],styleIssues:[],styleIndex:-1,amendmentDeletionRanges,amendmentAdditionRanges,amendmentReviewRanges,amendmentOutlineGroup,amendmentName});vm.runInContext(renderSource+';globalThis.render=renderDocument;',context);context.render(root,doc,[],side);return walk(root);}
test('actual AB224 Digest keeps exact delta colors without selection contours or insertion badges',()=>{
 const old=source('ab224-previous'),now=source('ab224-current'),upload=source('ab224-digest'),before=JSON.stringify([old,now,upload]),result=verifyAmendments('',old,now,{},upload)[0];assert.equal(amendmentName(result),'Digest');assert.equal(result.status,'implemented');
 for(const [doc,side]of [[old,0],[now,1]]){const tree=rendered(doc,result,side);assert.equal(tree.filter(e=>e.classList.contains('amendment-selection')).length,0);assert.equal(tree.filter(e=>e.classList.contains('amendment-insertion')).length,0);
  const colored=tree.filter(e=>e.classList.contains(side?'amendment-added':'amendment-deletion'));assert.ok(colored.length);const ranges=side?amendmentAdditionRanges(result):amendmentDeletionRanges(doc,result,side);for(const e of colored)assert.ok(ranges.some(r=>r.start<=Number(e.dataset.start)&&r.end>=Number(e.dataset.end)));for(const e of tree.filter(e=>e.classList.contains('previous-source-struck')))assert.equal(e.classList.contains('amendment-deletion'),false,'Source strikeouts must not acquire a second deletion decoration');
 }
 assert.equal(JSON.stringify([old,now,upload]),before,'Rendering must preserve native PDF data and delta verification');
});
test('actual AB224 Current Digest colors every physically crossed-out fragment including repeated Existing law and health words',()=>{
 const old=source('ab224-previous'),now=source('ab224-current'),upload=source('ab224-digest'),before=JSON.stringify([old,now,upload]),result=verifyAmendments('',old,now,{},upload)[0],range=digestBodyRange(now),tree=rendered(now,result,1),chunks=tree.filter(e=>Number(e.dataset.start)>=range.start&&Number(e.dataset.end)<=range.end&&e.classList.contains('pdf-struck'));
 assert.equal(result.status,'implemented');assert.ok(chunks.length);assert.ok(chunks.some(e=>e.textContent.includes('Existing')));for(const e of chunks)assert.equal(e.classList.contains('amendment-deletion'),true,e.textContent);
 const copiedActive=tree.filter(e=>e.textContent==='Existing'&&!e.classList.contains('pdf-struck')&&e.dataset.start!==undefined);assert.ok(copiedActive.length);assert.ok(copiedActive.every(e=>!e.classList.contains('amendment-deletion')));
 assert.equal(tree.filter(e=>e.classList.contains('amendment-selection')||e.classList.contains('amendment-insertion')).length,0);assert.equal(JSON.stringify([old,now,upload]),before);
});
test('regular instructions retain their existing evidence groups and exact changed text',()=>{
 const old=makeDocument(['line 1 The office funds ten programs.'],'old'),now=makeDocument(['line 1 The office funds twelve programs.'],'current'),result=verifyAmendments('Amendment 1\nOn page 1, in line 1, strike out “ten” and insert:\ntwelve',old,now)[0];assert.equal(result.status,'implemented');for(const side of [0,1]){const doc=side?now:old,tree=rendered(doc,result,side),selected=tree.filter(e=>e.dataset.selectionText==='true');assert.equal(selected.map(e=>e.textContent).join(''),side?'twelve':'ten');assert.ok(selected.every(e=>e.dataset.outlineGroup==='A1.1'));}assert.equal(amendmentOutlineGroup(result,'A1.2'),'A1.2');
});
test('a final-period insertion renders the ordinary after-line arrow and exact Current insertion selection',()=>{
 const old=makeDocument(['line 1 Existing law applies.\n- 0 -'],'Previous'),now=makeDocument(['line 1 Existing law applies.\nline 2 SEC. 2. New law.\n- 0 -'],'Current'),result=verifyAmendments('On page 1, in line 1, after the period, insert:\nSEC. 2. New law.',old,now)[0];assert.equal(result.status,'implemented');
 const previous=rendered(old,result,0),current=rendered(now,result,1),arrows=previous.filter(e=>e.classList.contains('amendment-after-arrow'));assert.equal(arrows.length,1);assert.equal(arrows[0].textContent,'➜');
 assert.equal(current.filter(e=>e.dataset.selectionText==='true').map(e=>e.textContent).join(''),'SEC. 2. New law.');assert.ok(current.every(e=>!e.classList.contains('current-amendment-issue')));
});

test('Digest discrepancies and missing wording remain visible without outlines or plus badges',()=>{
 const heading='LEGISLATIVE COUNSEL’S DIGEST',enact='The people of the State of California do enact as follows:',bill=text=>makeDocument([heading+'\n'+text+'\n'+enact+'\nline 1 Existing body.'],'bill');
 const old=bill('Existing law funds ten programs.'),upload=makeDocument(['Existing law funds twelve programs.'],'Digest');
 for(const now of [old,bill('Existing law funds thirteen programs.')]){
  const result=verifyAmendments('',old,now,{},upload)[0];assert.notEqual(result.status,'implemented');
  for(const [doc,side] of [[old,0],[now,1]]){const tree=rendered(doc,result,side);assert.equal(tree.filter(e=>e.classList.contains('amendment-selection')).length,0);assert.equal(tree.filter(e=>e.classList.contains('amendment-insertion')).length,0);}
  const current=rendered(now,result,1);assert.ok(current.some(e=>e.classList.contains('amendment-missing')||e.classList.contains('amendment-unexpected')),'The discrepancy itself stays visible');
 }
});

test('Digest redraw removes old contours while ordinary amendment outline routing stays available',()=>{
 const start=app.indexOf('function drawReviewOutlines(){'),end=app.indexOf("\nwindow.addEventListener('resize',drawReviewOutlines);",start),draw=app.slice(start,end);let removed=0,selectionQueries=0;
 const root={dataset:{},scrollLeft:0,scrollTop:0,querySelector:()=>null,querySelectorAll:selector=>{if(selector==='.review-outline')return [{remove(){removed++;}}];selectionQueries++;return [];},getBoundingClientRect:()=>({left:0,top:0})};
 for(const digest of [true,false]){const before=selectionQueries,context=vm.createContext({$:()=>root,reviewMode:'amendments',amendmentResults:[{digest,insertText:'replacement'}],amendmentIndex:0});vm.runInContext(draw+';drawReviewOutlines();',context);assert.equal(selectionQueries-before,digest?0:2);}
 assert.equal(removed,4);
});
