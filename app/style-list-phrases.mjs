const heads=new Set('cities counties districts agencies boards commissions departments offices schools hospitals clinics providers contractors employers employees workers students pupils members participants residents applicants programs services records documents forms applications reports permits licenses fees taxes benefits duties rights obligations requirements agreements contracts plans projects books papers supplies equipment materials resources apples pears bananas lands buildings property evidence testimony income assets debts expenses revenues appropriations expenditures payments funds grants loans bonds stocks shares schedules accounts users customers patients practitioners professionals businesses corporations partnerships associations organizations institutions universities colleges libraries parks utilities vehicles vessels operators owners tenants landlords manufacturers distributors retailers wholesalers farmers growers water waste energy food drugs devices roads bridges highways'.split(' '));
const adjectives=new Set('public private local state federal regional municipal county city special eligible qualified covered licensed registered certified full part current former new existing annual monthly written oral financial medical legal educational social health care mental employment housing insurance tax water fire school safety transportation nonprofit commercial industrial agricultural residential domestic foreign civil criminal environmental professional technical administrative university community coastal urban rural tribal natural renewable nonrenewable'.split(' '));
const animalNouns=new Set('horse horses mule mules cattle'.split(' '));
const colorWords=new Set('red white blue black green yellow orange purple brown gray grey pink violet'.split(' '));

import {lcbModifierForms} from './lcb-contextual.mjs';
import {canonicalWrittenValue} from './style-numerals.mjs';
export const LIST_INTRODUCERS='(?:(?:includes?|including)(?:\\s*,\\s*but\\s+(?:is\\s+)?not\\s+limited\\s+to\\s*,)?|comprises?|(?:consists|composed|comprised)\\s+of|contains?|such\\s+as)';
// Modal + known transitive verb provides an explicit direct-object list cue.
// Keep this separate from numerical grouping: a verb alone does not establish
// that several quantities share the same numerical expression.
export const PUNCTUATION_LIST_INTRODUCERS='(?:'+LIST_INTRODUCERS+'|(?:shall|must|may|will|should)\\s+(?:not\\s+)?(?:provide|collect|maintain|submit|retain|review|inspect|receive|issue|purchase|fund|offer|use|distribute|deliver))';
const compoundCache=new WeakMap();
const numberWords='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion';
const leadingNumber=new RegExp('^(\\s*)(\\d+(?:,\\d{3})*|(?:'+numberWords+')(?:[\\s-]+(?:'+numberWords+')){0,12})(?=\\s+)');
function leadingCount(raw){
 const m=leadingNumber.exec(raw);if(!m||!/^\d/.test(m[2])&&canonicalWrittenValue(m[2])===null)return null;
 return {start:m[1].length,end:m[1].length+m[2].length};
}
for(const head of ['households','families','veterinarians','technicians','notices','instructions','receipts','recommendations','findings','orders','resolutions'])heads.add(head);
adjectives.add('veterinary');
for(const word of [...heads]){
 const singular=({businesses:'business',taxes:'tax'})[word]||(word.endsWith('ies')?word.slice(0,-3)+'y':word.replace(/s$/,''));heads.add(singular);
}
const participleCompound=/^(?:state|county|city|board|agency|government|family|employer|manufacturer)-(?:owned|approved|funded|operated|licensed|adopted|provided|sponsored|financed|based|related)$/;
const timeCompound=/^(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)-(?:day|week|month|year|hour|minute)$/;
function compounds(reference){
 if(!reference)return new Set();
 if(!compoundCache.has(reference))compoundCache.set(reference,new Set(lcbModifierForms(reference).map(r=>r.form)));
 return compoundCache.get(reference);
}
// A grouping comma belongs to the number, not to the series. Preserve its
// character length so callers retain exact conjunction offsets.
export function splitListCommas(text){
 return text.replace(/\b\d{1,3}(?:,\d{3})+(?!\d)/g,m=>m.replaceAll(',','\uE000')).split(',').map(g=>g.replaceAll('\uE000',','));
}
export function countedListPhrase(raw,reference){
 const m=leadingCount(raw);if(!m||!listNounPhrase(raw,reference))return null;
 return m;
}
// A finite noun-phrase grammar avoids interpreting verbs, conditions, names,
// alternatives inside an item, or arbitrary comma-delimited clauses as lists.
export function listNounPhrase(raw,reference){
 const atom=raw.trim();
 // LCB explicitly includes letters and figures in the serial-comma rule.
 // Single labels and integer values need no noun-head inference.
 if(/^(?:[A-Za-z]|\d+|\d{1,3}(?:,\d{3})+)$/.test(atom)||canonicalWrittenValue(atom)!==null)return true;
 const normalized=raw.replace(/-[ \t]*\n\s*/g,'-').trim(),count=leadingCount(normalized);
 const words=(count?normalized.slice(count.end).trim():normalized).split(/\s+/);
 if(words.length<1||words.length>5)return false;
 if(!heads.has(words.at(-1)))return false;
 const listed=compounds(reference);
 return words.slice(0,-1).every(w=>adjectives.has(w)||listed.has(w)||participleCompound.test(w)||timeCompound.test(w));
}

