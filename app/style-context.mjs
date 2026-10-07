export function styleSource(doc){
  const chars=doc.text.split('');
  for(const r of [...(doc.excluded||[]),...(doc.struck||[])])for(let i=r.start;i<r.end;i++)if(chars[i]!=='\n')chars[i]=' ';
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
  return {source,at,sentenceAt};
}
