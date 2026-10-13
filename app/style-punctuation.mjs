import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {canonicalWrittenValue} from './style-numerals.mjs';
import {dividedCalendarDates,validCompleteCalendarDate} from './style-calendar-dates.mjs';
import {simplePunctuationWordSeries} from './style-list-phrases.mjs';
import {percentageOpeningEvidence} from './style-percentage-openings.mjs';
import {percentageValueMatches} from './style-percentage-values.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {createNounQuantityReader}from './style-noun-quantities.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';
import {cutsOriginalSourceWord} from './style-introduced-lists.mjs';
export const LCB_SHORT_PUNCTUATION_SCOPE='Selected LCB6/7 apostrophe, full-date/month-year, listed possessive, parenthetic and existing-law examples validate complete original Unicode source spans, protecting strikes, wrapped literals, tables and unknown exclusions. The include/are plural is the regular inflection of includes/is without changing verb agreement. Four-digit decade plurals require an intact plural/punctuation continuation and reject currency/identifier fragments; possessive decade meanings remain manual. Under existing law requires an intact complete sentence or explicit Digest entry, not any printed newline or a prefix hidden by source deletion. Full dates require a valid four-digit Gregorian date and intact English prose continuation; month/year forms require a temporal cue or source entry to protect person names. Recognized months may have incorrect capitalization: punctuation and divided-day suggestions preserve source case, with month capitalization checked independently. Other calendar meanings and historical calendar systems remain manual. Recognized interior heads preserve original marks; arbitrary phrase roles and punctuation remain manual.';
export const LCB_QUOTE_PUNCTUATION_SCOPE='Period/comma placement and redundant final-period checks use complete recognized quotation enclosures beyond the former 600-character excerpt, preserving closing-mark-only selections across known page heads. Source strikes, unknown exclusions, every table and unverified/inch-mark enclosures cannot establish evidence. Complete finite amendment-directive leads preserve the GPO outside-punctuation exception, including statutory language. Ellipses, complex nesting, unknown directive meanings and whole-rule compliance remain manual.';
export const LCB_POSSESSIVE_HEAD_SCOPE='Seven selected regular noun-head singular/plural inflections extend the listed attorney’s fees, contractor’s license, master’s degree, farmers’ market, cashier’s checks, mechanic’s liens and traveler’s checks examples. The listed possessor and apostrophe form are retained; this is an explicit grammatical extension, not seven additional source quotations. Exact original phrase evidence, wrapped quotations and selected official-name protections remain. Unfamiliar head derivatives and possessive meaning remain manual.';
const listedPossessives=[['workers compensation','workers’ compensation'],['attorneys fees','attorney’s fees'],['drivers license','driver’s license'],['drivers licenses','driver’s licenses'],['farmers market','farmers’ market'],['homeowners insurance','homeowners’ insurance'],['masters degree','master’s degree'],['travelers checks','traveler’s checks'],['contractors license','contractor’s license'],['cashiers checks','cashier’s checks'],['mechanics liens','mechanic’s liens']];
const possessiveHeadInflections=[['attorneys fee','attorney’s fee','attorney’s fees'],['contractors licenses','contractor’s licenses','contractor’s license'],['masters degrees','master’s degrees','master’s degree'],['farmers markets','farmers’ markets','farmers’ market'],['cashiers check','cashier’s check','cashier’s checks'],['mechanics lien','mechanic’s lien','mechanic’s liens'],['travelers check','traveler’s check','traveler’s checks']];
export const QUALIFIED_TIME_NOTICE_SCOPE='LCB6/7 possessive-time checks now also recognize a complete canonical written or integer/grouped/decimal count followed by a selected business/calendar/court/school/academic/consecutive/working time-unit qualifier and notice, plus the source-listed schoolday noun. Every original count, qualifier, time unit and notice remains evidence. The possessive is supplied from the actual singular/plural unit; independent figure/spelled-out corrections remain separate. Protected quotations, source strikes/exclusions, malformed numbers, identifiers, genuine hyphenated unit modifiers and table rows stay excluded. Other qualified nominal relationships and fractions remain unresolved; this does not certify all possessive-time grammar.';
export function contextualPunctuationIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 const blockedListEvidence=styleEvidenceGuard(doc,ctx);
 const timeQuantity=createNounQuantityReader(doc,ctx);
 let timeLiteralRanges=null,timeOriginalContext=null;
 const timeCurrencyPrefix=(source,start)=>{while(start>0&&/\s/u.test(source[start-1]))start--;return /[$€£¥₹¢]/u.test(source[start-1]||'');};
 const literal=[...ctx.source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const quoted=m=>literal.some(r=>r.start<m.index+m[0].length&&r.end>m.index);
 const digestHeading=/legislative\s+counsel[’']s\s+digest/i.exec(ctx.source);
 const sourceEntry=at=>{const sentence=ctx.sentenceAt(at),prefix=ctx.source.slice(sentence.start,at);if(!prefix.trim())return sentence.start;if(digestHeading&&ctx.at(at)==='Digest'&&digestHeading.index+digestHeading[0].length<=at&&!ctx.source.slice(digestHeading.index+digestHeading[0].length,at).trim())return digestHeading.index;return null;};
 const calendarLeads=new Set('in during before after through until by since from on dated effective beginning ending commencing'.split(' '));
 const calendarLead=at=>{let cursor=at;const previous=()=>{while(cursor>0&&/\s/u.test(ctx.source[cursor-1]))cursor--;const end=cursor;while(cursor>0&&/[\p{L}\p{M}]/u.test(ctx.source[cursor-1]))cursor--;return {start:cursor,text:ctx.source.slice(cursor,end).toLowerCase()};};const last=previous();if(calendarLeads.has(last.text))return last.start;if(last.text==='of'){const first=previous();if(['as','month'].includes(first.text))return first.start;}return sourceEntry(at);};
 // Closing marks belong to a verified enclosure, not a clipped look-behind.
 // Literal content is allowed only here, for its boundary punctuation; all
 // other source exclusions, strikes, table and original-boundary guards apply.
 const quoteBoundaryBlocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false});
 const quoteOwners=new Map(ctx.literalRanges.map(r=>[r.end-1,r]));
 const quoteOwner=index=>{const owner=quoteOwners.get(index);if(!owner||!/[“"]/.test(doc.text[owner.start]||'')||!/[”"]/.test(doc.text[index]||'')||/\d/u.test(doc.text[owner.start-1]||'')||quoteBoundaryBlocked(owner.start,owner.end))return null;return owner;};
 const amendmentQuote=owner=>{const start=ctx.sentenceAt(owner.start).start,lead=ctx.source.slice(start,owner.start);return /\b(?:insert|strike(?:\s+out)?|delete|replace|substitute|change)\b[^.!?]*\b(?:words?|text|phrase|term|language)\b[^.!?]*$/i.test(lead);};
 const guardedExamples=new Set(['Punctuation: Apostrophes','Punctuation: Full dates','Punctuation: Month and year','Punctuation: Listed possessive forms','Punctuation: Listed parenthetic phrases','Punctuation: Introductory existing-law phrase','Numerals: Percent']);
 const add=(m,suggestion,rule,page,message,guideId='lcb',conflict=false)=>{
  suggestion=suggestion.replace(/\s+/g,' ');
  if(!['Punctuation: Quotation Marks','8.120'].includes(rule)&&quoted(m))return;
  const end=m.index+m[0].length;
  const evidenceStart=m.evidenceStart??m.index,evidenceEnd=m.evidenceEnd??end;
  if(guardedExamples.has(rule)&&(cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd)||blockedListEvidence(evidenceStart,evidenceEnd)))return;
  if(ctx.at(m.index)==='Heading'||(doc.struck||[]).some(r=>r.start<end&&r.end>m.index))return;
  // A complete date can cross printed page labels already blanked in the
  // shared source. Preserve that whole source selection; its endpoints must
  // still be real prose. Other punctuation checks keep their existing scope.
  if(rule!=='Punctuation: Time possessives'&&!guardedExamples.has(rule)&&doc.blocks.some(b=>b.ignored&&(rule==='Punctuation: Full dates'?
    b.start<=m.index&&b.end>m.index||b.start<end&&b.end>=end:
    b.start<end&&b.end>m.index)))return;
  const printedPage=references[guideId].pages[page-1].printedPage;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId,guidePage:page,guidePrintedPage:printedPage,rule,category:'Punctuation',context:ctx.at(m.index),checkId:'punctuation',conflict,message,references:[{guideId,guideName:guideId==='lcb'?'LCB Style Manual':'GPO Style Manual',guidePage:page,guidePrintedPage:printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_,.\/⁄+-])[1-9]\d{2}0[’']s(?![\p{L}\p{N}\p{M}_])/gu)){
  // A following noun can make this a possessive decade; do not infer that.
  const end=m.index+m[0].length,cue=/^\s*(?:[.,;:!?)]|$|(?:and|or|to|through|were|are|was|is)\b)/i.exec(ctx.source.slice(end));
  if(!cue||/[$€£¥₹¢]\s*$/u.test(ctx.source.slice(Math.max(0,m.index-40),m.index)))continue;
  m.evidenceEnd=end+cue[0].length;
  add(m,m[0].replace(/[’']/g,''),'Punctuation: Apostrophes',6,'LCB does not use an apostrophe to form plural numbers; its example is “1990s.”');
 }
 const cardinalWords='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion';
 const count='(?:\\d+(?:,\\d{3})*(?:\\.\\d+)?|(?:'+cardinalWords+')(?:[\\s-]+(?:'+cardinalWords+')){0,12})';
 for(const m of ctx.source.matchAll(new RegExp('\\b('+count+')\\s+((?:(?:business|calendar|court|school|academic|consecutive|working)\\s+)?(?:schooldays?|days?|weeks?|months?|years?|hours?|minutes?)\\s+(notice|pay|work|labor|labour|vacation|delay|experience|traveltime))\\b','gi'))){
  // Qualifiers extend the source-listed notice construction only. They do
  // not establish the noun/verb role of an unfamiliar work/pay expression.
  if(/^(?:(?:business|calendar|court|school|academic|consecutive|working)\s+|schooldays?\s+)/i.test(m[2])&&m[3].toLowerCase()!=='notice')continue;
  const unitStart=m.index+m[0].lastIndexOf(m[2]),quantity=timeQuantity(unitStart),evidenceEnd=m.index+m[0].length;
  if(!quantity||quantity.start!==m.index||cutsOriginalStyleWord(doc,evidenceEnd)||/^[-\u00ad\u2010\u2011’']/u.test(doc.text.slice(evidenceEnd))||blockedListEvidence(quantity.start,evidenceEnd))continue;
  if(timeLiteralRanges===null){timeOriginalContext=originalBodyStyleContext(doc);timeLiteralRanges=[...styleSingleQuoteRanges(ctx.source),...(timeOriginalContext?[...timeOriginalContext.literalRanges,...styleSingleQuoteRanges(timeOriginalContext.source)]:[])];}if(timeLiteralRanges.some(r=>r.start<evidenceEnd&&r.end>quantity.start)||timeCurrencyPrefix(ctx.source,quantity.start)||timeOriginalContext&&timeCurrencyPrefix(timeOriginalContext.source,quantity.start))continue;
  const written=!/^\d/.test(m[1]),value=written?canonicalWrittenValue(m[1]):Number(m[1].replaceAll(',',''));
  if(value===null||!Number.isFinite(value)||ctx.tableAt(m.index)||/[\p{L}\p{N}\/⁄.,+−-]$/u.test(ctx.source.slice(Math.max(0,m.index-1),m.index))||/[+−-]\s*$/.test(ctx.source.slice(Math.max(0,m.index-12),m.index)))continue;
  // A larger written count may have its own numeral correction. Keep that
  // finding independent by highlighting just the missing possessive here.
  const kind=ctx.at(m.index),independentCount=written&&value>=10||kind==='Bill'&&!written&&value>=1&&value<=9||kind==='Digest'&&(written&&value!==1||!written&&value===1);
  const target=independentCount?{index:m.index+m[0].lastIndexOf(m[2]),0:m[2]}:m;
  const suggestion=target[0].replace(/\b(schoolday|day|week|month|year|hour|minute)(s?)\s+(\w+)$/i,(_,unit,plural,noun)=>unit+plural+(plural?'’':'’s')+' '+noun);
  add(target,suggestion,'Punctuation: Time possessives',m[3].toLowerCase()==='notice'?7:6,'LCB uses possessive time expressions, including “90 days’ notice” and “one week’s notice.” This complete recognized count immediately qualifies the stated noun. Larger written-number corrections remain independent; ambiguous fraction counts and tables are protected.');
 }
 for(const m of ctx.source.matchAll(/\b(?:your[’']s|her[’']s|our[’']s|their[’']s|its[’'])(?=\s|[.,;:!?)]|$)/gi))add(m,m[0].replace(/[’']/g,''),'8.8',208,'GPO 8.8 says possessive pronouns do not take an apostrophe; “it’s” as a contraction is checked separately.','gpo');
 for(const m of percentageValueMatches(doc,ctx)){
  const number=m.number;
  if(/^\d+(?:,\d{3})*$/.test(number)&&percentageOpeningEvidence(doc,ctx,m.index,m.index+number.length))continue;
  const kind=ctx.at(m.index),symbol=/%$/.test(m[0]);if(kind==='Bill'&&symbol)add(m,m[0].replace(/\s*%$/,' percent'),'Numerals: Percent',23,'LCB bill text uses figures followed by “percent”; the digest uses the % symbol.');
  if(kind==='Digest'&&!symbol)add(m,m[0].replace(/\s+percent$/i,'%'),'Numerals: Percent',23,'LCB digest text uses the % symbol; GPO 10.5 prefers the spelled form in ordinary prose. This conflicting choice is excluded from Stylistic Check.','lcb',true);
 }
 // A comma or period after a closing quote belongs inside under LCB.
 // Verify an opening quote exists so inch marks and apostrophes are not used.
 for(const m of ctx.source.matchAll(/[”"][.,]/g)){
  if(ctx.tableAt(m.index)||/^\.{2}/.test(ctx.source.slice(m.index+1)))continue;
  const owner=quoteOwner(m.index);if(!owner)continue;
  const prior=ctx.source.slice(owner.start+1,m.index);
  // GPO 8.139 expressly permits outside punctuation in amendment/court
  // directives. LCB disagrees; the user excludes such conflicts.
  if(amendmentQuote(owner))continue;
  if(!/[\p{L}\p{N}\p{M})\]]$/u.test(prior))continue;
  add(m,m[0][1]+m[0][0],'Punctuation: Quotation Marks',6,'LCB places periods and commas inside quotation marks.');
 }
 const months='January|February|March|April|May|June|July|August|September|October|November|December';
 for(const part of dividedCalendarDates(ctx.source)){
  const continuation=/^\s+[A-Za-z]+/u.exec(ctx.source.slice(part.end));
  add({index:part.start,0:part.text,evidenceEnd:continuation?part.end+continuation[0].length:part.end},part.suggestion+(continuation?',':''),'Punctuation: Full dates',7,'This complete calendar date has a separated pair of day digits. LCB page 7 shows contiguous day figures in a month-day-year date, with a comma after the year when the sentence continues. A following English prose word must have intact complete source evidence. This may be source spacing or PDF reading; verify the original PDF before editing. The source text is preserved.');
 }
 // Month capitalization has its own check. Date punctuation still applies
 // to a recognized month with incorrect case, preserving that source case
 // so the two independent suggestions do not silently rewrite each other.
 for(const m of ctx.source.matchAll(new RegExp('\\b('+months+')\\s+(\\d{1,2}),\\s+(\\d{4})(?=\\s+[A-Za-z])','gi'))){
  const end=m.index+m[0].length,continuation=/^\s+[A-Za-z]+/u.exec(ctx.source.slice(end));if(!continuation||!validCompleteCalendarDate(m[1],Number(m[2]),Number(m[3])))continue;m.evidenceEnd=end+continuation[0].length;
  add(m,m[0]+',','Punctuation: Full dates',7,'LCB shows a comma following the year in a complete month-day-year date when the sentence continues. A valid four-digit Gregorian date and intact following prose word establish this selected punctuation context; date meaning remains manual.');
 }
 for(const m of ctx.source.matchAll(new RegExp('\\b(?:'+months+'),\\s+[1-9]\\d{3}\\b','gi'))){
  const lead=calendarLead(m.index);if(lead===null)continue;m.evidenceStart=lead;
  add(m,m[0].replace(',',''),'Punctuation: Month and year',7,'LCB writes a month and year without a separating comma, as in “April 2001.” This occurrence has an intact temporal introducer or source-entry boundary; person-name and unexplained label contexts remain manual.');
 }
 for(const [form,preferred,sourcePreferred] of [...listedPossessives,...possessiveHeadInflections]){
  for(const m of ctx.source.matchAll(new RegExp('\\b'+form.replaceAll(' ','\\s+')+'\\b','gi'))){
   if(quoted(m))continue;
   const after=ctx.source.slice(m.index+m[0].length),before=ctx.source.slice(Math.max(0,m.index-70),m.index);
   // An official fund name or budget program label may have an established
   // spelling; do not silently rename it using the ordinary phrase example.
   if(/^[A-Z]\w+\s+[A-Z]/.test(m[0])&&(/^\s+(?:Fund|Board|System|Program|Act|Law)\b/.test(after)||/\b\d{4,}-[^.\n]*$/.test(before)))continue;
   const suggestion=/^[A-Z]/.test(m[0])?preferred[0].toUpperCase()+preferred.slice(1):preferred;add(m,suggestion,'Punctuation: Listed possessive forms',7,'LCB lists “'+(sourcePreferred||preferred)+'” with this possessive form.'+(sourcePreferred?' This occurrence uses the selected regular singular/plural inflection of the same noun head, retaining the listed possessor and apostrophe.':''));
  }
 }
 // Single-word items need independent role evidence. A noun followed by a
 // descriptive pair, condition or preposition pair is not a three-item list.
 for(const m of ctx.source.matchAll(/\b(?:includes?|comprises?|consists of|such as)\s+([a-z]+),\s+([a-z]+)\s+(and|or|nor)\s+([a-z]+)\b/gi)){
  const end=m.index+m[0].length;
  if(!simplePunctuationWordSeries([m[1],m[2],m[4]])||cutsOriginalSourceWord(doc,m.index)||cutsOriginalSourceWord(doc,end)||styleRangeBlocked(doc,m.index,end)||blockedListEvidence(m.index,end))continue;
  const join=/\s+(and|or|nor)\s+([a-z]+)$/i.exec(m[0]);
  add({index:m.index+join.index+join[0].indexOf(join[1]),0:join[1]},', '+join[1],'Punctuation: Commas',6,'LCB and GPO use a comma before the final conjunction in a series of three or more items. Check that these are separate list items, then add a comma before “'+join[1]+'”.');
  const issue=issues.at(-1),start=m.index+join.index+join[0].indexOf(join[1]);
  if(issue?.start===start&&issue.rule==='Punctuation: Commas')issue.references.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:216,guidePrintedPage:references.gpo.pages[215].printedPage,rule:'8.46',preferred:issue.suggestion,ruleText:'GPO 8.46 requires a comma after each member of a series of three or more words, phrases, letters or figures used with and, or or nor.'});
 }
 // These fixed LCB examples have a defined punctuation pattern. Preserve
 // quoted wording; do not infer that every occurrence of 'including' is
 // parenthetical or that an entire following list has been parsed.
 for(const m of ctx.source.matchAll(/\b(including),?\s+but\s+not\s+limited\s+to,?(?=\s+[A-Za-z0-9“"(])/gi)){
  if(quoted(m))continue;
  const suggestion=m[1]+', but not limited to,';
  if(m[0].replace(/\s+/g,' ')!==suggestion)add(m,suggestion,'Punctuation: Listed parenthetic phrases',7,'LCB explicitly lists “including, but not limited to,” and “includes, but is not limited to,”. Confirm the intended parenthetic list.');
 }
 for(const m of ctx.source.matchAll(/\b(?:includes,?\s+but\s+is|include,?\s+but\s+are)\s+not\s+limited\s+to,?(?=\s+[A-Za-z0-9“"(])/gi)){
  if(quoted(m))continue;
  const verb=m[0].match(/^includes?/i)[0],copula=/^includes$/i.test(verb)?'is':'are',suggestion=verb+', but '+copula+' not limited to,';
  if(m[0].replace(/\s+/g,' ')!==suggestion)add(m,suggestion,'Punctuation: Listed parenthetic phrases',7,'LCB explicitly lists “includes, but is not limited to,” as a parenthetic phrase.');
 }
 for(const m of ctx.source.matchAll(/\bUnder\s+existing\s+law(?=\s+[A-Za-z])/g)){
  const entry=sourceEntry(m.index);if(quoted(m)||entry===null)continue;m.evidenceStart=entry;
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
  const owner=quoteOwner(m.index+1);
  if(!owner||ctx.source[m.index-1]==='.')continue;
  add(m,m[0].slice(0,2),'8.120',229,'GPO 8.120 omits a redundant period outside a quotation that already ends in a period. Ellipses and unverified quotation boundaries are protected.','gpo');
 }
 return issues;
}
