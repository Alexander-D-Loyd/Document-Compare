import {styleContext} from './style-context.mjs';
// Full formal names supported by the source's geologic-time table. A name
// alone is not classified as geology, and no scientific date is verified.
export const GEOLOGIC_NAMES=[
 ...['Phanerozoic','Proterozoic','Archean','Hadean'].map(n=>n+' Eon'),
 ...['Cenozoic','Mesozoic','Paleozoic','Neoproterozoic','Mesoproterozoic','Paleoproterozoic','Neoarchean','Mesoarchean','Paleoarchean','Eoarchean'].map(n=>n+' Era'),
 ...['Quaternary','Cretaceous','Jurassic','Triassic','Permian','Carboniferous','Devonian','Silurian','Ordovician','Cambrian','Ediacaran','Cryogenian','Tonian','Stenian','Ectasian','Calymmian','Statherian','Orosirian','Rhyacian','Siderian'].map(n=>n+' Period'),
 'Cincinnati Arch','Cedar Creek Anticline','Ozark Uplift'
];
export function geologicNameIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const name of GEOLOGIC_NAMES){
  for(const m of source.matchAll(new RegExp('\\b'+name.replaceAll(' ','\\s+')+'\\b','gi'))){
   const start=m.index,end=start+m[0].length;
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(r=>r.start<end&&r.end>start)||m[0]===m[0].toUpperCase()||m[0].replace(/\s+/g,' ')===name)continue;
   const structural=/ (?:Arch|Anticline|Uplift)$/.test(name);
   const message=structural?'GPO Chapter 18 capitalizes a structural term when preceded by its name, with “'+name+'” as a source example.':'GPO Chapter 18 capitalizes formal geologic terms. The source table identifies the formal name “'+name+'”; an isolated era/period word or unfamiliar technical term is not automatically classified.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:name,guideId:'gpo',guidePage:363,guidePrintedPage:references.gpo.pages[362].printedPage,rule:'18 · Geologic terms',category:'Geologic capitalization',context:ctx.at(start),checkId:'geologic-names',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:363,guidePrintedPage:references.gpo.pages[362].printedPage,rule:'Geologic terms',preferred:name,ruleText:message+' Verbatim geologic quotations retain their original author’s usage.'}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