// LCB explicitly groups “three or four” as one item, and lists the legal
// geographic phrase “city and county.” Only scalar/letter inner alternatives
// are unambiguous enough here; grouped noun alternatives need manual review.
export function listItemPhrase(raw,reference){
 if(listNounPhrase(raw,reference)||raw.trim()==='city and county')return true;
 const joins=[...raw.matchAll(/\s+(?:or|nor)\s+/g)];if(joins.length!==1)return false;
 const scalar=/^(?:[A-Za-z]|\d+(?:,\d{3})*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/;
 const join=joins[0];return scalar.test(raw.slice(0,join.index).trim())&&scalar.test(raw.slice(join.index+join[0].length).trim());
}

// Punctuation can recognize a complete noun phrase with one bounded of/for
// complement. Keep numerical-expression grouping on its existing grammar:
// sharing a preposition does not establish that counts describe the same thing.
// These complete figure spellings establish punctuation items, not numerical
// meaning or a shared quantity. Leave the numeral-expression grammar intact.
const figureInteger='(?:\\d{1,3}(?:,\\d{3})+|\\d+)';
const figureScalar='[+\\-−]?(?:'+figureInteger+'(?:\\.\\d+)?|\\.\\d+)';
const punctuationFigure=new RegExp('^(?:'+figureScalar+'(?:[ \\t]*%)?|[+\\-−]?'+figureInteger+'\\s*[/⁄]\\s*'+figureInteger+'|\\d+\\s*:\\s*\\d+)$');
export function punctuationListNounPhrase(raw,reference){
 if(punctuationFigure.test(raw.trim())||listNounPhrase(raw,reference))return true;
 const normalized=raw.replace(/-[ \t]*\n\s*/g,'-').trim(),m=/^(.+?)\s+(of|for)\s+(.+)$/.exec(normalized);
 if(!m||!listNounPhrase(m[1],reference))return false;
 const tail=m[3];
 if(m[2]==='of'&&tail==='the public')return true;
 return listNounPhrase(tail.replace(/^(?:the|a|an)\s+/,''),reference);
}
export function punctuationListItemPhrase(raw,reference){
 if(listItemPhrase(raw,reference)||punctuationListNounPhrase(raw,reference))return true;
 const joins=[...raw.matchAll(/\s+(?:or|nor)\s+/g)];if(joins.length!==1)return false;
 const join=joins[0];
 return punctuationFigure.test(raw.slice(0,join.index).trim())&&punctuationFigure.test(raw.slice(join.index+join[0].length).trim());
}

// The older single-word fallback cannot infer grammatical roles from commas
// alone: “schools, public and private” is one qualified noun, not three items.
// Require a homogeneous, finite word class; unfamiliar words remain manual.
export function simplePunctuationWordSeries(items){
 if(items.length!==3||items.some(w=>!/^[A-Za-z]+$/.test(w)))return false;
 const words=items.map(w=>w.toLowerCase());
 return items.every(w=>w.length===1)||words.every(w=>canonicalWrittenValue(w)!==null)||
  words.every(w=>heads.has(w)||animalNouns.has(w))||
  words.every(w=>adjectives.has(w)||colorWords.has(w));
}

