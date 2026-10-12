// Finite source-observed adjective/noun relationships, not a general POS or
// name classifier. The caller must validate complete independent noun evidence.
const educational='(?:academic|behavioral|social-emotional)';
const education=new RegExp('^\\s+(?:integrated\\s+)?('+educational+'(?:\\s*,\\s*'+educational+')?\\s*,?\\s+(?:and|or)\\s+'+educational+')\\s+(learning\\s+practices?)(?![\\p{L}\\p{N}_])','u');
const language=/^\s+(?:and|or)\s+(?:bilingual|multilingual)\s+(households?|persons?|people|families|family|residents?|individuals?|workers?|employees?|students?|pupils?|applicants?)(?![\p{L}\p{N}_])/u;
export function qualifiedDescriptorHeadMatch(after){
 const e=education.exec(after),l=language.exec(after),m=e||l;if(!m)return null;
 if(e&&new Set(e[1].match(/academic|behavioral|social-emotional/g)).size!==(e[1].match(/academic|behavioral|social-emotional/g)||[]).length)return null;
 // An adjoining capitalized word may extend an unfamiliar literal name.
 if(/^\s+[A-Z][a-z]/.test(after.slice(m[0].length)))return null;
 return Object.assign([m[0]],{requiresEvidence:true,nounHead:e?e[2]:l[1],descriptorKind:e?'educational adjective series':'coordinated language descriptor'});
}
