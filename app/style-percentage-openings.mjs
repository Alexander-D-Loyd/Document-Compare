import {styleRangeBlocked} from './style-context.mjs';

// These are finite clause cues, not a general sentence parser. In particular,
// a labelled allocation fragment after a colon is not automatically a sentence.
const subject='(?:the|this|that|these|those)\\s+(?:committee|funds?|grants?|revenue|allocation|appropriation|amount|budget|balance|share|employees?|members?)';
const predicate='(?:(?:shall|must|may|will|would|can|could|should)\\s+(?:not\\s+)?(?:be|remain|apply|support|provide|cover|fund|receive|go|constitute|consist|represent|exceed)\\b|(?:is|are|was|were|remains?|applies|apply|supports?|provides?|covers?|funds|receives?|goes|go|constitutes?|consists?|represents?|exceeds?)\\b)';
const clause=new RegExp('^\\s*(?:of\\s+'+subject+'\\s+)?'+predicate,'i');

export function percentageAllocationFragmentEvidence(doc,ctx,start,numberEnd){
 const source=ctx.source,block=doc.blocks.find(b=>b.start<=start&&b.end>start);
 if(!block||ctx.at(start)==='Heading'||!/^\s*(?:\([a-z\d]+\)\s*)+$/i.test(source.slice(block.start+block.margin.length,start)))return null;
 // Source-grounded recipients are a selected allocation grammar, not a
 // complete classification of statutory list items or arbitrary agencies.
 const part=/^\s+percent\s+to\s+the\s+(?:employees?|Division\s+of\s+Labor\s+Standards\s+Enforcement)(?=\s+(?:or|in|for)\b|[.,;:]|$)/i.exec(source.slice(numberEnd));
 if(!part)return null;
 const evidenceEnd=numberEnd+part[0].length;
 if(ctx.literalAt(start,evidenceEnd)||styleRangeBlocked(doc,start,evidenceEnd)||doc.blocks.some(b=>b.start<evidenceEnd&&b.end>start&&ctx.tableAt(Math.max(start,b.start))))return null;
 return {start,evidenceEnd};
}

export function percentageOpeningEvidence(doc,ctx,start,numberEnd){
 const source=ctx.source,unit=/^\s*(?:percent\b|%)/i.exec(source.slice(numberEnd));
 if(!unit||ctx.at(start)==='Heading'||/[\p{L}\p{N}_/⁄.,+−-]$/u.test(source.slice(Math.max(0,start-1),start)))return null;
 const end=numberEnd+unit[0].length;
 if(ctx.literalAt(start,end)||styleRangeBlocked(doc,start,end)||ctx.tableAt(start))return null;
 const sentence=ctx.sentenceAt(start),digest=ctx.at(start)==='Digest'&&/legislative\s+counsel[’']s\s+digest/i.exec(source),floor=Math.max(sentence.start,digest?digest.index+digest[0].length:sentence.start);
 const prefix=source.slice(floor,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
 const block=doc.blocks.find(b=>b.start<=start&&b.end>start),labelled=block&&/^\s*(?:\([a-z\d]+\)\s*)+$/i.test(source.slice(block.start+block.margin.length,start));
 let evidenceEnd=end;
 if(prefix){
  if(!labelled)return null;
  const lead=source.slice(Math.max(sentence.start,block.start-300),block.start).trimEnd();
  if(!/[:.!?]$/.test(lead))return null;
 }
 if(labelled){
  const finite=clause.exec(source.slice(end,end+240));
  if(!finite)return null;
  evidenceEnd=end+finite[0].length;
 }
 if(styleRangeBlocked(doc,start,evidenceEnd)||ctx.literalAt(start,evidenceEnd)||doc.blocks.some(b=>b.start<evidenceEnd&&b.end>start&&ctx.tableAt(Math.max(start,b.start))))return null;
 return {start,end,evidenceEnd};
}
