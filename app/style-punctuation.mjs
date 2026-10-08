import {styleContext} from './style-context.mjs';
export function contextualPunctuationIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 const literal=[...ctx.source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const quoted=m=>literal.some(r=>r.start<m.index+m[0].length&&r.end>m.index);
 const add=(m,suggestion,rule,page,message,guideId='lcb',conflict=false)=>{
  suggestion=suggestion.replace(/\s+/g,' ');
  if(ctx.at(m.index)==='Heading'||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  const printedPage=references[guideId].pages[page-1].printedPage;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId,guidePage:page,guidePrintedPage:printedPage,rule,category:'Punctuation',context:ctx.at(m.index),checkId:'punctuation',conflict,message,references:[{guideId,guideName:guideId==='lcb'?'LCB Style Manual':'GPO Style Manual',guidePage:page,guidePrintedPage:printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of ctx.source.matchAll(/\b(?:18|19|20)\d0[’']s\b/g)){
  // A following noun can make this a possessive decade; do not infer that.
  if(!/^\s*(?:[.,;:!?)]|$|(?:and|or|to|through|were|are|was|is)\b)/i.test(ctx.source.slice(m.index+m[0].length)))continue;
  add(m,m[0].replace(/[’']/g,''),'Punctuation: Apostrophes',6,'LCB does not use an apostrophe to form plural numbers; its example is “1990s.”');
 }
 for(const m of ctx.source.matchAll(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|thirty|sixty|ninety)\s+(?:days?|weeks?|months?|years?)\s+notice\b/gi)){
  const suggestion=m[0].replace(/\b(day|week|month|year)(s?)\s+(notice)$/i,(_,unit,plural,notice)=>unit+plural+(plural?'’':'’s')+' '+notice);
  add(m,suggestion,'Punctuation: Time possessives',7,'LCB examples use “90 days’ notice” and “one week’s notice.” This time expression immediately modifies “notice.”');
 }
 for(const m of ctx.source.matchAll(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|thirty|sixty|ninety)\s+(?:days?|weeks?|months?|years?|hours?|minutes?)\s+(?:pay|work|labor|labour|vacation|delay|experience|traveltime)\b/gi)){
  add(m,m[0].replace(/\b(day|week|month|year|hour|minute)(s?)\s+(\w+)$/i,(_,unit,plural,noun)=>unit+plural+(plural?'’':'’s')+' '+noun),'Punctuation: Time possessives',6,'LCB describes possessive time expressions. GPO 8.14 illustrates a day’s labor, weeks’ pay and hours’ traveltime; confirm this means an amount of time rather than a named program.');
 }
 for(const m of ctx.source.matchAll(/\b(?:your[’']s|her[’']s|our[’']s|their[’']s|its[’'])(?=\s|[.,;:!?)]|$)/gi))add(m,m[0].replace(/[’']/g,''),'8.8',208,'GPO 8.8 says possessive pronouns do not take an apostrophe; “it’s” as a contraction is checked separately.','gpo');
 for(const m of ctx.source.matchAll(/\b\d+(?:\.\d+)?(?:\s*%|\s+percent\b)/gi)){
  if(ctx.tableAt(m.index))continue;
  if(/[\/⁄]\s*$/.test(ctx.source.slice(Math.max(0,m.index-5),m.index)))continue;
  const kind=ctx.at(m.index),symbol=/%$/.test(m[0]);if(kind==='Bill'&&symbol)add(m,m[0].replace(/\s*%$/,' percent'),'Numerals: Percent',23,'LCB bill text uses figures followed by “percent”; the digest uses the % symbol.');
  if(kind==='Digest'&&!symbol)add(m,m[0].replace(/\s+percent$/i,'%'),'Numerals: Percent',23,'LCB digest text uses the % symbol; GPO 10.5 prefers the spelled form in ordinary prose. This conflicting choice is excluded from Stylistic Check.','lcb',true);
 }
 // A comma or period after a closing quote belongs inside under LCB.
 // Verify an opening quote exists so inch marks and apostrophes are not used.
 for(const m of ctx.source.matchAll(/[”"][.,]/g)){
  if(ctx.tableAt(m.index)||/^\.{2}/.test(ctx.source.slice(m.index+1)))continue;
  const prior=ctx.source.slice(Math.max(0,m.index-600),m.index);
  const opening=m[0][0]==='”'?prior.lastIndexOf('“'):prior.lastIndexOf('"');
  const quoteLead=prior.slice(Math.max(0,opening-160),opening);
  // GPO 8.139 expressly permits outside punctuation in amendment/court
  // directives. LCB disagrees; the user excludes such conflicts.
  if(/\b(?:insert|strike(?:\s+out)?|delete|replace|substitute|change)\b[^.!?]*\b(?:words?|text|phrase|term)\b[^.!?]*$/i.test(quoteLead))continue;
  if(opening<0||!/[A-Za-z\d)\]]$/.test(prior)||/\n\s*\n/.test(prior.slice(opening)))continue;
  add(m,m[0][1]+m[0][0],'Punctuation: Quotation Marks',6,'LCB places periods and commas inside quotation marks.');
 }
 const months='January|February|March|April|May|June|July|August|September|October|November|December';
 for(const m of ctx.source.matchAll(new RegExp('\\b(?:'+months+')\\s+\\d{1,2},\\s+\\d{4}(?=\\s+[A-Za-z])','g')))add(m,m[0]+',','Punctuation: Full dates',7,'LCB shows a comma following the year in a complete month-day-year date when the sentence continues.');
 for(const m of ctx.source.matchAll(new RegExp('\\b(?:'+months+'),\\s+\\d{4}\\b','g')))add(m,m[0].replace(',',''),'Punctuation: Month and year',7,'LCB writes a month and year without a separating comma, as in “April 2001.”');
 for(const [form,preferred] of [['workers compensation','workers’ compensation'],['attorneys fees','attorney’s fees'],['drivers license','driver’s license'],['drivers licenses','driver’s licenses'],['farmers market','farmers’ market'],['homeowners insurance','homeowners’ insurance'],['masters degree','master’s degree'],['travelers checks','traveler’s checks'],['contractors license','contractor’s license'],['cashiers checks','cashier’s checks'],['mechanics liens','mechanic’s liens']]){
  for(const m of ctx.source.matchAll(new RegExp('\\b'+form.replaceAll(' ','\\s+')+'\\b','gi'))){
   if(quoted(m))continue;
   const after=ctx.source.slice(m.index+m[0].length),before=ctx.source.slice(Math.max(0,m.index-70),m.index);
   // An official fund name or budget program label may have an established
   // spelling; do not silently rename it using the ordinary phrase example.
   if(/^[A-Z]\w+\s+[A-Z]/.test(m[0])&&(/^\s+(?:Fund|Board|System|Program|Act|Law)\b/.test(after)||/\b\d{4,}-[^.\n]*$/.test(before)))continue;
   const suggestion=/^[A-Z]/.test(m[0])?preferred[0].toUpperCase()+preferred.slice(1):preferred;add(m,suggestion,'Punctuation: Listed possessive forms',7,'LCB lists “'+preferred+'” with this possessive form.');
  }
 }
 // Restrict this pass to an explicit introductory list and three simple
 // words; more complex clauses require a grammatical parse.
 for(const m of ctx.source.matchAll(/\b(?:includes?|comprises?|consists of|such as)\s+([a-z]+),\s+([a-z]+)\s+(and|or|nor)\s+([a-z]+)\b/gi)){
  if(/^(?:if|when|where|unless|then|shall|may|must)$/i.test(m[1])||/^(?:is|are|be|was|were)$/i.test(m[4]))continue;
  add(m,m[0].replace(/\s+(and|or|nor)\s+([a-z]+)$/i,', $1 $2'),'Punctuation: Commas',6,'LCB uses a comma before the final conjunction in a series of three or more items. This check covers a simple list introduced explicitly.');
 }
 // These fixed LCB examples have a defined punctuation pattern. Preserve
 // quoted wording; do not infer that every occurrence of 'including' is
 // parenthetical or that an entire following list has been parsed.
 for(const m of ctx.source.matchAll(/\b(including),?\s+but\s+not\s+limited\s+to,?(?=\s+[A-Za-z0-9“"(])/gi)){
  if(quoted(m))continue;
  const suggestion=m[1]+', but not limited to,';
  if(m[0].replace(/\s+/g,' ')!==suggestion)add(m,suggestion,'Punctuation: Listed parenthetic phrases',7,'LCB explicitly lists “including, but not limited to,” and “includes, but is not limited to,”. Confirm the intended parenthetic list.');
 }
 for(const m of ctx.source.matchAll(/\bincludes,?\s+but\s+is\s+not\s+limited\s+to,?(?=\s+[A-Za-z0-9“"(])/gi)){
  if(quoted(m))continue;
  const suggestion=m[0].match(/^includes/i)[0]+', but is not limited to,';
  if(m[0].replace(/\s+/g,' ')!==suggestion)add(m,suggestion,'Punctuation: Listed parenthetic phrases',7,'LCB explicitly lists “includes, but is not limited to,” as a parenthetic phrase.');
 }
 for(const m of ctx.source.matchAll(/\bUnder\s+existing\s+law(?=\s+[A-Za-z])/g)){
  if(quoted(m)||!/^(?:^|[.!?:]\s*|\n\s*)$/.test(ctx.source.slice(Math.max(0,m.index-2),m.index)))continue;
  add(m,m[0]+',','Punctuation: Introductory existing-law phrase',7,'LCB lists “Under existing law,” with a comma after this introductory phrase.');
 }
 // Restrict possessive indefinite pronouns to an explicit possessed noun;
 // an object form such as 'help someone' is not a possessive.
 for(const m of ctx.source.matchAll(/\b(?:someone|somebody|anyone|anybody|everyone|everybody|no\s+one|nobody|each\s+other|one\s+another)(?:s|[’'])?\s+(?:rights?|duties|obligations?|property|privacy|consent|identity|signature|account|application|books?|ideas?|home|opinion|responsibility)\b/gi)){
  if(quoted(m))continue;
  if(/\b(?:can|could|may|might|shall|should|will|would|must|does|did|do)\s*$/i.test(ctx.source.slice(Math.max(0,m.index-50),m.index)))continue;
  const n=m[0].match(/\s+(rights?|duties|obligations?|property|privacy|consent|identity|signature|account|application|books?|ideas?|home|opinion|responsibility)$/i),word=m[0].slice(0,n.index);
  const bare=word.replace(/(?:[’']|s)$/,'');
  add(m,bare+'’s'+n[0],'8.9',209,'GPO 8.9 requires an apostrophe for possessive indefinite pronouns. This check requires an explicit possessed-noun cue.','gpo');
 }
 // Established initials + a plural-only verb avoid changing a possessive
 // such as 'the NGO’s budget'. Unfamiliar names and quoted forms stay literal.
 for(const m of ctx.source.matchAll(/\b(?:NGO|IPO|SUV|EV|MPD|JPEG|URL|PDF|ATM|ID|API|RIF|IOU)[’']s(?=\s+(?:are|were|have|include|remain|require|provide|represent|contain|must|shall)\b)/g)){
  if(!quoted(m))add(m,m[0].replace(/[’']/g,''),'8.11',209,'GPO 8.11 normally forms plural initialisms without an apostrophe. The following plural verb or modal identifies this as a plural, rather than possession.','gpo');
 }
 // GPO specifically prohibits a dash replacing 'to' after 'from', or
 // 'and' after 'between'. Full year endpoints avoid silently expanding
 // abbreviated years or changing a citation/identifier.
 for(const m of ctx.source.matchAll(/\b(from|between)\s+((?:18|19|20)\d{2})\s*[-–—]\s*((?:18|19|20)\d{2})\b/gi)){
  if(quoted(m))continue;
  const rule=m[1].toLowerCase()==='from'?'8.78':'8.79',join=rule==='8.78'?'to':'and';
  add(m,m[1]+' '+m[2]+' '+join+' '+m[3],rule,222,'GPO '+rule+' uses “'+join+'” with “'+m[1].toLowerCase()+'” rather than substituting a dash. Only full-year ranges in prose are checked.','gpo');
 }
 for(const m of ctx.source.matchAll(/\.[”"]\.(?!\.)/g)){
  const before=ctx.source.slice(Math.max(0,m.index-600),m.index);
  const opening=m[0][1]==='”'?before.lastIndexOf('“'):before.lastIndexOf('"');
  if(opening<0||/\.$/.test(before)||/\n\s*\n/.test(before.slice(opening)))continue;
  add(m,m[0].slice(0,2),'8.120',229,'GPO 8.120 omits a redundant period outside a quotation that already ends in a period. Ellipses and unverified quotation boundaries are protected.','gpo');
 }
 return issues;
}
