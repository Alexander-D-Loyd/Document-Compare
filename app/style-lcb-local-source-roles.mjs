import {styleEvidenceGuard,originalBodyStyleContext} from './style-evidence.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';
const word='[\\p{L}\\p{N}\\p{M}_]';
const left='(?<!'+word+')',right='(?!'+word+')';
// These are source-local applicability witnesses. They do not add names to a
// corpus or establish the legal identity of any budget act, program or home.
export function lcbLocalSourceRoleRanges(doc,ctx,references){
 const original=originalBodyStyleContext(doc)?.source||ctx.source,blocked=styleEvidenceGuard(doc,ctx),out=[];
 const collect=source=>{
  const found=[];
  for(const m of source.matchAll(new RegExp(left+'(?:a|that)\\s+budget\\s+act'+right,'gu'))){const tail=original.slice(m.index+m[0].length);if(/^\s+of\s+\d/u.test(tail))continue;found.push({role:'generic-budget-act',start:m.index,end:m.index+m[0].length});}
  const pages=references?.lcb?.pages?.filter(p=>p.page===19)||[];
  if(pages.length===1&&/In-Home Supportive Services\s+program/u.test(pages[0].text||'')&&pages[0].lexicalEntries?.includes('In-Home Supportive Services program'))for(const m of source.matchAll(new RegExp(left+'In-Home\\s+Supportive\\s+Services\\s*\\(IHSS\\)\\s+program'+right,'gu')))found.push({role:'canonical-ihss-program',start:m.index,end:m.index+m[0].length});
  return found;
 };
 const originals=new Set(collect(original).map(r=>r.role+':'+r.start+':'+r.end));
 for(const r of collect(ctx.source))if(originals.has(r.role+':'+r.start+':'+r.end)&&original.slice(r.start,r.end)===ctx.source.slice(r.start,r.end)&&!blocked(r.start,r.end)&&!originalRoleBoundaryBlocked(original,r.start,r.end))out.push(r);
 return out;
}
export function countyInstitutionCaptionRanges(doc,ctx){
 const original=originalBodyStyleContext(doc)?.source||ctx.source,blocked=styleEvidenceGuard(doc,{...ctx,literalAt:ctx.technicalAt,tableAt:()=>false});
 const pattern=new RegExp('^[ \\t]*(?:\\(\\d+\\)\\s+)?\\d{7}\\s*-\\s*Veterans\\s+Home\\s+of\\s+Califor(?:-[ \\t]*\\n\\s*)?nia\\s*-(?<suffix>(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){1,7}County)\\s*-(?<short>[A-Z]{2,12})(?<tail>\\.{3,}\\s*\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)(?=\\s*(?:$|\\n))','gmu');
 const collect=source=>[...source.matchAll(pattern)].filter(m=>m.groups.suffix.replace(/\s+/gu,' ').split(' ').map(w=>w[0]).join('')===m.groups.short).map(m=>({start:m.index,end:m.index+m[0].length,role:'institution-schedule-caption'}));
 const originals=new Set(collect(original).map(r=>r.start+':'+r.end));
 return collect(ctx.source).filter(r=>originals.has(r.start+':'+r.end)&&original.slice(r.start,r.end)===ctx.source.slice(r.start,r.end)&&!blocked(r.start,r.end));
}
