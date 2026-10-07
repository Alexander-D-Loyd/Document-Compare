// Explicit close variants of GPO forms; no arbitrary near-word substitutions.
// Suggestions are advisory: a phrase can have a legitimate contextual exception.
export const STYLE_RULES = [
  ...[
    ['acknowledgement','acknowledgment'],['acknowledgements','acknowledgments'],
    ['abridgement','abridgment'],['cancelled','canceled'],['cancelling','canceling'],
    ['catalogue','catalog'],['catalogues','catalogs'],
    ['defence','defense'],['grey','gray'],['licence','license'],
    ['offence','offense'],['plough','plow'],['theatre','theater'],['centre','center'],
    ['centres','centers'],['favour','favor'],
    ['judgement','judgment'],['judgements','judgments'],
    ['labelled','labeled'],['labelling','labeling'],['modelled','modeled'],['modelling','modeling'],
    ['skilful','skillful'],
    ['towards','toward'],['worshipped','worshiped'],['worshipping','worshiping']
  ].map(([variant,preferred])=>({variant,preferred,rule:'5.2',category:'Preferred spelling',message:'Compare this spelling variant with the GPO preferred form.'})),
  ...['organise','recognise','authorise','standardise','realise','specialise','legalise','modernise','normalise','prioritise','utilise','optimise','emphasise'].flatMap(stem=>[
    [stem,stem.slice(0,-3)+'ize'],[stem+'d',stem.slice(0,-3)+'ized'],[stem.slice(0,-1)+'ing',stem.slice(0,-3)+'izing'],[stem+'s',stem.slice(0,-3)+'izes']
  ].map(([variant,preferred])=>({variant,preferred,rule:'5.12',category:'Preferred spelling',message:'GPO generally uses -ize for these forms; listed -ise exceptions remain accepted.'}))),
  ...[['analyse','analyze'],['analysed','analyzed'],['analysing','analyzing']].map(([variant,preferred])=>({variant,preferred,rule:'5.12',category:'Preferred spelling',message:'Compare the -yse spelling with GPO’s -yze form.'})),
  ...[['travelled','traveled'],['travelling','traveling'],['totalled','totaled'],['totalling','totaling']].map(([variant,preferred])=>({variant,preferred,rule:'5.14',category:'Preferred spelling',message:'Compare the doubled consonant with the GPO example.'})),
  ...[['attorney generals','attorneys general'],['attorney-generals','attorneys general'],['inspector generals','inspectors general'],['notary publics','notaries public'],['court-martials','courts-martial'],['right-of-ways','rights-of-way'],['commander in chiefs','commanders in chief']].map(([variant,preferred])=>({variant,preferred,rule:'5.8',category:'Compound plural',message:'GPO forms this compound plural on the significant word.'})),
  ...[['co-operation','cooperation'],['co-operate','cooperate'],['co-operating','cooperating'],['pre-existing','preexisting'],['de-emphasis','deemphasis']].map(([variant,preferred])=>({variant,preferred,rule:'6.7',category:'Compounding',message:'Compare the hyphenated form with GPO’s solid compound.'})),
  ...[['noone','no one'],['no-one','no one']].map(([variant,preferred])=>({variant,preferred,rule:'6.12',category:'Compounding',message:'GPO prints “no one” as two words.'})),
  ...[['north-east','northeast'],['north-west','northwest'],['south-east','southeast'],['south-west','southwest']].map(([variant,preferred])=>({variant,preferred,rule:'6.14',category:'Compounding',message:'GPO prints two-point compass directions as one word.'})),
  ...[['vice-president','vice president'],['attorney-general','attorney general'],['notary-public','notary public'],['commander-in-chief','commander in chief'],['sergeant-at-arms','sergeant at arms']].map(([variant,preferred])=>({variant,preferred,rule:'6.40',category:'Title compounding',message:'GPO generally leaves single-office civil and military titles unhyphenated. Review compound or quoted usages.'})),
  ...[['ex governor','ex-governor'],['self control','self-control'],['quasi academic','quasi-academic']].map(([variant,preferred])=>({variant,preferred,rule:'6.34',category:'Compounding',message:'Compare this prefix with GPO’s hyphenated example.'})),
  ...[['united states','United States'],['united nations','United Nations'],['environmental protection agency','Environmental Protection Agency'],['department of agriculture','Department of Agriculture']].map(([variant,preferred])=>({variant,preferred,rule:'3.18',category:'Capitalization',caseSensitive:true,message:'Compare the capitalization of this full organized-body name with GPO’s example.'}))
];

