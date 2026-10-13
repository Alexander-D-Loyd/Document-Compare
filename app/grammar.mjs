// Conservative offline English grammar rules. Offsets always refer to source text.
import {languageRangeGuard,findingText}from './finding-presentation.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
function indefiniteArticle(word){
  const lower=word.toLowerCase();
  if(word===word.toUpperCase()||/^(?:herb|historic|habitual)/.test(lower))return null;
  if(/^(?:heir|honest|honou?r|hour)/.test(lower))return 'an';
  if(/^(?:uni(?:corn|form|fy|fied|fication|lateral|on|que|t|vers)|use|user|usual|euro|one|once|ubiquit|utensil|utilit|utiliz|utilis)/.test(lower))return 'a';
  return /^[aeiou]/.test(lower)?'an':'a';
}
function articleCase(wanted,original){
  return original.length>1&&original===original.toUpperCase()?wanted.toUpperCase():/^[A-Z]/.test(original)?wanted[0].toUpperCase()+wanted.slice(1):wanted;
}
export function grammarIssues(doc) {
  const joined=styleWordDivisionView(doc);
  return joined?joined.restore(baseGrammarIssues(joined.doc)):baseGrammarIssues(doc);
}
function baseGrammarIssues(doc) {
  const blocked=[...(doc.excluded||[]),...(doc.struck||[])];
  const text=doc.text.split('');
  for(const r of blocked)for(let i=r.start;i<r.end;i++)if(text[i]!=='\n')text[i]=' ';
  const source=text.join(''),issues=[],cannotUse=languageRangeGuard(doc);
  const add=(start,end,message,suggestion)=>{
    if(!cannotUse(start,end))issues.push({start,end,message,suggestion});
  };
  // Cross-line whitespace is intentional: wrapping is not a grammar error.
  for(const m of source.matchAll(/\b([A-Za-z]+)\s+\1\b/gi)){
    if(m[1].length===1||/^[-\u00ad\u2010][ \t]*\n/.test(source.slice(m.index+m[0].length)))continue;
    // The month (or a person's name) May followed by the modal may is valid.
    // Preserve that case distinction instead of proposing removal of a verb.
    if(/^May\s+may$/.test(m[0]))continue;
    if(!['had','that'].includes(m[1].toLowerCase()))add(m.index,m.index+m[0].length,'Repeated word',m[1]);
  }
  for(const m of source.matchAll(/\b(a|an)\s+([A-Za-z]+)\b/gi)){
    // A divided fragment is not enough pronunciation evidence. The spelling
    // checker handles its reconstructed word independently.
    if(/^[-\u00ad\u2010][ \t]*\n/.test(source.slice(m.index+m[0].length)))continue;
    // Lettered references and named programs are not indefinite articles.
    // Function words cannot support an article-pronunciation correction.
    if(/^(?:a|an|the|and|or|of|in|to|for|from|on|at|by|with|under)$/i.test(m[2]))continue;
    if(/[-\u2010-\u2015]/.test(source[m.index-1]||''))continue;
    const before=source.slice(Math.max(0,m.index-100),m.index);
    if(/^a$/i.test(m[1])&&/\b(?:parts?|subparts?|articles?|sections?|chapters?|paragraphs?|subparagraphs?|subdivisions?|schedules?|appendix|appendices|attachments?|exhibits?|classes?|categories?|groups?|grades?|types?|forms?|plans?|options?|vitamin|hepatitis|cal\s+grant)\s+$/i.test(before))continue;
    const wanted=indefiniteArticle(m[2]);if(!wanted)continue;
    if(m[1].toLowerCase()!==wanted)add(m.index,m.index+m[0].length,'Check the indefinite article',articleCase(wanted,m[1])+' '+m[2]);
  }
  const patterns=[
    [/\b(I)\s+(is|are)\b/gi,'Subject–verb agreement','I am'],
    [/\b(he|she|it)\s+(are|have)\b/gi,'Subject–verb agreement',m=>m[1]+' '+(m[2].toLowerCase()==='are'?'is':'has')],
    [/\b(we|they|you)\s+(is|has)\b/gi,'Subject–verb agreement',m=>m[1]+' '+(m[2].toLowerCase()==='is'?'are':'have')],
    [/\b(could|would|should|must|might)\s+of\b/gi,'Use “have” after this modal verb',m=>m[1]+' have']
  ];
  for(const [pattern,message,suggestion] of patterns)for(const m of source.matchAll(pattern))add(m.index,m.index+m[0].length,message,typeof suggestion==='function'?suggestion(m):suggestion);
  return issues.sort((a,b)=>a.start-b.start||a.end-b.end).map(i=>({...i,matchText:findingText(doc,i)}));
}
