import {styleRangeBlocked} from './style-context.mjs';
const fold=s=>s.replace(/\s+/g,' ').trim();
// The explicit introduction supplies its code title. Identical source titles
// establish scope; this is not a registry approving that title or legal status.
const codePattern=/\b(?:of|to)\s+the\s+(Code\s+of\s+Civil\s+Procedure|(?!Code\b)[A-Za-z]+(?:\s+(?!Code\b)(?:[A-Za-z]+|&)){0,7}\s+Code)\b/gi;
const scopePattern=/\b(?:for\s+(?:the\s+)?purposes\s+of|as\s+used\s+in)\s+this\s+(code|section|article|chapter|division|subdivision|paragraph)\s*[:,]/gi;
const office=/^(?:department|authority|board of supervisors|commission|director|trustee|superintendent|controllers?|treasurers?|courts?)$/i;
// Scope is evidence, not an inference from a shared office word. A complete
// explicit code introduction identifies only that code, not an external code
// hierarchy. Article/chapter/subdivision boundaries remain unresolved here.
export function officeDefinitionContext(doc,ctx){
 const source=ctx.source,sections=ctx.sections.map(section=>{
  const prefix=source.slice(section.start,Math.min(section.end,section.start+1000)),read=/\bto\s+read\s*:/i.exec(prefix);
  const names=section.kind==='Codified'&&read?[...prefix.slice(0,read.index).matchAll(codePattern)]:[],titles=new Set(names.map(m=>fold(m[1]).toLowerCase()));
  const name=titles.size===1?names[0]:null;
  const end=read?section.start+read.index+read[0].length:section.start;
  const safe=name&&!styleRangeBlocked(doc,section.start,end)&&!ctx.literalAt(section.start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>section.start&&ctx.tableAt(Math.max(b.start,section.start)));
  return {...section,code:safe?fold(name[1]).toLowerCase():null};
 });
 const at=offset=>sections.find(s=>s.start<=offset&&s.end>offset)||null;
 const safe=(start,end)=>!styleRangeBlocked(doc,start,end)&&!doc.blocks.some(b=>b.start<end&&b.end>start&&ctx.tableAt(Math.max(b.start,start)));
 const records=[];
 for(const m of source.matchAll(/(?:“([^”]{1,100})”|"([^"\n]{1,100})")\s+means\b/g)){
  const term=fold(m[1]||m[2]);if(!office.test(term))continue;
  if(ctx.literalRanges.some(r=>r.start<m.index&&r.end>m.index+m[0].length))continue;
  const section=at(m.index),base=section?.start||0,before=source.slice(base,m.index),qualifiers=[...before.matchAll(scopePattern)].filter(q=>safe(base+q.index,base+q.index+q[0].length)&&!ctx.literalAt(base+q.index,base+q.index+q[0].length));
  const qualifier=qualifiers.at(-1),between=qualifier?before.slice(qualifier.index+qualifier[0].length):'',adjoining=qualifier&&/^\s*(?:\([a-z0-9]+\)\s*)?$/i.test(between);
  // Only an adjoining scope clause is a positive cross-section binding. A
  // prior group introducer or unresolved wider scope supplies uncertainty,
  // never an invented article/subdivision range.
  const scope=adjoining&&safe(base+qualifier.index,m.index)?qualifier[1].toLowerCase():qualifier?'unresolved':'unspecified';
  const rightStart=m.index+m[0].length,right=source.slice(rightStart),publicTitle=/^\s+(?:the\s+)?Superintendent\s+of\s+Public\s+Instruction\b/i.exec(right);
  const definitionEnd=publicTitle?rightStart+publicTitle[0].length:rightStart;
  const intact=safe(m.index,definitionEnd),after=publicTitle?right.slice(publicTitle[0].length):'';
  const publicReferent=!!publicTitle&&intact&&!/^\s*[,;]?\s*(?:and|or)\b/i.test(after)&&!ctx.literalAt(rightStart,definitionEnd);
  records.push({term,section,scope,publicReferent,intact,context:ctx.at(m.index),start:m.index,end:definitionEnd});
 }
 const local=(r,section)=>r.section?.start===section?.start;
 const sameCode=(r,section)=>!!r.section?.code&&r.section.code===section?.code;
 return {
  records,sections,
  isDefined(term,offset){
   const section=at(offset);
   return records.some(r=>r.term===fold(term)&&r.intact&&r.context===ctx.at(offset)&&(local(r,section)||r.scope==='code'&&sameCode(r,section)||r.scope!=='section'&&r.scope!=='code'&&sameCode(r,section)));
  },
  isPublicSuperintendent(offset){
   const section=at(offset);if(section?.kind!=='Codified'||section.code!=='education code')return false;
   const relevant=records.filter(r=>r.term.toLowerCase()==='superintendent'),near=relevant.filter(r=>local(r,section));
   const selected=near.length?near:relevant.filter(r=>r.scope==='code'&&sameCode(r,section));
   return !!selected.length&&selected.every(r=>r.intact&&r.publicReferent&&['unspecified','section','code'].includes(r.scope));
  }
 };
}
