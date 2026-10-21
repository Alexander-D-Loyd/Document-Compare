import {dimensionSeriesEvidence} from './style-symbol-series.mjs';
import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {dimensionMarkParts} from './style-dimension-marks.mjs';
import {percentageOpeningEvidence,percentageAllocationFragmentEvidence} from './style-percentage-openings.mjs';
import {METRIC_SYMBOLS,LCB_LISTED_UNIT_DEFINITIONS} from './metric-units.mjs';
import {extendedFractionParts} from './extended-fraction-forms.mjs';
import {largeOrdinalParts,compoundScaleOrdinalRanges} from './style-large-ordinals.mjs';
import {nounHeadPattern} from './style-noun-heads.mjs';
import {scalarSeriesRanges,countedSeriesGroups,partitiveCountGroups} from './style-scalar-series.mjs';
import {listNounPhrase} from './style-list-phrases.mjs';
import {andCardinalParts} from './style-compound-cardinals.mjs';
import {explicitRatioParts} from './style-ratios.mjs';
import {numeralIdentifierRanges,COUNTED_CLAUSE_END} from './style-numeral-identifiers.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {ones,tens,numbers,wordValue,spellNumber,canonicalWrittenValue,spellOrdinal,ordinalOnes as ordinals} from './style-cardinal-values.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {exactIntegerParts,exactFigureOrdinal}from './style-exact-integer-digits.mjs';
import {writtenQuantityEvidenceGuard,invalidUnconjoinedCardinalRanges} from './style-written-quantity-evidence.mjs';
import {writtenOrdinalEvidenceGuard} from './style-written-ordinal-evidence.mjs';
import {correlativeSpreads}from './style-correlative-spreads.mjs';
import {comparativeUnitRanges} from './style-comparative-unit-ranges.mjs';
import {sentenceUnitGroups} from './style-sentence-unit-groups.mjs';
export {spellNumber,canonicalWrittenValue,spellOrdinal} from './style-cardinal-values.mjs';
const ordinalNumbers=new Map(Array.from({length:99},(_,i)=>[spellOrdinal(i+1),i+1]));
// Only explicitly supported larger forms are recognized; arbitrary lengthy
// number phrases require the complete number/meaning parser, not a guess.
for(const [word,value] of [['hundredth',100],['one hundredth',100],['thousandth',1000],['one thousandth',1000]])ordinalNumbers.set(word,value);
const ordinalValues=new Map([...ordinalNumbers].map(([word,value])=>[word.replace(/-/g,' '),value]));
const ordinalPattern=[...ordinalNumbers.keys()].sort((a,b)=>b.length-a.length).map(w=>w.replace(/[ -]/g,'[\\s-]+')).join('|');
const figureOrdinal=n=>n.toLocaleString('en-US')+((n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));
const singular=w=>({people:'person',children:'child',feet:'foot',inches:'inch',copies:'copy'}[w]||w.replace(/s$/,''));
export function numeralIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],protectedRanges=[];
 const incompleteNumeric=numericExpressionGuard(doc,ctx);
 const scalarSeries=scalarSeriesRanges(ctx,doc);
 const countedGroups=countedSeriesGroups(ctx,references.lcb,doc);
 protectedRanges.push(...extendedFractionParts(source).map(({start,end})=>({start,end})));
 protectedRanges.push(...largeOrdinalParts(source).map(({start,end})=>({start,end})));
 // Unknown scale-ordinal roles remain manual, rather than receiving a
 // misleading replacement of the isolated hundredth/thousandth fragment.
 protectedRanges.push(...compoundScaleOrdinalRanges(source));
 // Do not highlight hundred/two separately inside one hundred and two.
 // The whole-count check handles only independently recognized noun uses.
 const scaleAndParts=andCardinalParts(source);protectedRanges.push(...scaleAndParts);
 protectedRanges.push(...invalidUnconjoinedCardinalRanges(source,countedGroups.flat()));
 protectedRanges.push(...explicitRatioParts(source,doc,ctx).map(({start,end})=>({start,end})),...numeralIdentifierRanges(source));
 const protect=pattern=>{for(const m of source.matchAll(pattern))protectedRanges.push({start:m.index,end:m.index+m[0].length});};
 protect(new RegExp('\\b\\d+(?:\\.\\d+)?\\s+(?:'+METRIC_SYMBOLS.slice().sort((a,b)=>b.length-a.length).join('|')+')\\b','g'));
 // A bare MB/Mb or MW/mW symbol does not provide enough evidence to
 // rewrite significant case. Keep its figure intact; the written-name
 // definition check can resolve the unit when that evidence is present.
 protect(new RegExp('\\b\\d+(?:\\.\\d+)?\\s+(?:'+LCB_LISTED_UNIT_DEFINITIONS.map(r=>r.symbol).join('|')+')\\b','gi'));
 // Technical symbols use figures under GPO 9.56/9.58; LCB examples
 // spelling out small measures refer to fully written unit names.
 protect(/\b\d+(?:\.\d+)?\s+(?:kg|mg|μg|km|cm|mm|mL|kL|kW|MW|Pa|Hz|ms|lb|min|yr|oz|ft|yd)s?\b/g);
 // A proven physical figure-mark expression is indivisible, like other
 // technical units. Ordinary written-unit LCB/GPO conflict rules stay intact.
 for(const r of dimensionMarkParts(source))if(!styleRangeBlocked(doc,r.start,r.evidenceEnd))protectedRanges.push({start:r.start,end:r.end});
 for(const r of dimensionSeriesEvidence(doc))protectedRanges.push({start:r.start,end:r.end});
 // Identifiers and dates are not counts. A repeated citation list stays one scope.
 // A comma followed by a recognized complete counted noun phrase starts a
 // quantity, not another Article/Section identifier. Unknown continuations
 // stay protected as citations; this is not a general grammar guesser.
 const countedHead='(?:'+nounHeadPattern+'|technicians?|veterinarians?)';
 const countEnd=COUNTED_CLAUSE_END;
 const citationEnd='(?!\\s+(?:(?:licensed|registered|public|private|qualified|eligible|additional|full-time|part-time)\\s+)*'+countedHead+'\\b'+countEnd+')';
 protect(new RegExp('\\b(?:sections?|subsections?|secs?\\.?|chapters?|subchapters?|chs?\\.?|provi(?:-\\s*)?sions?|items?|schedules?|parts?|subparts?|divisions?|titles?|articles?|subarticles?|paragraphs?|subparagraphs?|subdivisions?|clauses?|pages?|lines?|tables?|figures?|forms?|bills?|propositions?|No\\.?)\\s+(?:\\([a-z\\d]+\\)|\\d+(?:\\.\\d+)*)(?:\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or|to|through)\\s+|[-–])(?:\\([a-z\\d]+\\)|\\d+(?:\\.\\d+)*)(?!\\d|\\.\\d)'+citationEnd+')*','gi'));
 protect(/\b(?:I\.\s*D\.|ID)\s+\d+(?:\.\d+)*/g);
 // CAS chemical registry identifiers are serial numbers (GPO 12.7),
 // including a final check digit. Never rewrite that digit as a prose count.
 // Require the explicit label and complete three-part identifier so nearby
 // quantities and ordinary hyphenated numbers remain independently checked.
 protect(/\bCAS(?:\s+(?:RN|Registry(?:\s+(?:Number|No\.?))?|Number|No\.?))?\s*(?:[:#]\s*)?\d{2,7}\s*-\s*\d{2}\s*-\s*\d(?![\p{L}\p{N}_])/giu);
 for(const range of chemicalNameRanges(source))protectedRanges.push(range);
 // Abbreviated legal/session references and numbered program identifiers
 // are labels, including the abbreviations commonly used in budget bills.
 protect(/\b(?:P\.\s*L\.|Pub\.\s*L\.|H\.\s*R\.|S\.\s*B\.|A\.\s*B\.)\s*\d+(?:\s*[-–]\s*\d+)*/gi);
 protect(new RegExp('\\b(?:Chs?\\.?|Secs?\\.?|Stats?\\.?|Regs?\\.?)(?:\\s*|(?=\\d))\\d+(?:\\.\\d+)*(?:\\s*(?:,\\s*(?:(?:and|or)\\s*)?|(?:and|or)\\s*,?\\s*|[-–])\\d+(?:\\.\\d+)*(?!\\d|\\.\\d)'+citationEnd+')*','gi'));
 protect(/\bChs?\.?\s*\d[^;()]{0,100}?\bStats?\.\s*\d{4}/gi);
 protect(/\bChs?\.?\s*\d[^;()]{0,120}?\bS\s*t\s*a\s*t\s*s?\s*\.\s*\d{4}/gi);
 protect(/\bv\d+(?:\.\d+)+\b/g);
 protect(/\b(?:Buildings?|Subcommittees?|Bargaining\s+Units?)\s+\d+(?:\s*(?:,\s*(?:(?:and|or)\s*)?|(?:and|or)\s+)\d+)*/g);
 protect(/\b(?:SMARA|SPR)\s*-\s*\d+\b/g);
 protect(/\b\d+(?:st|nd|rd|th)\s+Ex\.\s*Sess\./gi);
 protect(/\b\d+\s+Cal\.\s*Code\s+Regs\.,?\s*\d+(?:\.\d+)*/gi);
 // A complete volume/reporter/page citation contains serial identifiers,
 // including the series suffix in the source AB 747 citation 17 Cal.5th 207.
 // Nearby prose ranks/counts and unknown reporter forms remain checkable.
 protect(/\b\d+\s+Cal\.\s*(?:App\.\s*|Rptr\.\s*)?(?:2d|3d|4th|5th)?\s+\d+(?:\s*,\s*\d+)*\b/g);
 protect(/\b\d+\s+U\.S\.\s+\d+(?:\s*,\s*\d+)*\b/g);
 protect(/\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.\s*\d{1,2}(?:,\s*\d{4})?/gi);
 protect(/\b(?:Round|Reach|Bargaining\s+Unit)\s+\d+\b/g);
 // A capitalized Tier/Level followed by a number names a serial classification.
 // It is distinct from a quantity such as "3 tiers" and from a nearby count.
 protect(/\b(?:Tier|Level)\s+\d+(?:\.\d+)*(?!\d|\.\d)/g);
 protect(/“[^”]*”|"[^"\n]*"/g);
 // Arithmetic operands are symbols/figures, not ordinary prose counts.
 protect(/(?:\b[A-Za-z]|\b\d+(?:\.\d+)?)\s*[+−±×÷]\s*(?:[A-Za-z]\b|\d+(?:\.\d+)?\b)(?:\s*[+−±×÷]\s*(?:[A-Za-z]\b|\d+(?:\.\d+)?\b))*/g);
 protect(/[±]\s*\d+(?:\.\d+)?/g);
 // Signed quantities are a complete expression, not an isolated positive count.
 protect(/(?<![\p{L}\p{N}_])[+−-]\s*\d+(?:\.\d+)?\b/gu);
 protect(/\bzero\s*-\s*emissions?\b/gi);
 // Keep an entire dollar figure indivisible even when extraction produces
 // a malformed final digit group. Currency/spacing verification owns that
 // expression; its trailing zeros are never standalone prose quantities.
 protect(/\$\s*[+−-]?\d+(?:[.,]\d+)*/g);
 protect(/\b(?:net[\s-]+zero|zero[\s-]+(?:tolerance|sum|based))\b/gi);
 protect(/\$\s*\d+(?:[.,]\d+)*\s+(?:thousand|million|billion|trillion)\b/gi);
 protect(/\b\d+\s+(?:U\.?\s*S\.?\s*C\.?|C\.?\s*F\.?\s*R\.?)(?:\s+(?:§\s*)?\d+(?:\.\d+)*)?/gi);
 protect(/\b(?:U\.S\.C\.|C\.F\.R\.)\s+(?:§\s*)?\d+(?:\.\d+)*/gi);
 protect(/\(\s*(?:\d+(?:\.\d+)?|\.\d+)[a-z]?\s*\)/gi);
 protect(/\b(?:Budget Act of|Stats?\.?|Statutes? of)\s+\d{4}\b/gi);
 protect(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?/gi);
 const wrapped=word=>word.split('').join('(?:-\\s*)?');
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 protect(new RegExp('\\b(?:'+months.map(wrapped).join('|')+')\\s+\\d{1,2}(?:,\\s*\\d{4})?','gi'));
 protect(new RegExp('\\b(?:'+['Section','Article','Chapter','Division','Provision','Paragraph','Subdivision'].map(wrapped).join('|')+')s?\\s+\\d+(?:\\.\\d+)*','gi'));
 protect(new RegExp('\\b'+wrapped('House')+'\\s+'+wrapped('Resolution')+'\\s+\\d+','g'));
 protect(/\b(?:Stage|Release|Phase|House Resolution|Public Law|SPR)\s*\d+(?:[-.]\d+)*(?:\s*,\s*(?:(?:and|or)\s*)?\d+)*/g);
 protect(/\b\d+\)(?=\s*[A-Z])/g);
 protect(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
 protect(/\b\d{4}-\d{2}-\d{2}\b/g);
 // Telephone/service dialing codes and formal decision identifiers are
 // indivisible identifiers; their digits are never prose quantities.
 protect(/\b\d[-\u2011\u2013]\d[-\u2011\u2013]\d\b/g);
 protect(/\b(?:Decision|D\.)\s+\d{2}-\d{2}-\d{3}\b/gi);
 // Fraction styling needs a whole-expression check, never a correction to
 // an isolated numerator, denominator or integer in a mixed fraction.
 protect(/\b\d+(?:\s+\d+)?\s*[\/⁄]\s*\d+\b/g);
 protect(/\b\d+[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g);
 protect(/\b(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+and\s+)?(?:one|two|three|four|five|six|seven|eight|nine)[ -]+(?:half|halves|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?)\b/gi);
 protect(/\b(?:one|two|three|four|five|six|seven|eight|nine)[ -]+(?:elevenths?|twelfths?|thirteenths?|fourteenths?|fifteenths?|sixteenths?|seventeenths?|eighteenths?|nineteenths?|twentieths?)\b/gi);
 protect(/\b\d{4}[-–]\d{2,4}\s+(?:Regular Session|fiscal year)/gi);
 // Hyphenated hundredth/thousandth forms identify a fractional unit.
 // The spaced ordinal remains available to the rank checker.
 protect(/\bone-(?:hundredth|thousandth)s?\b/gi);
 protect(/\bgrades?\s+\d+(?:\s*(?:,\s*(?:(?:and|or)\s+)?|and\s+|or\s+|to\s+|through\s+|-)\d+)*/gi);
 for(const block of doc.blocks){const body=source.slice(block.start+block.margin.length,block.end),m=/^\s*(?:SEC\.\s+|SECTION\s+)?\d+(?:\.\d+)*\.(?=\s|$)/i.exec(body);if(m)protectedRanges.push({start:block.start+block.margin.length,end:block.start+block.margin.length+m[0].length});
  if(block.formatting?.headerGaps?.length>=2)protectedRanges.push({start:block.start,end:block.end});
 }
 const budgetBill=/\bBudget Act of\s+\d{4}\b/i.test(source);
 if(budgetBill){
  protect(/\b\d{4}-\d{3}(?:-\d{4})?\b/g);
  // A zero-leading appropriation identifier is not the trailing group of
  // a comma-formatted count such as 1,000 in ordinary budget-bill prose.
  protect(/(?<![\d.,])\b0\d+\b(?![.,]\d)/g);
  protect(/\b\d{4,}-(?=[A-Za-z])/g);
  protect(/\b\d{4}-\d{4}\s+(?=[A-Z])/g);
  for(const block of doc.blocks){
   const body=source.slice(block.start+block.margin.length,block.end).trim();
   // Tabulated numeric cells and dot-leader amount rows are not sentences.
   if(body&&(/^[\d\s,$().+%—–-]+$/.test(body)||/\.{3,}/.test(body)))protectedRanges.push({start:block.start,end:block.end});
  }
 }
 const quantityEvidence=writtenQuantityEvidenceGuard(doc,ctx);
 const ordinalEvidence=writtenOrdinalEvidenceGuard(doc,ctx);
 const blocked=(start,end)=>protectedRanges.some(r=>r.start<end&&r.end>start)||quantityEvidence(start,end)||ordinalEvidence(start,end);
 const candidates=[];
 const pattern=new RegExp(`\\b(?:${ordinalPattern}|\\d+(?:,\\d{3})*(?:\\.\\d+)?(?:st|nd|rd|th)?|${[...numbers.keys(),'hundred','thousand','million','billion','trillion'].join('|')})\\b`,'gi');
 const matches=[...source.matchAll(pattern)];
 const atoms=[];
 for(let i=0;i<matches.length;i++){
  const m=matches[i],ordinalKey=m[0].toLowerCase().replace(/[\s-]+/g,' '),ordinalValue=ordinalValues.get(ordinalKey);
  let start=m.index,end=start+m[0].length,text=m[0],ordinal=/\d(?:st|nd|rd|th)$/i.test(text)||ordinalValue!==undefined,figure=/^\d/.test(text),value=figure?Number(text.replace(/(?:st|nd|rd|th)$/i,'').replaceAll(',','')):ordinal?ordinalValue:wordValue([text.toLowerCase()]);
  if(!figure&&!ordinal){
   const words=[text.toLowerCase()];
   while(i+1<matches.length&&/^[\s-]+$/.test(source.slice(end,matches[i+1].index))&& !/^\d/.test(matches[i+1][0])&&!ordinals.includes(matches[i+1][0].toLowerCase())){
    const next=matches[i+1][0].toLowerCase(),prior=words.at(-1);
    // "one two" is not a compound number; only tens, hundreds and scales join.
    if(!['hundred','thousand','million','billion','trillion'].includes(next)&&!(tens.includes(prior)&&ones.slice(1,10).includes(next))&&!['hundred','thousand','million','billion','trillion'].includes(prior))break;
    i++;words.push(next);end=matches[i].index+matches[i][0].length;
   }
   text=source.slice(start,end).replace(/\s+/g,' ').trim();value=wordValue(words);
   if(words.length>1&&canonicalWrittenValue(text)===null)continue;
  }
  atoms.push({start,end,text,ordinal,figure,value});
 }
 const spreads=correlativeSpreads(doc,ctx,atoms,scaleAndParts);protectedRanges.push(...spreads.uncertainRanges);
 for(const atom of atoms){
  let {start,end,text,ordinal,figure,value}=atom;
  if(value===null||!Number.isFinite(value)&&!(figure&&exactIntegerParts(text))||blocked(start,end)||ctx.at(start)==='Heading'||figure&&incompleteNumeric(start,end))continue;
  const before=source.slice(Math.max(0,start-120),start).replace(/\s+/g,' '),after=source.slice(end,end+150).replace(/\s+/g,' '),sentence=ctx.sentenceAt(start);
  if(ordinal&&!figure&&/\b(?:a|an|one)\s*$/i.test(before)&&/^\s+of\b/i.test(after))continue;
  if(!figure&&/[a-z]-[ \t]*\n\s*$/i.test(source.slice(Math.max(0,start-80),start)))continue;
  const prefix=source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  const sentenceStart=!prefix;
  if(text.toLowerCase()==='second'&&/\b(?:per|each|every)\s*$/i.test(before))continue;
  if(ordinal&&(figure||/^[A-Z]/.test(text))&&/^\s+(?:Amendment|Circuit|Congress|Street|Avenue)\b/.test(after))continue;
  if(!figure&&/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+$/i.test(before)&&value<=31){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals: Days/Dates',page:22,message:'A calendar day following a month name uses figures.',gpo:'12.9',gpoPage:288});continue;
  }
  if(!figure&&/\b(?:sections?|articles?|chapters?|parts?|divisions?|paragraphs?|subdivisions?)\s+$/i.test(before)){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals: Code Sections and Constitution',page:22,message:'This is a numbered reference identifier, not a quantity.',gpo:'12.7',gpoPage:288});continue;
  }
  let unit=after.match(/^\s*(?:-\s*)?(?:(?:business|calendar|court|school|academic|consecutive|working)\s+)?([a-z]+)/i)?.[1]?.toLowerCase()||'';
  const spread=spreads.byStart.get(start),spreadCount=spread?spread.members.length-1:0;
  if(spread)unit=spread.head;
  // LCB's listed schoolday compound is still a day unit after its spelling
  // correction. Preserve the same duration/conflict treatment as school day.
  if(/^schooldays?$/.test(unit))unit=unit.slice('school'.length);
  if(scalarSeries.some(r=>r.start<=start&&r.end>=end))unit='scalar-values';
  const money=/\$\s*$/.test(before)||/^(?:dollars?|cents?|mills?)$/.test(unit);
  const figureRepeat=/^\s*\(?\$/.test(after)||/\b(?:dollars?|cents?|mills?)\s*\(\s*\$\s*$/.test(before);
  const percent=/^(?:percent|percentage)$/.test(unit)||/^\s*%/.test(after);
  const percentageOpening=!ordinal&&!spreadCount&&Number.isSafeInteger(value)&&value<=1e12&&percentageOpeningEvidence(doc,ctx,start,end);
  if(percentageOpening){
   if(figure){const words=spellNumber(value),preferred=words[0].toUpperCase()+words.slice(1)+' percent';
    candidates.push({start,end:percentageOpening.end,text:doc.text.slice(start,percentageOpening.end),value,figure,ordinal,sentenceStart:true,context:ctx.at(start),exception:true,preferred,rule:'Numerals, general item 1',page:21,checkId:'opening-percentages',message:'Spell out a number at the beginning of a sentence, or rephrase it. This complete integer percentage opens a sentence; a labelled paragraph after a colon requires a recognized complete finite clause. Allocation fragments and uncertain clauses keep their ordinary percentage treatment.',gpo:'12.16',gpoPage:294});
   }
   continue;
  }
  if(!figure&&!ordinal&&percent&&percentageAllocationFragmentEvidence(doc,ctx,start,end)){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals, general item 2',page:21,message:'LCB requires figures for percentages. This labelled allocation to a recognized recipient is a list fragment, rather than a complete sentence opening; the preceding item’s final period does not change its grammatical role. Other recipient roles and unfamiliar clauses require review.',gpo:'12.9',gpoPage:288});continue;
  }
  const clock=/^\s*(?::\s*\d+|[ap]\.\s*m\.|o[’']clock)/i.test(after)||/\b\d{1,2}:\s*$/.test(before);
  const grade=/\bgrades?\s*$/i.test(before)||unit==='grade';
  // Ordinal degrees describe rank/severity (first-degree crime, third-degree
  // burn), not an angular/temperature quantity requiring cardinal figures.
  const degree=!ordinal&&(unit==='degree'||unit==='degrees')||/^\s*°/.test(after);
  const inNext=/^\s+in\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(after),inPrior=/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+in\s*$/i.exec(before);
  const inOther=inNext?.[1]||inPrior?.[1],inValue=inOther?(numbers.get(inOther.toLowerCase())??Number(inOther)):null;
  const ratio=inOther?Math.max(value,inValue)>=10:/\b(?:ratio|proportion)\s*(?:(?:of|by|is|was|to)\s+)?(?:(?:up to|at least|at most|not less than|not more than)\s+)?$/i.test(before)||/^\s*:\s*\d/.test(after)||/\b\d+\s*:\s*$/.test(before)||/\b\d+\s+to\s*$/i.test(before)&&/^\s*[.,;)]/.test(after)||/^\s+to\s+\d+\s*[.,;)]/.test(after);
  // LCB page 23 explicitly lists 6-point in Measures. It agrees with
  // GPO's figure treatment of typographic sizes; this is not the LCB/GPO
  // disagreement illustrated by two feet. Require an actual type/font head
  // so ordinary counts such as a three-point plan keep their prose rules.
  // A title-cased unit phrase continuing into an apparent proper name
  // supplies no dependable size context (for example 3-Point Type Institute).
  if(/^\s*-\s*Points?\s+(?:(?:Boldface|Italic|Roman|Display)\s+)?(?:Type|Fonts?)\s+[A-Z][\p{L}-]+\b/u.test(after))continue;
  const typographicMeasure=!ordinal&&/^\s*(?:-\s*)?points?\s+(?:(?:boldface|italic|roman|display)\s+)?(?:type|fonts?)\b/i.test(after);
  if(typographicMeasure&&!sentenceStart){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals: Measures',page:23,message:'LCB explicitly lists 6-point under measurements. Type and font sizes use figures, agreeing with GPO measurement rules.',gpo:'12.9',gpoPage:288});continue;
  }
  const duration=/^(?:day|week|month|year|hour|minute|second)s?$/.test(unit),measure=/^(?:feet|foot|inch|inches|meter|meters|metre|metres|mile|miles|pound|pounds|megabyte|megabytes|megawatt|megawatts|gallon|gallons|acre|acres)$/.test(unit);
  if(unit==='grade'&&ordinal&&value===1&&figure){candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:'first',rule:'Numerals: Grades',page:22,message:'LCB page 22 explicitly uses first grade in both bill and digest text.'});continue;}
  if(money||figureRepeat||percent||clock||grade||degree||ratio||/\d\.\d/.test(text)){
   // Paired dollar expressions and legal citations need their dedicated rules;
   // never change just one word inside a complete written amount.
   if(!figure&&!figureRepeat&&!sentenceStart&&(percent||clock||grade||degree||ratio)&&!(unit==='grade'&&text.toLowerCase()==='first')){
    const preferred=unit==='grade'&&ordinal?figureOrdinal(value):String(value);
    candidates.push({start,end,text,value,figure,ordinal,sentenceStart,context:ctx.at(start),exception:true,preferred,rule:grade?'Numerals: Grades':'Numerals, general item 2',page:grade?22:21,message:grade?'LCB uses figures in grades, preserving the ordinal suffix before grade (7th grade); first grade is its explicit exception.':'LCB requires figures for this numerical context.',gpo:'12.9',gpoPage:288});
   }
   continue;
  }
  candidates.push({start,end,text,value,figure,ordinal,sentenceStart,context:ctx.at(start),sentence,unit:singular(unit),duration,measure});
 }
 const cite=(id,rule,page,preferred,text)=>({guideId:id,guideName:id==='lcb'?'LCB Style Manual':'GPO Style Manual',rule,guidePage:page,guidePrintedPage:references[id].pages[page-1].printedPage,preferred,ruleText:text});
 const relatedStartNumbers=new Set(),openingBySentence=new Map();
 for(const n of candidates){
  if(n.sentenceStart&&!n.exception&&!n.ordinal){openingBySentence.set(n.sentence?.start,n);continue;}
  const first=openingBySentence.get(n.sentence?.start);
  if(!first||n.start<=first.end||n.exception||n.ordinal)continue;
  const bridge=source.slice(first.end,n.start).replace(/\s+/g,' ').trim();
  if(!/[.;:!?]/.test(bridge)&&bridge.split(/\s+/).filter(Boolean).length<=3&&/\b(?:and|or|to|through)\b/i.test(bridge))relatedStartNumbers.add(n);
 }
 const relatedFigures=new Set(),comparativeProofByStart=new Map();let group=[];
 const recognizedCountHead=new RegExp('^(?:'+nounHeadPattern+')$','i');
 const countExpression=n=>n.duration||n.measure||n.unit==='scalar-value'||recognizedCountHead.test(n.unit)||listNounPhrase(n.unit,references.lcb);
 const candidatesByStart=new Map(candidates.map(n=>[n.start,n]));
 for(const proof of comparativeUnitRanges(doc,ctx))for(const member of proof.members){const candidate=candidatesByStart.get(member.start);if(candidate&&candidate.end===member.end&&!candidate.exception&&!candidate.ordinal){relatedFigures.add(candidate);comparativeProofByStart.set(member.start,proof);}}
 // A repeated unit prevents an unjustified figure-to-word correction without
 // inferring that every same-unit quantity has the same legislative purpose.
 // New word-to-figure findings still require the established explicit range,
 // series or part-of-total evidence, rather than this conservative exception.
 // Complete decimals have their own figure rule and are not correction
 // candidates, but can still establish a same-unit magnitude of ten or more.
 const decimalWitnesses=atoms.filter(n=>n.figure&&!n.ordinal&&n.text.includes('.')&&!blocked(n.start,n.end)&&!incompleteNumeric(n.start,n.end)).map(n=>({...n,context:ctx.at(n.start),sentence:ctx.sentenceAt(n.start)}));
 const sentenceCandidates=[...candidates,...decimalWitnesses].sort((a,b)=>a.start-b.start);
 for(const proof of sentenceUnitGroups(doc,ctx,sentenceCandidates))for(const member of proof.members){const candidate=candidatesByStart.get(member.start);if(candidate?.figure){relatedFigures.add(candidate);if(!comparativeProofByStart.has(member.start))comparativeProofByStart.set(member.start,proof);}}
 for(const spread of spreads.groups){
  const members=spread.members.map(n=>candidatesByStart.get(n.start)).filter(n=>n&&!n.exception&&!n.ordinal&&countExpression(n));
  if(members.length&&spread.atLeastTen)for(const member of members)relatedFigures.add(member);
  const sentence=ctx.sentenceAt(spread.start),prefix=source.slice(sentence.start,spread.start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(!prefix)for(const member of members)if(member.start>spread.start)relatedStartNumbers.add(member);
 }
 const evidenceBlocked=styleEvidenceGuard(doc,ctx);
 const finishGroup=()=>{if(group.length<2||!group.some(n=>n.value>=10))return;
  const first=group[0],last=group.at(-1),head=/^\s*(?:-\s*)?(?:(?:business|calendar|court|school|academic|consecutive|working)\s+)?[a-z]+\b/i.exec(source.slice(last.end)),end=last.unit==='scalar-value'?last.end:last.end+(head?.[0].length||0);
  if(cutsOriginalStyleWord(doc,first.start)||cutsOriginalStyleWord(doc,end)||evidenceBlocked(first.start,end))return;
  for(const n of group)relatedFigures.add(n);
 };
 for(const n of candidates){
  const prior=group.at(-1),bridge=prior?source.slice(prior.end,n.start).replace(/\s+/g,' ').trim():'';
  if(!prior||n.exception||prior.exception||n.ordinal||prior.ordinal||n.context!==prior.context||n.sentence?.start!==prior.sentence?.start||!n.unit||!countExpression(n)||n.unit!==prior.unit||!/^(?:[a-z]+\s*,?\s*)?(?:and|or|to|through|,)\s*(?:(?:and|or)\s*)?$/i.test(bridge)){
   finishGroup();group=[n];
  }else group.push(n);
 }
 finishGroup();
 for(const members of countedGroups){
  const counts=members.map(r=>candidates.find(n=>n.start===r.start&&n.end===r.end&&!n.exception&&!n.ordinal&&!n.duration&&!n.measure));
  if(counts.every(Boolean)&&counts.some(n=>n.value>=10))for(const n of counts)relatedFigures.add(n);
 }
 for(const counts of partitiveCountGroups(ctx,candidates,references.lcb,doc))if(counts.some(n=>n.value>=10)){
  for(const n of counts)relatedFigures.add(n);
  // These partition counts are closely related to an initial whole. GPO
  // 12.25 spells them like that sentence-opening number, unlike LCB's
  // figures rule. Preserve the user's exclusion of guide disagreements.
  if(counts[0].sentenceStart)for(const n of counts.slice(1))relatedStartNumbers.add(n);
 }
 for(const n of candidates){
  // Keep large figure candidates as magnitude witnesses for related counts,
  // but never turn their rounded Number value into source wording/digits.
  const unsafeFigure=n.figure&&!Number.isSafeInteger(n.value);
  if(unsafeFigure&&(!n.ordinal||n.sentenceStart||n.exception||!exactFigureOrdinal(n.text)))continue;
  let preferred,rule,page=21,message,gpoRule,gpoPage,gpoPreferred,conflict=false;
  if(n.exception){({preferred,rule,page,message}=n);gpoRule=n.gpo;gpoPage=n.gpoPage;gpoPreferred=preferred;}
  else if(n.sentenceStart){
   if(!n.figure)continue;preferred=n.ordinal?spellOrdinal(n.value):spellNumber(n.value);preferred=preferred[0].toUpperCase()+preferred.slice(1);rule='Numerals, general item 1';message='Spell out a number at the beginning of a sentence, or rephrase the sentence.';gpoRule='12.16';gpoPage=294;gpoPreferred=preferred;
  }else if(n.ordinal){
   if(n.unit==='party'&&n.value===3){preferred='third';rule='Numerals: Digest, item 3';message='Use “third party” for a person other than the principals.';}
   else{const words=n.context==='Digest'?n.value===1:n.value<10;preferred=words?ordinals[n.value]:unsafeFigure?exactFigureOrdinal(n.text):figureOrdinal(n.value);rule=`Numerals: ${n.context}, item ${n.context==='Digest'?2:4}`;message=`LCB ${n.context.toLowerCase()} rules determine the ordinal form here.`;}
   gpoRule='12.10';gpoPage=292;gpoPreferred=n.value<10?ordinals[n.value]:preferred;conflict=n.context==='Digest'&&n.value>1&&n.value<10&&n.unit!=='party';
  }else{
   const related=relatedFigures.has(n);
   const words=n.context==='Digest'?n.value===1:n.value<10&&!related&&!((n.value===0)&&(n.duration||n.measure));
   preferred=words?spellNumber(n.value):String(n.value);rule=`Numerals: ${n.context}, item ${n.context==='Digest'?1:related?3:words?1:2}`;
   page=21;
   message=related?'Related numbers in the same numerical expression use figures when one is 10 or more.':n.context==='Digest'?'Digest text uses figures except for one.':'Bill text spells out one through nine and uses figures for 10 and above; different numerical expressions are treated separately.';
   gpoRule=n.duration||n.measure?'12.9':n.value<10?'12.23':'12.4';gpoPage=n.duration||n.measure?288:n.value<10?296:287;
   gpoPreferred=n.duration||n.measure?String(n.value):n.value<10?spellNumber(n.value):String(n.value);
   if(related&&!n.duration&&!n.measure){gpoRule='12.5';gpoPage=287;gpoPreferred=String(n.value);}
   conflict=(n.duration||n.measure)&&words||n.context==='Digest'&&n.value!==1&&n.value<10&&!n.duration&&!n.measure&&!related||n.context==='Digest'&&n.value===1&&related;
  }
  // GPO 12.25 spells closely related sentence-opening numbers alike;
  // LCB’s later-number form can differ; the applicable LCB form wins.
  if(relatedStartNumbers.has(n)){conflict=true;gpoRule='12.25';gpoPage=297;gpoPreferred=spellNumber(n.value);}
  if(n.figure&&!n.ordinal&&/^\d+(?:\.\d+)?$/.test(preferred)&&Number(n.text.replaceAll(',',''))===Number(preferred))preferred=n.text;
  const normalized=n.text.toLowerCase().replace(/\s+/g,' '),matchesPrimary=normalized===preferred.toLowerCase();
  // Already compliant LCB wording is not a finding, including when the
  // secondary GPO convention differs. Do not create a conflict-only warning.
  if(matchesPrimary)continue;
  const gpoRecord=references.gpo.pages[(gpoPage||296)-1],gpoText=gpoRecord.text.slice(Math.max(0,gpoRecord.text.indexOf((gpoRule||'12.23')+'.'))).replace(/\s+/g,' ').slice(0,850);
  const refs=[cite('lcb',rule,page,preferred,message),cite('gpo',gpoRule||'12.23',gpoPage||296,gpoPreferred||preferred,gpoText)];
  if(n.duration||n.measure)refs.splice(1,0,cite('lcb',n.duration?'Numerals: Days/Dates and Ages':'Numerals: Measures',n.duration?22:23,preferred,n.duration?'LCB examples distinguish “four years (bill)” from “4 years (digest)” and “two years of age (bill)” from “2 years of age (digest).”':'LCB examples distinguish “two feet (bill)” from “2 feet (digest)” and “five megabytes (bill)” from “5 megabytes (digest).”'));
  const zeroFallback=n.value===0&&!n.exception&&!n.sentenceStart&&n.context==='Bill'&&!n.duration&&!n.measure&&!relatedFigures.has(n);
  if(zeroFallback){
   const note='LCB bill rules specify one through nine and ten or above without specifying zero. Under LCB’s reference priority, GPO 12.23 spells out an isolated number below ten. Signed quantities and technical contexts are protected.';
   issues.push({start:n.start,end:n.end,text:n.text,suggestion:preferred,rule:'12.23',guideId:'gpo',guidePage:296,guidePrintedPage:references.gpo.pages[295].printedPage,category:'Numeral form',context:n.context,confidence:'Rule check',checkId:'numerals',references:[cite('gpo','12.23',296,preferred,note),cite('lcb','Reference guide priority',1,preferred,'LCB places GPO next after its own manual.')],conflict:false,matchesPrimary,message:note});
   continue;
  }
  const comparativeProof=comparativeProofByStart.get(n.start);if(comparativeProof)refs[0].ruleText='When 2 or more numbers appear in a sentence and one of them is 10 or larger, figures are used for each number, unless they are of different numerical expressions.';
  issues.push({start:n.start,end:n.end,text:n.text,suggestion:preferred,rule,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),category:'Numeral form',context:n.context,confidence:'Rule check',checkId:n.checkId||'numerals',references:refs,conflict,matchesPrimary,message:matchesPrimary?'Current wording follows LCB; no LCB correction is suggested. GPO uses a different form.':message,conflictNote:conflict?'LCB takes priority. LCB and GPO use different numeral forms in this context; the LCB recommendation is shown.':undefined,...(comparativeProof?{evidenceStart:comparativeProof.start,evidenceEnd:comparativeProof.end,relationshipEvidence:comparativeProof}:{})});
 }
 return issues;
}
import {chemicalNameRanges} from './chemical-name-ranges.mjs';
