import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard} from './style-written-quantity-evidence.mjs';
import {canonicalWrittenValue,ones,tens} from './style-cardinal-values.mjs';
import {andCardinalParts} from './style-compound-cardinals.mjs';
import {sourceNameRanges} from './style-source-names.mjs';

export const LCB_TABLE_CELL_SCOPE='Source-confirmed tabular rows receive numeral checks even without an Item Amount heading. Canonical written amounts after leaders in explicit Budget Act item tables and written counts in source-aligned numeric columns have precise figure corrections; unknown column roles receive reader review without a replacement. Literal/name columns, headings, quoted cells, malformed quantities, source strikes, excluded evidence and table-adjacent prose remain protected. Numeric table roles use explicit source headers or quantity units; geometry by itself does not establish legal meaning. This is not a general table interpretation or footnote/fraction checker.';
const numericHeader=/^(?:(?:number|no\.)\s+of\s+)?(?:amount|amounts|total|totals|quantity|quantities|count|counts|duration|time|grade|grades|percent|percentage|percentages|ratio|ratios|permits|applications|applicants|requests|notices|days|weeks|months|years|hours|minutes|seconds|employees|positions|population|cost|costs|funding|appropriation|appropriations|dollars)$/i;
const literalHeader=/^(?:county|city|district|provider|program|name|names|title|description|item|unit|agency|department|entity|entities|location|address)$/i;
const quantityUnit=/^(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?|degrees?|percent|percentages?|dollars?|cents?|mills?)$/i;
const overlap=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
function cells(block,source){
 const body=source.slice(block.start,block.end),wide=[...body.matchAll(/[ \t]{2,}|\t+/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const geometric=(block.formatting?.headerGaps||[]).filter(g=>Number.isInteger(g.start)&&Number.isInteger(g.end)&&g.start>=0&&g.end>g.start&&g.end<=body.length&&/^\s+$/.test(body.slice(g.start,g.end)));
 const gaps=wide.length>=2?wide:geometric.length>=2?geometric:[];if(gaps.length<2)return [];
 const rows=[];let start=block.margin?.length||0;
 for(const gap of [...gaps,{start:body.length,end:body.length}]){if(gap.start<start)continue;const raw=body.slice(start,gap.start),lead=raw.search(/\S/),text=raw.trim();if(text)rows.push({start:block.start+start+lead,end:block.start+start+lead+text.length,text});start=gap.end;}
 return rows;
}
function completeValue(text){
 const normalized=text.toLowerCase().replace(/[\s-]+/g,' ').trim();
 if(!/\band\b/.test(normalized))return canonicalWrittenValue(normalized);
 const part=andCardinalParts(normalized);return part.length===1&&part[0].start===0&&part[0].end===normalized.length?part[0].value:null;
}
const numericalWords=new Set([...ones,...tens,'hundred','thousand','million','billion','trillion','and','or','nor','to','through']);
function cellNumbers(text,{allowUnfamiliarUnit=false}={}){
 const unit=/(?<gap>\s+)(?<unit>[A-Za-z]+)$/.exec(text),known=unit&&quantityUnit.test(unit.groups.unit),unfamiliar=!!(allowUnfamiliarUnit&&unit&&!known&&!numericalWords.has(unit.groups.unit.toLowerCase())),after=known||unfamiliar?unit.groups.unit:'',end=after?unit.index:text.length,numberText=text.slice(0,end);
 if(completeValue(numberText)!==null)return {after,unfamiliar,members:[{start:0,end}]};
 if([...numberText.matchAll(/\d+(?:,\d+)+(?:\.\d+)?/g)].some(m=>!/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(m[0])))return null;
 const scales=andCardinalParts(numberText);if(scales.some(p=>p.value===null))return null;
 const splitSource=numberText.replace(/(?<![\p{L}\p{N}\p{M}_])\d{1,3}(?:,\d{3})+(?!\d)/gu,m=>m.replaceAll(',','\uE000'));
 const connectors=[...splitSource.matchAll(/\s+(?:and|or|to|through)\s+|,\s*(?:(?:and|or)\s+)?/gi)].filter(m=>!scales.some(p=>p.start<m.index&&p.end>m.index));if(!connectors.length)return null;
 const members=[];let begin=0;
 let count=0;for(const connector of [...connectors,{index:numberText.length,0:''}]){const raw=numberText.slice(begin,connector.index),lead=raw.search(/\S/),part=raw.trim(),figure=/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(part);if(!part||!figure&&completeValue(part)===null)return null;if(!figure)members.push({start:begin+lead,end:begin+lead+part.length});count++;begin=connector.index+connector[0].length;}
 return count>=2&&members.length?{after,unfamiliar,members}:null;
}
function detector(doc,references,options){
 const ctx=styleContext(doc),source=ctx.source,tableCtx={...ctx,tableAt:()=>false},blocked=styleEvidenceGuard(doc,tableCtx),written=writtenQuantityEvidenceGuard(doc,tableCtx),numeric=numericExpressionGuard(doc,tableCtx),names=sourceNameRanges(source),existing=options.existingIssues||[],issues=[];
 const budgetWitness=[...source.matchAll(/\bBudget Act of\s+\d{4}/gi)].some(m=>!blocked(m.index,m.index+m[0].length));
 const itemWitness=[...source.matchAll(/(?<!\d)\d{4}-\d{3}-\d{4}\s*-/g)].some(m=>!blocked(m.index,m.index+m[0].length));
 const amountHeading=doc.blocks.some(b=>/^Item\s+Amount$/.test(source.slice(b.start,b.end).trim())&&!blocked(b.start,b.end));
 const budget=budgetWitness&&(itemWitness||amountHeading);
 let headers=null,prior=null;
 const add=(start,end,evidenceStart,evidenceEnd,precise,role)=>{
  const text=doc.text.slice(start,end),value=completeValue(source.slice(start,end));
  if(value===null||!Number.isSafeInteger(value)||value<0||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(evidenceStart,evidenceEnd)||written(start,end)||numeric(start,end)||overlap(names,start,end)||overlap(existing,start,end))return;
  const suggestion=precise?value.toLocaleString('en-US'):null;
  issues.push({start,end,text,suggestion,rule:'Numerals, general item 2',guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),category:precise?'Table Numeral Form':'Table Cell Review',context:'Table',confidence:precise?'Rule check':'Review Suggested',reviewSuggested:!precise,reviewKind:precise?undefined:'table-cell-role',checkId:precise?'lcb-table-cell-figures':'lcb-table-cell-review',conflict:false,matchesPrimary:false,message:precise?'LCB uses figures in tables, and GPO 13.101 agrees. This complete canonical written count occurs in '+role+'; only its number is changed.':'Review Suggested: This source-confirmed table cell contains a written number, but its column role is unresolved. If it is a quantity rather than a literal label, LCB and GPO use figures. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals, general item 2',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),preferred:suggestion,ruleText:'Always use figures with decimals, degrees, grades, percentages, ratios, time, and in tables.'},{guideId:'gpo',guideName:'GPO Style Manual',rule:'13.101',guidePage:312,guidePrintedPage:String(references.gpo.pages[311].printedPage),preferred:suggestion,ruleText:'Figures are used for all numbers, ordinals, and fractions in tables.'}]});
 };
 for(const block of doc.blocks){
  if(block.ignored||ctx.at(block.start)==='Heading'){headers=null;prior=null;continue;}
  const body=source.slice(block.start+(block.margin?.length||0),block.end),lineStart=block.start+(block.margin?.length||0),isTable=ctx.tableAt(block.start);
  if(!isTable){headers=null;prior=null;continue;}
  const leader=/\.{3,}[ \t]*(?<amount>[A-Za-z][A-Za-z\s-]*)$/.exec(body);
  if(leader){const amount=leader.groups.amount.trim(),start=lineStart+leader.index+leader[0].indexOf(leader.groups.amount);add(start,start+amount.length,lineStart,block.end,budget,budget?'an explicit Budget Act amount after leaders':'a leader-delimited cell');headers=null;prior=null;continue;}
  const row=cells(block,source);if(row.length<2){headers=null;prior=null;continue;}
  const roles=row.map(c=>numericHeader.test(c.text)?'numeric':literalHeader.test(c.text)?'literal':null);
  const headerOnly=row.every(c=>!cellNumbers(c.text)&&!/^\d+(?:,\d{3})*(?:\.\d+)?$/.test(c.text));
  if(headerOnly&&roles.filter(Boolean).length>=2&&roles.includes('numeric')){headers={cells:row,roles,page:block.page};prior=block;continue;}
  if(prior&&block.start-prior.end>2&&block.page===prior.page)headers=null;
  for(let index=0;index<row.length;index++){
   const cell=row[index],role=headers?.cells.length===row.length?headers.roles[index]:null;
   if(role==='literal')continue;
   const parsed=cellNumbers(source.slice(cell.start,cell.end),{allowUnfamiliarUnit:role==='numeric'});if(!parsed)continue;const {after}=parsed;
   const precise=!parsed.unfamiliar&&(role==='numeric'||quantityUnit.test(after)&&!textLooksNamed(cell.text)),headerStart=headers?.cells[0].start;
   // A source strike or exclusion in the numeric header invalidates its role.
   if(role==='numeric'&&blocked(headerStart,headers.cells.at(-1).end))continue;
   for(const member of parsed.members)add(cell.start+member.start,cell.start+member.end,cell.start,cell.end,precise,role==='numeric'?'a source-labelled numeric column':'a complete quantity with an explicit unit');
  }
  prior=block;
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function textLooksNamed(text){return /\b[A-Z][a-z]+\b/.test(text);}
export function lcbTableCellIssues(doc,references,options={}){
 if(!references?.lcb?.pages||!references?.gpo?.pages)return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],prior=view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing;
 const found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:prior}));return view?view.restore(found):found;
}
