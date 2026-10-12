import {styleContext,styleRangeBlocked} from './style-context.mjs';
// Case only: LCB20 covers U.S. and state courts. GPO76 capitalizes the
// U.S. title and the full Ohio name, but lowercases state short forms;
// GPO56 also lists descriptive supreme court of Virginia in lowercase.
// Unknown jurisdiction is not inferred from nearby prose. California's
// direct full name follows the same named-court rule; no registry status,
// other state/country ambiguity or short-form resolution is certified.
export function supremeCourtAgreement(doc,start,end){
 const ctx=styleContext(doc),source=ctx.source,before=source.slice(Math.max(0,start-110),start),after=source.slice(end,end+110);
 const nationalBefore=/\b(?:United\s+States|U\.S\.)\s+$/i.exec(before);
 const namedStateBefore=/\b(?:California|Ohio)\s+$/i.exec(before);
 const nationalAfter=/^\s+(?:of\s+the\s+United\s+States|\(U\.S\.\))(?=$|[^\p{L}\p{N}_])/iu.exec(after);
 // Do not guess whether an inverted, possessive, extended or mixed title
 // constitutes a complete official name. Those forms remain manual.
 if(/^\s+of\b/i.test(after)&&!nationalAfter)return null;
 if(namedStateBefore&&nationalAfter)return null;
 if(namedStateBefore&&/\bState\s+of\s+$/i.test(before.slice(0,namedStateBefore.index)))return null;
 if(/^\s+(?:association|foundation|committee|program|society|office|building)\b/i.test(after))return null;
 const qualifier=nationalBefore||namedStateBefore;
 if(!qualifier&&!nationalAfter)return null;
 const evidenceStart=qualifier?start-before.length+qualifier.index:start,evidenceEnd=nationalAfter?end+nationalAfter[0].length:end;
 if(styleRangeBlocked(doc,evidenceStart,evidenceEnd)||ctx.literalAt(evidenceStart,evidenceEnd))return null;
 if(doc.blocks.some(b=>b.start<evidenceEnd&&b.end>evidenceStart&&ctx.tableAt(b.start)))return null;
 return {start:evidenceStart,end:evidenceEnd,guidePage:namedStateBefore?.[0].trim().toLowerCase()==='california'?70:90,description:qualifier===namedStateBefore?'explicit full California/Ohio court name':'explicit United States court reference'};
}
