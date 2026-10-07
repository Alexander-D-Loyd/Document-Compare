import { grammarIssues as findGrammarIssues } from './grammar.mjs';
import * as pdfjs from './vendor/pdf.mjs';
import { makeDocument, spellingCandidates, comparisonTokens, activeText } from './core.mjs';
import { loadDictionary, saveWord, removeWord, normalizeWord, isAccepted } from './personal-dictionary.mjs';
import { extractPageLayout } from './pdf-strikes.mjs';
import { reviewOutline } from './review-outline.mjs';
import { amendmentDeletionRanges } from './amendment-highlights.mjs';
import { searchGuide } from './gpo-style.mjs';
import {STYLE_GUIDES,guideById} from './style-guides.mjs';
import {loadStyleTerms,saveStyleTerms,searchStyleTerms} from './custom-style.mjs';
import {searchCoverage} from './style-coverage.mjs';
import { parseAmendments, amendmentDisplays, isProposedAmendmentsPage } from './amendments.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const $ = id => document.getElementById(id);
const docs = [null, null];
const versions = {0:0,1:0,amendments:0};
const loading = {0:false,1:false,amendments:false};
let amendmentsDoc=null,amendmentWorker=null,amendmentSequence=0,amendmentResults=[];
let amendmentIndex=-1,otherEdits=null;
let reviewMode="changes",grammarIssues=[],grammarIndex=-1,amendmentsChecked=false;
const comparisonTokensFor=(doc,side)=>side===0?doc.effectiveTokens:doc.tokens;
let compareWorker = null;
let compareSequence = 0;
let compared = false;
let currentChanges = [];
let changeIndex = -1;
let changeCount = 0;
let navigableChanges=[];
let spellingWorker = null;
let spellingIndex = -1;
let spellingIssues = [];
let spellingSequence = 0;
let languageIssues=[],languageIndex=-1;
let personalWords = new Set();
let dictionaryError = '';
let styleIssues=[],styleIndex=-1,styleWorker=null,styleSequence=0,styleChecked=false;
const guideReferencePromises=new Map(),guidePdfPromises=new Map(),guideViews=new Map(STYLE_GUIDES.map(g=>[g.id,{page:g.defaultPage,query:''}]));
const guideTabs=[...STYLE_GUIDES,{id:'custom',title:'Custom Terms'},{id:'coverage',title:'Check Coverage'}];guideViews.set('custom',{query:''});guideViews.set('coverage',{query:''});
let customTerms=[],customTermsError='';
try{customTerms=loadStyleTerms(localStorage);}catch{customTermsError='Saved custom terms could not be loaded.';}
let activeGuideId='lcb',guideContext=null,guidePage=1,guideRenderTask,guideRenderSequence=0;
try { personalWords = loadDictionary(localStorage); }
catch { dictionaryError = 'Personal dictionary could not be loaded. Saved words may still be flagged.'; }

function setReviewMode(mode){
  const changed=reviewMode!==mode;reviewMode=mode;document.body.dataset.review=mode;
  for(const [id,value] of [['review-amendments','amendments'],['review-changes','changes'],['check-spelling','language'],['check-style','style']])$(id).setAttribute('aria-pressed',String(mode===value));
  $('amendments-section').hidden=mode!=='amendments'||!amendmentsDoc;
  $('add-dictionary').disabled=mode!=='language'||spellingIndex<0||!spellingIssues.length;
  if(compared&&changed)renderDocuments();
}
function resetSpelling() {
  grammarIssues=[];grammarIndex=-1;
  languageIssues=[];languageIndex=-1;$('grammar-status').textContent='';
  spellingSequence++;
  if (spellingWorker) spellingWorker.terminate();
  spellingWorker = null; spellingIndex = -1; spellingIssues = [];
  docs.forEach(doc => { if (doc) doc.spelling = []; });
  $('check-spelling').disabled = false;
  $('next-spelling').disabled = true;$('previous-spelling').disabled=true;
  $('add-dictionary').disabled = true;
  $('add-dictionary').removeAttribute('title');
  $('spelling-status').textContent = dictionaryError || 'English dictionary · names and specialist terms may be flagged.';
}

function availability() {
  $('compare').disabled = !docs.every(Boolean) || loading[0] || loading[1] || !!compareWorker;
  $('review-amendments').disabled = !docs.every(Boolean) || !amendmentsDoc || Object.values(loading).some(Boolean) || !!amendmentWorker;
  $('refresh').disabled = Object.values(loading).some(Boolean);
  $('check-style').disabled = !docs.every(Boolean) || loading[0] || loading[1] || !!compareWorker || !!styleWorker;
}
function invalidateAmendments(){
  amendmentSequence++;amendmentWorker?.terminate();amendmentWorker=null;amendmentResults=[];
  otherEdits=null;amendmentsChecked=false;updateIssueNavigation();amendmentIndex=-1;$('next-amendment').disabled=true;$('previous-amendment').disabled=true;$('amendment-position').textContent='';
  updateChangeNavigation();
  if(compared)renderDocuments();
  $('amendment-results').replaceChildren();
  $('amendments-section').hidden=reviewMode!=='amendments'||!amendmentsDoc;
  $('amendment-status').textContent='Load both versions and select Amendments.';
}
function invalidateResults() {
  compared = false;
  if (compareWorker) { compareWorker.terminate(); compareWorker = null; compareSequence++; }
  $('results').hidden = true;
  $('empty').hidden = false;
  currentChanges=[]; navigableChanges=[];changeIndex=-1; changeCount=0;
  $('next-change').disabled=true;$('previous-change').disabled=true;
  $('change-status').textContent='No comparison yet.';
  resetSpelling();
  resetStyle();
  invalidateAmendments();
  availability();
}
function metadata(side) {
  const doc = side==='amendments'?amendmentsDoc:docs[side];
  $('name' + side).textContent = doc.name;
  $('meta' + side).textContent = side==='amendments'?`${doc.pages} page${doc.pages===1?'':'s'} · ${parseAmendments(doc.text).length} amendment(s)${doc.ignoredFromPage?` · mockup pages ${doc.ignoredFromPage}–${doc.sourcePages} ignored`:''} · click to replace`:`${doc.pages} page${doc.pages === 1 ? '' : 's'} · ${doc.tokens.filter(t=>/[\p{L}\p{N}]/u.test(t.value)).length.toLocaleString()} words · click to replace`;
}

function refreshView(){
  if(Object.values(loading).some(Boolean))return;
  invalidateResults();
  setReviewMode('changes');
  for(const id of ['left','right']){
    $(id).replaceChildren();$(id).scrollTo({top:0,left:0,behavior:'instant'});
    const input=$(id+'-page');input.value='1';input.dataset.current='1';input.setCustomValidity('');
  }
  $('added').textContent='';$('removed').textContent='';
  $('dictionary-dialog').close();$('dictionary-search').value='';
  closeGuide();$('guide-search').value='';
  window.scrollTo({top:0,left:0,behavior:'instant'});
  if(docs.every(Boolean))runComparison(true);
  else $('status').textContent=docs.some(Boolean)?'Choose the other PDF to continue.':'Choose two PDFs to begin. Your files stay on this computer.';
}

