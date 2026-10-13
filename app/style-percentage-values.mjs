import {cutsOriginalStyleWord,styleEvidenceGuard} from './style-evidence.mjs';

export const LCB_PERCENTAGE_VALUE_SCOPE='LCB23 figures-plus-percent formatting selects complete integer, conventionally comma-grouped and decimal values. Exact original Unicode boundaries and complete source evidence protect malformed values, numeric identifiers, currency/signed/range/fraction fragments, literals, tables, strikes and unknown exclusions. Recognized wholly interior PDF running heads and margin prefixes may separate the intact value from its unit. Sentence-opening percentage policy and the excluded Digest/GPO preference conflict remain independent. Mixed fractions, signed values, unit-modifier meanings and whole-rule compliance remain outside this selected formatter.';

const afterNumericRangeConnector=(source,prior)=>{
 const connector=/\b(to|through)$/i.exec(source.slice(Math.max(0,prior-8),prior));
 if(!connector)return false;
 let end=prior-connector[1].length;while(end>0&&/\s/u.test(source[end-1]))end--;
 if(source[end-1]==='%')end--;else if(/\bpercent$/i.test(source.slice(Math.max(0,end-8),end)))end-='percent'.length;
 while(end>0&&/\s/u.test(source[end-1]))end--;
 return /\d/u.test(source[end-1]||'');
};

export function percentageValueMatches(doc,ctx){
 const blocked=styleEvidenceGuard(doc,ctx),out=[];
 const magnitude='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
 // Avoid retrying a long failed numerical token at every interior digit.
 // Original-source guards below still own correctness after masking.
 const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_.,/⁄+−-])('+magnitude+')(?:\\s*%|\\s+percent(?![\\p{L}\\p{N}\\p{M}_]))','giu');
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length;
  // Check original characters as well as the masked style source. A deleted
  // identifier prefix or comma cannot establish a standalone numeric value.
  if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end))continue;
  let prior=start;while(prior>0&&/\s/u.test(doc.text[prior-1]))prior--;
  const lead=doc.text.slice(Math.max(0,prior-32),start),tail=doc.text.slice(end);
  if(/[\p{L}\p{N}\p{M}_.,/⁄+−–—-]$/u.test(lead)||/[+−–—/⁄-]\s*$|[$€£¥₹¢]\s*$/u.test(lead)||/^[\p{L}\p{N}\p{M}_%/⁄-]/u.test(tail))continue;
  if(afterNumericRangeConnector(doc.text,prior)||/^\s*(?:[-−–—]|to\b|through\b)\s*\d/u.test(tail))continue;
  m.number=m[1];out.push(m);
 }
 return out;
}
