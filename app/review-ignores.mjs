// Review-only state. Deliberately never persisted to disk or local storage.
export function createReviewIgnores(){
 const occurrences=new Set(),matches=new Set();
 const signature=(kind,issue,text)=>JSON.stringify([kind,kind==='spelling'?issue.word:(kind==='style'&&issue.text?issue.text:text.slice(issue.start,issue.end)).replace(/\s+/g,' ').trim(),kind==='grammar'?issue.message:kind==='style'?issue.rule:'',issue.suggestion||'']);
 const occurrence=(kind,issue,text)=>JSON.stringify([signature(kind,issue,text),issue.start,issue.end]);
 return {
  ignore(kind,issue,text,all=false){(all?matches:occurrences).add(all?signature(kind,issue,text):occurrence(kind,issue,text));},
  has(kind,issue,text){return occurrences.has(occurrence(kind,issue,text))||matches.has(signature(kind,issue,text));},
  matchingCount(kind,issue,issues,text){const key=signature(kind,issue,text);return issues.filter(candidate=>signature(kind,candidate,text)===key).length;},
  clear(){occurrences.clear();matches.clear();}
 };
}
