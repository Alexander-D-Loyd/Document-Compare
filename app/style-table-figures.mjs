import {styleContext} from './style-context.mjs';
import {writtenMoneyNumber} from './style-money.mjs';
import {spellNumber} from './style-numerals.mjs';
export function tableFigureIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 if(!/\bBudget Act of\s+\d{4}/i.test(source)||!doc.blocks.some(b=>/^Item\s+Amount$/.test(b.text.trim())))return issues;
 for(const b of doc.blocks){
  if(b.ignored||!ctx.tableAt(b.start))continue;
  const body=source.slice(b.start,b.end);
  // Separate a terminal sentence period from the leader run. Abbreviation
  // periods and a leader run directly adjoining the label remain untouched.
  const terminal=/\b(?<word>[A-Za-z]{4,})\.(?<gap>[ \t]+)(?=\.{3,}[ \t]*[\d$])/.exec(body);
  if(terminal&&!/^(?:approx|assn|dept|educ|equip|misc|prof|corp|const|supp|admin|incorp|internatl)$/i.test(terminal.groups.word)){
   const start=b.start+terminal.index+terminal.groups.word.length,end=start+1;
   const message='GPO 14.1 omits the period immediately before leaders. This check covers a separated terminal period after a full word in a recognized Budget Act Item/Amount table; abbreviations and indexes remain protected.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:'',guideId:'gpo',guidePage:317,guidePrintedPage:references.gpo.pages[316].printedPage,rule:'14.1',category:'Leaderwork punctuation',context:'Table',checkId:'table-figures',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:317,guidePrintedPage:references.gpo.pages[316].printedPage,rule:'14.1',preferred:'Omit the terminal period',ruleText:message}]});
  }
  const m=/\.{3,}\s*(?<amount>[A-Za-z][A-Za-z\s-]*)$/.exec(body);
  if(!m)continue;
  const amount=m.groups.amount.trim(),value=writtenMoneyNumber(amount);
  if(value===null||!Number.isSafeInteger(value)||value<0)continue;
  // Require the canonical spelled cardinal; no inference from names,
  // mixed syntax, None, or an unfamiliar written expression.
  const canonical=s=>s.toLowerCase().replace(/\band\b/g,'').replace(/[\s-]+/g,' ').trim();
  if(canonical(amount)!==canonical(spellNumber(value)))continue;
  const start=b.start+m.index+m[0].indexOf(m.groups.amount),end=start+amount.length;
  const suggestion=value.toLocaleString('en-US'),message='LCB numeral rule 2 uses figures in tables. GPO 13.101 agrees. This is an explicit spelled amount after leaders in a recognized Budget Act Item/Amount table; labels and None are preserved.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 2',category:'Table numerals',context:'Table',checkId:'table-figures',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 2',preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:312,guidePrintedPage:references.gpo.pages[311].printedPage,rule:'13.101',preferred:suggestion,ruleText:'GPO 13.101 uses figures, ordinals and fractions in tables, with its footnote fraction exception.'}]});
 }
 return issues;
}
