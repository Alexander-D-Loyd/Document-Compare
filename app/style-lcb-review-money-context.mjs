import {legislativeContext} from './legislative-context.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard} from './style-written-quantity-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {ones,tens} from './style-cardinal-values.mjs';
import {writtenMoneyNumber} from './style-money.mjs';

const word='(?:'+[...ones,...tens.slice(2),'hundred','thousand','million','billion','trillion'].join('|')+')';
const amount=word+'(?:[\\s-]+(?:and[\\s-]+)?'+word+')*';
const written=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])('+amount+')[\\s-]+(dollars?|cents?|mills?)(?![\\p{L}\\p{N}\\p{M}_])(?:\\s+and\\s+('+amount+')[\\s-]+cents?(?![\\p{L}\\p{N}\\p{M}_]))?(?:\\s*\\(\\s*\\$\\s*([+−-]?\\s*\\d+(?:\\s*[.,]\\s*\\d+)*)(?:\\s+(thousand|million|billion|trillion))?\\s*\\))?','giu');
const figure=/\$\s*(?<number>[+−-]?\s*\d+(?:\s*[.,]\s*\d+)*)(?:\s+(?:thousand|million|billion|trillion))?(?![\p{L}\p{N}\p{M}_])/giu;
const intersects=(ranges,start,end)=>ranges.some(r=>r.start<end&&r.end>start);
function explicitlyDesignatedBudgetAct(doc,ctx){
 const intact=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false});
 // A reference to another year's Budget Act is insufficient. Only a complete
 // self-designation, or the digest's explicit Budget Bill declaration, owns
 // this exclusion. The quoted official name inside a self-designation is
 // evidence; an entire quoted/example clause is not.
 const patterns=[
  /\bThis\s+act\s+(?:shall\s+be|is)\s+(?:known\s+and\s+may\s+be\s+)?cited\s+as\s+(?:the\s+)?[“"]?Budget\s+Act\s+of\s+\d{4}/gi,
  /\bThis\s+bill\s+would\s+declare\s+that\s+it\s+is\s+to\s+take\s+effect\s+immediately\s+as\s+(?:a|the)\s+Budget\s+Bill\b/gi,
 ];
 for(const [index,pattern]of patterns.entries())for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length;
  if((index===0?ctx.at(start)==='Bill':ctx.at(start)==='Digest')&&!ctx.literalAt(start)&&!intact(start,end))return true;
 }
 return false;
}
function budgetItemAmendmentSections(doc,ctx){
 const intact=styleEvidenceGuard(doc,ctx),ranges=[];
 const target=/^(?:SECTION|SEC\.)\s+\d+(?:\.\d+)*\.\s+Item\s+\d{4}\s*-\s*\d{3}(?:\s*-\s*\d{4})?\s+of\s+(?:Section\s+\d+(?:\.\d+)*\s+of\s+)?the\s+Budget\s+Act\s+of\s+\d{4}(?:\s*,\s*as\s+amended\s+by\s+[^:;!?]{1,500})?\s*,?\s+is\s+amended\s+to\s+read\s*:/i;
 for(const section of ctx.sections){
  const m=target.exec(ctx.source.slice(section.start,Math.min(section.end,section.start+1800)));
  if(m&&!intact(section.start,section.start+m[0].length))ranges.push({start:section.start,end:section.end});
 }
 return ranges;
}
export const LCB_UNKNOWN_MONEY_REVIEW_SCOPE='Reader-assisted monetary-form review for active nonbudget bill amounts whose section type is not resolved by the existing legislative context classifier. Dollar figures, selected written dollar/cent/mill amounts and monetary modifiers are selected without an asserted replacement. Matching complete word/figure pairs do not generate another warning; original complete pair spans protect their contained figures. LCB page 23 bill money examples and page 21 findings/declarations and resolution exceptions are shown together. Existing precise findings retain precedence; independently identified digest, codified, findings and resolution contexts keep their existing checks. Intact explicit Budget Act self-designations and Budget Bill digest declarations, plus specifically identified Budget Act item-amendment sections, retain existing targeted checks rather than this uncertain-context fallback. A mere reference to a Budget Act does not suppress review in another provision. Complete original spans, recognized word divisions, quotes, tables, headings, named-source ranges, strikes, unknown exclusions and partial numerical expressions are protected. This supplies a checking method for unresolved contexts, not a semantic classification guarantee or verified no-misses coverage.';

