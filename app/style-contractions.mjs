import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard} from './style-evidence.mjs';
const rules=[];
const add=(subjects,suffix,expansions)=>{for(const subject of subjects.split(' '))rules.push({form:subject+"'"+suffix,expansions:expansions.map(e=>subject+' '+e)});};
add('you we they','re',['are']);add('I you we they','ve',['have']);
add('who what where when why how there which','ve',['have']);
add('I you he she it we they that there who what','ll',['will']);add('I','m',['am']);
add('this these those which','ll',['will']);
add('here','s',['is']);
add('he she it that there what who where when why how','s',['is','has']);
add('I you he she it we they that there who what','d',['had','would']);
add('this these those','d',['had','would']);
add('could should would must might may ought need','ve',['have']);
add('who what where when why how there these those','re',['are']);
add('where when why how','d',['did','had','would']);
add('where when why how','ll',['will']);
for(const [form,expansion] of [["'tis",'it is'],["'twas",'it was'],["'twere",'it were']])rules.push({form,expansions:[expansion]});
for(const [form,expansion] of [["aren't",'are not'],["can't",'cannot'],["couldn't",'could not'],["daren't",'dare not'],["didn't",'did not'],["doesn't",'does not'],["don't",'do not'],["hadn't",'had not'],["hasn't",'has not'],["haven't",'have not'],["isn't",'is not'],["mayn't",'may not'],["mightn't",'might not'],["mustn't",'must not'],["needn't",'need not'],["oughtn't",'ought not'],["shan't",'shall not'],["shouldn't",'should not'],["wasn't",'was not'],["weren't",'were not'],["won't",'will not'],["wouldn't",'would not'],["let's",'let us']])rules.push({form,expansions:[expansion]});
// Prefer the complete compound contraction over a smaller fragment.
for(const subject of 'I you he she it we they that there who what this these those which'.split(' ')){
 rules.push({form:subject+"'d've",expansions:[subject+' would have']});
 rules.push({form:subject+"'ll've",expansions:[subject+' will have']});
}
for(const [form,expansion] of [["can't've",'cannot have'],["couldn't've",'could not have'],["shouldn't've",'should not have'],["wouldn't've",'would not have'],["mustn't've",'must not have'],["mightn't've",'might not have'],["needn't've",'need not have'],["won't've",'will not have']])rules.push({form,expansions:[expansion]});
for(const [form,expansions] of [["ain't",['am not','is not','are not','has not','have not']],["y'all",['you all']],["y'all're",['you all are']],["y'all've",['you all have']]])rules.push({form,expansions});
export const CONTRACTION_FORMS=rules;
const lookup=new Map(rules.map(r=>[r.form.toLowerCase(),r]));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_’\'])(?:'+[...rules].sort((a,b)=>b.form.length-a.form.length).map(r=>r.form.replaceAll("'","[’']")).join('|')+')(?![\\p{L}\\p{N}\\p{M}_’\'])','giu');
export const CONTRACTION_EVIDENCE_SCOPE='The finite pronoun/auxiliary and compound-contraction inventory includes selected relative and demonstrative forms such as who’ve, which’ve, this’ll, these’ll, those’ll and here’s. It validates every complete original contraction token, including Unicode combining marks, supplementary-plane letters and original adjacent characters masked by a deletion or exclusion. Wrapped literal quotations, source strikes, recognized tables and uncertain excluded content cannot establish findings. Existing possessive and Who’s Who protections remain. Ambiguous expansions stay explicit alternatives; unsupported forms, pronunciation and intended meaning remain manual. Listed style expansions do not add spelling-dictionary authority.';
export function contractionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx),leftEdge=/[\p{L}\p{N}\p{M}_’']$/u,rightEdge=/^[\p{L}\p{N}\p{M}_’']/u;
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length;if(ctx.at(start)==='Heading'||blocked(start,end)||leftEdge.test(doc.text.slice(Math.max(0,start-2),start))||rightEdge.test(doc.text.slice(end,end+2)))continue;
  const r=lookup.get(m[0].toLowerCase().replaceAll('’',"'")),ambiguous=r.expansions.length>1;
  if(/^who[’']s$/i.test(m[0])&&/^\s+Who\b/.test(source.slice(end)))continue; // Literal Who's Who title.
  const choices=r.expansions.map(e=>/^[A-Z]/.test(m[0])?e[0].toUpperCase()+e.slice(1):e),suggestion=choices.join(' / ');
  const message='LCB spelling and usage item 3 does not use contractions.'+(ambiguous?' The expansion depends on meaning; the displayed alternatives are choices, not text to insert together. In questions, a contracted d can also mean did.':' This form has a direct uncontracted expansion.');
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:2,guidePrintedPage:references.lcb.pages[1].printedPage,rule:'Spelling and usage, item 3',category:'Contractions',context:ctx.at(start),checkId:'contractions',conflict:false,alternatives:choices,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:2,guidePrintedPage:references.lcb.pages[1].printedPage,rule:'Spelling and usage, item 3',preferred:suggestion,ruleText:'Contractions are not used. An ambiguous contraction requires choosing the expansion that preserves meaning.'}]});
 }
 return issues;
}
