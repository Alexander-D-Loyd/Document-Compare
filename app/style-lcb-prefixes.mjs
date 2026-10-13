import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {lexicalPrefixCandidates} from './lcb-prefix-candidates.mjs';
export const LCB_PREFIX_EVIDENCE_SCOPE='Finite listed and lexical prefix/root checks require complete original Unicode word boundaries and the whole matched prefix/root range. Masked source letters cannot manufacture a token or open join; wrapped literal quotations, every intersecting table, strikes and unknown exclusions remain protected. Recognized margins and interior page heads preserve exact physical selections. Root recognition does not establish dictionary approval, unfamiliar meanings, authentic names or all productive prefix combinations.';
// Recognized roots provide a format-review cue, not approval of an arbitrary
// compound's meaning or spelling. Preserve the guide's contextual exceptions.
const baseForms=[
 ...[
  ['ex',8,'governor|president|convict|offender|employee|spouse|serviceman|servicemember|mayor|director'],
  ['self',13,'control|controlled|regulation|regulated|regulatory|government|governed|governing|administration|administered|insurance|insured|insuring|employment|employed|employing|assessment|assessed|support|supporting|sufficient|sufficiency|liquidating|certification|certified|reporting|reported|directed|management|managed'],
  ['quasi',8,'judicial|legislative|governmental|public|contract|contractual|corporation|corporate|academic|experimental|criminal']
 ].flatMap(([prefix,page,roots])=>roots.split('|').map(root=>({page,prefix,root,preferred:prefix+'-'+root,hyphen:true}))),
 ...[
  ['multi',12,'year|yearly|state|county|district|family|unit|use|purpose|disciplinary|cultural|lingual|lateral|national|modal|agency|jurisdictional|generational|sector|level'],
  ['bi',9,'annual|annually|ennial|ennially|monthly|weekly|partisan|lateral|lingual|racial|cultural|cameral'],
  ['anti',9,'competitive|discrimination|fraud|nuclear|trust|terrorism|terrorist|viral|bacterial|microbial|corruption|smoking'],
  ['non',12,'compliance|payment|discrimination|profit|profitability|refundable|transferable|resident|residential|renewable|partisan|voting|exempt|classified|criminal|custodial|public|commercial|governmental|medical|emergency|essential|performing|recurring|taxable']
 ].flatMap(([prefix,page,roots])=>roots.split('|').map(root=>({page,prefix,root,preferred:prefix+root,hyphen:false}))),
 ...['inflammatory','infective'].map(root=>({page:9,prefix:'anti',root,preferred:'anti-'+root,hyphen:true})),
 ...[
  ['co','operate|operates|operated|operating|operation|operations|operative|operatives|owner|owners|ownership|worker|workers|payment|payments|insurance|locate|locates|located|locating|location'],
  ['pre','exist|exists|existed|existing|existence|operative|operatively|employment'],
  ['post','graduate|graduates|graduation|secondary|operative|operatively|natal'],
  ['re','enact|enacts|enacted|enacting|enactment|authorize|authorizes|authorized|authorizing|authorization|evaluate|evaluates|evaluated|evaluating|evaluation|examine|examines|examined|examining|examination|organize|organizes|organized|organizing|organization|elect|elects|elected|electing|election|elections|read|reads|reading'],
  ['de','energize|energizes|energized|energizing'],
  ['intra','state|district|city'],
  ['inter','state|district|city|agency|governmental|departmental|generational'],
  ['out','weigh|weighs|weighed|weighing'],
 ].flatMap(([prefix,roots])=>roots.split('|').map(root=>({page:8,prefix,root,preferred:prefix+root,hyphen:false}))),
 // "in active programs" contains a preposition, not an in- prefix. Only
 // an explicitly hyphenated spelling supplies prefix evidence here.
 ...'bound|active|accurate|adequate|applicable|complete|consistent|dependent|direct|divisible|eligible|operative|operable|secure|solvent|sufficient|valid'.split('|').map(root=>({page:11,prefix:'in',root,preferred:'in'+root,hyphen:false,joinOpen:false})),
];
// Inflect recognized noun roots as whole words; do not offer a replacement
// for just the singular stem of non-residents or ex-employees.
const pluralRoots=new Map([
 ['ex:governor','governors'],['ex:president','presidents'],['ex:convict','convicts'],['ex:offender','offenders'],['ex:employee','employees'],['ex:spouse','spouses'],['ex:serviceman','servicemen'],['ex:servicemember','servicemembers'],['ex:mayor','mayors'],['ex:director','directors'],
 ['quasi:contract','contracts'],['quasi:corporation','corporations'],['non:payment','payments'],['non:resident','residents'],['non:profit','profits'],['non:emergency','emergencies'],
]);
export const LCB_PREFIX_FORMS=[...baseForms,...baseForms.filter(r=>pluralRoots.has(r.prefix+':'+r.root)).map(r=>({...r,root:pluralRoots.get(r.prefix+':'+r.root),preferred:r.prefix+(r.hyphen?'-':'')+pluralRoots.get(r.prefix+':'+r.root)}))];
const prefixLookup=new Map(LCB_PREFIX_FORMS.map(r=>[r.prefix+r.root,r]));
const prefixPattern=new RegExp('\\b(?:'+LCB_PREFIX_FORMS.map(r=>r.prefix+(r.joinOpen===false?'-':r.hyphen?'[\\s-]*':'[\\s-]+')+r.root).sort((a,b)=>b.length-a.length).join('|')+')\\b','gi');
export function lcbPrefixIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const blocked=styleEvidenceGuard(doc,ctx);
 const candidates=[...source.matchAll(prefixPattern)].map(m=>({m,r:prefixLookup.get(m[0].toLowerCase().replace(/[\s-]+/g,''))}));
 candidates.push(...lexicalPrefixCandidates(source));
 for(const {m,r} of candidates){
   const start=m.index,end=start+m[0].length,after=source.slice(end),plain=m[0].replace(/\s+/g,' ').toLowerCase();
   if(plain===r.preferred||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(q=>q.start<end&&q.end>start)||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0]))continue;
   // Source capitals can denote a literal agency/organization or title.
   if((!r.properRoot&&/[A-Z]/.test(m[0].slice(1)))||(/^[A-Z]/.test(m[0])&&/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after)))continue;
   // Ignore rhetorical dashes in body text, but not page-header dashes that
   // styleSource has already masked between the two fragments of this phrase.
   if(r.lexical&&doc.text.slice(start,end).split('').some((c,i)=>/[‒–—―]/u.test(c)&&/\S/u.test(source[start+i])))continue;
   if(!r.hyphen&&/^\s*-(?:[a-z])/i.test(after))continue; // compound-base exceptions
   if(issues.some(i=>i.start<end&&i.end>start))continue;
   const suggestion=/^[A-Z]/.test(m[0])?r.preferred[0].toUpperCase()+r.preferred.slice(1):r.preferred;
   const message=r.properRoot?'LCB keeps a hyphen between anti and a recognized proper noun, agreeing with GPO 6.35.':r.prefix==='anti'&&r.hyphen?'LCB keeps a hyphen for this anti- form at the repeated-vowel boundary.':'LCB '+(r.page===8?'hyphenation item 5':'page '+r.page)+' uses '+(r.hyphen?'a hyphen for this prefix':'a solid form for this prefix')+'. '+(r.lexical?'Confirm the complete compound’s meaning, dictionary spelling and any official-name exception before changing it.':'This check is limited to a recognized root; proper names, unfamiliar compounds and literal quotations remain manual.');
   const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:r.page===8?'Hyphenation, item 5':'Hyphenation: '+r.prefix,preferred:suggestion,ruleText:message}];
   if(['ex','self','quasi'].includes(r.prefix))cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:119,guidePrintedPage:references.gpo.pages[118].printedPage,rule:'6.34',preferred:suggestion,ruleText:'GPO uses a hyphen with ex, self and quasi; selfhood and selfsame are listed exceptions.'});
   else if(!r.hyphen&&['co','pre','post','re','de','intra','in'].includes(r.prefix))cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:118,guidePrintedPage:references.gpo.pages[117].printedPage,rule:'6.29',preferred:suggestion,ruleText:'GPO prints combining forms and prefixes solid except for the stated proper-name, duplicated-prefix and ambiguity exceptions. Only these recognized roots are checked.'});
   else if(r.properRoot)cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:120,guidePrintedPage:references.gpo.pages[119].printedPage,rule:'6.35',preferred:suggestion,ruleText:'GPO uses a hyphen between a prefix and a capitalized word unless usage demands otherwise.'});
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:cites[0].rule,category:'Prefix compounding',context:ctx.at(start),checkId:'lcb-prefixes',conflict:false,message,references:cites});
 }
 return issues;
}
