// Physical prime/quote-mark units need an explicit dimension continuation.
// Unqualified marks may be quotations, chemistry or angular notation instead.
// Recognize complete expressions; never protect an isolated trailing digit.
const number='\\d+(?:\\.\\d+)?',mark="(?:''|″|′|'|\")",boundary='(?<![\\p{L}\\p{N}_.,/⁄°:+−-])',space='\\s{0,300}';
const rangePattern=new RegExp(boundary+'('+number+')('+space+')('+mark+')?('+space+'(?:-|to|through|and|or)'+space+')('+number+')('+space+')('+mark+')','giu');
const heightPattern=new RegExp(boundary+'('+number+')('+space+")(['′])(\\s{0,300})("+number+')('+space+")(''|″|\")",'gu');
const singlePattern=new RegExp(boundary+'('+number+')('+space+')('+mark+')','gu');
const physicalTail=/^(?:\s*-\s*|\s+)(?:wide|long|tall|high|deep|thick|diameter|boards?|pipes?|plates?|panels?|strips?|openings?|tubes?|rods?|slabs?)\b(?=[\s.,;:!?)]|$)/i;
export function dimensionMarkParts(source){
 const parts=[];
 const add=(m,kind)=>{
  const start=m.index,end=start+m[0].length,tail=physicalTail.exec(source.slice(end,end+400));
  if(!tail||parts.some(p=>p.start<end&&p.end>start))return;
  const firstEnd=start+m[1].length,range=kind==='range',joinStart=range?firstEnd+m[2].length+(m[3]?.length||0):null;
  parts.push({start,end,evidenceEnd:end+tail[0].length,kind,first:m[1],firstGap:m[2],firstMark:m[3]||'',bridge:range?m[4]:null,joinStart,last:range?m[5]:null,lastGap:range?m[6]:null,lastMark:range?m[7]:null,missingFirstMark:range&&!m[3]});
 };
 for(const m of source.matchAll(rangePattern))add(m,'range');
 for(const m of source.matchAll(heightPattern))add(m,'height');
 for(const m of source.matchAll(singlePattern))add(m,'single');
 return parts.sort((a,b)=>a.start-b.start);
}
