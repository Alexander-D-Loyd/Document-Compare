export function styleSource(doc){
  const chars=doc.text.split('');
  const runningHeads=doc.blocks.filter(b=>!b.margin&&/^Item\s+Amount$/.test(b.text.trim())&&b.formatting?.headerParts?.length>=2).map(b=>({start:b.start,end:b.end}));
  for(const r of [...(doc.excluded||[]),...(doc.struck||[]),...runningHeads])for(let i=r.start;i<r.end;i++)if(chars[i]!=='\n')chars[i]=' ';
  return chars.join('').replace(/[\u2010-\u2015]/g,'-');
}
export function styleContext(doc){
  const source=styleSource(doc),digest=/legislative\s+counsel[’']s\s+digest/i.exec(source),enact=/do\s+enact\s+as\s+follows\s*:/i.exec(source);
  const at=offset=>enact&&offset>=enact.index+enact[0].length?'Bill':digest&&offset>=digest.index&&(!enact||offset<enact.index)?'Digest':digest||enact?'Heading':'Bill';
  const sentences=[];let begin=enact?enact.index+enact[0].length:0;
  // Scan the digest independently and preserve original offsets throughout.
  let start=0;
  for(let i=0;i<source.length;i++){
    if(!/[.!?]/.test(source[i]))continue;
    if(source[i]==='.'&&((/\d/.test(source[i-1]||'')&&/\d/.test(source[i+1]||''))||/\b(?:SEC|Sec|No|Mr|Mrs|Ms|Dr|St|U|S|a|p|m|e|g|i)\.$/.test(source.slice(Math.max(0,i-10),i+1))))continue;
    sentences.push({start,end:i+1});start=i+1;
  }
  sentences.push({start,end:source.length});
  const sentenceAt=offset=>{
    let lo=0,hi=sentences.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(sentences[mid].end<=offset)lo=mid+1;else hi=mid;}
    const sentence=sentences[lo];return {...sentence,start:offset>=begin?Math.max(begin,sentence.start):sentence.start};
  };
  const budget=/\bBudget Act of\s+\d{4}/i.test(source);
  const tableRanges=doc.blocks.filter((b,index)=>{
    const body=source.slice(b.start+b.margin.length,b.end).trim();
    const next=doc.blocks[index+1],nextBody=next?source.slice(next.start+next.margin.length,next.end):'';
    const wrappedLabel=budget&&/\.{3,}/.test(nextBody)&&body.split(/\s+/).length<=12&&!/[.;:!?]/.test(body);
    return b.formatting?.headerGaps?.length>=2||/\.{3,}/.test(body)||wrappedLabel||(budget&&body&&/^[\d\s,$().+%—–-]+$/.test(body));
  });
  const tableAt=offset=>{let lo=0,hi=tableRanges.length;while(lo<hi){const mid=(lo+hi)>>1;if(tableRanges[mid].end<=offset)lo=mid+1;else hi=mid;}return !!tableRanges[lo]&&tableRanges[lo].start<=offset;};
  return {source,at,sentenceAt,tableAt};
}