export function lcbUnknownMoneyReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages?.some(p=>p.page===21)||!references.lcb.pages.some(p=>p.page===23))return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const issues=withStyleContext(reviewDoc,()=>reviewUnknownMoney(reviewDoc,references,prior));
 return view?view.restore(issues).map(issue=>({...issue,sectionContext:issue.sectionContext?{...issue.sectionContext,start:view.toSource(issue.sectionContext.start),end:view.toSource(issue.sectionContext.end,true)}:null})):issues;
}
function reviewUnknownMoney(doc,references,existingIssues){
 const ctx=legislativeContext(doc),source=ctx.source,style=styleContext(doc),blocked=styleEvidenceGuard(doc,style),numeric=numericExpressionGuard(doc,style),quantity=writtenQuantityEvidenceGuard(doc,style),issues=[],selected=[];
 // Budget appropriation prose has financial/table conventions that this
 // uncertain section classifier cannot resolve. Dedicated existing amount
 // agreement checks remain active; do not invent blanket budget corrections.
 if(explicitlyDesignatedBudgetAct(doc,style))return [];
 const names=sourceNameRanges(source),budgetItems=budgetItemAmendmentSections(doc,ctx),singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}])'[^'\n]*'(?![\p{L}\p{N}])/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const add=(m,kind)=>{
  const start=m.index,end=start+m[0].length;
  if(ctx.moneyAt(start)!=='Unknown'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||intersects(existingIssues,start,end)||intersects(selected,start,end)||intersects(names,start,end)||intersects(budgetItems,start,end)||intersects(singleQuotes,start,end))return;
  if(kind==='written'){
   if(quantity(start,start+m[1].length,end)||/[-\u2010-\u2015]/u.test(doc.text[end]||''))return;
   if(m[4]){
    const main=writtenMoneyNumber(m[1]),cents=m[3]?writtenMoneyNumber(m[3]):0,factor=/^cent/i.test(m[2])?.01:/^mill/i.test(m[2])?.001:1;
    const scale={thousand:1e3,million:1e6,billion:1e9,trillion:1e12}[m[5]?.toLowerCase()]||1,fig=Number(m[4].replace(/[\s,]/g,'').replace('−','-'))*scale;
    if(main!==null&&cents!==null&&cents<100&&Math.abs(main*factor+cents/100-fig)<.000001){selected.push({start,end});return;}
   }
  }
  if(kind==='figure'){
   const numberStart=start+m[0].indexOf(m.groups.number),numberEnd=numberStart+m.groups.number.length;
   if(numeric(numberStart,numberEnd))return;
   const before=source.slice(Math.max(0,start-15),start);
   if(/\b(?:CAD|AUD|NZD|CA|AU|NZ|HK|SG)\s*$/i.test(before))return;
  }
  const message='Review Suggested: Verify the monetary form in this provision. Its section type could not be established automatically. LCB bill money examples use words with matching parenthetical figures; uncodified findings and declarations and resolutions use figures alone. Confirm which context applies before changing this amount. No replacement has been selected.';
  const referencesForIssue=[
   {guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Money',guidePage:23,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===23).printedPage),preferred:null,ruleText:'ten dollars ($10) (bill); $10 (digest, opinion, and cover letter). LCB page 23 shows matching words and figures for bill monetary amounts.'},
   {guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Bill, item 5; Resolutions',guidePage:21,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===21).printedPage),preferred:null,ruleText:'In uncodified findings and declarations, dollar amounts are not repeated (use figures). Resolutions: Numeral rules for bills and digests apply, except dollar amounts are not repeated (use figures).'},
  ];
  const section=ctx.sections.find(s=>s.start<=start&&s.end>start);
  issues.push({start,end,text:doc.text.slice(start,end),matchText:m[0].replace(/\s+/g,' '),suggestion:null,rule:'Numerals: Monetary context review',guideId:'lcb',guidePage:23,guidePrintedPage:'23',category:'Monetary Context Review',context:'Bill',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'monetary-context',checkId:'lcb-unknown-money-review',conflict:false,matchesPrimary:false,message,references:referencesForIssue,sectionContext:section?{kind:'Unknown',start:section.start,end:section.end}:null});
  selected.push({start,end});
 };
 // Whole written/figure pairs own the dollar figure contained within them.
 for(const m of source.matchAll(written))add(m,'written');
 for(const m of source.matchAll(figure))add(m,'figure');
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
