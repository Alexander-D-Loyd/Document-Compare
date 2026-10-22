// Citation-shaped source is not proof of a citation family, authority or error.
// This helper finds original text only; the caller must apply whole-source
// strike, exclusion, literal, table and physical-offset evidence protections.
const locator=/(?:§{1,2}\s*[\dA-Z]|\b(?:pp?\.|pages?|sections?|secs?\.|chapters?|ch\.|arts?\.|rules?|Nos?\.)\s*[\dA-Z])/u;
const year=/\b[12]\d{3}\b/u;
const dateParenthetical=/\([^()]*\b[12]\d{3}\b[^()]*\)/u;
const sourceName=/\b(?:Code|Constitution|Regulations|Rules of Court|Charter|Ordinance|Treaty|Report|Rep\.|Study|Manual|Book|Treatise|Dictionary|Dict\.|Law Review|L\.Rev\.|Journal|L\.J\.)/u;
const reporter='\\d+\\s+(?:[A-Z]{2,}\\.?|[A-Z][A-Za-z]*\\.[A-Za-z.]*)(?:\\s+[A-Z][A-Za-z.]+){0,3}\\s+\\d+(?:[-–]\\d+)?';
const reporterPattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_./#@-])'+reporter+'(?![\\p{L}\\p{N}\\p{M}_./#@-])','gu');
const signal='(?:(?:See(?: generally| also)?|Cf\\.|E\\.g\\.,?)\\s+)?';
const author='[\\p{Lu}][\\p{L}\\p{M}’\'.]*(?:[ \\t]+(?:[\\p{Lu}][\\p{L}\\p{M}’\'.]*|&|and|of|the|ex|rel\\.|re|et[ \\t]+al\\.)){0,15}';
const proseBibliography=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+signal+author+',\\s*[^()\\n;]{1,240}\\([^()\\n]{0,80}\\b[12]\\d{3}\\b[^()\\n]{0,40}\\)[^()\\n;]{0,160}?(?:§{1,2}\\s*\\d+[A-Za-z]*(?:[.:-]\\d+)*|\\b(?:pp?\\.|pages?|sections?|chapters?|ch\\.)\\s*[A-Z]?\\d+(?:[-–]\\d+)?)(?![\\p{L}\\p{N}\\p{M}_/#@-])','gu');
const shortReference=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+author+',\\s*supra(?:(?:\\s*,\\s*|\\s+)(?:at\\s+)?(?:pp?\\.|pages?|§{1,2})\\s*[A-Z]?\\d+(?:[-–]\\d+)?)?(?![\\p{L}\\p{N}\\p{M}_/#@-])','gu');
const repeatedReference=/(?<![\p{L}\p{N}\p{M}_/#@-])(?:[Ii]d\.|[Ii]bid\.)(?:\s+(?:at\s+)?(?:pp?\.|pages?|§{1,2})\s*[A-Z]?\d+(?:[-–]\d+)?)?(?![\p{L}\p{N}\p{M}_/#@-])/gu;
const namedChapterVerse=/(?<![\p{L}\p{N}\p{M}_/#@-])(?<name>(?:[123]\s+)?[\p{Lu}][\p{L}\p{M}’'-]*(?:\s+(?:[\p{Lu}][\p{L}\p{M}’'-]*|of|the)){0,3})\s+\d+:\d+(?:[-–](?:\d+:)?\d+)?(?![\p{L}\p{N}\p{M}_/#@-])/gu;
const nonWorkLabels=new Set(['Ratio','Proportion','Scale','Section','Chapter','Rule','Figure','Table','Example','Volume','Source','Exhibit','Item','Schedule','Title','Page','Pages','Line','Lines']);
const namedWork=m=>!m.groups.name.split(/\s+/u).some(w=>nonWorkLabels.has(w));
const overlaps=(a,b)=>a.start<b.end&&a.end>b.start;
const contains=(a,b)=>a.start<=b.start&&a.end>=b.end;

function citationShaped(text){
 if(/\b(?:supra|infra)\b|\b(?:[Ii]d|[Ii]bid)\./u.test(text))return true;
 if(sourceName.test(text)&&locator.test(text))return true;
 if(/\bv\.\s+[\p{Lu}]/u.test(text)&&(year.test(text)||locator.test(text)))return true;
 if(reporterPattern.test(text)){reporterPattern.lastIndex=0;return true;}reporterPattern.lastIndex=0;
 if([...text.matchAll(namedChapterVerse)].some(namedWork))return true;
 // Unknown books and institutional works need an actual bibliographic date
 // plus a locator, not just an ordinary parenthetical mentioning a year.
 return dateParenthetical.test(text)&&locator.test(text)&&/^\s*\(?\s*(?:(?:See(?: generally| also)?|Cf\.|E\.g\.,?)\s+)?(?:\d+\s+)?[\p{Lu}][\p{L}\p{M}’'.& -]*(?:,|\s+[\p{Lu}])/u.test(text);
}

function paragraphEnd(source,start){
 const tail=source.slice(start),gap=/\n[ \t]*\n/u.exec(tail);
 return gap?start+gap.index:source.length;
}

export function citationRecoveryRegions(source,recognizedRegions=[]){
 const found=[],enclosed=[],open=[],unmatchedCloses=[];
 for(let p=0;p<source.length;p++){
  if(source[p]==='(')open.push(p);
  else if(source[p]===')'){
   if(open.length){const start=open.pop();if(!open.length)enclosed.push({start,end:p+1});}
   else unmatchedCloses.push(p);
  }
 }
 const add=(r,recoveryKind,reason)=>{
  const text=source.slice(r.start,r.end);if(!text.trim()||!citationShaped(text))return;
  if(recoveryKind==='unknown-family'&&recognizedRegions.some(p=>contains(p,r)))return;
  found.push({...r,text,recoveryKind,reason});
 };
 for(const r of enclosed){
  if(r.end-r.start>=3000)add(r,'oversized-parenthetical','The complete parenthetical exceeds the ordinary citation recognizer’s size limit. Its internal fragments cannot establish a complete citation.');
  else add(r,'unknown-family','The passage has source-like locators or bibliographic coordinates, but no supported source family has established its citation requirements.');
 }
 // An unmatched outer opener owns its complete paragraph through the visible
 // source end. Do not turn a balanced inner year into a separate citation.
 for(const start of open.filter((p,n)=>!n||p>=paragraphEnd(source,open[n-1]))){
  const end=paragraphEnd(source,start),lineStart=source.lastIndexOf('\n',start)+1,prefix=source.slice(lineStart,start);
  const beginsDate=/^\(\s*(?:(?:\d+(?:st|nd|rd|th|d)\s+ed\.|[A-Z][a-z]+\.?\s+\d{1,2},?)\s+)?[12]\d{3}\b/u.test(source.slice(start));
  const a=beginsDate&&locator.test(source.slice(start,end))&&(sourceName.test(prefix)||/[\p{Lu}][\p{L}\p{M}’'.& -]+,\s*[\p{Lu}]/u.test(prefix))?lineStart:start;
  add({start:a,end},'unbalanced-parenthetical','The source contains an opening parenthesis without a matching close in this passage. Citation structure and boundaries remain unresolved.');
 }
 for(const end of unmatchedCloses){
  const start=source.lastIndexOf('\n',end)+1;
  add({start,end:end+1},'unbalanced-parenthetical','The source contains a closing parenthesis without a matching opener in this passage. Citation structure and boundaries remain unresolved.');
 }
 for(const pattern of [proseBibliography,shortReference,repeatedReference,reporterPattern,namedChapterVerse])for(const m of source.matchAll(pattern)){
  if(pattern===namedChapterVerse&&!namedWork(m))continue;
  const r={start:m.index,end:m.index+m[0].length,...(pattern===namedChapterVerse?{recoveryShape:'named-chapter-verse'}:{})};
  if(enclosed.some(p=>contains(p,r)))continue;
  add(r,'unknown-family',pattern===namedChapterVerse?'This name and chapter:verse-shaped locator do not establish the work. Identify the source first; if it is a Bible reference, verify the full book name and chapter/verse. No Bible identity, canonical name or expansion is inferred.':pattern===shortReference||pattern===repeatedReference?'This short reference does not establish the intended earlier authority or source family. Verify the complete reference chain and applicable citation form.':'The source-like author, title, reporter or locator is not assigned a supported citation family. Verify the source and applicable form without inferring its identity.');
 }
 // Incomplete outer text has one owner. Unknown nested fragments do not gain
 // additional tasks, nor can a recognized inner fragment settle that owner.
 const incomplete=found.filter(r=>r.recoveryKind!=='unknown-family');
 const ordered=found.sort((a,b)=>a.start-b.start||b.end-a.end),out=[];
 for(const r of ordered){
  if(r.recoveryKind==='unknown-family'&&incomplete.some(p=>overlaps(p,r)))continue;
  if(out.some(p=>contains(p,r)))continue;
  out.push(r);
 }
 return out;
}

// Negative number-role evidence only. A source-shaped title, date or reporter
// coordinate cannot certify its authenticity; nearby prose counts stay live.
export function citationRecoveryCoordinates(region){
 const out=[],text=region.text,add=(a,b)=>out.push({start:region.start+a,end:region.start+b,kind:'Unresolved citation coordinate protection'});
 for(const pattern of [reporterPattern,shortReference,repeatedReference,namedChapterVerse])for(const m of text.matchAll(pattern)){if(pattern===namedChapterVerse&&!namedWork(m))continue;add(m.index,m.index+m[0].length);}
 const titleDate=new RegExp('(?:^|\\(\\s*)'+signal+'(?:\\d+\\s+)?'+author+',\\s*[^()]{1,300}\\([^()]{0,80}\\b[12]\\d{3}\\b[^()]{0,40}\\)','gu');
 for(const m of text.matchAll(titleDate))add(m.index,m.index+m[0].length);
 const coordinate='[A-Z]?\\d+[A-Za-z]*(?:[.:-]\\d+[A-Za-z]*)*(?:\\([A-Za-z0-9]+\\))*';
 for(const m of text.matchAll(new RegExp('(?:§{1,2}|\\b(?:pp?\\.|pages?|sections?|secs?\\.|chapters?|ch\\.|arts?\\.|rules?|Nos?\\.))\\s*'+coordinate+'(?:\\s*(?:[-–]|,|and|&)\\s*'+coordinate+')*(?=\\s*(?:[,.;)\\]]|$))','gu')))add(m.index,m.index+m[0].length);
 for(const m of text.matchAll(/\(\s*(?:\d+(?:st|nd|rd|th|d)\s+ed\.\s+)?[12]\d{3}\s*\)/gu))add(m.index,m.index+m[0].length);
 return out;
}
