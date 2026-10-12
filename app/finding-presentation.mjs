// Display and Ignore All identity must not contain printed margin labels.
// Physical source offsets and PDF highlight geometry remain untouched.
export function isStructuralExclusion(doc,r){
 let lo=0,hi=doc.blocks.length;while(lo<hi){const mid=(lo+hi)>>1;if(doc.blocks[mid].end<=r.start)lo=mid+1;else hi=mid;}
 const b=doc.blocks[lo];return !!b&&((b.margin&&r.start>=b.start&&r.end<=b.start+b.margin.length)||((b.runningHead||b.layoutLabel||b.ignored&&b.formatting?.headerParts?.length)&&r.start===b.start&&r.end===b.end));
}
export function languageRangeGuard(doc){
 const excluded=doc.excluded||[],structural=excluded.filter(r=>isStructuralExclusion(doc,r)),blocked=[...(doc.struck||[]),...excluded.filter(r=>!isStructuralExclusion(doc,r))];
 return (start,end)=>blocked.some(r=>r.start<end&&r.end>start)||structural.some(r=>r.start<=start&&r.end>start||r.start<end&&r.end>=end);
}
export function findingText(doc,issue){
 if(typeof issue.matchText==='string'&&issue.matchText.trim())return issue.matchText.replace(/\s+/gu,' ').trim();
 const {start,end}=issue;if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>doc.text.length||end<=start)return issue.text||'';
 const remove=(doc.excluded||[]).filter(r=>r.start>=start&&r.end<=end&&isStructuralExclusion(doc,r)).map(r=>({...r}));
 for(const word of issue.sourceWordDivisions||[])for(let n=0;n<word.spans.length-1;n++)remove.push({start:word.spans[n].end,end:word.spans[n+1].start});
 const joined=remove.filter(r=>r.start>=start&&r.end<=end).sort((a,b)=>a.start-b.start),pieces=[];let cursor=start;
 for(const r of joined){if(r.start>cursor)pieces.push(doc.text.slice(cursor,r.start));cursor=Math.max(cursor,r.end);}
 pieces.push(doc.text.slice(cursor,end));return pieces.join('').replace(/\s+/gu,' ').trim();
}
export function consolidateStyleFindings(issues){
 const out=[];
 for(const issue of [...issues].sort((a,b)=>a.start-b.start||b.end-a.end)){
  // A nested phrase or a different grammatical-role question is independent
  // evidence. Only identical questions on the identical phrase can be folded.
  const sameQuestion=other=>other.checkId==='lcb-general-unit-modifier-review'&&issue.checkId===other.checkId&&other.reviewSuggested&&issue.reviewSuggested&&other.suggestion===null&&issue.suggestion===null&&typeof other.head==='string'&&other.head===issue.head&&other.reviewVariant===issue.reviewVariant&&Number.isInteger(other.evidenceStart)&&other.evidenceStart===issue.evidenceStart&&other.evidenceEnd===issue.evidenceEnd&&other.start===issue.start&&other.end===issue.end;
  const existing=out.find(sameQuestion);
  if(!existing){out.push({...issue});continue;}
  existing.coveredReviewVariants=[...new Set([...(existing.coveredReviewVariants||[existing.reviewVariant]),issue.reviewVariant])];
  existing.references=[...(existing.references||[]),...(issue.references||[]).filter(r=>!(existing.references||[]).some(e=>e.guideId===r.guideId&&e.rule===r.rule&&e.guidePage===r.guidePage))];
 }
 return out.sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id}));
}
