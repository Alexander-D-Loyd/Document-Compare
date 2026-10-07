export function classify(text) {
  const trimmed = text.trim().replace(/^(?:[-•]\s+|\d+[.)]\s+)/, '');
  // Prefer explicit editorial language; general obligations remain content.
  const direct = /^(?:(?:editor(?:ial)?|revision|editing|reviewer)\s*(?:note|instruction)s?\s*[:\-]\s*)?(?:please\s+)?(delete|remove|omit|insert|add|replace|change|revise|rewrite|move|retain|keep)\b/i.exec(trimmed);
  const indirect = /\b(?:paragraph|sentence|section|heading|word|phrase|text|clause|line|bullet|page)\b.{0,90}\b(?:should|must|needs? to)\s+be\s+(deleted|removed|omitted|inserted|added|replaced|changed|revised|rewritten|moved|retained)\b/i.exec(trimmed);
  const contextual = /\b(?:delete|remove|omit|insert|add|replace|change|revise|rewrite|move|retain|keep)\b.{0,100}\b(?:paragraph|sentence|section|heading|word|phrase|text|clause|line|bullet|page|quotation|caption)\b/i.exec(trimmed);
  const quoteAction = direct && /["“”‘’]/.test(trimmed);
  const marked = /^(?:editor(?:ial)?|revision|editing|reviewer)\s*(?:note|instruction)s?\s*[:\-]/i.test(trimmed);
  const targetMention = /\b(?:paragraph|sentence|section|heading|word|phrase|text|clause|line|bullet|page|quotation|caption)\b/i.test(trimmed);
  // "Add sugar" and "Keep records for seven years" are ordinary content.
  const targetFirst = /^(?:in|at|after|before|for)\s+(?:the\s+)?(?:paragraph|sentence|section|heading|line|page)\b.{0,60}[,:]\s*(?:please\s+)?(?:delete|remove|insert|add|replace|change|revise|rewrite|move)\b/i.test(trimmed);
  const likely = !!(indirect || marked || targetFirst || (direct && (targetMention || quoteAction || /^(?:replace|rewrite|revise|omit)\b/i.test(direct[1]))));
  const found = direct?.[1] || indirect?.[1] || contextual?.[0]?.match(/delete|remove|omit|insert|add|replace|change|revise|rewrite|move|retain|keep/i)?.[0];
  const action = found ? found.toLowerCase().replace(/deleted/, 'delete').replace(/removed/, 'remove').replace(/replaced/, 'replace').replace(/changed/, 'change').replace(/inserted/, 'insert').replace(/added/, 'add').replace(/revised/, 'revise').replace(/rewritten/, 'rewrite').replace(/moved/, 'move').replace(/omitted/, 'omit').replace(/retained/, 'retain') : 'review';
  const target = trimmed.match(/\b(?:paragraph|sentence|section|heading|word|phrase|text|clause|line|bullet|page)\s+(?:\d+(?:\.\d+)*|["“][^"”]+["”]|[A-Z](?=\b))/i)?.[0] || '';
  const replacement = trimmed.match(/\b(?:with|insert|add)\s+["“]([^"”]+)["”]/i)?.[1] || '';
  return { kind: likely ? 'instruction' : 'content', action, target, replacement, reason: likely ? 'Editorial wording detected; confirm the label.' : 'No explicit editing direction detected.' };
}
export function makeBlocks(pages) {
  return pages.flatMap((text, page) => text.split(/\n+/).filter(line => line.trim()).map((text, i) => ({ id: `${page + 1}-${i}`, text: text.trim(), page: page + 1, ...classify(text) })));
}
export function contentText(doc, includeInstructions = false) {
  return doc.blocks.filter(b => includeInstructions || b.kind === 'content').map(b => b.text).join('\n');
}
export function wordCount(text) { return (text.match(/\S+/g) || []).length; }
// Compare lexical text across the whole document. Layout whitespace has no tokens.
// Offsets refer to each source independently so rendering keeps accurate page refs.
export function comparisonTokens(text) {
  return Array.from(text.matchAll(/[\p{L}\p{N}\p{M}_]+|[^\s\u200b\u00ad]/gu), match => ({ value: match[0], start: match.index, end: match.index + match[0].length }));
}
export function extractPageLines(items) {
  const rows = [];
  for (const item of items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const y = item.transform[5];
    let row = rows.find(row => Math.abs(row.y - y) <= 2);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a,b) => b.y - a.y).map(row => {
    let text = '', end = null;
    for (const item of row.items.sort((a,b) => a.transform[4] - b.transform[4])) {
      const gap = end === null ? 0 : item.transform[4] - end;
      if (text && gap > Math.max(1.5, item.height * .16) && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
      text += item.str;
      end = item.transform[4] + item.width;
    }
    return text.trim();
  }).filter(Boolean);
}
function layoutLines(pages) {
  // Only explicit "line N" prefixes and recognizable, repeated page labels.
  // Numeric clauses, headings, dates and body content are retained.
  const labels = new Map();
  const pageLabel = text => /^(?:\d+|[—–-]\s*\d+\s*[—–-]|(?:[—–-]\s*\d+\s*[—–-]\s*)?(?:AB|SB)\s*\d+(?:\s*[—–-]\s*\d+\s*[—–-])?)$/i.test(text.trim());
  for (const page of pages) {
    const lines = page.split('\n');
    for (const text of new Set([...lines.slice(0,2), ...lines.slice(-2)].filter(pageLabel))) labels.set(text.trim(), (labels.get(text.trim()) || 0) + 1);
  }
  return pages.map(page => page.split('\n').map((text, i, lines) => {
    const atEdge = i < 2 || i >= lines.length - 2;
    const ignored = atEdge && pageLabel(text) && ((labels.get(text.trim()) || 0) > 1 || /[—–-]/.test(text));
    const margin = text.match(/^line\s*\d+(?:\s+|$)/i)?.[0] || '';
    return {text, ignored, margin};
  }));
}
export function cleanLayoutLabels(pages) {
  return layoutLines(pages).map(lines => lines.filter(line => !line.ignored).map(line => line.text.slice(line.margin.length)).join('\n'));
}
export function makeDocument(pages, name, pageStrikes=[], pageFormatting=[]) {
  let offset = 0;
  const blocks = [], excluded = [];
  layoutLines(pages).forEach((lines, page) => lines.forEach((line, i) => {
    if (!line.text.trim()) return;
    const block = {...line, formatting:pageFormatting[page]?.[i], id:`${page+1}-${i}`, page:page+1, start:offset, end:offset+line.text.length, kind:'content'};
    blocks.push(block);
    if (line.ignored || line.margin) excluded.push({start:offset, end:offset+(line.ignored ? line.text.length : line.margin.length)});
    offset = block.end + 1;
  }));
  const text = blocks.map(b => b.text).join('\n');
  // Use the document's printed text column on short pages as well. A sparse
  // final page must not infer its column from a single indented body line.
  const columnBlocks=blocks.filter(b=>b.formatting&&b.text.slice(b.margin.length).trim()&&
    (b.margin||(b.text.length>40&&b.formatting.right-b.formatting.x>b.formatting.pageWidth*.4)));
  const columns=new Map();
  for(const b of columnBlocks){
    const f=b.formatting,c=columns.get(f.pageWidth)||{left:f.x,right:f.right};
    c.left=Math.min(c.left,f.x);c.right=Math.max(c.right,f.right);columns.set(f.pageWidth,c);
  }
  for(const b of blocks){
    const f=b.formatting,c=f&&columns.get(f.pageWidth);if(!c)continue;
    f.columnLeft=c.left;f.columnRight=c.right;
    f.indent=Math.max(0,(f.x-c.left)/Math.max(1,c.right-c.left));
    if(!b.margin){
      const width=c.right-c.left,center=(c.left+c.right)/2;
      f.centered=(Math.abs((f.x+f.right)/2-center)<width*.015||Math.abs((f.x+f.right)/2-f.pageWidth/2)<f.pageWidth*.01)&&(f.right-f.x<width*.97||f.runs.some(r=>r.bold||r.smallCaps));
    }
    if(f.headerGaps?.length||b.ignored){
      const gaps=f.headerGaps||[],cuts=[0,...gaps.flatMap(g=>[g.start,g.end]),b.text.length].sort((a,b)=>a-b);
      f.headerParts=[];
      for(let i=0;i<cuts.length-1;i++){
        const start=cuts[i],end=cuts[i+1];
        if(start===end||!b.text.slice(start,end).trim()||gaps.some(g=>g.start<=start&&g.end>=end))continue;
        const runs=f.runs.filter(r=>!r.space&&r.start<end&&r.end>start);if(!runs.length)continue;
        const left=runs[0].x,right=runs.at(-1).x+runs.at(-1).width,width=c.right-c.left;
        const center=(left+right)/2;
        const anchor=Math.abs(center-(c.left+c.right)/2)<width*.03?'center':Math.abs(right-c.right)<width*.03?'right':'left';
        f.headerParts.push({start,end,anchor,position:anchor==='center'?(center-c.left)/width:anchor==='right'?(c.right-right)/width:(left-c.left)/width});
      }
    }
  }
  let excludedIndex=0;
  const tokens = comparisonTokens(text).filter(token => {
    while (excludedIndex<excluded.length && excluded[excludedIndex].end<=token.start) excludedIndex++;
    const range=excluded[excludedIndex];
    return !range || token.end<=range.start || token.start>=range.end;
  });
  let pageOffset=0;const struck=[];
  pages.forEach((page,i)=>{for(const span of pageStrikes[i] || [])struck.push({start:pageOffset+span.start,end:pageOffset+span.end});pageOffset+=page.length+1;});
  const effectiveTokens=tokens.filter(token=>!struck.some(span=>span.start<token.end && span.end>token.start));
  return {name, pages:pages.length, rawPages:pages, blocks, text, tokens, effectiveTokens, struck, excluded, spelling:[], changeLocations:{}};
}
export function spellingCandidates(doc) {
  let rangeIndex=0;
  // PDF small-cap headings may extract as lowercase. Exempt only CALIFORNIA
  // in the legislature masthead, leaving ordinary occurrences checkable.
  const mastheadWords=doc.blocks.filter(b=>b.page===1).slice(0,8).flatMap(block=>{
    if(block.margin||!/^california\s+legislature\b/i.test(block.text))return [];
    const end='california'.length,runs=block.formatting?.runs||[];
    if(!Array.from({length:end},(_,i)=>i).every(i=>runs.some(r=>r.smallCaps&&r.start<=i&&r.end>i)))return [];
    return [{start:block.start,end:block.start+end}];
  });
  return Array.from(doc.text.matchAll(/\p{L}+(?:[’']\p{L}+)*/gu), match => ({word:match[0], start:match.index, end:match.index+match[0].length})).filter(word => {
    while (rangeIndex<doc.excluded.length && doc.excluded[rangeIndex].end<=word.start) rangeIndex++;
    const range=doc.excluded[rangeIndex];
    return (!range || word.end<=range.start || word.start>=range.end) && !(word.word.length>1 && word.word===word.word.toUpperCase()) && !mastheadWords.some(r=>r.start===word.start&&r.end===word.end);
  });
}
export function activeText(doc){
  const ranges=[...(doc.struck||[])].sort((a,b)=>a.start-b.start);
  let cursor=0,result='';
  for(const range of ranges){
    const start=Math.max(cursor,range.start),end=Math.min(doc.text.length,range.end);
    if(end<=start)continue;
    result+=doc.text.slice(cursor,start)+doc.text.slice(start,end).replace(/[^\n]/g,' ');cursor=end;
  }
  return result+doc.text.slice(cursor);
}
