import {LY_ADVERBS} from './ly-adverbs.mjs';
import {nounHeadPattern} from './style-noun-heads.mjs';
// LCB8 item3 and GPO6.20 agree on ly + adverb + participle modifiers.
// Finite words establish that role; suffixes alone do not establish a POS.
const adverb=LY_ADVERBS.join('|');
const participles='preserved owned funded operated trained approved licensed registered recognized organized supported developed regulated controlled financed provided purchased managed administered insured employed known kept defined awaited heard'.split(' ').join('|');
const separator='(?:\\s*-\\s*|\\s+)';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+adverb+')'+separator+'('+adverb+'|well)'+separator+'('+participles+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
// The additional heads are exact GPO6.20 example nouns, not guessed -s roots.
const head=new RegExp('^\\s+(?:'+nounHeadPattern+'|specimens?|moments?|usages?|subsidiar(?:y|ies))(?![\\p{L}\\p{N}\\p{M}_])','iu');
const lyPattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+adverb+')-('+participles+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
export const lyModifierCandidates=source=>[...source.matchAll(lyPattern)];
export function lyModifierHead(match,source){
 const end=match.index+match[0].length,noun=head.exec(source.slice(end));if(!noun)return null;
 if(/[A-Z]/u.test(match[0].slice(1))&&/^[ \t\n]+[A-Z]/u.test(noun[0]))return null;
 return {end:end+noun[0].length,suggestion:match[0].replace('-',' ')};
}
export const multiAdverbCandidates=source=>[...source.matchAll(pattern)];
export function multiAdverbHead(match,source){
 const end=match.index+match[0].length,noun=head.exec(source.slice(end));
 if(!noun)return null;
 // Protect an apparent proper title while accepting sentence-initial and
 // uniformly uppercase ordinary prose. This does not authenticate names.
 const role=match[0]+noun[0];
 if(role!==role.toUpperCase()&&/^[A-Z]/.test(match[2])&&/^[A-Z]/.test(match[3])&&/^\s+[A-Z]/.test(noun[0]))return null;
 return {end:end+noun[0].length,suggestion:match.slice(1,4).join(' ').toLowerCase()};
}