async function readFile(file, side) {
  const version = ++versions[side];
  if(side==='amendments'){invalidateAmendments();amendmentsDoc=null;}else{invalidateResults();docs[side]=null;}
  loading[side] = true;
  $('error' + side).textContent = '';
  $('name' + side).textContent = file.name;
  $('meta' + side).textContent = 'Reading PDF…';
  availability();
  let task;
  try {
    if (!/\.pdf$/i.test(file.name)) throw Error('Choose a PDF file.');
    if (file.size > 50 * 1024 * 1024) throw Error('This PDF exceeds the 50 MB limit.');
    const data = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder().decode(data.slice(0, 1024)).includes('%PDF-')) throw Error('This file is not a valid PDF.');
    task = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false, cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href, cMapPacked: true, standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href, wasmUrl: new URL('./vendor/wasm/', import.meta.url).href });
    // Do not request or retain document passwords.
    task.onPassword = () => { task.destroy(); };
    const pdf = await task.promise;
    if (pdf.numPages > 300) throw Error('This PDF exceeds the 300-page limit. Split it into smaller documents.');
    const pages = [],pageStrikes=[],pageFormatting=[];
    const blankPages = [];
    let total = 0,ignoredFromPage=null;
    for (let p = 1; p <= pdf.numPages; p++) {
      if (versions[side] !== version) return;
      $('meta' + side).textContent = `Reading page ${p} of ${pdf.numPages}…`;
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const operators=await page.getOperatorList();
      const fontStyles={...tc.styles};
      for(const name of Object.keys(fontStyles)){
        try{const font=page.commonObjs.get(name);fontStyles[name]={...fontStyles[name],bold:!!font.bold,italic:!!font.italic};}catch{}
      }
      const layout=extractPageLayout(tc.items,operators,pdfjs.OPS,fontStyles,page.view[2]-page.view[0]);
      if(side==='amendments'&&isProposedAmendmentsPage(layout.text)){
        ignoredFromPage=p;page.cleanup();break;
      }
      pages.push(layout.text);pageStrikes.push(layout.strikes);pageFormatting.push(layout.lines);
      if (!layout.text.trim()) blankPages.push(p);
      total += pages.at(-1).length;
      if (total > 1_000_000) throw Error('This PDF contains too much text. Split it into smaller documents.');
      page.cleanup();
    }
    if (!total) throw Error(ignoredFromPage?'No instruction pages precede the PROPOSED AMENDMENTS mockup. Upload the instructional amendment pages.':'No readable text found. This may be a scanned PDF; run OCR on it first.');
    if (blankPages.length) throw Error(`No readable text on page${blankPages.length === 1 ? '' : 's'} ${blankPages.slice(0, 10).join(', ')}${blankPages.length > 10 ? '…' : ''}. Run OCR or remove blank pages before comparing, so changes are not missed.`);
    if (versions[side] !== version) return;
    const document=makeDocument(pages,file.name,pageStrikes,pageFormatting);
    if(side==='amendments'){document.sourcePages=pdf.numPages;document.ignoredFromPage=ignoredFromPage;}
    if(side==='amendments')amendmentsDoc=document;else docs[side]=document;
    metadata(side);
    if(side==='amendments'){$('amendments-section').hidden=reviewMode!=='amendments';$('amendment-status').textContent='Instructions loaded. Select Amendments to verify both versions.';}
    else $('status').textContent = docs.every(Boolean) ? 'Ready to compare document text.' : 'Choose the other PDF to continue.';
  } catch (error) {
    if (versions[side] !== version) return;
    const message = /password|destroy/i.test(error.message) ? 'Password-protected PDFs are not supported. Save an unlocked copy first.' : error.message || 'Could not read this PDF. It may be damaged.';
    $('error' + side).textContent = message;
    $('name' + side).textContent = side==='amendments'?'Drop amendment instructions here':'Drop a PDF here';
    $('meta' + side).textContent = side==='amendments'?'or click to choose a PDF · optional':'or click to choose a file · up to 50 MB';
    $(side==='amendments'?'amendment-status':'status').textContent = 'The PDF could not be loaded. See the message above.';
  } finally {
    if (task) await task.destroy().catch(() => {});
    if (versions[side] === version) loading[side] = false;
    availability();
  }
}

for (const side of [0,'amendments',1]) {
  const drop = $('drop' + side), input = $('file' + side);
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) readFile(input.files[0], side); input.value = ''; });
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', event => {
    event.preventDefault(); drop.classList.remove('drag');
    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1) { $('error' + side).textContent = 'Drop one PDF into each document slot.'; return; }
    readFile(files[0], side);
  });
}
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

