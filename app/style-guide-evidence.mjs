import {lcbSourceItems} from './style-lcb-source-sections.mjs';

const clean=text=>text.replace(/\s+/gu,' ').trim();
const fold=text=>clean(text).toLocaleLowerCase('en-US');
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
function lcbExampleSection(page,rule){
 const sections=page.page===23?[
  ['MEASURES',/measures?/iu],['MONEY',/money|monetary/iu],['PERCENT',/percent/iu],['PROPORTIONS/RATIOS',/proportions?|ratios?/iu],['TIME',/\btime\b/iu]
 ]:page.page===22?[
  ['AGES',/\bages?\b/iu],['CODE SECTIONS AND CONSTITUTION',/code sections|constitution/iu],['CORRELATIVES/SPREADS',/correlatives?|spreads?/iu],['DAYS/DATES',/days|dates/iu],['GRADES',/grades?/iu]
 ]:[];
 const chosen=sections.find(([,pattern])=>pattern.test(rule||''));if(!chosen)return null;
 const headings=sections.flatMap(([title])=>{
  const pattern=new RegExp('(?:^|\\n)[ \\t]*'+title.split(' ').map(escape).join('[ \\t\\r\\n]+')+'(?:[ \\t]+\\([^\\n]*\\))?[ \\t]*(?=\\n|$)','u');
  const match=pattern.exec(page.text);return match?[{title,start:match.index}]:[];
 }).sort((a,b)=>a.start-b.start);
 const index=headings.findIndex(h=>h.title===chosen[0]);if(index<0)return null;
 const start=headings[index].start,end=headings[index+1]?.start??page.text.length;
 return {text:clean(page.text.slice(start,end)),kind:'Printed source examples',page:page.page,start,end};
}
// These are excerpts from the bundled source, never generated paraphrases.
// A page fallback is labelled as such rather than presented as an exact rule.
export function guidePassage(reference,citation){
 const page=reference?.pages?.find(p=>p.page===citation.guidePage);
 if(!page)return null;
 if(citation.guideId==='lcb'){
  const item=/\bitem\s+(\d+)\b/iu.exec(citation.rule||'');
  if(item){
   const section=/\b(Bill|Digest|Resolutions|General)\b/u.exec(citation.rule||'')?.[1];
   const spelling=page.page===2&&/^Spelling and usage\b/iu.test(citation.rule||'');
   const passages=lcbSourceItems(page).filter(p=>p.number===item[1]&&(!section||p.section===section)&&(!spelling||p.section!=='Office Preferences'));
   if(passages.length===1)return {text:passages[0].text,kind:'Source provision',page:page.page,start:passages[0].start,end:passages[0].end};
  }
  // A bounded detector can identify a more precise printed example than a
  // preferred-form lookup. Accept only exact offsets into this cited page;
  // labels or paraphrases supplied by a finding cannot establish authority.
  const witness=citation.sourcePassage;
  if(witness&&Number.isInteger(witness.start)&&Number.isInteger(witness.end)&&witness.start>=0&&witness.end>witness.start&&witness.end<=page.text.length&&(witness.page===undefined||witness.page===page.page)&&typeof witness.text==='string'&&witness.text.trim()&&page.text.slice(witness.start,witness.end)===witness.text){
   return {text:witness.text,kind:'Printed source passage',page:page.page,start:witness.start,end:witness.end};
  }
  const preferred=fold(citation.preferred||'');
  if(preferred){
   const entries=(page.lexicalEntries||[]).filter(entry=>{
    const value=fold(entry).replace(/\s*\([^)]*\)\s*/gu,' ').trim();
    return value===preferred;
   });
   if(entries.length===1)return {text:entries[0],kind:'Printed source example',page:page.page};
  }
  if(page.page===7&&['Public Employees’ Retirement System','State Teachers’ Retirement System','County Employees Retirement Law of 1937','extremely low, very low, low-, and moderate-income households',', including, but not limited to,'].includes(citation.ruleText)){
   const match=new RegExp(citation.ruleText.split(' ').map(escape).join('\\s+'),'u').exec(page.text);
   if(match)return {text:clean(match[0]),kind:'Printed source example',page:7,start:match.index,end:match.index+match[0].length};
  }
  const examples=lcbExampleSection(page,citation.rule);if(examples)return examples;
 }else if(citation.guideId==='gpo'){
  const number=/^\d+\.\d+$/u.test(citation.rule||'')?citation.rule:null;
  if(number){
   const pages=reference.pages.filter(p=>p.chapter===page.chapter&&p.page>=page.page),source=pages.map(p=>p.flowText||p.text).join('\n');
   const markers=[...source.matchAll(/(?:^|\n|(?<=[a-z]\.))[ \t]*(\d{1,2}\.\d{1,3})\.[ \t\n]+/gu)];
   const index=markers.findIndex(m=>m[1]===number);
   if(index>=0&&markers[index].index<(page.flowText||page.text).length){
    const start=markers[index].index,end=markers[index+1]?.index??source.length;
    return {text:clean(source.slice(start,end)),kind:'Source provision',page:page.page};
   }
  }
 }
 return {text:clean(page.flowText||page.text),kind:'Source page — confirm the applicable passage',page:page.page};
}

export function attachGuideEvidence(issue,references){
 const citations=(issue.references||[]).map(citation=>({...citation,sourcePassage:guidePassage(references[citation.guideId],citation)}));
 return {...issue,references:citations,reviewTask:issue.suggestion?
  `Compare “${issue.matchText||issue.text}” with the guide form “${issue.suggestion}”. Confirm that the stated context and exceptions apply before editing.`:
  `Review “${issue.matchText||issue.text}” under the cited provision. Confirm its meaning or role; no replacement is prescribed by this finding.`};
}
