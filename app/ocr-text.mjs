const connectors=new Set('a an the and or of to in on at by for from with under over after before this that these those is are was were shall must may be not'.split(' '));
export function ocrDictionary(text){return new Set([...connectors,...text.split(/\r?\n/).slice(1).map(line=>line.split('/')[0].trim().toLowerCase()).filter(word=>/^[a-z]+$/.test(word))]);}
export function repairOcrSpacing(text,words){
 return text.replace(/\b[A-Za-z]{4,}\b/g,word=>{
  const lower=word.toLowerCase();if(words.has(lower))return word;
  const splits=[];
  for(let i=1;i<lower.length;i++){
   const first=lower.slice(0,i),last=lower.slice(i);
   if(words.has(first)&&words.has(last)&&(first.length>=3||connectors.has(first))&&(last.length>=3||connectors.has(last))&&(connectors.has(first)||connectors.has(last)))splits.push(i);
  }
  return splits.length===1?word.slice(0,splits[0])+' '+word.slice(splits[0]):word;
 });
}
export function isOcrStyle(style){return /GlyphLessFont/i.test(style?.name||'')||(style?.fontFamily==='sans-serif'&&style?.ascent===1&&Math.abs(style?.descent||0)<.01);}

// Repair OCR only in editorial directives; quoted payload wording stays literal.
export function repairOcrDirective(styled){
 let text=typeof styled==='string'?styled:styled.text;
 let strikes=typeof styled==='string'?[]:styled.strikes.map(r=>({...r}));
 const replace=(pattern,replacement)=>{
  const edits=[...text.matchAll(pattern)].map(m=>({start:m.index,end:m.index+m[0].length,value:replacement(...m)}));
  for(const edit of edits.reverse()){
   const delta=edit.value.length-(edit.end-edit.start);
   const map=offset=>offset<=edit.start?offset:offset>=edit.end?offset+delta:edit.start+Math.min(offset-edit.start,edit.value.length);
   strikes=strikes.map(r=>({start:map(r.start),end:map(r.end)}));
   text=text.slice(0,edit.start)+edit.value+text.slice(edit.end);
  }
 };
 replace(/\b(On)page(?=\s*\d)/gi,m=>m.replace(/page/i,' page'));
 replace(/\b(page|line)(?=\d)/gi,m=>m+' ');
 replace(/\binline(?=\s*\d)/gi,()=> 'in line');
 replace(/\blines?\s+[|Il](?=\s+(?:to|through|and)\s+\d)/g,m=>m.slice(0,-1)+'1');
 // A closing apostrophe before the next deletion clause is an OCR delimiter,
 // while apostrophes inside the quoted wording are preserved.
 replace(/“([^“”\n]*)[’'](?=\s*,\s*strike\s+out\b)/g,(_,body)=>'“'+body+'”');
 // Some OCR layers lose the outer closing quote around a quoted definition.
 replace(/“([^“”\n]*“[^“”\n]*”)(?=\s*and\s*insert\b)/g,(_,body)=>'“'+body+'”');
 replace(/([,;”])(?=[A-Za-z])/g,m=>m+' ');
 return typeof styled==='string'?text:{text,strikes};
}
export function repairOcrInstructions(text){
 return text.replace(/((?:^|\n)\s*Amendment\s*\d+\s*\n)([\s\S]*?)(?=(?:\n\s*Amendment\s*\d+\s*(?:\n|$))|$)/gi,(_,heading,body)=>{
  const marker=/\b(?:and\s*)?insert\s*:\s*/i.exec(body),end=marker?marker.index+marker[0].length:body.length;
  return heading+repairOcrDirective(body.slice(0,end))+body.slice(end);
 });
}
