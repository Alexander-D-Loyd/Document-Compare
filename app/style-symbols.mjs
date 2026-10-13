import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {dimensionMarkParts} from './style-dimension-marks.mjs';
export function symbolIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const add=(start,end,suggestion,rule,message)=>{
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))return;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,category:'Symbol notation',context:ctx.at(start),checkId:'symbols',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 const atom='(?:[A-Za-z]|\\d+(?:\\.\\d+)?)',op='[+−±×÷]';
 const pattern=new RegExp('\\b(?:equation|formula|expression)\\s+(?<expr>'+atom+'(?:\\s*'+op+'\\s*'+atom+'){1,5})(?=\\s*(?:[.;,:)]|=|\\bis\\b|$))','gi');
 for(const m of source.matchAll(pattern)){
  const expr=m.groups.expr;if(!/\s[+−±×÷]|[+−±×÷]\s/.test(expr))continue;
  const start=m.index+m[0].lastIndexOf(expr),end=start+expr.length;
  add(start,end,expr.replace(/\s*([+−±×÷])\s*/g,'$1'),'10.3','GPO 10.3 closes mathematical operators against accompanying figures and symbols. This check requires an explicit equation/formula/expression cue and simple single-letter or numeric operands; breeding crosses, magnification and ordinary prose remain protected.');
 }
 // Apply the explicit three-number percent-series example only in bill
 // prose; the digest’s symbol choice disagrees with GPO and is excluded.
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)\s+percent,\s+(\d+(?:\.\d+)?)\s+percent,?\s+(and|or)\s+(\d+(?:\.\d+)?)\s+percent\b/gi)){
  if(ctx.at(m.index)!=='Bill')continue;
  add(m.index,m.index+m[0].length,m[1]+', '+m[2]+', '+m[3]+' '+m[4]+' percent','10.5','GPO 10.5 illustrates a simple percent series with the word percent after its final figure. This check is limited to three bare percentage values, without intervening labels or distinct clauses.');
 }
 // GPO 10.6 explicitly illustrates 5′–7′ long versus 5–7′ long.
 // Preserve both values and the source connector; infer a shared physical
 // unit only when neither endpoint already states a different unit.
 for(const r of dimensionMarkParts(source)){
  if(!r.missingFirstMark||ctx.literalAt(r.start,r.evidenceEnd)||styleRangeBlocked(doc,r.start,r.evidenceEnd)||doc.blocks.some(b=>b.start<r.evidenceEnd&&b.end>r.start&&ctx.tableAt(Math.max(b.start,r.start))))continue;
  const originalJoin=doc.text.slice(r.joinStart,r.joinStart+r.bridge.length),bridge=[...r.bridge].map((c,n)=>/\S/.test(c)?originalJoin[n]:c).join('');
  const suggestion=(r.first+r.lastMark+r.firstGap+bridge+r.last+r.lastGap+r.lastMark).replace(/\s+/g,' ');
  add(r.start,r.end,suggestion,'10.6','GPO 10.6 repeats the unit symbol at each end of a range, including its 5′–7′ long example. This complete physical-dimension expression omits the first endpoint’s unit mark; repeat the final mark without changing either value or the connector. Other unit meanings, mixed-unit endpoints and unfamiliar contexts require review.');
 }
 return issues;
}
