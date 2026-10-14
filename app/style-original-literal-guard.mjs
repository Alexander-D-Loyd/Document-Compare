import {originalBodyStyleContext} from './style-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';

// Original enclosure marks are negative evidence only. Removing or striking
// a quotation boundary must never expose its literal payload as eligible prose.
export function originalStyleLiteralGuard(doc,ctx){
 const original=originalBodyStyleContext(doc);
 const singles=styleSingleQuoteRanges(original?.source||ctx.source);
 return (start,end)=>!!original?.literalAt(start,end)||singles.some(r=>start<r.end&&end>r.start);
}
