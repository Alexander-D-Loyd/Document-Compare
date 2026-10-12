const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const divided=new RegExp(String.raw`\b(${months.join('|')})\s+([1-3])\s+([0-9]),\s+([1-9][0-9]{3})(?![\p{L}\p{N}_])`,'gu');
// A complete calendar date establishes a digit role. Preserve the PDF text
// and report one potential spacing correction, never an isolated 0 -> zero.
// Do not invent dates from invalid days, bare numbers, or unknown month names.
export function dividedCalendarDates(source){
 const parts=[];
 for(const m of source.matchAll(divided)){
  const year=Number(m[4]),month=months.indexOf(m[1]),day=Number(m[2]+m[3]);
  const leap=year%4===0&&(year%100!==0||year%400===0),limit=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month];
  if(day>limit)continue;
  parts.push({start:m.index,end:m.index+m[0].length,text:m[0],suggestion:m[1]+' '+day+', '+m[4]});
 }
 return parts;
}
