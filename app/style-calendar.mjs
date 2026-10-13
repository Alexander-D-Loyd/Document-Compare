import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
export const CALENDAR_SOURCE_EVIDENCE_SCOPE='The existing finite month, weekday and listed-holiday capitalization checks require intact original Unicode terms and full source calendar cues. A masked word cannot manufacture a calendar lead or date continuation. Recognized interior PDF running heads and margins preserve precise calendar-name selections; wrapped literals, tables, strikes and unknown exclusions remain protected. Month numeric continuations retain the existing day/ordinal-day/four-digit-year grammar; invalid date meanings, unfamiliar calendars, proper-title authenticity and additional holidays remain manual.';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const holidays=['April Fools’ Day','Arbor Day','Armed Forces Day','Christmas Day','Christmas Eve','Father’s Day','Flag Day','Fourth of July','Independence Day','Labor Day','Memorial Day','Mother’s Day','New Year’s Day','New Year’s Eve','Thanksgiving Day','Veterans Day','Presidents Day','Washington’s Birthday','Lincoln’s Birthday'];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[’']/g,"[’']").replaceAll(' ','\\s+');
export function calendarIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx);
 const add=(start,text,preferred,rule,evidenceStart=start,evidenceEnd=start+text.length)=>{
  // A weekday's established plural s is part of the verified full witness;
  // the existing correction still selects just its case-bearing name stem.
  const end=start+text.length;if(text.replace(/\s+/g,' ').replace(/'/g,'’')===preferred||text===text.toUpperCase()||ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd)||blocked(evidenceStart,evidenceEnd))return;
  const page=references.gpo.pages.find(p=>new RegExp('(?:^|\\n)\\s*'+rule.replace('.','\\.')+'\\.').test(p.flowText||p.text));if(!page)return;
  const message=rule==='3.24'?'GPO capitalizes month and weekday names. This occurrence has an explicit calendar cue.':'GPO capitalizes this listed holiday name. Confirm that the words name the holiday.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'gpo',guidePage:page.page,guidePrintedPage:page.printedPage,rule,category:'Calendar capitalization',context:ctx.at(start),checkId:'calendar',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule,preferred,ruleText:message}]});
 };
 for(const name of months){
  const pattern=new RegExp('\\b(?:on|by|before|after|through|until|during|in|dated|effective|beginning|month\\s+of)\\s+('+name+')(?:\\s+\\d{4}(?![\\p{L}\\p{N}\\p{M}_])|\\s+\\d{1,2}(?:st|nd|rd|th)?(?![\\p{L}\\p{N}\\p{M}_])|\\s*[,.;])','giu');
  for(const m of source.matchAll(pattern))add(m.index+m[0].lastIndexOf(m[1]),m[1],name,'3.24',m.index,m.index+m[0].length);
 }
 for(const name of weekdays){
  for(const m of source.matchAll(new RegExp('\\b(?:on|every|each|through|after|before|by|until)\\s+('+name+')(?:s)?(?![\\p{L}\\p{N}\\p{M}_])','giu'))){let term=m[1],start=m.index+m[0].lastIndexOf(term);add(start,term,name,'3.24',m.index,m.index+m[0].length);}
 }
 for(const name of holidays)for(const m of source.matchAll(new RegExp('\\b'+escape(name)+'\\b','gi')))add(m.index,m[0],name,'3.25');
 return issues;
}
