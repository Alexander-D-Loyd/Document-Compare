// Entity names can be followed by a genuine possessive or narrative dash/colon.
// Inputs are precomputed source strings, never a document to reconstruct.
// These punctuation marks differ from attached identifier delimiters. A masked
// source mark cannot supply the exception; original body text is negative only.
export function entityNameBoundaryBlocked(text,source,original,start,end){
 let before=original.slice(Math.max(0,start-2),start),after=original.slice(end,end+5);
 const narrativeDash=index=>/[\u2013-\u2015]/u.test(text[index]||'')&&source[index]==='-';
 if(narrativeDash(start-1))before=before.slice(0,-1)+' ';
 if(narrativeDash(end))after=' '+after.slice(1);
 else if(text[end]===':'&&source[end]===':'&&/^(?:\s|$)/u.test(text.slice(end+1,end+2)))after=' '+after.slice(1);
 else{
  const possessive=/^[’'](?:s)?(?=$|[\s,.;!?)]|:(?=\s|$))/u.exec(text.slice(end,end+8));
  if(possessive&&source.slice(end,end+possessive[0].length)===possessive[0])after=after.slice(possessive[0].length);
 }
 return /[\p{L}\p{N}\p{M}_.’'\-\u2010-\u2015/:\\#@]$/u.test(before)||/^[\p{L}\p{N}\p{M}_’'\-\u2010-\u2015/:\\#@]/u.test(after)||/^\.[\p{L}\p{N}\p{M}_]/u.test(after);
}
