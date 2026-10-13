// Explicit source-coordinate fixture witnesses for mapper boundary tests.
// Actual trained parse behavior is tested separately by parser-modifier-eligibility.py.
export function listedModifierWitness(plan,issue){
 const role=(start,end,text,pos,tag,dep,head)=>({start,end,text,pos,tag,dep,headStart:head.start,headEnd:head.end,headText:head.text});
 const root=[...plan.text.matchAll(/\b(?:requires|require|serves|serve|filed|applies|apply|supports|support|received|provides|provide|operates|operate|is|are|was|were|required)\b/gu)].find(m=>m.index<issue.start||m.index>=issue.end);
 if(!root)return null;
 const p={start:root.index,end:root.index+root[0].length,text:root[0]},predicate={...role(p.start,p.end,p.text,'VERB',/^(?:are|were|require|serve|apply|support|provide|operate)$/u.test(p.text)?'VBP':/^(?:filed|received|was)$/u.test(p.text)?'VBD':'VBZ','ROOT',p),finiteAuxiliaries:[]};
 const h={start:issue.headStart,end:issue.headEnd,text:issue.head},head=role(h.start,h.end,h.text,'NOUN',/s$/u.test(h.text)?'NNS':'NN','dobj',p);
 const components=[...plan.text.slice(issue.start,issue.end).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?|-/gu)].map(m=>{const start=issue.start+m.index,end=start+m[0].length,punct=m[0]==='-';return role(start,end,m[0],punct?'PUNCT':'NOUN',punct?'HYPH':'NN',punct?'punct':'compound',h);});
 return {kind:'exact-listed-attributive',components,head,predicate};
}
