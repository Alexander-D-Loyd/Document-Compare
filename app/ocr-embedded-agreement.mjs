const tokens=text=>[...text.normalize('NFKC').replace(/[-\u00ad\u2010][ \t]*\n\s*(?:line\s*\d+\s+)?/giu,'').replace(/^line\s*\d+\s*/gimu,'').toLowerCase().replace(/’/gu,"'").matchAll(/\p{L}[\p{L}\p{M}]*(?:['-][\p{L}\p{M}]+)*|\d+(?:[,.]\d+)*/gu)].map(m=>m[0]);
// Compare two readings of this same source PDF, never a different bill.
// Differences are uncertainty evidence; neither reading overwrites the other.
export function embeddedOcrDisagreements(embeddedText,ocrText){
 const available=new Map();for(const t of tokens(ocrText))available.set(t,(available.get(t)||0)+1);
 const missing=[];for(const t of tokens(embeddedText)){const n=available.get(t)||0;if(n)available.set(t,n-1);else missing.push(t);}
 return missing;
}
