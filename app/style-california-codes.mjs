import {CALIFORNIA_CODES,CALIFORNIA_CODES_SOURCE} from './data/california-codes.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {styleEvidenceGuard,originalBodyStyleContext} from './style-evidence.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {eraReferenceRanges} from './style-gpo-era-references.mjs';
const clean=s=>s.replace(/\s+/gu,' ').trim();
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const layoutName=s=>clean(s.replace(/(?<=\p{L})-[ \t]*\n\s*(?=\p{L})/gu,''));
const byName=new Map(CALIFORNIA_CODES.map(e=>[e.name.toLowerCase(),e]));
const byShort=new Map(CALIFORNIA_CODES.map(e=>[e.shorthand,e]));
const names=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:'+CALIFORNIA_CODES.map(e=>e.name.split(' ').map(w=>[...w].map(escape).join('(?:-[ \\t]*\\n\\s*)?')).join('\\s+')).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
// Uppercase title words and explicit "of/under the ... Code" citations give
// unlisted titles a bounded review path, without guessing a replacement.
// Only recognized abbreviated prefixes may carry a period inside a title.
// Sentence punctuation cannot join independent citations into one finding.
const titled=/(?<![\p{L}\p{N}\p{M}_])(?:Cal\.|U\.\s*S\.|[\p{Lu}][\p{L}\p{M}'’\-]*)(?:\s+(?:(?:Cal\.|U\.\s*S\.|[\p{Lu}][\p{L}\p{M}'’\-]*)|and|of|&)){0,7}\s+Codes?\b(?:\s+of\s+(?:Civil\s+Procedures?|[\p{Lu}][\p{L}\p{M}]+(?:\s+[\p{Lu}][\p{L}\p{M}]+){0,3}))?/gu;
const explicit=/(?:\b(?:of|under|pursuant\s+to)\s+the\s+)([\p{L}&][\p{L}\p{M}&'’ \n-]{0,100}?\bCodes?\b(?:\s+of\s+(?:civil\s+procedures?|regulations))?)/giu;
const otherJurisdiction='(?:United\\s+States|U\\.\\s*S\\.|Internal\\s+Revenue|Federal|Nevada|New\\s+York|Texas|Arizona|Oregon|Washington|Idaho|Utah|Colorado|Florida|Louisiana|Canadian|Uniform|Model|International|Municipal|County|City)';
const foreign=new RegExp('\\b'+otherJurisdiction+'\\s*$','iu'),foreignTitle=new RegExp('^'+otherJurisdiction+'\\s+','iu');
const titlePrefix=/^(?:(?:The|Under|See|Notwithstanding|Amend|Amending|California|Cal\.)\s+)+/iu;
const codeWords=new Set([...CALIFORNIA_CODES.flatMap(e=>e.name.toLowerCase().split(' ')),'regulations']);
const shorts=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:'+CALIFORNIA_CODES.map(e=>e.shorthand).sort((a,b)=>b.length-a.length).join('|')+')(?:\\.)?(?![\\p{L}\\p{N}\\p{M}_])','giu');
const sectionAfter=/^\s*(?:§{1,2}|[Ss]ections?\b|[Ss]ecs?\.|\d)/u;
export function californiaCodeIssues(doc){
 const view=styleWordDivisionView(doc,{knownWords:codeWords,knownWordsOnly:true,includeLiterals:true,includeTables:true});
 return view?view.restore(withStyleContext(view.doc,()=>codeIssues(view.doc))):codeIssues(doc);
}
function codeIssues(doc){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 // This user-requested citation check includes quoted citations and tables.
 // Technical literals, strikeouts, and unknown excluded content remain blocked.
 const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:ctx.technicalAt,tableAt:()=>false});
 const candidates=[],issues=[];
 const add=(start,end,kind,pair=null)=>{if(kind==='name')start+=(titlePrefix.exec(source.slice(start,end))?.[0]||'').length;if(end>start)candidates.push({start,end,kind,pair});};
 for(const m of source.matchAll(names))add(m.index,m.index+m[0].length,'name');
 for(const m of source.matchAll(titled)){
  const prefix=titlePrefix.exec(m[0])?.[0]||'';add(m.index+prefix.length,m.index+m[0].length,'name');
 }
 for(const m of source.matchAll(explicit)){const start=m.index+m[0].length-m[1].length;add(start,start+m[1].length,'name');}
 // Lowercase misspellings also need a review when followed by an explicit
 // section cue; do not treat every ordinary prose use of "code" as a title.
 for(const m of source.matchAll(/\b[a-z]+(?:\s+(?:and|of|&)\s+[a-z]+)*\s+codes?\b(?=\s*(?:§|[Ss]ections?\s+\d|[Ss]ecs?\.\s+\d|\d))/gu))add(m.index,m.index+m[0].length,'name');
 // The exceptional title starts with Code rather than ending with it.
 for(const m of source.matchAll(/\bcode\s+of\s+civil\s+procedures?\b/giu))add(m.index,m.index+m[0].length,'name');
 // Prefer a complete title to its nested, otherwise-valid suffix (for example
 // "Unemployment Insurance Code" versus "Insurance Code").
 const titles=candidates.sort((a,b)=>a.start-b.start||b.end-a.end).filter((r,n,rows)=>!rows.slice(0,n).some(p=>p.start<=r.start&&p.end>=r.end)).filter(r=>{
  // This separate regulatory title is outside the supplied statutory-code
  // registry. Require its complete original California qualifier; a generic
  // or unfamiliar Code title remains eligible for exact-list review.
  return !(/^Code of Regulations$/iu.test(layoutName(source.slice(r.start,r.end)))&&/\bCalifornia\s+$/iu.test(original.slice(0,r.start)));
 });
 for(const title of titles){
  const row=byName.get(layoutName(source.slice(title.start,title.end)).toLowerCase());
  const after=source.slice(title.end,title.end+50),pair=/^\s*(?:[-–—]\s*|\(\s*|(?=[A-Z]{2,6}\b))([A-Za-z]{2,6}\.?|(?:[A-Za-z][.&]){1,6}[A-Za-z]\.?)(?=\s*(?:\)|[,;:.]|$|§|\d))/u.exec(after);
  if(pair){
   // A paired replacement inherits the complete title's identity. Removed
   // characters cannot manufacture that identity or its original endpoints.
   // Only the explicitly parsed adjoining separator dash is punctuation.
   const titleOriginal=/[-–—]/u.test(doc.text[title.end]||'')?original.slice(0,title.end)+' '+original.slice(title.end+1):original;
   if(entityNameBoundaryBlocked(doc.text,source,titleOriginal,title.start,title.end))continue;
   const start=title.end+pair[0].lastIndexOf(pair[1]),raw=pair[1];
   if(blocked(title.start,start+raw.length))continue;
   // A final sentence period outside parentheses is punctuation, not part
   // of the listed shorthand. A period printed inside (GOV.) remains exact
   // shorthand evidence, as does an abbreviation before a section citation.
   const sentencePeriod=raw.endsWith('.')&&!/^\s*\(/u.test(after)&&/^\s*$/u.test(source.slice(start+raw.length));
   add(start,start+raw.length-Number(sentencePeriod),'shorthand',row||null);candidates.at(-1).paired=true;title.paired=true;
  }
 }
 for(const m of source.matchAll(shorts))if(sectionAfter.test(source.slice(m.index+m[0].length,m.index+m[0].length+30))||/\b(?:Cal\.|California)\s*$/u.test(source.slice(Math.max(0,m.index-20),m.index)))add(m.index,m.index+m[0].length,'shorthand');
 // Unknown short forms need an explicit section symbol/word, California
 // qualifier, or "Section N of ..." cue. Bill IDs and ordinary acronyms alone
 // are not evidence that an unlisted token is a California Code citation.
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])[A-Za-z]{2,6}\.?(?![\p{L}\p{N}\p{M}_])/gu)){
  const after=source.slice(m.index+m[0].length,m.index+m[0].length+30),before=source.slice(Math.max(0,m.index-60),m.index);
  const uppercase=/^[A-Z]{2,6}\.?$/u.test(m[0]),symbol=/^\s*§/u.test(after);
  if(symbol||uppercase&&/^\s*(?:[Ss]ections?\s+\d|[Ss]ecs?\.\s+\d)/u.test(after)||sectionAfter.test(after)&&/\b(?:Cal\.|California)\s*$/u.test(before)||uppercase&&/\bsections?\s+\d[\d.()\s,-]*\s+of\s+(?:the\s+)?$/iu.test(before))add(m.index,m.index+m[0].length,'shorthand');
 }
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:[A-Za-z][.&]){1,6}[A-Za-z]\.?(?![\p{L}\p{N}\p{M}_])/gu))if(sectionAfter.test(source.slice(m.index+m[0].length,m.index+m[0].length+30)))add(m.index,m.index+m[0].length,'shorthand');
 // An explicitly parsed title owns its shorthand. The independent acronym
 // scan may also include the following sentence period; it must not create
 // a competing correction with a different code identity or source span.
 const pairedShorts=candidates.filter(r=>r.kind==='shorthand'&&r.paired);
 const shortCandidates=candidates.filter(r=>r.kind==='shorthand'&&(r.paired||!pairedShorts.some(p=>p.start===r.start&&(r.end===p.end||r.end===p.end+1&&source[p.end]==='.'))));
 const all=[...titles,...shortCandidates].sort((a,b)=>a.start-b.start||b.end-a.end||Number(!!b.pair)-Number(!!a.pair)),seen=new Set();
 for(const r of all){
  const {start,end,kind,pair}=r,key=kind+':'+start+':'+end;if(seen.has(key))continue;seen.add(key);
  let boundaryOriginal=original;
  // An explicitly parsed name–shorthand separator is not a technical affix.
  // Only that printed separator is ignored; the opposite endpoint retains
  // all original negative evidence, including masked identifier attachments.
  const separator=r.paired?(kind==='name'?end:start-1):-1;
  if(separator>=0&&/[-–—]/u.test(doc.text[separator]||''))boundaryOriginal=original.slice(0,separator)+' '+original.slice(separator+1);
  if(blocked(start,end)||entityNameBoundaryBlocked(doc.text,source,boundaryOriginal,start,end))continue;
  const before=original.slice(Math.max(0,start-80),start);
  if(foreign.test(before)||foreignTitle.test(clean(source.slice(start,end)))||/^Code\s+of\s+Federal\s+Regulations\b/iu.test(clean(source.slice(start,end))))continue;
  // Do not validate an acronym nested inside a code title or ordinary prose
  // that happens to precede a section reference.
  if(kind==='shorthand'&&(titles.some(t=>t.start<=start&&t.end>=end)||/^(?:the|under|see|and|or|of|to|in|per|code|codes|title|chapter|part|rule|rules|article|usc|cfr|pl|stat|sec|secs|section|ab|sb|hr|us|eg|ie|etc)$/iu.test(clean(source.slice(start,end)).replaceAll('.',''))))continue;
  const text=doc.text.slice(start,end),raw=source.slice(start,end),joined=layoutName(raw),form=kind==='name'&&byName.has(joined.toLowerCase())?joined:clean(raw);
  if(kind==='name'&&(/^(?:(?:(?:Department\s+)?Organization|Standardized\s+Account|Reference|Fund|Account|Access|ZIP|Postal|Area|QR|Bar)\s+)?codes?$/iu.test(form)||/^\s+Structure\b/u.test(source.slice(end,end+30))))continue;
  const row=kind==='name'?byName.get(form.toLowerCase()):byShort.get(form.replace(/\.$/u,'').toUpperCase());
  const expected=pair?.shorthand||(kind==='name'?row?.name:row?.shorthand);
  if(form===expected)continue;
  const rule=kind==='name'?'Exact code name':'Exact shorthand',message=expected?`“${form}” does not exactly match ${pair?'the shorthand for '+pair.name:'the California Codes list'}. Listed form: “${expected}”.`:`“${form}” is not an exact ${kind==='name'?'code name':'shorthand'} in the California Codes list. Confirm the intended citation; no replacement is inferred.`;
  issues.push({start,end,text,matchText:form,suggestion:expected||null,guideId:'california-codes',rule,category:kind==='name'?'California Code name':'California Code shorthand',checkId:'california-codes-'+kind,context:ctx.at(start),conflict:false,reviewSuggested:!expected,message,codeSource:{...CALIFORNIA_CODES_SOURCE,entry:pair||row||null,pairedWith:pair?.name||null},references:[{guideId:'california-codes',guideName:'California Codes',rule,preferred:expected||null,ruleText:message}]});
 }
 const eras=eraReferenceRanges(doc,ctx);
 return issues.filter(i=>!eras.some(r=>r.markerStart<=i.start&&r.markerEnd>=i.end));
}
