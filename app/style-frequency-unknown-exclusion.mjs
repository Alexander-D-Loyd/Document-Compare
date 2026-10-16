import {styleContext} from './style-context.mjs';
import {originalBodyStyleContext} from './style-evidence.mjs';
const beforeNegative=/\b(?:not|never|without|avoids?|avoided|avoiding|prohibits?|prohibited|prohibiting)\b/i;
const afterNegative=/^\s+(?:is|are|was|were)\s+(?:not|never)\b/i;
export const FREQUENCY_UNKNOWN_EXCLUSION_SCOPE='Negative evidence only for the existing explicit biannual/biennial frequency checks. Unknown excluded body text cannot erase an existing same-clause negation into a positive frequency assertion. Deliberately struck text remains removed in the negative-only context; real sentence/clause boundaries and recognized layout masks remain in force. The existing live guard is retained independently. This adds no frequency grammar, vocabulary, suggestion, meaning classification or general raw-source veto.';
export function createFrequencyUnknownExclusionGuard(doc,ctx=styleContext(doc)){
 const prior=originalBodyStyleContext(doc);if(!prior)return()=>false;
 let negativeSource=prior.source;
 if((doc.struck||[]).length){const chars=negativeSource.split('');for(const r of doc.struck)for(let at=Math.max(0,r.start);at<Math.min(chars.length,r.end);at++)if(chars[at]!=='\n')chars[at]=' ';negativeSource=chars.join('');}
 if(negativeSource===ctx.source)return()=>false;
 // This copied negative-only view restores unknown PDF exclusions but keeps
 // deliberate deletions masked. Reusing the sentence reader avoids treating
 // a restored full stop or abbreviation as a new grammatical interpretation.
 const negative=styleContext({...doc,text:negativeSource,excluded:[],struck:[]});
 return(start,matchEnd)=>{const sentence=negative.sentenceAt(start),before=negative.source.slice(sentence.start,start).split(/[;:,]/).at(-1),after=negative.source.slice(matchEnd,sentence.end);return beforeNegative.test(before)||afterNegative.test(after);};
}
