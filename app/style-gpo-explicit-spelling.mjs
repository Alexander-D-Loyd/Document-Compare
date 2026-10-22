import {styleContext,withStyleContext} from './style-context.mjs';
import {listedWordingContext} from './style-gpo-listed-wording.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';

export const GPO_EXPLICIT_SPELLING_SCOPE='One exact printed negative/preferred spelling row: GPO PDF97/printed83 lists flammable (not inflammable). Only intact lowercase inflammable as a complete prose word is compared. There are no generated derivatives, case or sense substitutions. Source quotations, bill-local quoted terms and explicit local means/shall mean/is defined as declarations, technical identifiers/endpoints, apparent/source-created names, headings, tables, source strikes and unknown exclusions are protected. An installed higher-priority ordered authority explicitly placing inflammable before flammable in the same preference row, and overlapping existing LCB findings, suppress the GPO comparison. Mere dictionary acceptance of inflammable does not establish a conflicting style preference. Capitalized/all-capital forms, unlisted variants/inflections, other sense pairs on the page and dictionary completeness remain outside this finite row.';

export function gpoExplicitSpellingIssues(doc,references,{existingIssues=[],authority=null}={}){
 return withStyleContext(doc,()=>{
  const page=references?.gpo?.pages?.find(p=>p.page===97),match=page&&/flammable \(not\s+inflammable\)/u.exec(page.text||'');if(!match)return [];
  if(authority?.entries?.some(row=>row.spellings?.[0]==='inflammable'&&row.spellings.slice(1).includes('flammable')))return [];
  const view=listedWordingContext(doc),ctx=styleContext(doc),issues=[];
  // A declaration is negative evidence throughout this loaded source. It
  // never creates a new definition or establishes a synonym's meaning.
  if(/(?<![\p{L}\p{N}\p{M}_])inflammable\s+(?:means|shall\s+mean|is\s+defined\s+as)(?![\p{L}\p{N}\p{M}_])/iu.test(view.original))return [];
  for(const m of view.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])inflammable(?![\p{L}\p{N}\p{M}_])/gu)){
   const start=m.index,end=start+m[0].length;
   if(view.guard(start,end)||originalRoleBoundaryBlocked(view.original,start,end)||/(?<![\p{L}\p{N}\p{M}_])(?:identifier|keyword|token|variable|parameter|symbol|serial|filename|file|path|url)\s*(?:[:=]\s*)?$/iu.test(view.original.slice(0,start))||existingIssues.some(i=>i.guideId==='lcb'&&i.start<end&&i.end>start))continue;
   const message='GPO’s printed spelling table explicitly lists flammable (not inflammable). Compare this intact unquoted base word with that one source row; no other spelling, derivative or meaning is inferred.';
   issues.push({start,end,evidenceStart:start,evidenceEnd:end,text:doc.text.slice(start,end),suggestion:'flammable',guideId:'gpo',guidePage:97,guidePrintedPage:page.printedPage,rule:'5.2: explicit spelling table',category:'Explicit GPO spelling',checkId:'gpo-explicit-spelling',context:ctx.at(start),conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:97,guidePrintedPage:page.printedPage,rule:'5.2: explicit spelling table',preferred:'flammable',ruleText:message,sourcePassage:{page:97,start:match.index,end:match.index+match[0].length,text:match[0]}}]});
  }
  return issues;
 });
}
