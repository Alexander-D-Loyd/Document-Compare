const KEY='document-compare.custom-style-terms.v1';
export function loadStyleTerms(storage){
  const rows=JSON.parse(storage.getItem(KEY)||'[]');
  if(!Array.isArray(rows))throw Error('Saved style terms are invalid.');
  return rows.filter(r=>r&&typeof r.term==='string'&&r.term.trim()).map(r=>({term:r.term.trim(),replacement:typeof r.replacement==='string'?r.replacement.trim():''}));
}
export function saveStyleTerms(storage,rows){storage.setItem(KEY,JSON.stringify(rows));}
export function searchStyleTerms(rows,query){return rows.filter(r=>r.term.includes(query)||r.replacement.includes(query));}
export function customStyleIssues(doc,terms){
  const chars=doc.text.split(''),protectedRanges=[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))];
  for(const r of [...(doc.excluded||[]),...(doc.struck||[])])for(let i=r.start;i<r.end;i++)chars[i]=' ';
  const source=chars.join(''),issues=[];
  for(const {term,replacement} of terms){
    const escaped=term.trim().split(/\s+/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
    if(!escaped)continue;
    const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'gu');
    for(const match of source.matchAll(pattern)){
      const start=match.index,end=start+match[0].length;if(protectedRanges.some(r=>r.start<end&&r.end>start))continue;
      issues.push({start,end,text:term,suggestion:replacement,guideId:'custom',category:'Custom term',rule:'Saved term',references:[],conflict:false,message:'This wording matches your saved case-sensitive style term.'});
    }
  }
  return issues;
}
