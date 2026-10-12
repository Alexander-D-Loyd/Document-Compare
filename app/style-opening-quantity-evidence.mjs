import {METRIC_SYMBOLS}from './metric-units.mjs';
const wordBoundary='(?![\\p{L}\\p{N}\\p{M}_-])';
const reserved='(?:that|which|who|whose|where|when|if|unless|provided|and|or|is|are|was|were|shall|must|may|will|would|can|could|should|remains?|applies|apply|supports?|provides?|constitutes?|represents?|exceeds?)';
const nounWord='(?!'+reserved+'\\b)[a-z]+(?:[’\'][a-z]+)?';
const complement='(?:required|needed|available|sufficient|necessary|permitted|allowed|prohibited|valid|invalid|appropriate|inappropriate|adequate|inadequate|acceptable|unacceptable|due|remaining|included|excluded|allocated|used|retained|provided|the\\s+(?:maximum|minimum|rate|frequency|limit|requirement))'+wordBoundary;
const finite='(?:(?:shall|must|may|will|would|can|could|should)\\s+(?:not\\s+)?(?:be\\s+'+complement+'|remain'+wordBoundary+'|apply'+wordBoundary+')|(?:is|are|was|were)\\s+(?:not\\s+)?'+complement+'|(?:remains?|applies|apply)'+wordBoundary+')';
const predicate=new RegExp('^\\s+(?:of\\s+(?:(?:the|these|those|this|that)\\s+)?(?:'+nounWord+'\\s+)+)?'+finite,'iu');
const partitive=new RegExp('^\\s+of\\s+(?:(?:the|these|those|this|that|a|an)\\s+)?(?:'+nounWord+'\\s+)+'+finite,'iu');
const unit=/^\s*(%|[A-Za-zμµ]+)(?![\p{L}\p{N}\p{M}_-])/u,metric=new Set(METRIC_SYMBOLS),money=new Set('dollar dollars cent cents million millions billion billions trillion trillions'.split(' ')),reservedUnit=new RegExp('^(?:'+reserved+'|of|the|a|an|to|in|by|for|at|from|with)$','iu');
export const MULTIWORD_QUANTITY_OPENING_SCOPE='Sentence-opening quantity review additionally recognizes selected complete multiword measures (square/cubic units, fluid ounces, acre-feet and kilowatt-hours), full-time/part-time equivalent employee/position/unit counts, and up to three selected lowercase qualifiers before a lowercase noun. The entire quantity phrase and its existing explicit finite predicate remain source evidence. This extends LCB21 general item1 and the agreeing GPO12.16 opening question; it does not prescribe the compound spelling, establish a technical meaning, or invent number wording. Incomplete, capitalized, extended, dashed, source-damaged, quoted and table evidence retains its guards. Other noun phrases and predicate roles remain unresolved.';
const qualifier='(?:additional|authorized|available|certified|combined|designated|eligible|licensed|maximum|minimum|permitted|qualified|registered|remaining|required|total)';
const qualifierWord=new RegExp('^'+qualifier+'$','u');
const multiwordUnit=new RegExp('^\\s+(?:(?:square|cubic)\\s+(?:foot|feet|inch|inches|yard|yards|mile|miles|meter|meters|metre|metres|centimeter|centimeters|centimetre|centimetres)|fluid\\s+ounces?|acre(?:-\\s*|\\s+)(?:foot|feet)|kilowatt(?:-\\s*|\\s+)hours?|(?:full|part)(?:-\\s*|\\s+)time(?:-\\s*|\\s+)equivalent(?:-\\s*|\\s+)(?:employees?|positions?|units?)|(?:'+qualifier+'\\s+){1,3}'+nounWord+')'+wordBoundary,'u');

// This is finite grammatical evidence, not a sentence or meaning parser.
// Callers must separately prove source opening, number and complete range.
export function openingQuantityClause(source,numberEnd,{allowPartitive=false,originalSource=source}={}){
 if(allowPartitive){const p=partitive.exec(source.slice(numberEnd));if(p)return {end:numberEnd,evidenceEnd:numberEnd+p[0].length};}
 const phrase=multiwordUnit.exec(source.slice(numberEnd));
 if(phrase){
  const end=numberEnd+phrase[0].length,p=predicate.exec(source.slice(end));
  // Source dash normalization must not reinterpret a body dash as a compound.
  const head=/[a-z]+(?:[’'][a-z]+)?$/u.exec(phrase[0])?.[0];
  if(p&&head&&!money.has(head)&&!qualifierWord.test(head)&&!/[\u2012-\u2015]/u.test(originalSource.slice(numberEnd,end)))return {end,evidenceEnd:end+p[0].length,quantityPhrase:'selected-multiword'};
 }
 const u=unit.exec(source.slice(numberEnd));if(!u||reservedUnit.test(u[1])||money.has(u[1].toLowerCase())||u[1]!=='%'&&!/^[a-z]+$/u.test(u[1])&&!metric.has(u[1]))return null;
 const end=numberEnd+u[0].length,p=predicate.exec(source.slice(end));return p?{end,evidenceEnd:end+p[0].length}:null;
}
export function quantityOpeningPrefix(ctx,start){
 const sentence=ctx.sentenceAt(start),digest=ctx.at(start)==='Digest'?/legislative\s+counsel[’']s\s+digest/iu.exec(ctx.source):null,floor=Math.max(sentence.start,digest?digest.index+digest[0].length:sentence.start);
 return ctx.source.slice(floor,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
}
export const quantitySingleQuoteRanges=source=>[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^']*'(?![\p{L}\p{N}\p{M}_])/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
// Masking an adjacent original suffix/hyphen must not turn a partial word
// into a complete copular complement or finite predicate.
export const quantityPredicateBoundaryBlocked=(doc,end)=>/^[\p{L}\p{N}\p{M}_-]/u.test(doc.text.slice(end,end+2));
