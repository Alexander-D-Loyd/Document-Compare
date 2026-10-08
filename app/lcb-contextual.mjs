import {styleContext} from './style-context.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const nouns='act|action|agreement|application|area|assessment|assistance|benefit|board|building|business|care|child|class|clause|committee|community|contract|cost|coverage|device|development|district|document|employee|employer|entity|equipment|facility|family|fee|fund|funding|group|guideline|household|housing|individual|information|institution|insurance|interest|law|loan|material|measure|member|method|notice|number|organization|owner|payment|person|personnel|plan|policy|practice|procedure|process|product|program|project|property|provider|rate|record|regulation|relationship|report|requirement|resident|resource|responsibility|rule|school|service|standard|structure|student|support|system|tax|technology|term|training|unit|utility|vehicle|worker';
const head=new RegExp('^\\s+(?:'+nouns+')(?:s|es)?\\b','i');
export function lcbModifierForms(reference){
 const forms=[];
 for(const p of reference.pages.filter(p=>p.page>=9&&p.page<=14)){
  for(const line of p.text.split('\n')){
   const m=/^\s*([A-Za-z]+(?:-[A-Za-z]+)+)\s+\(u\.m\.\)/.exec(line);
   if(m)forms.push({form:m[1],page:p.page});
  }
 }
 return forms;
}
export function lcbContextualIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const add=(m,suggestion,rule,page,message,category='Contextual style')=>{
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||m[0]===suggestion)return;
  if([...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  if(issues.some(i=>i.start===m.index&&i.end===m.index+m[0].length&&i.suggestion===suggestion))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category,context:ctx.at(m.index),checkId:'lcb-contextual',conflict:false,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(page),rule,preferred:suggestion,ruleText:message}],message});
 };
 // Explicitly listed unit-modifier forms, with a recognized noun head.
 // The same open phrase as a noun or predicate remains accepted.
 for(const item of lcbModifierForms(references.lcb)){
  const pattern=new RegExp('\\b'+item.form.split('-').map(escape).join('\\s+')+'\\b','gi');
  for(const m of source.matchAll(pattern))if(head.test(source.slice(m.index+m[0].length))){
   if(item.form==='in-state'&&!/\b(?:a|an|the|each|every|any|all|these|those)\s+$/i.test(source.slice(Math.max(0,m.index-25),m.index)))continue;
   const suggestion=m[0].replace(/\s+/g,'-');add(m,suggestion,'Hyphenation examples: '+item.form,item.page,'LCB lists “'+item.form+'” in unit-modifier position. Here the phrase precedes a recognized noun.','Modifier hyphenation');
  }
 }

 // Common multiword noun phrases form a single modifier before a participle.
 // Match the whole phrase rather than producing a partial health-related fix.
 for(const m of source.matchAll(/\b(?:mental\s+health|public\s+health|child\s+care|health\s+care|data\s+sharing)\s+(?:adopted|approved|based|related)\b/gi)){
  if(head.test(source.slice(m.index+m[0].length)))add(m,m[0].replace(/\s+/g,'-'),'Hyphenation, item 1',8,'LCB treats the whole phrase as a unit modifier before the following noun; the hyphens connect every component.','Modifier hyphenation');
 }
 // LCB page 16 explicitly extends these participles beyond its examples.
 for(const m of source.matchAll(/\b[a-z]+\s+(?:adopted|approved|based|related)\b/gi)){
  if(issues.some(i=>i.start<=m.index&&i.end>=m.index+m[0].length))continue;
  const first=m[0].split(/\s/)[0];if(/^(?:is|are|was|were|be|been|being|has|have|had|and|or|not|as|the|a|an|any|all|each|every|some|such|this|that|these|those|it|they|we|you|who|which|what|their|its|other|more|less|for|in|on|of|by|to|with|from|under|over|at|into|without)$/i.test(first)||/ly$/i.test(first)||/[’']/.test(source[m.index-1]||'')||/[A-Za-z]-\s*$/.test(source.slice(Math.max(0,m.index-30),m.index)))continue;
  if(/^(?:administers?|provides?|receives?|issues?|establishes?|maintains?|implements?|requires?|authorizes?|includes?|excludes?|applies|uses?|makes?)$/i.test(first))continue;
  if(head.test(source.slice(m.index+m[0].length)))add(m,m[0].replace(/\s+/g,'-'),'Hyphenation: End words',16,'LCB hyphenates -adopted, -approved, -based and -related in unit-modifier position.','Modifier hyphenation');
 }
 // Predicate adjectives use open forms, while an embedded noun modifier
 // after "is a" is still attributive and must retain its hyphen.
 const predicate=['cost-effective','hearing-impaired','hands-free','age-appropriate','high-quality','tax-exempt','well-known'];
 for(const form of predicate)for(const m of source.matchAll(new RegExp('\\b'+escape(form)+'\\b','gi'))){
  const before=source.slice(Math.max(0,m.index-35),m.index),after=source.slice(m.index+m[0].length);
  if(/\b(?:is|are|was|were|remains?|becomes?)\s+$/i.test(before)&&/^\s*(?:[.;,:!?]|$)/.test(after))add(m,m[0].replaceAll('-',' '),'Hyphenation, item 2',8,'LCB omits the hyphen in an adjective phrase following the word it modifies.','Modifier hyphenation');
 }
 for(const m of source.matchAll(/\b(?:ex-officio|bona-fide|per-capita|per-diem|prima-facie|de-minimis|inter-vivos)\b/gi))add(m,m[0].replaceAll('-',' '),'Hyphenation, item 4',8,'LCB does not hyphenate foreign phrases used as adjectives.','Modifier hyphenation');
 // Only established letter-by-letter initialisms; pronounceable acronyms
 // such as NASA, NATO, FEMA and HUD must not receive this article rule.
 for(const m of source.matchAll(/\b(?:a|an)\s+(?:AB|FCC|FDA|FBI|FTC|HMO|IRS|LCB|LLC|MOU|MRI|NGO|RN|SB|SRO|XML)\b/gi)){
  const [article,initials]=m[0].split(/\s+/);if(initials!==initials.toUpperCase())continue;let wanted=/^[AEFHILMNORSX]/.test(initials)?'an':'a';if(/^[A-Z]/.test(article))wanted=wanted[0].toUpperCase()+wanted.slice(1);
  if(article!==wanted)add(m,wanted+' '+initials,'Spelling and usage, item 5',2,'LCB uses “an” before letter-by-letter initials beginning with a vowel sound; its example is “an FCC ruling.”','Articles before initials');
 }
 for(const issue of issues.filter(i=>i.category==='Articles before initials')){
  const initials=issue.text.trim().split(/\s+/).at(-1),rule=/^[AEFHILMNORSX]/.test(initials)?'5.18':'5.17';
  const page=references.gpo?.pages.find(p=>new RegExp('(?:^|\\n)\\s*'+rule.replace('.','\\.')+'\\.').test(p.flowText||p.text));
  if(page)issue.references.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule,preferred:issue.suggestion,ruleText:'The article follows the vowel or consonant sound of the first letter in a letter-by-letter initialism.'});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
