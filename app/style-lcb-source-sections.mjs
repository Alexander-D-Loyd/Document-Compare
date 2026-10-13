// Source-page sections are separate from detector coverage. Restarted item
// numbers cannot replace an earlier prescription with the same number.
export function lcbSourceItems(page){
 const source=page.text,markers=[];
 if(page.page===2){const heading=/(?:^|\n)[ \t]*Some commonly used words shown in office style\b[^\n]*/u.exec(source);if(heading)markers.push({start:heading.index,section:'Office Preferences'});}
 if(page.page===21)for(const m of source.matchAll(/(?:^|\n)[ \t]*(Bill|Digest|Opinions and Cover Letters|Resolutions)[ \t]*(?=\n|$)/gu))markers.push({start:m.index,section:m[1]});
 const sections=[{start:0,section:page.page===21?'General':''},...markers].sort((a,b)=>a.start-b.start),out=[];
 for(let n=0;n<sections.length;n++){
  const section=sections[n],end=sections[n+1]?.start??source.length,body=source.slice(section.start,end),numbered=[...body.matchAll(/(?:^|\n)[ \t]*(\d+)\.[ \t]+/gu)];
  if(numbered.length)for(let i=0;i<numbered.length;i++){const start=section.start+numbered[i].index,itemEnd=section.start+(numbered[i+1]?.index??body.length);out.push({number:numbered[i][1],section:section.section,start,end:itemEnd,text:source.slice(start,itemEnd).replace(/\s+/gu,' ').trim()});}
  else if(['Opinions and Cover Letters','Resolutions'].includes(section.section))out.push({number:null,section:section.section,start:section.start,end,text:body.replace(/\s+/gu,' ').trim()});
 }
 return out;
}

export const LCB_OFFICE_PREFERENCE_SCOPES={
 '1':'The explicit an historical variant is checked against the LCB a historical preference. Complete source boundaries, quotes, names, strikes and tables retain their safeguards. Other h-word pronunciation and article choices remain contextual.',
 '2':'The explicit advisor/advisors variants are checked against adviser/advisers in eligible intact prose, preserving an adjoining possessive apostrophe. Complete original word boundaries reject damaged suffixes and combining marks. Literal names and quotations are protected. These regular noun plurals extend only this listed preference; full ordered dictionary authority is not supplied by the office example.',
 '3':'Ensure versus assure receives precise checks only with the supported complete outcome object and grammatical cues, and conditional meaning review elsewhere. Reassurance of a person remains a different sense. The source alternatives do not justify replacing every assure occurrence.',
 '4':'The explicit judgement/judgements variants are checked against judgment/judgments in eligible intact prose, preserving an adjoining possessive apostrophe. Complete original word boundaries reject damaged suffixes and combining marks. Unknown derivatives such as judgemental, literal names, quotations, headings, tables and excluded source content remain protected.',
 '5':'The explicit marshall variant is checked against marshal in eligible intact prose. Authentic personal/entity names and literal quotations remain protected.',
 '6':'The explicit monies variant is checked against moneys in eligible intact prose. Literal quotations, names, headings, tables and uncertain source content remain protected.',
 '7':'The explicit wilful variant is checked against willful in eligible intact prose. Literal quotations, names, headings, tables and uncertain source content remain protected.'
};
