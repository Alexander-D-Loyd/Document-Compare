const key=s=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
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
   const form=text.split(' (')[0].trim(),forms=[form,...form.split(/\s+or\s+/)].map(f=>f.replace(/,\s*the$/,'').toLowerCase()),mapped=implemented.filter(r=>r.page===page.page&&forms.includes(r.preferred.toLowerCase()));
   const excluded=['health care','federal government'].includes(form.toLowerCase()),scopedConflict=form.toLowerCase()==='african american'?'The African American program modifier choice is excluded as a known guide disagreement. Other contexts remain manual. ':form.toLowerCase()==='collective bargaining'?'Selected before-noun collective bargaining forms are excluded as known guide disagreements. Other contexts remain manual. ':'';
   records.push({id:'lcb-entry-'+page.page+'-'+key(text),title:'LCB '+page.chapter+' · '+form,guide:'lcb',page:page.page,status:excluded?'Excluded guide conflict':mapped.length?'Partially automated':'Manual review required',text,scope:excluded?'LCB and GPO prescribe different forms for this entry. Both choices are excluded from Stylistic Check under the user policy; source lookup does not constitute an actionable spelling or capitalization correction.':scopedConflict+(mapped.length?'Selected implemented form: '+mapped.map(r=>r.scope).join(' ')+' Other variants, meanings and exceptions are not certified by this entry.':'This discrete source entry is not fully mapped to a tested contextual check. Verify the listed spelling/compound, grammatical role, meaning and any parenthetical exception manually. Source search alone does not automate it.'),context:page.page>=18?'Named entity versus descriptive use, sentence start and stated source exception':/u\.m\./.test(text)?'Recognized unit-modifier position; other listed roles must also be considered':/\(v\./.test(text)?'Verb use':/\(n\./.test(text)?'Noun use':'Lexical form and intended source meaning',exceptions:'Quoted/literal source names, source strikeouts, margin labels, heading/table roles and the entry’s stated exceptions'});
  }
 }
 return records;
}
