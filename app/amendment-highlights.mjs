// Digest deltas use only inline removal/addition colors. Regular instructional
// amendments keep their selected evidence contours.
export function amendmentOutlineGroup(result,rangeId){
 return result?.digest?null:rangeId;
}
export function amendmentDeletionRanges(doc,result,side){
  if(!result)return [];
  return result.evidence.flatMap((e,i)=>{
    const ranges=side?e.currentDeletionRanges||[]:e.previousDeletionRanges??[{start:e.previousOffset,end:e.previousEndOffset}];
    return ranges.flatMap((range,n)=>doc.blocks.filter(b=>!b.ignored&&(b.margin||result.title||result.heading||result.digest)&&b.start<range.end&&b.end>range.start).map(b=>({
      start:Math.max(range.start,b.start+b.margin.length),end:Math.min(range.end,b.end),id:`A${result.number}.${i+1}${result.digest?'.D'+(n+1):''}`
    })).filter(r=>r.end>r.start));
  });
}
export function amendmentAdditionRanges(result){
 return result?.evidence.flatMap((e,i)=>(e.currentAdditionRanges??[{start:e.currentOffset,end:e.currentEndOffset}]).map((r,n)=>({...r,id:`A${result.number}.${i+1}${result.digest?'.C'+(n+1):''}`,directive:result.directive})))||[];
}
export function amendmentReviewRanges(result){
 return result?.evidence.flatMap((e,i)=>result.digest?[...(e.currentAdditionRanges||[]),...(e.differenceRanges||[])].map((r,n)=>({...e,currentOffset:r.start,currentEndOffset:r.end,id:`A${result.number}.${i+1}.C${n+1}`})):[{...e,id:`A${result.number}.${i+1}`}])||[];
}
