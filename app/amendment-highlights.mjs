export function amendmentDeletionRanges(doc,result,side){
  if(!result)return [];
  return result.evidence.flatMap((e,i)=>{
    const ranges=side?e.currentDeletionRanges||[]:[{start:e.previousOffset,end:e.previousEndOffset}];
    return ranges.flatMap(range=>doc.blocks.filter(b=>!b.ignored&&(b.margin||result.title||result.heading)&&b.start<range.end&&b.end>range.start).map(b=>({
      start:Math.max(range.start,b.start+b.margin.length),end:Math.min(range.end,b.end),id:`A${result.number}.${i+1}`
    })).filter(r=>r.end>r.start));
  });
}
