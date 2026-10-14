import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app/app.mjs',import.meta.url),'utf8');
const start=app.indexOf('function nextIssue('),end=app.indexOf('\nfunction renderDictionary()',start);
function node(dataset={},classes=[]){
 const names=new Set(classes);
 return {dataset,classList:{add:x=>names.add(x),remove:x=>names.delete(x),contains:x=>names.has(x)}};
}
function navigate(issue,{chunk=null,sameMode=false}={}){
 const row=node({},['text-line']),contextNode=node({},['current-amendment-issue']),stale=node({},['current-amendment-issue']);
 const right={querySelector:()=>chunk?.classList.contains('current-amendment-issue')?chunk:null,querySelectorAll:s=>s==='.current-amendment-issue'?[stale,...(chunk?.classList.contains('current-amendment-issue')?[chunk]:[])]:chunk?[chunk]:[]};
 const bottom={querySelector:s=>s==='.current-amendment-issue'?contextNode:null,querySelectorAll:s=>s==='[data-issue-key]'?[]:[contextNode]};
 const status={},scrolls=[];
 const context=vm.createContext({$:id=>id==='right'?right:id==='amendment-results'?bottom:status,docs:[{},{}],amendmentsChecked:true,compared:true,amendmentIndex:0,reviewMode:sameMode?'amendments':'changes',activeAmendmentIssue:null,issueAmendments:()=>[issue],setReviewMode:()=>{},renderAmendments:()=>{},renderDocuments:()=>{if(chunk&&issue.currentEnd>issue.currentStart)chunk.classList.add('current-amendment-issue');},focusAmendment:()=>{},amendmentResults:[issue.r],locationTarget:()=>row,scrollInPane:(pane,target)=>scrolls.push({pane,target}),amendmentName:()=> 'Amendment 2'});
 vm.runInContext(app.slice(start,end)+';nextIssue();',context);
 return {row,chunk,stale,scrolls,status};
}
const review={r:{number:'2',status:'needs-review',readingWarnings:[{text:'(l)',confidence:58}],evidence:[{status:'implemented',discrepancies:[]}]},i:0,key:'0:review',currentStart:100,currentEnd:100};
test('OCR review with matching insertion scrolls to the source row without a yellow text or margin discrepancy',()=>{
 for(const sameMode of [false,true]){
  const result=navigate(review,{sameMode});
  assert.equal(result.row.classList.contains('current-amendment-issue'),false);
  assert.equal(result.scrolls[0].target,result.row);
  assert.match(result.status.textContent,/Issue 1 of 1/);
  if(sameMode)assert.equal(result.stale.classList.contains('current-amendment-issue'),false);
 }
});
test('genuine nonempty discrepancy keeps exact text highlighted and never colors its full source row',()=>{
 for(const sameMode of [false,true]){
  const chunk=node({start:'100',end:'103'}),result=navigate({...review,currentEnd:103,actualText:'bad'},{chunk,sameMode});
  assert.equal(chunk.classList.contains('current-amendment-issue'),true);
  assert.equal(result.row.classList.contains('current-amendment-issue'),false);
  assert.equal(result.scrolls[0].target,chunk);
 }
});
test('zero-width missing requested text retains its localized missing-text marker',()=>{
 const chunk=node({issueOffset:'100'},['current-amendment-issue']),result=navigate({...review,expectedText:'missing'},{chunk,sameMode:true});
 assert.equal(chunk.classList.contains('current-amendment-issue'),true);
 assert.equal(result.scrolls[0].target,chunk);
 assert.equal(result.row.classList.contains('current-amendment-issue'),false);
});
