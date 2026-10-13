import {nounHeadMatch} from './style-noun-heads.mjs';
import {styleContext} from './style-context.mjs';
import {predicateCompoundMatches,predicateRangeKey} from './style-predicate-evidence.mjs';
import {productiveEndWordPredicates,productiveEndWordCandidates,listedNominalBase} from './style-end-word-predicates.mjs';
import {LCB_PREDICATE_EXAMPLES,listedPredicateCandidates,predicateBodyDash} from './style-predicate-examples.mjs';
import {participialModifierEvidenceRanges} from './style-participial-modifier-evidence.mjs';
import {isCommonLexicalRoot} from './lcb-prefix-candidates.mjs';
import {openIncomeQualifierBefore} from './style-income-qualifiers.mjs';
import {modifierChainHeadMatcher} from './style-listed-modifier-heads.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const initialisms=['AB','FCC','FDA','FBI','FTC','HMO','IRS','LCB','LLC','MOU','MRI','NGO','RN','SB','SRO','XML','CDC','CFR','CPUC','DMV','DOJ','DNA','PDF','USC','USDA'];
// GPO5.17/5.18 explicitly demonstrate these spoken letter forms. The literal
// H-U-D example is letter-by-letter; undivided HUD remains an unclassified
// pronounceable acronym, never a generic first-letter sound inference.
const sourceInitialisms=['BLS','GAO','WWW','CIO','UFO','AEC','NSC','RFC'];
export const KNOWN_INITIALISM_EVIDENCE_SCOPE='Finite established letter-by-letter initials require complete original article/initials evidence, including combining marks and characters masked by exclusions or strikes. Recognized interior running heads preserve complete source selections; wrapped literals, tables and identifier continuations remain protected. Unknown pronunciations and unfamiliar initials remain manual or conditional review; no word-pronounced acronym is inferred from its first letter.';
export const FOREIGN_PHRASE_EVIDENCE_SCOPE='Seven finite ex officio/bona fide/per capita/per diem/prima facie/de minimis/inter vivos forms retain complete original token boundaries and evidence. Wrapped literal quotations, tables and masked/deleted characters cannot establish a hyphen-removal suggestion. Source spelling and physical offsets are preserved; other foreign phrases, authentic titles and linguistic meaning remain manual.';
const initialismPattern=new RegExp('\\b(a|an)\\s+('+[...initialisms,...sourceInitialisms].map(s=>s.split('').join('\\.?\\s*')+'\\.?').join('|')+'|H-U-D)(?![\\p{L}\\p{N}_])','giu');
export function lcbModifierForms(reference){
 const forms=[];
 for(const p of reference.pages.filter(p=>p.page>=9&&p.page<=14)){
  for(const line of p.text.split('\n')){
   const m=/^\s*([A-Za-z]+(?:[’'][A-Za-z]+)?(?:-[A-Za-z]+)+)\s+\(u\.m\.\)/.exec(line);
   if(m)forms.push({form:m[1],page:p.page});
  }
 }
 return forms;
}
export function lcbContextualIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const forms=lcbModifierForms(references.lcb),headMatch=modifierChainHeadMatcher(forms);
 const blockedEvidence=styleEvidenceGuard(doc,ctx);
 const cutsWord=index=>/[\p{L}\p{N}\p{M}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}\p{M}_]/u.test(doc.text.slice(index,index+2));
 const modifierEvidence=(m,noun)=>{
  const phraseStart=headMatch.prefixStart(source,m.index),beforeStart=Math.max(0,phraseStart-300),headEnd=m.index+m[0].length+noun[0].length;
  const cues=participialModifierEvidenceRanges(source.slice(beforeStart,phraseStart),source.slice(headEnd));
  return cues.some(cue=>{
   const start=cue.side==='before'?beforeStart+cue.start:phraseStart,end=cue.side==='after'?headEnd+cue.end:headEnd;
   return !cutsWord(start)&&!cutsWord(end)&&!blockedEvidence(start,end);
  });
 };
 const add=(m,suggestion,rule,page,message,category='Contextual style')=>{
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||m[0]===suggestion||literal.some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  // Ignored page labels are already masked in styleSource and may lie between
  // valid body fragments. The renderer excludes those labels from highlights.
  if((doc.struck||[]).some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  if(issues.some(i=>i.start===m.index&&i.end===m.index+m[0].length&&i.suggestion===suggestion))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category,context:ctx.at(m.index),checkId:'lcb-contextual',conflict:false,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(page),rule,preferred:suggestion,ruleText:message}],message});
 };
 // Explicitly listed unit-modifier forms, with a recognized noun head.
 // The same open phrase as a noun or predicate remains accepted.
 for(const item of forms){
  const pattern=new RegExp('\\b'+item.form.split('-').map(w=>escape(w).replace(/[’']/g,"[’']")).join('[\\s-]+')+'\\b','gi');
  for(const m of source.matchAll(pattern))if(headMatch(source.slice(m.index+m[0].length),item.form)){
   const tail=source.slice(m.index+m[0].length), noun=headMatch(tail,item.form);
   const evidenceEnd=m.index+m[0].length+noun[0].length;
   if(cutsWord(m.index)||cutsWord(evidenceEnd)||blockedEvidence(m.index,evidenceEnd))continue;
   if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&(/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^\s+[A-Z][a-z]/.test(tail)))continue;
   const wrapped=m[0].replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').replace(/'/g,'’').toLowerCase();
   if(wrapped===item.form.toLowerCase()){
    // Hyphen matching is case-insensitive, but the listed English language
    // component still requires its capital. Keep other source case intact.
    if(item.form.includes('English')&&/\benglish\b/.test(m[0]))add(m,m[0].replace(/-[ \t]*\n\s*/g,'-').replace(/\s+/g,' ').replace(/\benglish\b/g,'English'),'Hyphenation examples: '+item.form,item.page,'LCB explicitly capitalizes English inside this listed modifier. Correct the language word while preserving the other source case.','Modifier capitalization');
    continue;
   }
   if((noun.chain.length||noun.requiresEvidence||/-(?:approved|adopted|based|related)$/.test(item.form))&&!modifierEvidence(m,noun))continue;
   if(item.form==='in-state'&&!/\b(?:a|an|the|each|every|any|all|these|those)\s+$/i.test(source.slice(Math.max(0,m.index-25),m.index)))continue;
   if(item.form==='low-income'&&openIncomeQualifierBefore(source,m.index))continue;
   let suggestion=m[0].replace(/[\s-]+/g,'-');if(item.form.includes('English'))suggestion=suggestion.replace(/\benglish\b/g,'English');add(m,suggestion,'Hyphenation examples: '+item.form,item.page,'LCB lists “'+item.form+'” in unit-modifier position. Here the phrase precedes a recognized noun.','Modifier hyphenation');
  }
 }

 // Common multiword noun phrases form a single modifier before a participle.
 // Match the whole phrase rather than producing a partial health-related fix.
 const multiwordCandidates=[...source.matchAll(/\b(?:mental\s+health|public\s+health|child\s+care|health\s+care|data\s+sharing|family\s+planning)\s+(?:adopted|approved|based|related)\b/gi)];
 for(const m of multiwordCandidates){
  const tail=source.slice(m.index+m[0].length),noun=nounHeadMatch(tail);
  if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&(/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^\s+[A-Z][a-z]/.test(tail)))continue;
  if(noun&&modifierEvidence(m,noun)){
   const ending=/\s+(adopted|approved|based|related)$/i.exec(m[0]),base=m[0].slice(0,ending.index),listed=listedNominalBase(base);
   let preferred=listed?.preferred||base;if(/^[A-Z]/.test(base))preferred=preferred[0].toUpperCase()+preferred.slice(1);
   const suggestion=preferred.replace(/\s+/g,'-')+'-'+ending[1];
   add(m,suggestion,'Hyphenation, item 1',8,'LCB treats the whole phrase as a unit modifier before the following noun, preserving explicitly listed base spellings. Independent noun-phrase evidence distinguishes this from a finite verb and its object.','Modifier hyphenation');
   const issue=issues.find(i=>i.start===m.index&&i.suggestion===suggestion);
   if(issue&&listed)issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:listed.page,guidePrintedPage:String(listed.page),rule:'Hyphenation examples: '+listed.preferred,preferred:listed.preferred,ruleText:'LCB explicitly lists the complete noun base with this spelling.'});
  }
 }
 // LCB page 16 explicitly extends these participles beyond its examples.
 for(const m of source.matchAll(/\b[a-z]+\s+(?:adopted|approved|based|related)\b/gi)){
  // A protected/uncertain whole phrase must not fall back to a suffix-only fix.
  if(multiwordCandidates.some(p=>p.index<=m.index&&p.index+p[0].length>=m.index+m[0].length))continue;
  if(issues.some(i=>i.start<=m.index&&i.end>=m.index+m[0].length))continue;
  if(/^(?:forth|herein|therein|hereby|thereby|thereof|thus|however|also|never|already|his|her|my|our|your|hers|ours|theirs|him|them|me|us)\s/i.test(m[0]))continue;
  const first=m[0].split(/\s/)[0];if(/^(?:is|are|was|were|be|been|being|has|have|had|and|or|not|as|the|a|an|any|all|each|every|some|such|this|that|these|those|it|they|we|you|who|which|what|their|its|other|more|less|for|in|on|of|by|to|with|from|under|over|at|into|without)$/i.test(first)||/ly$/i.test(first)&&!['family','elderly'].includes(first.toLowerCase())||/[’']/.test(source[m.index-1]||'')||/[A-Za-z]-\s*$/.test(source.slice(Math.max(0,m.index-30),m.index)))continue;
  if(/^(?:administers?|provides?|receives?|issues?|establishes?|maintains?|implements?|requires?|authorizes?|includes?|excludes?|applies|uses?|makes?)$/i.test(first))continue;
  const tail=source.slice(m.index+m[0].length),noun=nounHeadMatch(tail);
  if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&(/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^\s+[A-Z][a-z]/.test(tail)))continue;
  if(!isCommonLexicalRoot(first.toLowerCase())||!noun||!modifierEvidence(m,noun))continue;
  if(noun)add(m,m[0].replace(/\s+/g,'-'),'Hyphenation: End words',16,'LCB hyphenates -adopted, -approved, -based and -related in unit-modifier position.','Modifier hyphenation');
 }
 // Predicate adjectives use open forms, while an embedded noun modifier
 // after "is a" is still attributive and must retain its hyphen.
 const listedPredicates=listedPredicateCandidates(source,doc.text),endPredicates=productiveEndWordCandidates(source).filter(m=>!predicateBodyDash(doc.text,source,m));
 const predicateMatches=predicateCompoundMatches(source,[...listedPredicates.map(p=>p.m),...endPredicates]);
 for(const {m,form} of listedPredicates)if(LCB_PREDICATE_EXAMPLES.includes(form)&&predicateMatches.has(predicateRangeKey(m)))add(m,m[0].replace(/\s*-\s*/g,' ').replace(/\s+/g,' '),'Hyphenation, item 2',8,'LCB omits the hyphen in an adjective phrase following the word it modifies. Explicit copular and closing/complement evidence also supports complete coordinated compounds; embedded noun modifiers and uncertain comma continuations remain protected.','Modifier hyphenation');
 // Page 16 explicitly makes these endings productive. Complete recognized
 // lexical bases and an explicit predicate supply the format evidence, without
 // treating the root list as approval of a compound's meaning or spelling.
 for(const {m,suggestion,baseReference} of productiveEndWordPredicates(source,listedPredicates.map(p=>p.m),endPredicates)){
  add(m,suggestion,'Hyphenation, item 2 and End words',8,'LCB opens the final participle boundary in an adjective phrase after the noun it modifies. Source-listed base spellings are preserved; other bases retain their internal hyphens for manual review. Confirm the compound’s meaning and any literal-name exception; embedded noun modifiers remain protected.','Modifier hyphenation');
  const issue=issues.find(i=>i.start===m.index&&i.end===m.index+m[0].length&&i.suggestion===suggestion);
  if(issue){
   issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:16,guidePrintedPage:references.lcb.pages[15].printedPage,rule:'End words',preferred:suggestion,ruleText:'LCB page 16 expressly uses -adopted, -approved, -based and -related in unit-modifier position.'});
   issue.references.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:116,guidePrintedPage:references.gpo.pages[115].printedPage,rule:'6.18',preferred:suggestion,ruleText:'GPO omits the hyphen in a compound predicate adjective whose second element is a past participle.'});
   if(baseReference)issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:baseReference.page,guidePrintedPage:String(baseReference.page),rule:'Hyphenation examples: '+baseReference.preferred,preferred:baseReference.preferred,ruleText:'LCB explicitly lists this complete base spelling. Predicate position does not discard its internal spelling.'});
  }
 }
 for(const m of source.matchAll(/\b(?:ex-officio|bona-fide|per-capita|per-diem|prima-facie|de-minimis|inter-vivos)\b/gi)){
  const end=m.index+m[0].length;if(cutsWord(m.index)||cutsWord(end)||blockedEvidence(m.index,end))continue;
  add(m,m[0].replaceAll('-',' '),'Hyphenation, item 4',8,'LCB does not hyphenate foreign phrases used as adjectives.','Modifier hyphenation');
 }
 // Only established letter-by-letter initialisms; pronounceable acronyms
 // such as NASA, NATO, FEMA and HUD must not receive this article rule.
 for(const m of source.matchAll(initialismPattern)){
  const [article,initials]=m.slice(1),end=m.index+m[0].length;
  if(initials!==initials.toUpperCase()||m[0].length>4096||cutsWord(m.index)||cutsWord(end)||blockedEvidence(m.index,end))continue;
  // A known group can also be a prefix of an identifier, never pronunciation
  // evidence for its partial spelling. Keep its original source unchanged.
  if(/[\\/@]/u.test(doc.text[m.index-1]||'')||/^[\\/@\-\u2010\u2011\uFFFD]/u.test(doc.text.slice(end))||/^\.[A-Za-z0-9]/u.test(doc.text.slice(end))||/\.$/.test(initials)&&/^[A-Za-z0-9]/u.test(doc.text.slice(end)))continue;
  const before=source.slice(Math.max(0,m.index-100),m.index);
  if(/^a$/i.test(article)&&/\b(?:parts?|subparts?|articles?|sections?|chapters?|paragraphs?|subparagraphs?|subdivisions?|schedules?|appendix|appendices|attachments?|exhibits?|classes?|categories?|groups?|grades?|types?|forms?|plans?|options?|vitamin|hepatitis|cal\s+grant)\s+$/i.test(before))continue;
  let wanted=/^[AEFHILMNORSX]/.test(initials)?'an':'a';if(/^[A-Z]/.test(article))wanted=wanted[0].toUpperCase()+wanted.slice(1);
  if(article.toLowerCase()!==wanted.toLowerCase())add(m,wanted+' '+initials.replace(/\s+/g,' '),'Spelling and usage, item 5',2,'LCB follows the first letter’s vowel or consonant sound when choosing the article; its example is “an FCC ruling.”','Articles before initials');
 }
 for(const issue of issues.filter(i=>i.category==='Articles before initials')){
  const initials=issue.text.replace(/^a(?:n)?\s+/i,'').replace(/[.\s]/g,''),rule=/^[AEFHILMNORSX]/.test(initials)?'5.18':'5.17';
  for(const sourceRule of initials==='H-U-D'?['5.16',rule]:[rule]){
   const page=references.gpo?.pages.find(p=>new RegExp('(?:^|\\n)\\s*'+sourceRule.replace('.','\\.')+'\\.').test(p.flowText||p.text));
   if(page)issue.references.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule:sourceRule,preferred:issue.suggestion,ruleText:sourceRule==='5.16'?'GPO explicitly contrasts an H-U-D directive, whose letters are spoken, with a HUD directive, whose acronym is pronounced as a word.':'The article follows the vowel or consonant sound of the first letter in a letter-by-letter initialism.'});
  }
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
