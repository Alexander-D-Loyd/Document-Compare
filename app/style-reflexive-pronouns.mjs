import {styleContext,styleRangeBlocked} from './style-context.mjs';

export const REFLEXIVE_FORMS=[['her self','herself'],['him self','himself'],['it self','itself'],['my self','myself'],['our selves','ourselves'],['them selves','themselves'],['thy self','thyself'],['your self','yourself'],['your selves','yourselves'],['one self','oneself']];

// Matching explicit pronoun subjects and finite predicates establish a bounded
// emphatic role. Noun subjects, coordination and unknown predicates stay manual.
const EMPHATIC_SUBJECTS={herself:['she','is|was|has|does'],himself:['he','is|was|has|does'],itself:['it','is|was|has|does'],myself:['i','am|was|have|do'],ourselves:['we','are|were|have|do'],themselves:['they','are|were|have|do'],thyself:['thou','art|wast|hast|dost'],yourself:['you','are|were|have|do'],yourselves:['you','are|were|have|do']};
function emphaticSubject(ctx,start,after,preferred){
 const role=EMPHATIC_SUBJECTS[preferred];if(!role)return false;
 const before=ctx.source.slice(ctx.sentenceAt(start).start,start);
 return new RegExp('(?:^|[;:])\\s*(?:\\([a-z]\\)\\s*)?'+role[0]+'\\s+$','i').test(before)&&new RegExp('^\\s+(?:'+role[1]+'|shall|will|may|can|could|must|should|would)\\b','i').test(after);
}

export function reflexivePronounIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [variant,preferred] of REFLEXIVE_FORMS){
  for(const m of source.matchAll(new RegExp('\\b'+variant.replace(' ','\\s+')+'\\b','gi'))){
   const start=m.index,end=start+m[0].length;
   if(styleRangeBlocked(doc,start,end)||ctx.at(start)==='Heading'||ctx.tableAt(start)||ctx.tableAt(end-1)||quotes.some(r=>r.start<end&&r.end>start))continue;
   const before=source.slice(Math.max(0,start-65),start),after=source.slice(end,end+65);
   // Require a recognized reflexive construction. A following noun such as
   // 'her self assessment' has a different parse and must remain untouched.
   const one=preferred==='oneself';
   const lead=one?/\b(?:by|for)\s+$/i:/\b(?:by|for|about|to|of|with|against|from|on|identify|identifies|identified|protect|protects|protected|defend|defends|defended|represent|represents|represented|govern|governs|governed|support|supports|supported)\s+$/i;
   const reflexive=lead.test(before)&&/^\s*(?:[.;,:!?)]|$|(?:from|to|by|on|with|against|in|through|as|without|rather|and|or)\b)/i.test(after);
   const emphatic=emphaticSubject(ctx,start,after,preferred);
   if(!reflexive&&!emphatic)continue;
   if(m[0]===m[0].toUpperCase()||/\bself\s*[-:]\s*$/i.test(before))continue;
   const suggestion=/^[A-Z]/.test(m[0])?preferred[0].toUpperCase()+preferred.slice(1):preferred;
   const message='GPO prints compound personal pronouns as one word. This separated form occurs in '+(emphatic?'an emphatic construction with a matching explicit pronoun subject and finite predicate':'a recognized reflexive construction')+'; preserve literal wording and other uses of “self”.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:114,guidePrintedPage:references.gpo.pages[113].printedPage,rule:'6.13',category:'Pronoun compounding',context:ctx.at(start),checkId:'reflexive-pronouns',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:114,guidePrintedPage:references.gpo.pages[113].printedPage,rule:'6.13',preferred:suggestion,ruleText:'GPO 6.13 prints compound personal pronouns as one word; examples include herself, himself, itself, myself, oneself, ourselves, themselves, thyself, yourself and yourselves.'}]});
  }
 }
 return issues;
}
