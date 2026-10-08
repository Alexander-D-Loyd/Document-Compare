import {WORD_CHOICE_RULES} from './style-word-choice.mjs';
import {GPO_ASSESSMENTS} from './style-rule-assessments.mjs';
import {END_WORD_RULES,OPEN_END_RULES} from './style-compounds.mjs';
import {lcbLexicalInventory} from './lcb-lexical-inventory.mjs';
import {lcbRules} from './joint-style.mjs';
import {lcbModifierForms} from './lcb-contextual.mjs';
import {LISTED_NOUN_RULES} from './style-listed-nouns.mjs';
import {CAPITALIZATION_NAMES,CAPITALIZATION_DESCRIPTIONS} from './style-capitalization.mjs';
// Inventory source passages separately from implementations. Presence in this
// index is never counted as automatic coverage of the whole rule.
const cache=new WeakMap();
const supportedGpo=new Map([
 ['3.18','Selected organized-body names'],['3.20','Federal government conflict'],
 ['5.2','Selected spelling variants'],['5.8','Selected compound plurals'],['5.12','Selected -ize and -yze variants'],['5.14','Selected doubled consonants'],
 ['6.7','Selected solid compounds'],['6.12','No one'],['6.14','Selected compass forms'],['6.15','Selected noun-head modifiers'],['6.20','Selected -ly adverbs'],['6.34','Selected prefix examples'],['6.36','Compound numbers'],['6.40','Selected civil/military titles'],
 ['9.53','Selected temperature symbol spacing'],['9.54','Exact hours with a.m./p.m.'],['9.55','Redundant o’clock with time abbreviations'],['9.56','Selected metric symbol spacing and plurals'],['9.58','Selected English unit abbreviation plurals'],
 ['12.1','Contextual numeral engine; exceptions remain'],['12.7','Selected protected identifiers'],['12.9','Selected dates and quantities']
 ,['8.8','Malformed possessive pronoun forms'],['8.14','Selected time possessive phrases'],['8.46','Explicitly introduced simple serial lists'],['8.51','Comma position in quotations'],['8.53','Full-date commas'],['8.56','Month-year commas'],['8.138','Comma and period position in quotations']
]);
const lcbScope={2:'Selected spelling preferences, contractions, and/or and established initialisms',3:'Selected spelling variants and explicit word-choice cues; ambiguous meanings remain manual',4:'Selected spelling variants and explicit word-choice cues; ambiguous meanings remain manual',5:'Selected spelling variants and explicit word-choice cues; ambiguous meanings remain manual',6:'Quoted comma/period position, simple serial lists and selected apostrophes; selected grouped noun series need a final semicolon; complex clauses remain',7:'Dates, listed possessives and time notice expressions',8:'Listed modifiers, selected predicate forms, foreign phrases and selected -ly adverbs',9:'Listed hyphenated modifiers before recognized noun heads; selected compounds',10:'Listed hyphenated modifiers before recognized noun heads; selected compounds',11:'Listed hyphenated modifiers before recognized noun heads; selected compounds',12:'Listed hyphenated modifiers before recognized noun heads; selected compounds',13:'Listed hyphenated modifiers before recognized noun heads; selected compounds',14:'Listed hyphenated modifiers before recognized noun heads; selected compounds',15:'Explicit listed end-word compounds and open-word exceptions; inflections and new formations remain partial',16:'-adopted/-approved/-based/-related before recognized noun heads',17:'Selected code titles; official-name/context rules remain',18:'Selected listed institutions and descriptive phrases; contextual titles remain partial',19:'Known federal government and numbered-reference conflicts excluded; other contextual examples remain',20:'Selected listed institutions and descriptive phrases; constitutional contexts remain partial',21:'Bill/digest cardinals, ordinals, starts and numerical spreads; selected fractions and mixed durations; money remains partial',22:'Selected ages, citations, dates, durations and grades',23:'Selected measures, percentages, explicit ratios and clock times; monetary forms in recognized codified provisions, findings and resolutions; unknown monetary contexts remain manual'};
// Reviewed against GPO chapter 1 source passages. These are classified
// individually; an exclusion here is not a claim of automated style coverage.
const gpoAssessment=new Map([
 ...['1.1','1.3','1.4','1.8','1.9','1.10','1.11','1.12','1.13','1.14','1.15','1.16','1.17','1.18','1.19','1.20','1.21','1.22'].map(id=>[id,{status:'Not applicable to legislative prose',scope:'This rule governs manuscript submission, printing/binding, requisitions, pagination instructions or proof-marking workflows. It is retained for source search but does not define a word-level legislative prose correction.'}]),
 ['1.2',{status:'Manual review required',scope:'Source legibility requires visual review of the PDF or scan. Readable extraction alone cannot certify reproduction quality.'}],
 ['1.5',{status:'Manual review required',scope:'Plain presentation of names, signatures, figures, foreign words and technical terms requires visual and contextual judgment.'}],
 ['1.6',{status:'Manual review required',scope:'Chemical symbols such as Al/Cl/Tl versus A1/C1/T1 require scientific context and source-image evidence. Do not replace them based on spelling similarity.'}],
 ['1.7',{status:'Manual review required',scope:'Footnote reference order is a layout rule. It needs reliable footnote identification and left-to-right page geometry, which this style checker does not yet establish.'}]
]);
for(const [id,assessment] of GPO_ASSESSMENTS)gpoAssessment.set(id,assessment);
const lcbAssessment={
 '2-2':{status:'Manual review required',scope:'Dictionary authority and first-listed spelling require the cited dictionary and context. Selected variants do not automate this instruction.'},
 '17-1':{status:'Partially automated',scope:'Selected complete entity names are checked; unlisted entity names and official heads require manual review.'},
 '17-2':{status:'Partially automated',scope:'Selected official code, act, account and fund titles are checked; unlisted or locally defined titles require review.'},
 '17-3':{status:'Partially automated',scope:'Selected standalone office words are lowercased only with article and clause cues, while quoted definitions and complete official names are protected. The Superintendent exception requires recognized codified Education Code context and an explicit Public Instruction definition. Unknown referents and other contexts require manual review.'},
 '17-4':{status:'Partially automated',scope:'Known federal government capitalization conflicts are excluded under the user policy; other federal titles need name and context evidence.'},
 '17-5':{status:'Partially automated',scope:'Standalone act/article/chapter/division/section are checked with numbered/title protections.'},
 '17-6':{status:'Partially automated',scope:'Person’s office and selected formal agency names are distinguished. Unlisted official offices need review.'},
 '17-7':{status:'Manual review required',scope:'The OLC Intranet entity list is not bundled with the offline app. Entity verification against that source is unavailable.'}
};
// Chapter 20 numbers these report-format instructions 1–14, without a
// chapter.rule label. Keep their actual identifiers instead of inventing
// GPO 20.1 citations or silently dropping them from the source inventory.
const reportScopes=[
 'Excerpt point size, 2-em cut-in and asterisk ellipses',
 'Contempt proceedings classified as excerpts',
 'Letters, appendixes/exhibits and Ramseyer matter not cut in',
 'Leaderwork and lists of more than six items in 8-point type',
 'Tabular work in 7-point gothic type',
 'Substitute-amendment and later quotation type/measure',
 'Committee prints with report heads use report style',
 'Committee prints without report heads use committee-print style',
 'Existing committee-print type reused when submitted as a report',
 'One-sided versus two-sided cut-in space and excerpt measures',
 'Immigration-case memorandums and adjacent committee-language indentation',
 'Senate report printing order, views, Cordon material and appendixes',
 'New-page and odd-page placement for views and explanatory statements',
 'Author signatures required before printing minority/additional views'
];
function reportFormatInventory(reference){
 const pages=reference.pages.filter(p=>p.page>=439&&p.page<=441),parts=pages.map(p=>p.flowText||p.text),source=parts.join('\n');
 const starts=[];let expected=1;
 for(const m of source.matchAll(/(?:^|\n)[ \t]*(\d{1,2})\.[ \t]+/g))if(Number(m[1])===expected&&expected<=14){starts.push(m);expected++;}
 if(starts.length!==14)throw Error('Report-format inventory must retain all 14 source items.');
 return starts.map((m,i)=>{
  const end=starts[i+1]?.index??source.indexOf('[Sample',m.index),text=source.slice(m.index,end<0?source.length:end).replace(/\s+/g,' ').trim();
  let offset=0;const page=pages.find((p,j)=>{const inside=m.index<offset+parts[j].length+1;offset+=parts[j].length+1;return inside;});
  return {id:'gpo-report-format-'+(i+1),title:'GPO Reports and Hearings · Format item '+(i+1),guide:'gpo',page:page.page,status:'Not applicable to legislative prose',text,scope:reportScopes[i]+'. This instruction governs congressional numbered-report composition, rather than the wording of a California bill. Source typography and report context would require a separate report/layout checker; bill excerpts retain bill style.'};
 });
}
export function styleRuleInventory(references){
 if(cache.has(references))return cache.get(references);
 const records=[];
 for(const id of ['lcb','gpo']){
  const ref=references[id];if(!ref)continue;
  if(id==='gpo'){
   const pages=ref.pages.filter(p=>p.chapter!=='Index'),parts=pages.map(p=>p.flowText||p.text),starts=[];let offset=0;
   for(let i=0;i<parts.length;i++){starts.push({offset,page:pages[i]});offset+=parts[i].length+1;}
   const full=parts.join('\n');const matches=[...full.matchAll(/(?:^|\n|(?<=[a-z]\.))[ \t]*(\d{1,2}\.\d{1,3})\.[ \t\n]+/g)],covered=new Set();
   for(let i=0;i<matches.length;i++){
    const m=matches[i],start=m.index,end=matches[i+1]?.index??full.length;
    const page=starts.findLast(p=>p.offset<=start+m[0].length)?.page;if(!page)continue;
    const chapterEnd=starts.find(p=>p.offset>start&&p.page.chapter!==page.chapter)?.offset;
    // The compound examples are a separate dictionary, not part of 7.13.
    const examplesEnd=m[1]==='7.13'?starts.find(p=>p.page.page===127)?.offset:undefined;
    const ruleEnd=Math.min(end,chapterEnd??end,examplesEnd??end);
    const rule=m[1];if(Number(rule.split('.')[0])<1||Number(rule.split('.')[0])>20)continue;
    const passage=full.slice(start,ruleEnd).trim(),text=passage.replace(/([a-z])-\s*\n\s*([a-z])/gi,'$1$2').replace(/\s+/g,' ').trim();
    records.push({id:'gpo-'+rule,title:'GPO '+rule+' · '+page.chapter,guide:'gpo',page:page.page,status:gpoAssessment.get(rule)?.status||(supportedGpo.has(rule)?'Partially automated':'Not yet assessed'),text,scope:gpoAssessment.get(rule)?.scope||supportedGpo.get(rule)||'This source rule has not been fully mapped to an automated check. Manual review remains necessary.'});covered.add(page.page);
   }
   // Unnumbered example tables, front matter and indexes still have a source
   // entry. Do not silently drop them because they have no numbered rule.
   for(const p of ref.pages)if(!covered.has(p.page)&&p.text.trim())records.push({id:'gpo-page-'+p.page,title:'GPO · '+p.chapter+' · Source page '+p.page,guide:'gpo',page:p.page,status:'Not yet assessed',text:p.text.replace(/\s+/g,' ').trim(),scope:'Unnumbered examples or page continuation; source search is available. Whole-page automatic coverage is not established.'});
   records.push(...reportFormatInventory(ref));
   records.push(
    {id:'gpo-geologic-copy',title:'GPO Geologic terms · Literal source usage',guide:'gpo',page:363,status:'Manual review required',text:'For geologic capitalization, compounding and quotation, follow copy. Verbatim published material retains the original author’s usage and identifies it as such.',scope:'Selected literal quotations are protected, but distinguishing every verbatim extract, source citation and intended authorial use requires contextual review. A quoted term is not complete evidence of source provenance.'},
    {id:'gpo-geologic-formal',title:'GPO Geologic terms · Formal time names',guide:'gpo',page:363,status:'Partially automated',text:'Formal geologic terms are capitalized: Proterozoic Eon, Cambrian Period. The source table lists divisions of geologic time.',scope:'Selected complete eon/era/period names from the source table require the explicit rank word and are checked for case. Quotations, tables, headings and strikeouts are protected. Isolated words, scientific dates, unfamiliar ranks and external geologic authority remain manual.'},
    {id:'gpo-geologic-structure',title:'GPO Geologic terms · Named structural features',guide:'gpo',page:363,status:'Partially automated',text:'Structural terms such as arch, anticline or uplift are capitalized when preceded by a name: Cincinnati Arch, Cedar Creek Anticline, Ozark Uplift.',scope:'The three explicit named source examples are checked. Generic arch/anticline/uplift words and literal source quotes are protected; unlisted formations and actual feature identity require review.'},
    {id:'gpo-physiographic-names',title:'GPO Geographic divisions · Physiographic regions',guide:'gpo',page:364,status:'Manual review required',text:'Physiographic regions have divisions, provinces and sections. All names are capitalized, not the class.',scope:'The three-tier classification and complete geographic tables require actual region/name versus class identification, source fidelity and external naming evidence. The tables remain searchable; their many proper names are not treated as interchangeable style variants.'}
   );
  }else{
   for(const p of ref.pages){
    const numbered=[...p.text.matchAll(/(?:^|\n)[ \t]*(\d+)\.[ \t]+/g)];
    if(numbered.length){for(let i=0;i<numbered.length;i++){
     const m=numbered[i],text=p.text.slice(m.index,numbered[i+1]?.index??p.text.length).replace(/\s+/g,' ').trim();
     const section=p.page===21?[...p.text.slice(0,m.index).matchAll(/(?:^|\n)[ \t]*(Bill|Digest)[ \t]*(?=\n|$)/g)].at(-1)?.[1]||'General':'';
     const assessment=lcbAssessment[p.page+'-'+m[1]];
     records.push({id:'lcb-'+p.page+'-'+(section?section.toLowerCase()+'-':'')+m[1],title:'LCB '+p.chapter+' · Page '+p.page+(section?' · '+section:'')+' · Item '+m[1],guide:'lcb',page:p.page,status:p.page===1?'Reference priority':assessment?.status||'Partially automated',text,scope:p.page===1?'LCB takes precedence over GPO.':assessment?.scope||lcbScope[p.page]||'Not fully mapped; manual review required.'});
    }}else records.push({id:'lcb-page-'+p.page,title:'LCB '+p.chapter+' · Source page '+p.page,guide:'lcb',page:p.page,status:/Not yet/.test(lcbScope[p.page]||'')?'Not yet assessed':'Partially automated',text:p.text.replace(/\s+/g,' ').trim(),scope:lcbScope[p.page]||'Not fully mapped; manual review required.'});
   }
  }
 }
 for(const item of [...END_WORD_RULES,...OPEN_END_RULES]){
  const conflict=['groundwater','wildland'].includes(item.preferred);
  records.push({id:item.id,title:'LCB End words · '+item.preferred,guide:'lcb',page:15,status:conflict?'Excluded guide conflict':'Partially automated',text:'LCB page 15 lists '+item.preferred+'. Checked variant: '+item.variant+'.',scope:conflict?'LCB uses the solid form while GPO’s Chapter 7 compounding table uses a space. Both guide choices are excluded from Stylistic Check under the user policy. Source lookup remains available.':'Tested exact open or hyphenated variant in active prose. All-capital headings, apparent continued official titles, tables and strikeouts are protected. Selected ordinary noun plurals are tested; other inflections and unlisted new formations still need review.',context:'Active bill/digest prose',exceptions:'Source strikeouts, margin labels, all-capital headings, recognized tables and apparent extended titles'});
 }
 for(const item of WORD_CHOICE_RULES)records.push({id:'lcb-usage-'+item.id,title:'LCB Word choice · '+item.id,guide:'lcb',page:item.page,status:'Partially automated',text:item.explanation,scope:'Explicit grammatical or domain cue: '+item.explanation+' Ambiguous meanings and quoted/defined terms require manual review.',context:'Active prose with the encoded contextual cue',exceptions:'Quoted text, source strikeouts, headings, tables and apparent continued titles'});
 if(references.lcb){const implemented=[...[...CAPITALIZATION_NAMES,...CAPITALIZATION_DESCRIPTIONS].map(([page,preferred])=>({page,preferred,scope:'Selected listed capitalization with sentence-start, heading/table and extended-name protections; authentic referents and stated role exceptions remain manual.'})),...WORD_CHOICE_RULES.map(r=>({preferred:r.preferred,page:r.page,scope:'Explicit meaning/grammar cue: '+r.explanation})),{preferred:'Celsius',page:3,scope:'The explicit degrees Celsius context is checked for scale-name capitalization.'},{preferred:'Fahrenheit',page:4,scope:'The explicit degrees Fahrenheit context is checked for scale-name capitalization.'},...lcbRules(references.lcb).map(r=>({preferred:r.preferred,page:r.guidePage,scope:'Explicit close variant '+r.variant+' is checked.'})),...lcbModifierForms(references.lcb).map(r=>({preferred:r.form,page:r.page,scope:'Listed open variant before a recognized noun head is checked.'})),...LISTED_NOUN_RULES.map(r=>({...r,scope:'Variant '+r.variant+' requires a noun/article cue or recognized attributive head; literal names and quoted uses remain protected.'}))];records.push(...lcbLexicalInventory(references.lcb,implemented));}
 const seen=new Set();const unique=records.filter(r=>!seen.has(r.id)&&seen.add(r.id));cache.set(references,unique);return unique;
}
export function searchRuleInventory(references,query=''){
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return styleRuleInventory(references).filter(r=>terms.every(t=>(r.title+' '+r.status+' '+r.text+' '+r.scope).toLowerCase().includes(t)));
}