function sideRanges(doc, changes, side) {
  const ranges=[];
  const tokens=comparisonTokensFor(doc,side);
  let tokenIndex=0;
  doc.changeLocations={};
  for(const change of changes){
    if(change.group !== undefined && doc.changeLocations[change.group] === undefined)
      doc.changeLocations[change.group]=tokens[tokenIndex]?.start ?? doc.text.length;
    if((side===0 && change.added)||(side===1 && change.removed)||!change.count)continue;
    const first=tokens[tokenIndex],last=tokens[tokenIndex+change.count-1];
    if(change.added || change.removed)ranges.push({start:first.start,end:last.end,kind:change.added?'added':'removed',group:change.group});
    tokenIndex+=change.count;
  }
  if(otherEdits){doc.changeLocations={...otherEdits.locations[side]};return otherEdits.ranges[side];}
  return ranges;
}
function renderDocument(root, doc, changes, side) {
  root.replaceChildren();
  const ranges=sideRanges(doc,changes,side);
  const showChanges=reviewMode==='changes'&&(!amendmentsDoc||amendmentsChecked);
  const selectedAmendment=reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
  const deletionHighlights=amendmentDeletionRanges(doc,selectedAmendment,side);
  let previousPage=0,rangeIndex=0,spellIndex=0,pageRoot=root;
  doc.blocks.forEach((block,blockIndex)=>{
    if(block.page!==previousPage){
      pageRoot=document.createElement('section');pageRoot.className='pdf-page';root.append(pageRoot);
      const label=document.createElement('div');label.className='page-ref';label.textContent=`Page ${block.page}`;label.dataset.page=block.page;pageRoot.append(label);previousPage=block.page;
    }
    const row=document.createElement('div');row.className='text-line'+(block.margin?' has-margin':'');row.dataset.block=blockIndex;
    const gutter=document.createElement('span');gutter.className='margin-number';gutter.textContent=block.margin.replace(/^line\s*/i,'').trim();
    const body=document.createElement('span');body.className='line-body'+(block.ignored?' layout-label':'');
    const f=block.formatting;
    const headerParents=new Map();
    if(f){
      const scale=16/Math.max(1,f.bodyHeight);
      if(f.columnRight>f.columnLeft){root.dataset.columnWidth=f.columnRight-f.columnLeft;root.dataset.bodyHeight=f.bodyHeight;}
      row.style.marginTop=`calc(${f.gapBefore}px * var(--pdf-scale, ${scale}))`;
      row.style.lineHeight=`calc(${Math.max(f.height,f.leading)}px * var(--pdf-scale, ${scale}))`;
      row.style.minHeight=row.style.lineHeight;
      gutter.style.lineHeight='inherit';
      const numberRun=f.runs.find(r=>r.end<=block.margin.length&&/^\d+$/.test(block.text.slice(r.start,r.end)));
      if(numberRun&&f.columnLeft!==undefined){
        gutter.classList.add('pdf-positioned-margin');gutter.style.left=`calc(var(--pdf-body-left) + ${(numberRun.x+numberRun.width-f.columnLeft)}px * var(--pdf-scale, ${scale}))`;
        gutter.style.fontSize=`min(12px, calc(${numberRun.height}px * var(--pdf-scale, ${scale})))`;
      }
      body.style.fontFamily=/sans/i.test(f.font)?'Segoe UI, sans-serif':'Times New Roman, Georgia, serif';
      body.style.fontSize=`calc(${f.height}px * var(--pdf-scale, ${scale}))`;
      if(f.centered){row.classList.add('pdf-centered');body.style.textAlign='center';}
      else body.style.paddingLeft=Math.min(65,f.indent*100)+'%';
      if(f.headerGaps?.length){body.classList.add('pdf-spread-heading');body.style.paddingLeft='0';}
      if(f.headerParts?.length){
        body.classList.add('pdf-positioned-heading');body.style.paddingLeft='0';body.style.minHeight=`calc(${Math.max(f.height,f.leading)}px * var(--pdf-scale, ${scale}))`;
        for(const part of f.headerParts){
          const parent=document.createElement('span');parent.className='pdf-header-part';parent.dataset.headerStart=part.start;parent.dataset.headerEnd=part.end;
          parent.style[part.anchor==='right'?'right':'left']=part.position*100+'%';
          if(part.anchor==='center')parent.style.transform='translateX(-50%)';
          body.append(parent);headerParents.set(part,parent);
        }
      }
      if(f.rules?.length){row.classList.add('pdf-header-rule');row.style.setProperty('--rule-style',new Set(f.rules.map(r=>Math.round(r.y*10))).size>1?'double':'solid');row.style.setProperty('--rule-width',new Set(f.rules.map(r=>Math.round(r.y*10))).size>1?'3px':'1px');row.style.setProperty('--rule-offset',`calc(${f.height*.7+f.baseline-f.rules[0].y}px * var(--pdf-scale, ${scale}))`);}
    }
    const start=block.start+block.margin.length,end=block.end;
    while(rangeIndex<ranges.length && ranges[rangeIndex].end<=start)rangeIndex++;
    while(spellIndex<doc.spelling.length && doc.spelling[spellIndex].end<=start)spellIndex++;
    const edits=[],spells=[],strikes=(doc.struck||[]).filter(r=>r.start<end&&r.end>start);
    for(let i=rangeIndex;i<ranges.length && ranges[i].start<end;i++)if(ranges[i].end>start)edits.push(ranges[i]);
    for(let i=spellIndex;i<doc.spelling.length && doc.spelling[i].start<end;i++)if(doc.spelling[i].end>start)spells.push(doc.spelling[i]);
    const amendments=side===1&&reviewMode==='amendments'?amendmentResults.filter((_,i)=>i===amendmentIndex).flatMap(result=>result.evidence.map(e=>({start:e.currentOffset,end:e.currentEndOffset??e.currentOffset,directive:result.directive}))).filter(r=>r.start<end&&r.end>start):[];
    const amendmentCoverage=amendmentResults.flatMap(result=>result.evidence.map(e=>({start:side?e.currentOffset:e.previousOffset,end:side?e.currentEndOffset:e.previousEndOffset}))).filter(r=>r.end>r.start&&r.start<end&&r.end>start);
    const active=side===0&&reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
    const currentReview=side===1&&reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
    const comparisons=currentReview?currentReview.evidence.map((e,i)=>({...e,id:`A${currentReview.number}.${i+1}`})):[];
    const reviewRanges=comparisons.filter(e=>e.currentOffset<end&&e.currentEndOffset>start);
    const differences=reviewRanges.flatMap(e=>e.differenceRanges||[]).filter(r=>r.start<end&&r.end>start);
    const missing=comparisons.flatMap(e=>(e.missingPoints||[]).map(p=>({...p,id:e.id}))).filter(p=>p.offset>=start&&p.offset<=end);
    const sourceEdits=active?active.evidence.map((e,i)=>({start:e.previousOffset,end:e.previousEndOffset??e.previousOffset,id:`A${active.number}.${i+1}`})):[];
    const deletions=deletionHighlights.filter(r=>r.start<end&&r.end>start);
    const insertions=active?.action==='insert'?sourceEdits.map(r=>r.start):active?.action==='replace'?sourceEdits.map(r=>r.end):[];
    const points=[...new Set(insertions)].filter(at=>at>=start&&at<=end);
    const appendInsertion=at=>{
      if(!points.includes(at))return;
      const marker=document.createElement('span');const between=!!active.between;marker.className=between?'amendment-insertion amendment-between-arrow':'amendment-insertion amendment-selection';marker.textContent=between?'➜':'+';if(between)row.style.marginTop=Math.max(16,parseFloat(row.style.marginTop)||0)+'px';marker.dataset.outlineGroup=sourceEdits.find(r=>r.start===at||r.end===at)?.id||active.number;marker.dataset.amendmentInsertion=active.number;marker.dataset.sourceOffset=at;marker.title=active.directive;marker.setAttribute('aria-label',`Amendment ${active.number}: insert text here`);marker.tabIndex=0;body.append(marker);
    };
    const grammars=side===1&&reviewMode==='language'?grammarIssues.filter(r=>r.start<end&&r.end>start):[];
    const styles=side===1&&reviewMode==='style'?styleIssues.filter(r=>r.start<end&&r.end>start):[];
    const boundaries=new Set([start,end]);
    for(const part of f?.headerParts||[])for(const offset of [part.start,part.end])if(block.start+offset>start&&block.start+offset<end)boundaries.add(block.start+offset);
    for(const run of f?.runs||[])for(const offset of [run.start,run.end])if(block.start+offset>start&&block.start+offset<end)boundaries.add(block.start+offset);
    for(const point of points)boundaries.add(point);
    for(const p of missing)boundaries.add(p.offset);
    for(const range of [...edits,...spells,...grammars,...styles,...strikes,...amendments,...amendmentCoverage,...deletions,...differences,...reviewRanges.map(e=>({start:e.currentOffset,end:e.currentEndOffset}))]){boundaries.add(Math.max(start,range.start));boundaries.add(Math.min(end,range.end));}
    const appendComparisonMarkers=at=>{
      for(const p of missing.filter(p=>p.offset===at)){
        const marker=document.createElement('span');marker.className='amendment-missing amendment-selection';marker.textContent='[missing text]';marker.title=currentReview.directive;marker.setAttribute('aria-label',`${p.id}: missing requested text: ${p.text}`);marker.dataset.amendmentMissing=p.id;marker.dataset.outlineGroup=p.id;body.append(marker);
      }
    };
    const cuts=[...boundaries].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const a=cuts[i],b=cuts[i+1];if(a===b)continue;
      appendInsertion(a);
      appendComparisonMarkers(a);
      const reviewing=reviewRanges.some(e=>e.currentOffset<=a&&e.currentEndOffset>=b);
      const related=amendmentCoverage.some(r=>r.start<=a&&r.end>=b);
      const edit=!showChanges||related||reviewing||block.ignored||(side===0&&strikes.some(r=>r.start<b&&r.end>a))?null:edits.find(r=>r.start<=a && r.end>=b);
      const spelling=reviewMode==='language'&&side===1&&spells.find(r=>r.start<=a && r.end>=b);
      const struck=strikes.some(r=>r.start<=a&&r.end>=b);
      const chunk=document.createElement(edit?'mark':'span');chunk.textContent=doc.text.slice(a,b);
      chunk.dataset.start=a;chunk.dataset.end=b;
      const fontRun=f?.runs?.find(r=>r.start<=a-block.start&&r.end>=b-block.start);
      if(fontRun){
        if(fontRun.bold)chunk.style.fontWeight='700';if(fontRun.italic)chunk.style.fontStyle='italic';
        if(fontRun.smallCaps){chunk.classList.add('pdf-small-caps');chunk.style.fontSize=`calc(${fontRun.height*.67}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;}
      }
      if(f?.headerGaps?.some(r=>r.start<=a-block.start&&r.end>=b-block.start))chunk.classList.add('pdf-header-gap');
      if(edit){chunk.classList.add('other-change',edit.kind);chunk.dataset.change=edit.group;}
      if(edit&&amendmentCoverage.some(r=>r.start<=a&&r.end>=b))chunk.dataset.amendmentRelated='true';
      if(struck){chunk.classList.add('pdf-struck');chunk.title='Crossed out in the source PDF';if(side===0)chunk.classList.add('previous-source-struck');}
      if(spelling){chunk.classList.add('spelling');chunk.dataset.spelling=spelling.id;chunk.title=`Select spelling issue: ${spelling.word}`;chunk.tabIndex=0;chunk.setAttribute('role','button');chunk.setAttribute('aria-label',`Review spelling of ${spelling.word}`);}
      const grammar=grammars.find(r=>r.start<=a&&r.end>=b);
      if(grammar){chunk.classList.add('grammar');chunk.dataset.grammar=grammar.id;chunk.title=grammar.message+' · Suggested: '+grammar.suggestion;chunk.tabIndex=0;chunk.setAttribute('role','button');}
      const style=styles.find(r=>r.start<=a&&r.end>=b);
      if(style&&!struck){chunk.classList.add('stylistic');chunk.dataset.style=style.id;chunk.title=`${style.message} Suggested: ${style.suggestion} · ${style.references.map(r=>guideById(r.guideId).title+" "+r.rule).join("; ")}`;chunk.tabIndex=0;chunk.setAttribute('role','button');chunk.setAttribute('aria-label',`Review potential style discrepancy: ${style.text}`);}
      const amendment=amendments.filter(r=>r.start<=a&&r.end>=b);
      const deleted=!(side===0&&struck)&&deletions.some(r=>r.start<=a&&r.end>=b);
      if(amendment.length&&!block.ignored){chunk.classList.add('amendment-text');if(!deleted&&(currentReview?.action==='insert'||currentReview?.action==='replace'))chunk.classList.add('amendment-added');chunk.title=[...new Set(amendment.map(r=>r.directive))].join('\n');chunk.dataset.amendmentInstruction=chunk.title;if(!spelling)chunk.tabIndex=0;chunk.setAttribute('aria-description',chunk.title);}
      if(deleted){chunk.classList.add('amendment-deletion');chunk.dataset.amendmentDeletion=selectedAmendment.number;chunk.title=selectedAmendment.directive;}
      if(differences.some(r=>r.start<=a&&r.end>=b))chunk.classList.add('amendment-unexpected');
      const selectionRange=side===1?reviewRanges.find(r=>r.currentOffset<=a&&r.currentEndOffset>=b):deletions.find(r=>r.start<=a&&r.end>=b);
      const part=f?.headerParts?.find(p=>p.start<=a-block.start&&p.end>=b-block.start);
      const chunkParent=headerParents.get(part)||body;
      const selected=selectionRange&&!block.ignored&&!(side===0&&struck)&&!(side===1&&deleted)&&!!(side===1?currentReview?.insertText:active?.insertText)?.trim();
      if(selected){
        let wrapper=chunkParent.lastElementChild;
        if(!wrapper?.classList.contains('amendment-selection')||wrapper.dataset.selectionText!=='true'||wrapper.dataset.outlineGroup!==selectionRange.id){
          wrapper=document.createElement('span');wrapper.className='amendment-selection';wrapper.dataset.selectionText='true';wrapper.dataset.outlineGroup=selectionRange.id;chunkParent.append(wrapper);
        }
        wrapper.append(chunk);
      }else chunkParent.append(chunk);
    }
    appendInsertion(end);
    appendComparisonMarkers(end);
    if(f?.centered&&!f.headerParts?.length){
      const heading=document.createElement('span');heading.className='pdf-centered-content';heading.append(...body.childNodes);body.append(heading);
      body.style.minHeight=`calc(${Math.max(f.height,f.leading)}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;
    }
    row.append(gutter,body);pageRoot.append(row);
  });
}
function renderDocuments(){
  docs.forEach((doc,side)=>{const root=$(side?'right':'left'),top=root.scrollTop;renderDocument(root,doc,currentChanges,side);root.scrollTop=top;updatePageCounter(side);});
  if(reviewMode==='changes'&&changeIndex>=0)document.querySelectorAll(`[data-change="${changeIndex}"]:not([data-amendment-related])`).forEach(el=>el.classList.add('current-change'));
  if(reviewMode==='language'&&spellingIndex>=0 && spellingIssues[spellingIndex])document.querySelectorAll(`[data-spelling="${spellingIssues[spellingIndex].id}"]`).forEach(el=>el.classList.add('current-spelling'));
  if(reviewMode==='language'&&grammarIndex>=0)document.querySelectorAll(`[data-grammar="${grammarIndex}"]`).forEach(el=>el.classList.add('current-grammar'));
  if(reviewMode==='style'&&styleIndex>=0)document.querySelectorAll(`[data-style="${styleIndex}"]`).forEach(el=>el.classList.add('current-style'));
  if(reviewMode==='amendments'&&amendmentIndex>=0)focusAmendment(amendmentResults[amendmentIndex],false);
  drawReviewOutlines();
}
function drawReviewOutlines(){
  for(const root of [$('left'),$('right')]){
    const width=Number(root.dataset.columnWidth),body=root.querySelector('.line-body');
    if(width>0&&body){
      const scale=Math.min(16/Math.max(1,Number(root.dataset.bodyHeight)||12),body.clientWidth/width);root.style.setProperty('--pdf-scale',scale);
    }
    root.querySelectorAll('.review-outline').forEach(el=>el.remove());
    const groups=new Map();
    const groupKey=(el,id)=>id+'|'+el.closest('.pdf-page').querySelector('.page-ref').dataset.page;
    if(reviewMode==='changes'){
      for(const el of root.querySelectorAll('.current-change')){const id=groupKey(el,el.dataset.change);const group=groups.get(id)||[];group.push(el);groups.set(id,group);}
    }else if(reviewMode==='amendments'&&amendmentResults[amendmentIndex]?.insertText.trim()){
      for(const el of root.querySelectorAll('.amendment-selection[data-outline-group]')){const id=groupKey(el,el.dataset.outlineGroup);const group=groups.get(id)||[];group.push(el);groups.set(id,group);}
    }
    const origin=root.getBoundingClientRect();
    for(const [id,els] of groups){
      const rects=[];
      for(const el of els){
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){
          const node=walker.currentNode,text=node.textContent;
          if(!text.trim())continue;
          const range=document.createRange();range.setStart(node,text.length-text.trimStart().length);range.setEnd(node,text.trimEnd().length);
          rects.push(...range.getClientRects());
        }
      }
      const outline=reviewOutline(rects);if(!outline)continue;
      const box=document.createElementNS('http://www.w3.org/2000/svg','svg');box.classList.add('review-outline');box.dataset.outlineGroup=id.split('|')[0];box.dataset.pdfPage=id.split('|')[1];box.setAttribute('aria-hidden','true');
      box.setAttribute('viewBox',`0 0 ${outline.width} ${outline.height}`);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',outline.path);box.append(path);
      box.style.left=(outline.left-origin.left+root.scrollLeft)+'px';box.style.top=(outline.top-origin.top+root.scrollTop)+'px';box.style.width=outline.width+'px';box.style.height=outline.height+'px';root.append(box);
    }
  }
}
window.addEventListener('resize',drawReviewOutlines);
new ResizeObserver(drawReviewOutlines).observe($('results'));
function scrollInPane(root,target){
  if(!target)return;
  const top=target.getBoundingClientRect().top-root.getBoundingClientRect().top+root.scrollTop-root.clientHeight*.3;
  root.scrollTo({top:Math.max(0,top),behavior:'instant'});updatePageCounter(root.id==='right'?1:0);
}
function updatePageCounter(side){
  const doc=docs[side];if(!doc)return;
  const root=$(side?'right':'left'),input=$(root.id+'-page');
  const top=root.getBoundingClientRect().top+20;
  const labels=Array.from(root.querySelectorAll('[data-page]'));
  const page=labels.filter(el=>el.getBoundingClientRect().top<=top).at(-1)?.dataset.page||labels[0]?.dataset.page||1;
  input.max=doc.pages;input.dataset.current=page;
  if(document.activeElement!==input)input.value=page;
  $(root.id+'-page-total').textContent=doc.pages;
}
for(const side of [0,1]){
  const id=side?'right':'left',root=$(id),input=$(id+'-page');
  root.addEventListener('scroll',()=>updatePageCounter(side),{passive:true});
  const navigate=()=>{
    const page=Number(input.value),doc=docs[side];
    if(!doc||!Number.isInteger(page)||page<1||page>doc.pages){input.setCustomValidity(`Enter a page from 1 to ${doc?.pages||1}.`);input.reportValidity();return;}
    input.setCustomValidity('');const target=root.querySelector(`[data-page="${page}"]`);
    if(target)root.scrollTo({top:target.getBoundingClientRect().top-root.getBoundingClientRect().top+root.scrollTop-18,behavior:'instant'});
    updatePageCounter(side);
  };
  $(id+'-page-form').addEventListener('submit',e=>{e.preventDefault();navigate();});
  input.addEventListener('change',navigate);input.addEventListener('input',()=>input.setCustomValidity(''));
  input.addEventListener('blur',()=>{if(input.validity.valid)updatePageCounter(side);});
}
function locationTarget(doc,root,offset){
  let index=doc.blocks.findIndex(block=>block.end>=offset);
  if(index<0)index=doc.blocks.length-1;
  return root.querySelector(`[data-block="${index}"]`);
}
function nextChange(direction=1){
  setReviewMode("changes");
  if(!changeCount)return;
  const previous=navigableChanges.indexOf(changeIndex);
  const position=previous<0?(direction>0?0:changeCount-1):(previous+direction+changeCount)%changeCount;
  changeIndex=navigableChanges[position];
  document.querySelectorAll('.current-change').forEach(el=>el.classList.remove('current-change'));
  const locations=[];
  docs.forEach((doc,side)=>{
    const root=$(side?'right':'left');
    const matches=root.querySelectorAll(`[data-change="${changeIndex}"]:not([data-amendment-related])`);
    matches.forEach(el=>el.classList.add('current-change'));
    const offset=doc.otherChangeLocations?.[changeIndex]??doc.changeLocations[changeIndex] ?? 0;
    const target=matches[0] || locationTarget(doc,root,offset);
    scrollInPane(root,target);
    const block=doc.blocks.find(block=>block.end>=offset) || doc.blocks.at(-1);
    if(block)locations.push(`${side?'Revised':'Original'} p. ${block.page}${block.margin?' · '+block.margin.trim():''}`);
  });
  drawReviewOutlines();
  $('change-status').textContent=`${amendmentResults.length?'Other change':'Change'} ${position+1} of ${changeCount} · ${locations.join(' / ')}`;
}
function updateChangeNavigation(){
  const otherGroups=new Set();
  if(amendmentsDoc&&!amendmentsChecked){navigableChanges=[];changeCount=0;changeIndex=-1;$("next-change").disabled=true;$("previous-change").disabled=true;$("change-status").textContent="Select Amendments to identify non-amendment changes.";return;}
  if(docs.every(Boolean)){
    docs.forEach((doc,side)=>{
      const ranges=sideRanges(doc,currentChanges,side);
      doc.otherChangeLocations={};
      const targets=amendmentResults.flatMap(result=>result.evidence.map(e=>({start:side?e.currentOffset:e.previousOffset,end:side?e.currentEndOffset:e.previousEndOffset}))).filter(t=>t.end>t.start);
      for(const range of ranges){
        let parts=[range];
        for(const target of targets)parts=parts.flatMap(part=>part.end<=target.start||part.start>=target.end?[part]:[{start:part.start,end:Math.min(part.end,target.start)},{start:Math.max(part.start,target.end),end:part.end}].filter(p=>p.end>p.start));
        const tokens=comparisonTokensFor(doc,side);
        const token=tokens.find(t=>parts.some(p=>t.start<p.end&&t.end>p.start));
        if(token){otherGroups.add(range.group);doc.otherChangeLocations[range.group]??=token.start;}
      }
    });
  }
  navigableChanges=otherEdits?[...otherGroups].sort((a,b)=>a-b):[...new Set(currentChanges.filter(c=>c.group!==undefined).map(c=>c.group))].filter(group=>otherGroups.has(group));
  changeCount=navigableChanges.length;changeIndex=-1;
  document.querySelectorAll('.current-change').forEach(el=>el.classList.remove('current-change'));
  $('next-change').disabled=!changeCount;$('previous-change').disabled=!changeCount;
  $('change-status').textContent=changeCount?`${changeCount} ${amendmentResults.length?'non-amendment ':''}change${changeCount===1?'':'s'} · select next to begin.`:amendmentResults.length?'No non-amendment text changes found.':'No text changes found.';
}
function updateLanguageNavigation(){
  languageIssues=[...spellingIssues.map((r,i)=>({kind:'spelling',index:i,start:r.start})),...grammarIssues.map((r,i)=>({kind:'grammar',index:i,start:r.start}))].sort((a,b)=>a.start-b.start||a.kind.localeCompare(b.kind));
  languageIndex=-1;
  $('next-spelling').disabled=!languageIssues.length;$('previous-spelling').disabled=!languageIssues.length;
}
function selectLanguage(index){
  if(index<0||index>=languageIssues.length)return;
  languageIndex=index;const issue=languageIssues[index];spellingIndex=-1;grammarIndex=-1;
  document.querySelectorAll('.current-spelling,.current-grammar').forEach(el=>el.classList.remove('current-spelling','current-grammar'));
  $('grammar-status').textContent='';$('spelling-status').textContent='';
  if(issue.kind==='spelling')selectSpelling(issue.index);else selectGrammar(issue.index);
  const status=$(issue.kind==='spelling'?'spelling-status':'grammar-status');
  status.textContent=`Issue ${index+1} of ${languageIssues.length} · `+status.textContent;
}
function nextSpelling(direction=1){
  setReviewMode('language');if(!languageIssues.length)return;
  selectLanguage(languageIndex<0?(direction>0?0:languageIssues.length-1):(languageIndex+direction+languageIssues.length)%languageIssues.length);
}
function selectSpelling(index){
  setReviewMode("language");
  if(index<0 || index>=spellingIssues.length)return;
  spellingIndex=index;
  const issue=spellingIssues[spellingIndex],root=$(issue.side?'right':'left');
  document.querySelectorAll('.current-spelling').forEach(el=>el.classList.remove('current-spelling'));
  const matches=root.querySelectorAll(`[data-spelling="${issue.id}"]`);
  matches.forEach(el=>el.classList.add('current-spelling'));scrollInPane(root,matches[0]);
  const block=docs[issue.side].blocks.find(b=>b.end>=issue.start);
  $('add-dictionary').disabled=false;
  $('add-dictionary').title=`Save “${issue.word}” to your personal dictionary`;
  $('spelling-status').textContent=`Spelling issue ${spellingIndex+1} of ${spellingIssues.length} · ${issue.side?'Revised':'Original'} p. ${block.page} · “${issue.word}”`;
}
function addToDictionary(){
  const issue=spellingIssues[spellingIndex];
  if(!issue || spellingWorker)return;
  try {
    const saved=saveWord(localStorage,issue.word);
    const next=[...spellingIssues.slice(spellingIndex+1),...spellingIssues.slice(0,spellingIndex)].find(candidate=>!isAccepted(candidate.word,saved));
    const oldCount=spellingIssues.length;
    personalWords=saved;dictionaryError='';
    if($('dictionary-dialog').open)renderDictionary();
    docs.forEach(doc=>{doc.spelling=doc.spelling.filter(candidate=>!isAccepted(candidate.word,personalWords));});
    spellingIssues=docs.flatMap(doc=>doc.spelling);spellingIndex=-1;
    renderDocuments();
    updateLanguageNavigation();
    $('add-dictionary').disabled=true;
    const removed=oldCount-spellingIssues.length;
    const savedMessage=`Saved “${issue.word}” to your dictionary. ${removed} matching flag${removed===1?'':'s'} removed.`;
    if(next){
      selectLanguage(languageIssues.findIndex(candidate=>candidate.kind==='spelling'&&spellingIssues[candidate.index].id===next.id));
      $('spelling-status').textContent=savedMessage+' '+$('spelling-status').textContent;
    }else{
      $('add-dictionary').removeAttribute('title');
      $('spelling-status').textContent=savedMessage+' No spelling issues remain.';
    }
  }catch{
    $('spelling-status').textContent=`Could not save “${issue.word}” to your dictionary. It remains flagged; try again.`;
  }
}
function resetStyle(){
  styleSequence++;styleWorker?.terminate();styleWorker=null;styleIssues=[];styleIndex=-1;styleChecked=false;
  $('previous-style').disabled=true;$('next-style').disabled=true;$('style-rule').disabled=true;
  $('style-status').textContent='Check similar wording against style guides · LCB takes priority.';
}
function selectStyle(index){
  if(index<0||index>=styleIssues.length)return;
  setReviewMode('style');styleIndex=index;
  document.querySelectorAll('.current-style').forEach(el=>el.classList.remove('current-style'));
  const issue=styleIssues[index],matches=$('right').querySelectorAll(`[data-style="${issue.id}"]`);
  matches.forEach(el=>el.classList.add('current-style'));scrollInPane($('right'),matches[0]);
  const block=docs[1].blocks.find(b=>b.start<=issue.start&&b.end>issue.start);
  const recommendation=issue.matchesPrimary||!issue.suggestion?'':`Suggested: “${issue.suggestion}”.`;
  const references=issue.references.map(r=>`${guideById(r.guideId).title} ${r.rule}, p. ${r.guidePrintedPage}`).join(' · ');
  $('style-status').textContent=`Potential discrepancy ${index+1} of ${styleIssues.length} · p. ${block?.page||1}${issue.context?' · '+issue.context+' text':''} · ${issue.category}: “${issue.text}”. ${recommendation} ${issue.message} ${references}${issue.conflict?' · LCB takes priority.':''}`;
  $('style-rule').disabled=false;
}
function nextStyle(direction=1){
  setReviewMode('style');if(!styleIssues.length)return;
  selectStyle(styleIndex<0?(direction>0?0:styleIssues.length-1):(styleIndex+direction+styleIssues.length)%styleIssues.length);
}
function checkStyle(){
  if(!compared||compareWorker||!docs[1]||styleWorker)return;
  setReviewMode('style');
  if(styleChecked){if(styleIndex>=0)selectStyle(styleIndex);return;}
  resetStyle();const seq=++styleSequence;
  styleWorker=new Worker('./style-worker.mjs',{type:'module'});availability();
  $('style-status').textContent='Checking Current Version against selected style rules · LCB takes priority…';
  const finish=()=>{styleWorker?.terminate();styleWorker=null;availability();};
  styleWorker.onerror=()=>{if(seq!==styleSequence)return;finish();$('style-status').textContent='Stylistic check could not finish. Try again.';};
  styleWorker.onmessage=({data})=>{
    if(seq!==styleSequence)return;finish();
    if(data.error){$('style-status').textContent=data.error;return;}
    styleIssues=data.issues;styleChecked=true;styleIndex=-1;
    $('previous-style').disabled=!styleIssues.length;$('next-style').disabled=!styleIssues.length;
    $('style-status').textContent=styleIssues.length?`${styleIssues.length} potential style discrepancy(s) · use arrows to review.`:'No potential discrepancies found by the supported checks. See Style Guides → Check Coverage for rules requiring manual review.';
    renderDocuments();if(styleIssues.length&&reviewMode==='style')selectStyle(0);
  };
  const doc=docs[1];styleWorker.postMessage({doc:{text:doc.text,blocks:doc.blocks,excluded:doc.excluded,struck:doc.struck},terms:customTerms});
}
function loadGuideReference(id=activeGuideId){
  if(!guideReferencePromises.has(id))guideReferencePromises.set(id,fetch(guideById(id).referenceUrl).then(response=>{if(!response.ok)throw Error(`${guideById(id).title} reference could not be loaded.`);return response.json();}).catch(error=>{guideReferencePromises.delete(id);throw error;}));
  return guideReferencePromises.get(id);
}
async function renderGuideSearch(){
  const id=activeGuideId,query=$('guide-search').value.trim();guideViews.get(id).query=query;
  if(id==='custom'){renderCustomTerms(query);return;}
  if(id==='coverage'){renderCoverage(query);return;}
  try{
    const reference=await loadGuideReference(id),pages=searchGuide(reference,query);
    if(id!==activeGuideId||query!==$('guide-search').value.trim())return;
    const root=$('guide-results');root.replaceChildren();
    $('guide-search-status').textContent=query?`${pages.length} matching page(s) · searches the complete manual.`:'Browse chapters or search by topic, wording, or rule number.';
    for(const page of pages){
      const button=document.createElement('button');button.type='button';button.className='guide-result';button.dataset.guidePage=page.page;
      const heading=document.createElement('strong');heading.textContent=`${page.chapter} · printed p. ${page.printedPage} · PDF ${page.page}`;
      const snippet=document.createElement('span'),text=page.text.replace(/\s+/g,' '),term=query.toLowerCase().split(/\s+/)[0]?.replaceAll('"',''),at=term?text.toLowerCase().indexOf(term):-1,start=Math.max(0,at-60);
      snippet.textContent=(start?'…':'')+text.slice(start,start+230)+(text.length>start+230?'…':'');
      button.append(heading,snippet);button.addEventListener('click',()=>renderGuidePage(page.page));root.append(button);
    }
  }catch(error){if(id===activeGuideId)$('guide-search-status').textContent=error.message;}
}
async function renderGuidePage(pageNumber){
  if(['custom','coverage'].includes(activeGuideId))return;
  const guide=guideById(activeGuideId),page=Number(pageNumber);if(!Number.isInteger(page)||page<1||page>guide.totalPages)return;
  guideViews.get(guide.id).page=page;
  guidePage=page;const seq=++guideRenderSequence,oldTask=guideRenderTask;
  oldTask?.cancel();guideRenderTask=null;
  $('guide-page').value=page;$('guide-page').max=guide.totalPages;$('guide-page-total').textContent=guide.totalPages;$('guide-previous-page').disabled=page===1;$('guide-next-page').disabled=page===guide.totalPages;
  $('guide-page-status').textContent='Loading original guide page…';
  try{
    if(oldTask)await oldTask.promise.catch(()=>{});
    if(!guidePdfPromises.has(guide.id))guidePdfPromises.set(guide.id,pdfjs.getDocument({url:new URL(guide.pdfUrl,import.meta.url).href,isEvalSupported:false,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href}).promise.catch(error=>{guidePdfPromises.delete(guide.id);throw error;}));
    const [pdf,reference]=await Promise.all([guidePdfPromises.get(guide.id),loadGuideReference(guide.id)]);
    const pdfPage=await pdf.getPage(page);if(seq!==guideRenderSequence||guide.id!==activeGuideId)return;
    const canvas=$('guide-canvas'),base=pdfPage.getViewport({scale:1}),width=Math.max(320,$('guide-canvas').parentElement.clientWidth-12),ratio=Math.min(window.devicePixelRatio||1,2);
    const viewport=pdfPage.getViewport({scale:width/base.width*ratio});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';
    guideRenderTask=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport});await guideRenderTask.promise;if(seq!==guideRenderSequence)return;
    canvas.dataset.page=page;canvas.dataset.guide=guide.id;const record=reference.pages[page-1];$('guide-page-status').textContent=`${guide.title} · ${record.chapter} · printed p. ${record.printedPage} · PDF page ${page}`;guideRenderTask=null;
  }catch(error){if(seq===guideRenderSequence&&error.name!=='RenderingCancelledException')$('guide-page-status').textContent='Guide page could not be displayed. Try again.';}
}
function closeGuide(){guideRenderSequence++;guideRenderTask?.cancel();guideRenderTask=null;$('guide-dialog').close();}
function renderGuideContext(){
  $('guide-rule-context').hidden=!guideContext;
  const root=$('guide-rules');root.replaceChildren();if(!guideContext)return;
  $('guide-conflict-note').textContent=guideContext.conflict?guideContext.conflictNote:'LCB is the primary standard. GPO is used for rules not covered by the selected LCB checks.';
  for(const reference of guideContext.references){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`${guideById(reference.guideId).title}${reference.guideId==='lcb'?' · Primary':''} · ${reference.rule} · p. ${reference.guidePrintedPage}`;
    const form=document.createElement('p');form.textContent=`${reference.guideId==='lcb'?'Recommended LCB form':'GPO form'}: “${reference.preferred}”`;
    const rule=document.createElement('p');rule.textContent=reference.ruleText;
    const button=document.createElement('button');button.className='quiet';button.textContent=`View ${guideById(reference.guideId).title} page`;button.addEventListener('click',()=>selectGuide(reference.guideId,reference.guidePage));
    box.append(title,form,rule,button);root.append(box);
  }
}
function selectGuide(id,page=null,query=null){
  guideViews.get(activeGuideId).query=$('guide-search').value;
  const custom=id==='custom',coverage=id==='coverage';$('custom-terms-panel').hidden=!custom;$('coverage-panel').hidden=!coverage;$('guide-content').hidden=custom||coverage;
  $('guide-search-label').textContent=custom?'Search custom terms (case sensitive)':coverage?'Search check coverage':'Search the guide';
  $('guide-search').placeholder=custom?'Search saved terms or replacements':coverage?'Search a rule area, context or limitation':'Search a phrase, topic, or rule number (for example 6.20)';
  for(const item of guideTabs){const tab=$('guide-tab-'+item.id);tab.setAttribute('aria-selected',String(item.id===id));tab.tabIndex=item.id===id?0:-1;}
  if(custom||coverage){
    activeGuideId=id;guideRenderSequence++;guideRenderTask?.cancel();guideRenderTask=null;$('guide-rule-context').hidden=true;
    $('guide-description').textContent=custom?'Your saved style terms · Case-sensitive matching and search':'Supported checks and rules requiring manual review';
    $('guide-search').value=query??guideViews.get(id).query;renderGuideSearch();return;
  }
  renderGuideContext();
  activeGuideId=id;const guide=guideById(id),view=guideViews.get(id),related=guideContext?.references.find(r=>r.guideId===id);
  $('guide-description').textContent=`${guide.name} · ${guide.edition} edition · Search all ${guide.totalPages} pages${guide.primary?' · Primary standard':''}`;
  for(const item of STYLE_GUIDES){const tab=$('guide-tab-'+item.id);tab.setAttribute('aria-selected',String(item.id===id));tab.tabIndex=item.id===id?0:-1;}
  $('guide-search').value=query??view.query;$('guide-results').replaceChildren();$('guide-search-status').textContent='Loading guide…';
  renderGuideSearch();renderGuidePage(page??related?.guidePage??view.page);
}
function openGuide(page=null,query='',id='lcb',context=null){
  $('dictionary-dialog').close();guideContext=context;renderGuideContext();
  if(!$('guide-dialog').open)$('guide-dialog').showModal();
  selectGuide(id,page??(['custom','coverage'].includes(id)?null:guideById(id).defaultPage),query);
}
function renderCoverage(query=''){
  const root=$('coverage-list'),items=searchCoverage(query);root.replaceChildren();
  $('guide-search-status').textContent=`${items.length} matching rule area(s). Checks flag potential issues; they do not certify complete compliance.`;
  for(const item of items){
    const card=document.createElement('article');card.className='guide-rule-card';
    const heading=document.createElement('strong');heading.textContent=item.title+' · '+item.status;
    const text=document.createElement('p');text.textContent=item.text;
    const button=document.createElement('button');button.className='quiet';button.textContent=`View ${guideById(item.guide).title} source page`;button.addEventListener('click',()=>selectGuide(item.guide,item.page));
    card.append(heading,text,button);root.append(card);
  }
}
function renderCustomTerms(query=$('guide-search').value.trim()){
  const root=$('custom-term-list');root.replaceChildren();const terms=searchStyleTerms(customTerms,query);
  $('guide-search-status').textContent=`${terms.length} of ${customTerms.length} saved term(s) · Case sensitive.`;
  $('custom-term-status').textContent=customTermsError;
  for(const item of terms){
    const li=document.createElement('li'),text=document.createElement('span');text.textContent=item.term+(item.replacement?' → '+item.replacement:'');
    const button=document.createElement('button');button.type='button';button.className='quiet';button.textContent='Remove';button.setAttribute('aria-label',`Remove ${item.term}`);
    button.addEventListener('click',()=>updateCustomTerms(customTerms.filter(r=>r.term!==item.term)));li.append(text,button);root.append(li);
  }
}
function updateCustomTerms(next){
  try{saveStyleTerms(localStorage,next);}catch{customTermsError='Could not save custom terms. Try again.';renderCustomTerms();return false;}
  const recheck=reviewMode==='style'&&(styleChecked||!!styleWorker);customTerms=next;customTermsError='';resetStyle();availability();if(compared)renderDocuments();renderCustomTerms();if(recheck)checkStyle();return true;
}
function checkSpelling(selectMode=true){
  if(!compared || compareWorker || !docs.every(Boolean))return;
  resetSpelling();
  grammarIssues=findGrammarIssues(docs[1]).map((issue,id)=>({...issue,id}));
  
  $('grammar-status').textContent=grammarIssues.length?`${grammarIssues.length} possible grammar issue(s).`:'No issues found by the local grammar rules.';
  if(selectMode)setReviewMode('language');renderDocuments();
  const seq=++spellingSequence;
  spellingWorker=new Worker('./spelling-worker.js');
  $('check-spelling').disabled=true;
  $('spelling-status').textContent='Checking spelling locally in Current Version…';
  const fail=message=>{
    if(seq!==spellingSequence)return;
    spellingWorker?.terminate();spellingWorker=null;$('check-spelling').disabled=false;
    $('spelling-status').textContent=message;updateLanguageNavigation();
  };
  spellingWorker.onerror=()=>fail('Spell check could not finish. Try again.');
  spellingWorker.onmessage=({data})=>{
    if(seq!==spellingSequence)return;
    if(data.error){fail(data.error);return;}
    spellingWorker.terminate();spellingWorker=null;
    let id=0;
    docs.forEach((doc,side)=>{doc.spelling=(side===1?data.issues[1]:[]).map(issue=>({...issue,id:id++,side}));});
    spellingIssues=docs.flatMap(doc=>doc.spelling);
    renderDocuments();
    $('check-spelling').disabled=false;
    updateLanguageNavigation();
    $('spelling-status').textContent=spellingIssues.length?`${spellingIssues.length} possible spelling issue${spellingIssues.length===1?'':'s'} · review names and specialist terms.`:'No spelling issues found in the English dictionary check.';
  };
  spellingWorker.postMessage({candidates:docs.map((doc,side)=>side===0?[]:spellingCandidates(doc).filter(candidate=>!isAccepted(candidate.word,personalWords)&&!doc.struck.some(r=>r.start<candidate.end&&r.end>candidate.start)))});
}
function runComparison(resetView=false){
  if(!amendmentWorker)setReviewMode("changes");
  if(!docs.every(Boolean)||loading[0]||loading[1])return;
  if(compareWorker)compareWorker.terminate();
  resetSpelling();
  resetStyle();
  changeIndex=-1;changeCount=0;$('next-change').disabled=true;$('previous-change').disabled=true;
  const seq=++compareSequence;
  compareWorker=new Worker('./compare-worker.js',{type:'module'});
  $('check-spelling').disabled=true;
  availability();$('status').textContent='Comparing document text…';
  const finish=()=>{compareWorker?.terminate();compareWorker=null;$('check-spelling').disabled=false;availability();};
  compareWorker.onerror=()=>{if(seq!==compareSequence)return;finish();$('status').textContent='Comparison failed. Try smaller PDFs.';};
  compareWorker.onmessage=({data})=>{
    if(seq!==compareSequence)return;finish();
    if(!data.changes){$('status').textContent='These documents differ too much to compare within the limit. Try shorter sections.';$('results').hidden=true;return;}
    let inEdit=false,group=-1;
    currentChanges=data.changes.map(change=>{
      if(!change.count)return change;
      if(change.added||change.removed){if(!inEdit)group++;inEdit=true;return {...change,group};}
      inEdit=false;return change;
    });
    updateChangeNavigation();
    renderDocuments();
    const added=currentChanges.filter(c=>c.added).reduce((n,c)=>n+c.words,0);
    const removed=currentChanges.filter(c=>c.removed).reduce((n,c)=>n+c.words,0);
    $('added').textContent=`${added.toLocaleString()} word${added===1?'':'s'} added`;
    $('removed').textContent=`${removed.toLocaleString()} word${removed===1?'':'s'} removed`;
    $('left-name').textContent=docs[0].name;$('right-name').textContent=docs[1].name;
    $('results').hidden=false;$('empty').hidden=true;compared=true;
    if(resetView===true)docs.forEach((_,side)=>{const root=$(side?'right':'left');root.scrollTo({top:0,left:0,behavior:'instant'});updatePageCounter(side);});
    $('next-change').disabled=!changeCount;$('previous-change').disabled=!changeCount;
    updateChangeNavigation();
    $('status').textContent='';
    if(amendmentResults.length){renderAmendments();if(reviewMode==='amendments')focusAmendment(amendmentResults[amendmentIndex],true);}
    if(amendmentsDoc&&!amendmentsChecked&&!amendmentWorker)checkAmendments(false);
  };
  compareWorker.postMessage({left:comparisonTokensFor(docs[0],0).map(t=>t.value),right:comparisonTokensFor(docs[1],1).map(t=>t.value)});
}
const amendmentLabels={'implemented':'Implemented','not-implemented':'Not implemented','incorrect':'Incorrect','needs-review':'Needs review'};
function focusAmendment(result,scroll){
  document.querySelectorAll('.amendment-focus').forEach(row=>row.classList.remove('amendment-focus'));
  if(!result)return;
  const evidence=result.evidence[0];if(!evidence||!compared)return;
  docs.forEach((doc,side)=>{
    const root=$(side?'right':'left'),offset=side?(!result.insertText.trim()&&evidence.currentDeletionRanges?.length?evidence.currentDeletionRanges[0].start:evidence.currentOffset):evidence.previousOffset;
    const row=locationTarget(doc,root,offset);row?.classList.add('amendment-focus');
    if(scroll){
      const marker=side===0?Array.from(root.querySelectorAll('[data-amendment-insertion]')).find(el=>Number(el.dataset.sourceOffset)===offset):null;
      const text=Array.from(root.querySelectorAll('[data-start]')).find(el=>Number(el.dataset.start)<=offset&&Number(el.dataset.end)>offset);
      scrollInPane(root,marker||text||row);
    }
  });
}
function nextAmendment(direction=1){
  setReviewMode("amendments");
  if(!amendmentResults.length||!compared||compareWorker)return;
  amendmentIndex=amendmentIndex<0?(direction>0?0:amendmentResults.length-1):(amendmentIndex+direction+amendmentResults.length)%amendmentResults.length;renderAmendments();if(compared)renderDocuments();focusAmendment(amendmentResults[amendmentIndex],true);
  $('results').scrollIntoView({block:'start',behavior:'instant'});
}
function renderAmendments(){
  updateIssueNavigation();
  const root=$('amendment-results');root.replaceChildren();
  $('next-amendment').disabled=!amendmentResults.length||!compared||!!compareWorker;$('previous-amendment').disabled=$('next-amendment').disabled;
  const result=amendmentResults[amendmentIndex];
  $('amendment-position').textContent=result?`Amendment ${amendmentIndex+1} of ${amendmentResults.length} · ${amendmentLabels[result.status]}`:'';
  if(!result)return;
  const display=amendmentsDoc?amendmentDisplays(amendmentsDoc).find(d=>d.number===result.number):null;
  const card=document.createElement('div');card.className='amendment-card';
  const directive=document.createElement('p');directive.className='amendment-directive';appendAmendmentText(directive,display?.directive||{text:result.directive,strikes:[]});
  card.append(directive);
  const payload=display?.payload||{text:result.insertText,strikes:[]};
  if(payload.text){
    const amendment=document.createElement('p');amendment.className='amendment-payload';
    const tokens=comparisonTokens(payload.text).filter(t=>!payload.strikes.some(r=>r.start<t.end&&r.end>t.start)),different=new Set();
    const canonical=value=>value.normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
    for(const evidence of result.evidence){
      const expected=comparisonTokens(evidence.expected).map(t=>canonical(t.value));
      const target=tokens.map(t=>canonical(t.value));
      const first=expected.findIndex((_,i)=>target.every((value,j)=>expected[i+j]===value));
      if(first<0)continue;
      let index=0;
      for(const part of evidence.expectedParts||[]){
        for(const token of comparisonTokens(part.text)){
          if(part.different&&index>=first&&index<first+tokens.length)different.add(index-first);
          index++;
        }
      }
    }
    appendAmendmentText(amendment,payload,tokens.filter((t,i)=>different.has(i)));card.append(amendment);
  }
  root.append(card);
}
function appendAmendmentText(root,styled,missing=[]){
  const cuts=new Set([0,styled.text.length]);
  for(const range of [...styled.strikes,...missing]){cuts.add(range.start);cuts.add(range.end);}
  const offsets=[...cuts].sort((a,b)=>a-b);
  for(let i=0;i<offsets.length-1;i++){
    const start=offsets[i],end=offsets[i+1],struck=styled.strikes.some(r=>r.start<=start&&r.end>=end);
    const flagged=!struck&&missing.some(r=>r.start<=start&&r.end>=end);
    const span=document.createElement(flagged?'mark':'span');span.textContent=styled.text.slice(start,end);
    if(struck){span.className='pdf-struck';span.title='Crossed out in the amendment PDF';}
    if(flagged)span.className='amendment-missing';root.append(span);
  }
}

