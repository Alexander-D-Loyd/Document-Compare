import {styleContext} from './style-context.mjs';
const pairs=[['supercede','supersede',5],['excede','exceed',null],['procede','proceed',5],['succede','succeed',null],['preceed','precede',4]];
export function verbEndingIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const gpo=references.gpo.pages.find(p=>/(?:^|\n)\s*5\.13\./.test(p.flowText||p.text));if(!gpo)return issues;
 for(const [bad,good,lcbPage] of pairs){
  const forms=[[bad,good],[bad+'s',good+'s'],[bad.endsWith('e')?bad+'d':bad+'ed',good.endsWith('e')?good+'d':good+'ed'],[bad.endsWith('e')?bad.slice(0,-1)+'ing':bad+'ing',good.endsWith('e')?good.slice(0,-1)+'ing':good+'ing']];
  for(const [variant,preferred] of forms)for(const m of source.matchAll(new RegExp('\\b'+variant+'\\b','gi'))){
   const start=m.index,end=start+m[0].length;if(ctx.at(start)==='Heading'||ctx.tableAt(start)||m[0]===m[0].toUpperCase()||quoted.some(r=>r.start<end&&r.end>start)||/^[A-Z]/.test(m[0])&&/^\s+[A-Z][a-z]/.test(source.slice(end)))continue;
   const suggestion=/^[A-Z]/.test(m[0])?preferred[0].toUpperCase()+preferred.slice(1):preferred;
   const cites=[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:gpo.page,guidePrintedPage:gpo.printedPage,rule:'5.13',preferred:suggestion,ruleText:'Only supersede ends in -sede; exceed, proceed and succeed end in -ceed; other words of this class end in -cede.'}];
   if(lcbPage)cites.unshift({guideId:'lcb',guideName:'LCB Style Manual',guidePage:lcbPage,guidePrintedPage:String(lcbPage),rule:'Spelling examples',preferred:suggestion,ruleText:'LCB lists '+(good==='precede'?'preceding':good==='proceed'?'proceeding':good)+'. Ordinary verb inflections preserve the listed stem.'});
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:cites[0].guideId,guidePage:cites[0].guidePage,guidePrintedPage:cites[0].guidePrintedPage,rule:cites[0].rule,category:'Verb spelling endings',context:ctx.at(start),checkId:'verb-endings',conflict:false,message:cites[0].ruleText,references:cites});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
