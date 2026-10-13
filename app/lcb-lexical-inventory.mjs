const key=s=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const conflictScope=(form,text)=>({
 'horse race':'LCB specifies open horse race (all forms); the GPO horse/race compounding entry specifies solid horserace. This guide disagreement in the noun choice and its ordinary race/races forms is excluded. Unencoded derivatives remain manual; exclusion is not full coverage of every derivative.',
 'quarter horse race':'The inner horse race/horserace noun choice differs between the guides and is excluded. The separate quarter horse entry retains its own selected checks. Other grammatical roles remain manual.',
 'central valley':'LCB lists central valley in lowercase; GPO 3.22 capitalizes a definite named region. The case choice for California’s definite Central Valley is excluded. Unresolved geography and generic unnamed valleys remain manual.',
 'subchapter':'LCB capitalizes a numbered Subchapter for California regulations and federal usages; GPO 3.10 lowercases generic numbered references. This contextual numbered-reference choice is excluded; unrelated titles and uses remain manual.',
}[form.toLowerCase()]||(text==='Regular Session of the Legislature (with year)'?'LCB capitalizes Regular Session with a year; GPO 3.10 lowercases a generic common noun with a date merely denoting time. This generic dated-session choice is excluded; official literal titles and unresolved uses remain manual.':null));
export function lcbLexicalInventory(reference,implemented){
 const records=[];
 for(const page of reference.pages.filter(p=>[3,4,5,9,10,11,12,13,14,18,19,20].includes(p.page))){
  const lines=page.text.split('\n').map(s=>s.trim()).filter(Boolean),entries=Array.isArray(page.lexicalEntries)?[...page.lexicalEntries]:[];let pending='';
  if(!entries.length)for(const line of lines){
   if(/^(?:SPELLING|HYPHENATION|CAPITALIZATION|\d+)$/.test(line))continue;
   if(pending){pending+=' '+line;}
   else if(!/^[A-Za-zÀ-ÖØ-öø-ÿ(]/.test(line))continue;
   else if(/^\(/.test(line)&&entries.length){entries[entries.length-1]+=' '+line;continue;}
   else pending=line;
   const opens=(pending.match(/\(/g)||[]).length,closes=(pending.match(/\)/g)||[]).length;
   if(opens>closes||/\bor$/.test(pending))continue;
   entries.push(pending);pending='';
  }
  if(pending)entries.push(pending);
  for(const text of entries){
   const form=text.split(' (')[0].trim(),forms=[form,...form.split(/\s+or\s+/)].map(f=>f.replace(/,\s*the$/,'').toLowerCase()),mapped=implemented.filter(r=>r.page===page.page&&forms.includes(r.preferred.toLowerCase())&&(!r.entryText||r.entryText===text));
   const excluded=['health care','federal government','centigrade','section','schedule','before and after school','state government','horse race','quarter horse race','central valley','subchapter'].includes(form.toLowerCase())||text==='Regular Session of the Legislature (with year)',scopedConflict=form.toLowerCase()==='horse race'?'The horse race/horserace noun choice is excluded as a known guide disagreement; other derivatives remain manual. ':form.toLowerCase()==='african american'?'The African American program modifier choice is excluded as a known guide disagreement. Unencoded contexts remain manual. ':form.toLowerCase()==='collective bargaining'?'Selected before-noun collective bargaining forms are excluded as known guide disagreements. Unencoded contexts remain manual. ':'';
   records.push({id:'lcb-entry-'+page.page+'-'+key(text),title:'LCB '+page.chapter+' · '+form,guide:'lcb',page:page.page,status:excluded?'Excluded guide conflict':mapped.length?'Partially automated':'Manual review required',text,scope:excluded?conflictScope(form,text)|| (form.toLowerCase()==='before and after school'?'LCB explicitly lists the open before and after school unit modifier. GPO 6.15/6.23 instead hyphenate a compound modifier and retain its shared-element hyphen (before- and after-school). This modifier choice is excluded under the user guide-conflict policy; other before/after meanings remain separate.':['section','schedule'].includes(form.toLowerCase())?'LCB capitalizes this numbered reference while GPO 3.10 lowercases the generic reference word. The conflicting case choice is excluded under the user policy; independent citation spacing and identifier protections remain active.':form.toLowerCase()==='centigrade'?'LCB lists centigrade in lowercase, while the GPO temperature-table footnote prefers Celsius, superseding Centigrade. The unit-name choice is excluded under the user policy. Independent agreed capitalization checks for an already chosen Celsius or Fahrenheit term remain active.':'LCB and GPO prescribe different forms for this entry. Both choices are excluded from Stylistic Check under the user policy; source lookup does not constitute an actionable spelling or capitalization correction.') :scopedConflict+(mapped.length?'Selected implemented form: '+mapped.map(r=>r.scope).join(' ')+' Other variants, meanings and exceptions are not certified by this entry.':'This discrete source entry is not fully mapped to a tested contextual check. Verify the listed spelling/compound, grammatical role, meaning and any parenthetical exception manually. Source search alone does not automate it.'),context:page.page>=18?'Named entity versus descriptive use, sentence start and stated source exception':/u\.m\./.test(text)?'Recognized unit-modifier position; other listed roles must also be considered':/\(v\./.test(text)?'Verb use':/\(n\./.test(text)?'Noun use':'Lexical form and intended source meaning',exceptions:'Quoted/literal source names, source strikeouts, margin labels, heading/table roles and the entry’s stated exceptions'});
  }
 }
 return records;
}