function checkAmendments(selectMode=true){
  if(!docs.every(Boolean)||!amendmentsDoc||Object.values(loading).some(Boolean)||amendmentWorker)return;
  if(!compared && !compareWorker)runComparison();
  if(selectMode)setReviewMode('amendments');
  otherEdits=null;amendmentsChecked=false;updateIssueNavigation();updateChangeNavigation();
  const seq=++amendmentSequence;
  amendmentResults=[];amendmentIndex=-1;$('next-amendment').disabled=true;$('previous-amendment').disabled=true;$('amendment-position').textContent='';if(compared)renderDocuments();
  amendmentWorker=new Worker('./amendment-worker.mjs',{type:'module'});
  availability();$('amendments-section').hidden=reviewMode!=='amendments';
  $('amendment-results').replaceChildren();
  $('amendment-status').textContent='Resolving instructions against the Previous Version and checking the Current Version…';
  const finish=()=>{amendmentWorker?.terminate();amendmentWorker=null;availability();};
  amendmentWorker.onerror=()=>{if(seq!==amendmentSequence)return;finish();$('amendment-status').textContent='Amendment verification could not finish. Try again.';};
  amendmentWorker.onmessage=({data})=>{
    if(seq!==amendmentSequence)return;finish();
    if(data.error){$('amendment-status').textContent=data.error;return;}
    amendmentsChecked=true;otherEdits=data.otherEdits;amendmentResults=data.results;amendmentIndex=amendmentResults.length?0:-1;updateChangeNavigation();renderAmendments();if(compared){renderDocuments();if(reviewMode==='amendments')focusAmendment(amendmentResults[amendmentIndex],true);}
    $('amendment-status').textContent='';
  };
  const model=doc=>({name:doc.name,pages:doc.pages,text:doc.text,blocks:doc.blocks,tokens:doc.tokens,effectiveTokens:doc.effectiveTokens,struck:doc.struck});
  amendmentWorker.postMessage({text:activeText(amendmentsDoc),previous:model(docs[0]),current:model(docs[1])});
}
function selectGrammar(index){
  setReviewMode('language');grammarIndex=index;
  $('add-dictionary').disabled=true;$('add-dictionary').removeAttribute('title');
  document.querySelectorAll('.current-grammar').forEach(el=>el.classList.remove('current-grammar'));
  const matches=$('right').querySelectorAll(`[data-grammar="${grammarIndex}"]`);
  matches.forEach(el=>el.classList.add('current-grammar'));scrollInPane($('right'),matches[0]);
  const issue=grammarIssues[grammarIndex];
  $('grammar-status').textContent=`Grammar issue ${grammarIndex+1} of ${grammarIssues.length} · ${issue.message} · Suggested: “${issue.suggestion}”`;
}
function issueAmendments(){return amendmentResults.map((r,i)=>({r,i})).filter(({r})=>r.status!=='implemented');}
function updateIssueNavigation(){
  const issues=issueAmendments(),enabled=amendmentsChecked&&!!issues.length;
  for(const id of ['previous-issue','next-issue','review-issues'])$(id).disabled=!enabled;
  $('issue-navigation').classList.toggle('has-issues',enabled);
  $('issue-status').textContent=!amendmentsChecked?'':issues.length?`${issues.length} amendment issue(s) · includes discrepancies and instructions needing review.`:'No amendment issues detected.';
}
function nextIssue(direction=1){
  const issues=issueAmendments();if(!amendmentsChecked||!issues.length||!compared)return;
  setReviewMode('amendments');
  let next=direction>0?issues.find(x=>x.i>amendmentIndex):[...issues].reverse().find(x=>x.i<amendmentIndex);
  amendmentIndex=(next||(direction>0?issues[0]:issues.at(-1))).i;
  renderAmendments();renderDocuments();focusAmendment(amendmentResults[amendmentIndex],true);
  $('issue-status').textContent=`Issue ${issues.findIndex(x=>x.i===amendmentIndex)+1} of ${issues.length} · ${amendmentLabels[amendmentResults[amendmentIndex].status]}`;
}
function renderDictionary(){
  const query=normalizeWord($('dictionary-search').value);
  const words=[...personalWords].sort((a,b)=>a.localeCompare(b,'en')).filter(word=>word.includes(query));
  $('dictionary-count').textContent=`${words.length} ${query?'matching ':''}word${words.length===1?'':'s'}${words.length>200?' · showing first 200':''}`;
  const list=$('dictionary-words');list.replaceChildren();
  for(const word of words.slice(0,200)){
    const row=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');
    label.textContent=word;remove.textContent='Remove';remove.className='quiet';remove.type='button';remove.setAttribute('aria-label',`Remove ${word} from dictionary`);
    remove.addEventListener('click',()=>{
      try{
        personalWords=removeWord(localStorage,word);dictionaryError='';renderDictionary();
        $('dictionary-feedback').textContent=`Removed “${word}”.`;
        if(compared)checkSpelling(false);
        $('dictionary-search').focus();
      }catch{$('dictionary-feedback').textContent=`Could not remove “${word}”. Your saved dictionary is unchanged.`;}
    });
    row.append(label,remove);list.append(row);
  }
  if(!words.length){const empty=document.createElement('li');empty.className='dictionary-empty';empty.textContent=query?'No matching words.':'No saved words yet.';list.append(empty);}
}
function openDictionary(){
  $('dictionary-feedback').textContent='';
  try{personalWords=loadDictionary(localStorage);dictionaryError='';}
  catch{$('dictionary-feedback').textContent='The saved dictionary could not be loaded. Try reopening it.';}
  $('dictionary-search').value='';$('dictionary-new-word').value='';renderDictionary();
  $('dictionary-dialog').showModal();$('dictionary-search').focus();
}
$('view-dictionary').addEventListener('click',openDictionary);
$('close-dictionary').addEventListener('click',()=>$('dictionary-dialog').close());
$('dictionary-search').addEventListener('input',renderDictionary);
$('dictionary-add-form').addEventListener('submit',event=>{
  event.preventDefault();const word=$('dictionary-new-word').value;
  try{
    personalWords=saveWord(localStorage,word);dictionaryError='';$('dictionary-new-word').value='';renderDictionary();
    $('dictionary-feedback').textContent=`Saved “${normalizeWord(word)}”.`;
    if(compared)checkSpelling(false);
    $('dictionary-new-word').focus();
  }catch(error){$('dictionary-feedback').textContent=/cannot be added/.test(error.message)?'Enter a single word using letters and optional apostrophes.':'Could not save this word. Your saved dictionary is unchanged.';}
});
$('dictionary-dialog').addEventListener('click',event=>{
  const dialog=$('dictionary-dialog'),rect=dialog.getBoundingClientRect();
  if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();
});
for(const [id,mode] of [['review-amendments','amendments'],['review-changes','changes']])$(id).addEventListener('click',()=>{
  setReviewMode(mode);
  if(mode==='amendments'){if(amendmentsDoc&&!amendmentsChecked&&!amendmentWorker)checkAmendments();else focusAmendment(amendmentResults[amendmentIndex],true);}
  
});

