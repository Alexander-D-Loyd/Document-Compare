import {californiaCountyIssues} from './style-california-counties.mjs';
import {jointStylisticIssues} from './joint-style.mjs';
import {californiaCodeIssues} from './style-california-codes.mjs';
import {attachGuideEvidence} from './style-guide-evidence.mjs';
// The supplied lists are additional references, separate from the LCB/GPO
// rule engine. Identical capitalization questions need only one visible owner.
export function reviewStyleIssues(doc,references,options={}){
 const guides=jointStylisticIssues(doc,references,options),codes=californiaCodeIssues(doc).map(i=>attachGuideEvidence(i,references));
 const counties=californiaCountyIssues(doc).map(i=>attachGuideEvidence(i,references));
 return [...guides.filter(i=>![...codes,...counties].some(c=>c.start===i.start&&c.end===i.end&&c.suggestion===i.suggestion)),...codes,...counties].sort((a,b)=>a.start-b.start||a.end-b.end).map((i,id)=>({...i,id}));
}
