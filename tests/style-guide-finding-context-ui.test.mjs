import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app/app.mjs',import.meta.url),'utf8');
const renderSource=source.slice(source.indexOf('function renderGuideContext()'),source.indexOf('function selectGuide('));
function render(finding){
 const node=()=>({textContent:'',hidden:false,children:[],append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},replaceChildren(...items){this.children=items;},addEventListener(){}}),elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const context=vm.createContext({$,document:{createElement:node},guideContext:{message:'Review finding',references:[],...finding},STYLE_EXCEPTION_SUMMARY:'Exceptions apply.',STYLE_REVIEW_SCOPE:'Review the printed rule.',docs:[]});
 vm.runInContext(renderSource+';renderGuideContext();',context);
 const text=item=>[item.textContent,...item.children.map(text)].join('\n');
 return {root:$('guide-rules'),text:text($('guide-rules'))};
}

test('actual finding view renders introduced and grouped series and time possessive evidence without a missing DOM variable',()=>{
 for(const [key,evidence,label]of[
  ['introducedSeriesEvidence',{text:'The following duties: first; second.'},'Introduced Series Context'],
  ['groupedSeriesEvidence',{text:'A and B, and C and D.'},'Grouped Series Context'],
  ['timePossessiveEvidence',{text:'two years experience',head:{text:'experience'}},'Time Expression Context']
 ]){
  const result=render({[key]:evidence});assert.match(result.text,new RegExp(label));assert.ok(result.text.includes(evidence.text));assert.equal(result.root.children.length,2);
 }
});

test('actual entity finding view separates source date from import receipt and renders supplied strings only as text',()=>{
 const entitySource={datasetId:'a'.repeat(64),inputFile:'<sample>.json',sourceTitle:'<img src=x>',sourceAuthority:'Supplied authority',sourceCitation:'Source 2',asOfDate:null,importedAt:'2026-10-16T00:00:00.000Z'};
 const result=render({entitySource});assert.ok(result.text.includes('Selected entity authority'));assert.ok(result.text.includes('<img src=x>'));assert.ok(result.text.includes('Source as-of: unknown · Imported: 2026-10-16T00:00:00.000Z'));assert.ok(result.text.includes('<sample>.json · SHA-256: '+entitySource.datasetId));assert.equal(result.root.children.length,2);
 const bundled=render({entitySource:{file:'California Entities.docx',sha256:'b'.repeat(64)}});assert.match(bundled.text,/Bundled entity snapshot/);assert.match(bundled.text,/Source as-of: unknown/);assert.doesNotMatch(bundled.text,/Imported:/);
});

test('official-head finding uses its selected registry provenance and retains source person and role explanation',()=>{
 const result=render({officialHeadEvidence:{head:'director',entityName:'Department of Example Services',witnessKind:'Selected offline California Entities export',person:'Jane Doe',namePosition:'Head immediately precedes person',registry:{datasetId:'c'.repeat(64),sourceFile:'names.json',sourceSHA256:'c'.repeat(64),asOfDate:'2025-01-15',importedAt:'2026-10-16T00:00:00.000Z',sourceTitle:'Entity names',citation:'Row 3',limitations:'Exact names only.'}}});
 assert.match(result.text,/Source as-of: 2025-01-15/);assert.match(result.text,/Person-name cue: Jane Doe/);assert.match(result.text,/Head title to review: director/);assert.ok(result.text.includes('c'.repeat(64)));assert.equal(result.root.children.length,3);
});