$('next-issue').addEventListener('click',()=>nextIssue(1));
$('previous-issue').addEventListener('click',()=>nextIssue(-1));
$('review-issues').addEventListener('click',()=>nextIssue(1));
setReviewMode('changes');
$('compare').addEventListener('click',runComparison);
$('refresh').addEventListener('click',refreshView);
$('check-style').addEventListener('click',checkStyle);
$('previous-style').addEventListener('click',()=>nextStyle(-1));
$('next-style').addEventListener('click',()=>nextStyle(1));
$('style-rule').addEventListener('click',()=>{const issue=styleIssues[styleIndex];if(issue)openGuide(issue.guidePage,'',issue.guideId,issue);});
$('view-guide').addEventListener('click',()=>openGuide());
for(const guide of guideTabs){
  const tab=document.createElement('button');tab.id='guide-tab-'+guide.id;tab.className='quiet guide-tab';tab.setAttribute('role','tab');tab.setAttribute('aria-controls',guide.id==='custom'?'custom-terms-panel':'guide-content');tab.textContent=guide.title+(guide.primary?' · Primary':'');tab.setAttribute('aria-selected',String(guide.id===activeGuideId));tab.tabIndex=guide.id===activeGuideId?0:-1;
  tab.addEventListener('click',()=>selectGuide(guide.id));
  tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=guideTabs.findIndex(g=>g.id===activeGuideId),next=event.key==='Home'?0:event.key==='End'?guideTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+guideTabs.length)%guideTabs.length;selectGuide(guideTabs[next].id);$('guide-tab-'+guideTabs[next].id).focus();});
  $('guide-tabs').append(tab);
}
$('close-guide').addEventListener('click',closeGuide);
$('guide-dialog').addEventListener('cancel',closeGuide);
let guideSearchTimer;
$('custom-term-form').addEventListener('submit',event=>{
  event.preventDefault();const term=$('custom-term').value.trim(),replacement=$('custom-replacement').value.trim();if(!term)return;
  if(updateCustomTerms([...customTerms.filter(r=>r.term!==term),{term,replacement}])){$('custom-term-form').reset();}
});
$('guide-search').addEventListener('input',()=>{clearTimeout(guideSearchTimer);guideSearchTimer=setTimeout(renderGuideSearch,180);});
$('guide-previous-page').addEventListener('click',()=>renderGuidePage(guidePage-1));
$('guide-next-page').addEventListener('click',()=>renderGuidePage(guidePage+1));
$('guide-page-form').addEventListener('submit',event=>{event.preventDefault();renderGuidePage($('guide-page').value);});
$('next-amendment').addEventListener('click',()=>nextAmendment(1));
$('previous-amendment').addEventListener('click',()=>nextAmendment(-1));
$('next-change').addEventListener('click',()=>nextChange(1));
$('previous-change').addEventListener('click',()=>nextChange(-1));
$('check-spelling').addEventListener('click',()=>{if(languageIssues.length){setReviewMode('language');if(languageIndex>=0)selectLanguage(languageIndex);}else checkSpelling();});
$('next-spelling').addEventListener('click',()=>nextSpelling(1));
$('previous-spelling').addEventListener('click',()=>nextSpelling(-1));
$('add-dictionary').addEventListener('click',addToDictionary);
for(const pane of [$('left'),$('right')]){
  function selectIssue(event){
    const style=event.target.closest('[data-style]');
    if(style&&reviewMode==='style'){if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;if(event.type==='keydown')event.preventDefault();selectStyle(Number(style.dataset.style));return;}
    if(event.type==='keydown' && event.key!=='Enter' && event.key!==' ')return;
    const grammar=event.target.closest('[data-grammar]');
    if(grammar&&reviewMode==='language'){if(event.type==='keydown')event.preventDefault();selectLanguage(languageIssues.findIndex(issue=>issue.kind==='grammar'&&issue.index===Number(grammar.dataset.grammar)));return;}
    const target=event.target.closest('[data-spelling]');if(!target)return;
    if(event.type==='keydown')event.preventDefault();
    selectLanguage(languageIssues.findIndex(issue=>issue.kind==='spelling'&&spellingIssues[issue.index].id===Number(target.dataset.spelling)));
  }
  pane.addEventListener('click',selectIssue);
  pane.addEventListener('keydown',selectIssue);
}
// Explicit, read-only interface for QA; never exposes file access or execution.
export function snapshot() { return { docs: docs.map(doc => doc && ({ name: doc.name, pages: doc.pages, blocks: doc.blocks, struck:doc.struck })), amendmentsDoc:amendmentsDoc&&({text:amendmentsDoc.text,struck:amendmentsDoc.struck}), status: $('status').textContent, resultsVisible: !$('results').hidden, changeCount, changeIndex, languageCount:languageIssues.length,languageIndex,spellingCount:spellingIssues.length, spellingIndex, amendmentResults, amendmentIndex, reviewMode, styleIssues, styleCount:styleIssues.length, styleIndex, styleChecked, grammarCount:grammarIssues.length, grammarIndex, amendmentIssueCount:issueAmendments().length }; }



