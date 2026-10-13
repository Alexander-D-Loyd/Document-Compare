import {threePointCompassCandidates,threePointCompassIssues} from './style-compass-directions.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
import {multiAdverbCandidates,multiAdverbHead,lyModifierCandidates,lyModifierHead} from './style-multi-adverb-modifiers.mjs';
// Explicit close variants of GPO forms; no arbitrary near-word substitutions.
// Suggestions are advisory: a phrase can have a legitimate contextual exception.
export const STYLE_RULES = [
  ...[['ageing','aging'],['aluminium','aluminum'],['anaemia','anemia'],['anaesthetic','anesthetic'],['haemoglobin','hemoglobin'],['diarrhoea','diarrhea'],['oedema','edema'],['encyclopaedia','encyclopedia'],['oesophagus','esophagus'],['fibre','fiber'],['calibre','caliber'],['litre','liter'],['metre','meter'],['manoeuvre','maneuver'],['jewellery','jewelry'],['mould','mold'],['moult','molt'],['mollusc','mollusk'],['sulphur','sulfur'],['sceptic','skeptic'],['spectre','specter'],['smoulder','smolder']].map(([variant,preferred])=>({variant,preferred,rule:'5.2',category:'Preferred spelling',message:'GPO lists this preferred spelling. Confirm that the word is ordinary prose rather than an established proper name.'})),
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
  {variant:'united states',preferred:'United States',rule:'3.3',category:'Capitalization',caseSensitive:true,message:'GPO 3.3 capitalizes proper names. This selected complete country name is checked; unfamiliar names and literal or historic source uses still require review.'},
  ...[['united nations','United Nations'],['environmental protection agency','Environmental Protection Agency'],['department of agriculture','Department of Agriculture']].map(([variant,preferred])=>({variant,preferred,rule:'3.18',category:'Capitalization',caseSensitive:true,message:'Compare the capitalization of this full organized-body name with GPO’s example.'}))
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
  const rangeBlocked=styleEvidenceGuard(doc),cutsWord=index=>/[\p{L}\p{N}\p{M}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}\p{M}_]/u.test(doc.text.slice(index,index+2));
  const issues=[],seen=new Set();
  const source=doc.text.split('');for(const r of blocked)for(let i=r.start;i<r.end;i++)source[i]=' ';
  const searchable=source.join('').replace(/[\u2010-\u2015]/g,'-');
  const hasCompass=rules.some(r=>r.rule==='6.14'),compassRanges=hasCompass?threePointCompassCandidates(searchable):[];
  const literalRanges=[...searchable.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
  const add=(match,rule,preferred,evidenceEnd=match.index+match[0].length)=>{
    const start=match.index,end=start+match[0].length;
    if(cutsWord(start)||cutsWord(end)||cutsWord(evidenceEnd)||rangeBlocked(start,evidenceEnd))return;
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
      // Slash spacing can vary in extraction without changing the prohibited
      // conjunction. Keep the complete source range, including wrapped lines.
      const parts=variant==='and/or'?'and\\s*/\\s*or':variant.split(' ').map(escape).join('\\s+');
      for(const match of searchable.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${parts}(?![\\p{L}\\p{N}_])`,'giu'))){
        // Adjacent path delimiters identify this slash spelling as a technical
        // segment, not the prohibited prose conjunction. Other syntax remains
        // manual; the shared evidence guard protects explicit URLs and email.
        if(variant==='and/or'&&(/[\/\\@]/u.test(doc.text[match.index-1]||'')||/[\/\\@]/u.test(doc.text[match.index+match[0].length]||'')))continue;
        // A known three-point expression owns its complete selection. An
        // uncertain or protected whole expression must not fall back to its
        // second two-point component alone.
        if(rule.rule==='6.14'&&compassRanges.some(r=>r.start<match.index+match[0].length&&r.end>match.index))continue;
        // Grey can be a surname, a quoted foreign spelling or a label.
        // The dictionary preference check supplies the same finite sense.
        if(rule.variant==='grey'&&(match[0]!=='grey'||!/^\s+(?:color|colour|paint|fabric|background|hair)\b/.test(searchable.slice(match.index+match[0].length))))continue;
        if(rule.rule==='6.40'&&/^-(?:elect|designate)\b/i.test(searchable.slice(match.index+match[0].length)))continue;
        if(rule.category.includes('ompound')&&/^(?:permit|license|bond)[\s-]+holders?$/i.test(match[0])){
          const before=searchable.slice(Math.max(0,match.index-55),match.index),after=searchable.slice(match.index+match[0].length);
          if(/\b(?:shall|must|may|can|could|will|would|should)\s*$/i.test(before)||/\bto\s*$/i.test(before)&&/^\s+to\s+[a-z]/i.test(after))continue;
        }
        if(rule.category==='Contractions'&&/^[’'](?:ve|ll|d|re|s)\b/i.test(searchable.slice(match.index+match[0].length)))continue;
        // A new office-preference plural must not alter the last word of a
        // formal-looking name such as Board of Advisors. This is a conservative
        // name protection, not a claim that the name is legally authoritative.
        if(rule.protectFormalNameTail&&/^[A-Z]/.test(match[0])&&/\b(?:Board|Council|Commission|Committee|Association|Society|Office|Department|Institute|Foundation|College|University|Academy|Federation|Court)(?:\s+(?:of|for|the|and|[A-Z][\p{L}\p{M}’'-]*)){0,8}\s+$/u.test(searchable.slice(Math.max(0,match.index-300),match.index)))continue;
        if(rule.category!=='Capitalization'&&/^[A-Z]/.test(match[0])&&(/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(match[0])||/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(searchable.slice(match.index+match[0].length))||/\b(?:Mr|Mrs|Ms|Dr)\.\s*$/.test(searchable.slice(Math.max(0,match.index-35),match.index))))continue;
        if(literalRanges.some(r=>r.start<match.index+match[0].length&&r.end>match.index))continue;
        add(match,rule,rule.preferred);
      }
    }
  }
  if(dynamic){
  // Restrict -ly checks to actual adverbs, excluding family-, early-, etc.
  const adverbQuotes=[...searchable.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
  const bodyDash=match=>[...doc.text.slice(match.index,match.index+match[0].length)].some((c,n)=>/[\u2012-\u2015]/u.test(c)&&/\S/u.test(searchable[match.index+n]));
  const multiAdverbs=multiAdverbCandidates(searchable),owners=[...multiAdverbs,...multiAdverbCandidates(doc.text.replace(/[\u2010-\u2015]/g,'-'))];
  for(const match of multiAdverbs){if(bodyDash(match))continue;const head=multiAdverbHead(match,searchable);if(head)add(match,{rule:'6.20',category:'Modifier hyphenation',message:'LCB8 item3 and GPO6.20 omit hyphens in this selected three-word modifier with two adverbs. Confirm the ordinary noun role.'},head.suggestion,head.end);}
  // Even an uncertain whole role must not fall back to a misleading correction
  // of its first two words. Original candidates also own masked fragments.
  for(const match of lyModifierCandidates(searchable))if(!bodyDash(match)&&!owners.some(m=>m.index<=match.index&&m.index+m[0].length>=match.index+match[0].length)&&!adverbQuotes.some(r=>r.start<match.index+match[0].length&&r.end>match.index)){const head=lyModifierHead(match,searchable);if(head)add(match,{rule:'6.20',category:'Modifier hyphenation',message:'LCB and GPO omit the hyphen in this selected -ly adverb and participle construction before its complete noun. Confirm the adjective meaning in context.'},head.suggestion,head.end);}
  // A spelled-out compound number retains its words; only the missing hyphen is suggested.
  for(const match of searchable.matchAll(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(?:one|two|three|four|five|six|seven|eight|nine)\b/gi))add(match,{rule:'6.36',category:'Numerical compounding',message:'GPO hyphenates the elements of spelled-out compound numbers from twenty-one through ninety-nine.'},fold(match[0]).replace(' ','-'));
  // Only compare the specific unit-modifier phrases illustrated by GPO, retaining noun context.
  for(const [phrase,noun] of [['long term','loan'],['high speed','line'],['large scale','project'],['low cost','housing'],['lump sum','payment'],['part time','personnel'],['state of the art','technology'],['cost of living','increase']]){
    const pattern=new RegExp(`\\b${phrase.split(' ').join('\\s+')}(?=\\s+${noun}\\b)`,'gi');
    for(const match of searchable.matchAll(pattern)){
      // The noun establishes the role but remains outside the selection.
      // Masking unknown/struck text cannot manufacture a valid noun cue.
      const end=match.index+match[0].length,head=new RegExp(`^\\s+${noun}\\b`,'i').exec(searchable.slice(end));
      if(head)add(match,{rule:'6.15',category:'Modifier hyphenation',message:'This phrase resembles a GPO example of a hyphenated modifier before a noun; confirm that the same context applies.'},phrase.replaceAll(' ','-'),end+head[0].length);
    }
  }
  }
  if(hasCompass)issues.push(...threePointCompassIssues(doc,reference));
  return issues.sort((a,b)=>a.start-b.start||a.end-b.end).map((issue,id)=>({...issue,id}));
}
