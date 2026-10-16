// Review-only state. Deliberately never persisted to disk or local storage.
export function createReviewIgnores(){
 const occurrences=new Set(),matches=new Set(),history=[];
 const signature=(kind,issue,text)=>JSON.stringify([kind,kind==='spelling'?issue.word:(kind==='style'&&(issue.matchText||issue.text)?issue.matchText||issue.text:issue.matchText||text.slice(issue.start,issue.end)).replace(/\s+/g,' ').trim(),kind==='grammar'?issue.message:kind==='style'?issue.rule:'',issue.suggestion||'']);
 const occurrence=(kind,issue,text)=>JSON.stringify([signature(kind,issue,text),issue.start,issue.end]);
 return {
  ignore(kind,issue,text,all=false){const set=all?matches:occurrences,key=all?signature(kind,issue,text):occurrence(kind,issue,text);if(set.has(key))return;set.add(key);history.push({kind,all,key});},
  get canUndo(){return history.length>0;},
  undo(){const action=history.pop();if(!action)return null;(action.all?matches:occurrences).delete(action.key);return {kind:action.kind,all:action.all};},
  has(kind,issue,text){return occurrences.has(occurrence(kind,issue,text))||matches.has(signature(kind,issue,text));},
  matchingCount(kind,issue,issues,text){const key=signature(kind,issue,text);return issues.filter(candidate=>signature(kind,candidate,text)===key).length;},
  clearKind(kind){
   for(const key of matches)if(JSON.parse(key)[0]===kind)matches.delete(key);
   for(const key of occurrences)if(JSON.parse(JSON.parse(key)[0])[0]===kind)occurrences.delete(key);
   for(let n=history.length-1;n>=0;n--)if(history[n].kind===kind)history.splice(n,1);
  },
  clear(){occurrences.clear();matches.clear();history.length=0;}
 };
}
