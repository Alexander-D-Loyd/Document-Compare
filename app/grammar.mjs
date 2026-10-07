// Conservative offline English grammar rules. Offsets always refer to source text.
export function grammarIssues(doc) {
  const blocked=[...(doc.excluded||[]),...(doc.struck||[])];
  const text=doc.text.split('');
  for(const r of blocked)for(let i=r.start;i<r.end;i++)if(text[i]!=='\n')text[i]=' ';
  const source=text.join(''),issues=[];
  const add=(start,end,message,suggestion)=>{
    if(!blocked.some(r=>r.start<end&&r.end>start))issues.push({start,end,message,suggestion});
  };
  // Cross-line whitespace is intentional: wrapping is not a grammar error.
  for(const m of source.matchAll(/\b([A-Za-z]+)\s+\1\b/gi)){
    if(!['had','that'].includes(m[1].toLowerCase()))add(m.index,m.index+m[0].length,'Repeated word',m[1]);
  }
  for(const m of source.matchAll(/\b(a|an)\s+([A-Za-z]+)\b/gi)){
    const word=m[2].toLowerCase();
    // Avoid acronyms and pronunciation exceptions such as “a university”.
    if(m[2]===m[2].toUpperCase()||/^(uni|use|user|usual|euro|one|once|hour|honest|honor|heir|herb)/.test(word))continue;
    const wanted=/^[aeiou]/.test(word)?'an':'a';
    if(m[1].toLowerCase()!==wanted)add(m.index,m.index+m[0].length,'Check the indefinite article',wanted+' '+m[2]);
  }
  const patterns=[
    [/\b(I)\s+(is|are)\b/gi,'Subject–verb agreement','I am'],
    [/\b(he|she|it)\s+(are|have)\b/gi,'Subject–verb agreement',m=>m[1]+' '+(m[2].toLowerCase()==='are'?'is':'has')],
    [/\b(we|they|you)\s+(is|has)\b/gi,'Subject–verb agreement',m=>m[1]+' '+(m[2].toLowerCase()==='is'?'are':'have')],
    [/\b(could|would|should|must|might)\s+of\b/gi,'Use “have” after this modal verb',m=>m[1]+' have']
  ];
  for(const [pattern,message,suggestion] of patterns)for(const m of source.matchAll(pattern))add(m.index,m.index+m[0].length,message,typeof suggestion==='function'?suggestion(m):suggestion);
  return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
