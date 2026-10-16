// Negative evidence only: masking an attached identifier delimiter must never
// turn a suffix/prefix inside a technical token into a standalone role cue.
export function originalRoleBoundaryBlocked(source,start,end){
 const before=source.slice(Math.max(0,start-2),start),after=source.slice(end,end+3);
 return /[\p{L}\p{N}\p{M}_.’'\-\u2010-\u2015/:\\#@]$/u.test(before)||/^[\p{L}\p{N}\p{M}_’'\-\u2010-\u2015/:\\#@]/u.test(after)||/^\.[\p{L}\p{N}\p{M}_]/u.test(after);
}
