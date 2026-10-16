// Negative evidence for already-selected LCB possessive phrases only.
// Do not classify names, infer possession, or reject ordinary compound
// hyphens, apostrophes or separated narrative punctuation.
export function possessiveTechnicalBoundaryBlocked(original,start,end){
 const before=original.slice(Math.max(0,start-3),start),after=original.slice(end,end+3);
 return /[/\\#@]$/u.test(before)||/^[/\\#@]/u.test(after)||/[\p{L}\p{N}\p{M}_]\.$/u.test(before)||/^\.[\p{L}\p{N}\p{M}_]/u.test(after);
}