const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fold=s=>s.normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();
export function findRuleReference(reference,rule){
  const pattern=new RegExp(`(?:^|\\s)${escape(rule)}\\.(?:\\s|$)`);
  return reference.pages.find(p=>pattern.test(p.text));
}
export function searchGuide(reference,query){
  const terms=query.normalize('NFKC').toLowerCase().match(/"[^"]+"|\S+/g)?.map(t=>t.replace(/^"|"$/g,''))||[];
  if(!terms.length)return reference.chapters.map(c=>({...reference.pages[c.page-1],browse:true}));
  return reference.pages.filter(p=>{
    const source=(`${p.chapter} ${p.text}`).normalize('NFKC').replace(/([a-z])-\s*\n\s*([a-z])/gi,'$1$2').replace(/\s+/g,' ').toLowerCase();
    return terms.every(t=>source.includes(t));
  });
}
export function stylisticIssues(doc,reference,rules=STYLE_RULES,{dynamic=true}={}){
  const blocked=[...(doc.excluded||[]),...(doc.struck||[])];
  const protectedRanges=[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))];
  const issues=[],seen=new Set();
  const source=doc.text.split('');for(const r of blocked)for(let i=r.start;i<r.end;i++)source[i]=' ';
  const searchable=source.join('').replace(/[\u2010-\u2015]/g,'-');
  const add=(match,rule,preferred)=>{
    const start=match.index,end=start+match[0].length;
    if(protectedRanges.some(r=>r.start<end&&r.end>start))return;
    const raw=fold(match[0]),normalized=raw;
    if(rule.caseSensitive?(normalized===preferred||normalized===preferred.toUpperCase()):normalized.toLowerCase()===preferred.toLowerCase())return;
    const key=`${start}:${end}`;if(seen.has(key))return;
    const page=rule.guidePage?reference.pages[rule.guidePage-1]:findRuleReference(reference,rule.rule);if(!page)return;
    seen.add(key);
    let suggestion=preferred;
    if(!rule.caseSensitive){if(raw===raw.toUpperCase())suggestion=preferred.toUpperCase();else if(/^[A-Z]/.test(raw))suggestion=preferred[0].toUpperCase()+preferred.slice(1);}
    issues.push({start,end,text:raw,suggestion,rule:rule.rule,category:rule.category,message:rule.message,guidePage:page.page,guidePrintedPage:page.printedPage});
  };
  for(const rule of rules){
    const variants=rule.category.includes('ompound')?[rule.variant,rule.variant.replaceAll('-',' '),rule.variant.replaceAll(' ','-'),rule.variant.replace(/[- ]/g,'')]:[rule.variant];
    for(const variant of new Set(variants)){
      const parts=variant.split(' ').map(escape).join('\\s+');
      for(const match of searchable.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${parts}(?![\\p{L}\\p{N}_])`,'giu'))){
        if(rule.rule==='6.40'&&/^-(?:elect|designate)\b/i.test(searchable.slice(match.index+match[0].length)))continue;
        add(match,rule,rule.preferred);
      }
    }
  }
  if(dynamic){
  // Restrict -ly checks to actual adverbs, excluding family-, early-, etc.
  const adverbs='publicly|privately|wholly|newly|highly|fully|federally|locally|recently|previously|widely|closely|eagerly|unusually';
  for(const match of searchable.matchAll(new RegExp(`\\b(?:${adverbs})-[a-z]+\\b`,'gi')))add(match,{rule:'6.20',category:'Modifier hyphenation',message:'GPO omits the hyphen after an adverb ending in -ly.'},match[0].replace('-',' '));
  // A spelled-out compound number retains its words; only the missing hyphen is suggested.
  for(const match of searchable.matchAll(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(?:one|two|three|four|five|six|seven|eight|nine)\b/gi))add(match,{rule:'6.36',category:'Numerical compounding',message:'GPO hyphenates the elements of spelled-out compound numbers from twenty-one through ninety-nine.'},fold(match[0]).replace(' ','-'));
  // Only compare the specific unit-modifier phrases illustrated by GPO, retaining noun context.
  for(const [phrase,noun] of [['long term','loan'],['high speed','line'],['large scale','project'],['low cost','housing'],['lump sum','payment'],['part time','personnel'],['state of the art','technology'],['cost of living','increase']]){
    const pattern=new RegExp(`\\b${phrase.split(' ').join('\\s+')}(?=\\s+${noun}\\b)`,'gi');
    for(const match of searchable.matchAll(pattern))add(match,{rule:'6.15',category:'Modifier hyphenation',message:'This phrase resembles a GPO example of a hyphenated modifier before a noun; confirm that the same context applies.'},phrase.replaceAll(' ','-'));
  }
  }
  return issues.sort((a,b)=>a.start-b.start||a.end-b.end).map((issue,id)=>({...issue,id}));
}
