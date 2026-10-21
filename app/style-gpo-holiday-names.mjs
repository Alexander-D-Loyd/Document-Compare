import {listedWordingContext} from './style-gpo-listed-wording.mjs';

export const GPO_HOLIDAY_NAME_SCOPE='GPO 3.25: five additional printed holiday/feast/fast names, Halloween, Hanukkah, Ramadan, Rosh Hashanah and Yom Kippur, receive capitalization comparisons only after complete on/during/before/after/through/until/since calendar leads and an intact closing punctuation mark, source end or selected finite prose continuation. Full original cue, name and continuation evidence is required. Exact source-page witnesses accompany the printed capitalization rule. Quotations, bill-local terms, names and source-created title continuations, headings/tables, source strikes, unknown exclusions, Unicode/technical attachments and body dash joins remain protected; recognized interior running heads retain exact name selections. This finite list does not infer a holiday from an unfamiliar spelling, alias, date, proper title or religious meaning; other holidays and ambiguous calendar roles remain manual.';
const forms=[['Halloween',48],['Hanukkah',48],['Ramadan',49],['Rosh Hashanah',49],['Yom Kippur',49]];
const word='[\\p{L}\\p{N}\\p{M}_]',lead='(?:on|during|before|after|through|until|since)',tail='(?:\\s*[,.;!?]|$|\\s+(?:(?:the\\s+(?:agency|office))|we|they)\\s+(?:shall|must|may|will|is|are)(?!'+word+'))';
export function gpoHolidayNameIssues(doc,references){
 const view=listedWordingContext(doc),{source,ctx}=view,issues=[];
 for(const [preferred,page]of forms){
  const pattern=new RegExp('(?<!'+word+')(?<cue>'+lead+'\\s+)(?<term>'+preferred.replaceAll(' ','\\s+')+')(?!'+word+')(?<tail>'+tail+')','giu');
  for(const m of source.matchAll(pattern)){
   const term=m.groups.term,start=m.index+m.groups.cue.length,end=start+term.length,evidenceEnd=m.index+m[0].length;
   if(term.replace(/\s+/gu,' ')===preferred||term===term.toUpperCase()||view.guard(start,end,m.index,evidenceEnd))continue;
   const printed=references.gpo.pages[page-1],witness=printed.text.indexOf(preferred);if(witness<0)continue;
   const message='GPO 3.25 capitalizes the printed holiday/feast/fast name “'+preferred+'”. This occurrence has a complete selected calendar lead and prose continuation; confirm that it denotes the holiday rather than an authentic title or another referent.';
   const citations=[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:printed.printedPage,rule:'3.25',preferred,ruleText:message,sourcePassage:{start:witness,end:witness+preferred.length,text:preferred,kind:'Printed holiday example',page}}];
   if(page!==48)citations.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:48,guidePrintedPage:references.gpo.pages[47].printedPage,rule:'3.25',preferred:null,ruleText:'The names of holidays and ecclesiastic feast and fast days are capitalized.'});
   issues.push({start,end,evidenceStart:m.index,evidenceEnd,text:doc.text.slice(start,end),suggestion:preferred,guideId:'gpo',guidePage:page,guidePrintedPage:printed.printedPage,rule:'3.25',category:'Calendar capitalization',checkId:'gpo-holiday-names',context:ctx.at(start),conflict:false,message,holidayEvidence:{kind:'printed-name-with-calendar-role',start:m.index,end:evidenceEnd,sourceText:doc.text.slice(m.index,evidenceEnd),printedName:preferred,sourcePage:page},references:citations});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
