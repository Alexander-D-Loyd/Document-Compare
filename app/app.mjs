import {searchCaliforniaCounties} from './data/california-counties.mjs';
import {searchCaliforniaCodes} from './data/california-codes.mjs';
import {createEntityAuthorityPanel} from './entity-authority-ui.mjs';
import {digestDisplay,digestPayload,amendmentName} from './digest-amendment.mjs';
import {styleReviewView} from './style-review-view.mjs';
import {STYLE_REVIEW_SCOPE,STYLE_EXCEPTION_SUMMARY} from './style-finding-policy.mjs';
import {billReadingWarnings,billReadingSummary,applyBillReadingWarnings}from './bill-ocr-policy.mjs';
import {validateAuthority,authorityIndex,authorityAccepts,authorityStore}from './offline-authority.mjs';
import {legislativeBody} from './external-amendments.mjs';
import {documentComparisonTokens as comparisonTokensFor} from './document-comparison.mjs';
import {outsideDigest,isBudgetRunningHead} from './change-scope.mjs';
import {createUploadedPdfViewer} from './uploaded-pdf.mjs';
import { grammarIssues as findGrammarIssues } from './grammar.mjs';
import {reviewOfflineLanguage,cancelOfflineLanguage,mergeOfflineGrammar} from './offline-language.mjs';
import * as pdfjs from './vendor/pdf.mjs';
import { makeDocument, spellingCandidates, comparisonTokens, substantiveTokens, activeText } from './core.mjs';
import { loadDictionary, saveWord, removeWord, normalizeWord, isAccepted } from './personal-dictionary.mjs';
import { extractPageLayout,hasVisiblePdfContent } from './pdf-strikes.mjs';
import {pdfFontStyle} from './pdf-font-style.mjs';
import {PDF_SOURCE_FONT_OPTIONS} from './pdf-source-font-options.mjs';
import { printedAmendmentItems } from './amendment-markings.mjs';
import {jrBoxPageNotices,jrBoxMetadata,markJrBoxGeometry} from './amendment-jr-box.mjs';
import { ocrDictionary,repairOcrSpacing,isOcrStyle,repairOcrInstructions } from './ocr-text.mjs';
import {createOfflineOcr} from './offline-ocr.mjs';
import {readScannedInstructions} from './read-scanned-instructions.mjs';
import {amendmentReadingWarnings,applyAmendmentReadingWarnings} from './pdf-reading-quality.mjs';
import {pageReadingProblems,largeRasterCoverage} from './pdf-page-quality.mjs';
import {correctPdfReading} from './correct-pdf-reading.mjs';
import { reviewOutline } from './review-outline.mjs';
import {sequenceFind} from './sequence-find.mjs';
import { amendmentDeletionRanges, amendmentAdditionRanges, amendmentReviewRanges, amendmentOutlineGroup } from './amendment-highlights.mjs';
import { searchGuide } from './gpo-style.mjs';
import {STYLE_GUIDES,guideById} from './style-guides.mjs';
import {loadStyleTerms,saveStyleTerms,searchStyleTerms} from './custom-style.mjs';
import {searchCoverage} from './style-coverage.mjs';
import {searchRuleInventory} from './style-rule-inventory.mjs';
import {createReviewIgnores} from './review-ignores.mjs';
import { parseAmendments, amendmentDisplays, isProposedAmendmentsPage, instructionsEnd } from './amendments.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const $ = id => document.getElementById(id);
const docs = [null, null];
const versions = {0:0,1:0,amendments:0,digest:0,reference:0};
const loading = {0:false,1:false,amendments:false,digest:false,reference:false};
const pdfTasks={0:null,1:null,amendments:null,digest:null,reference:null},reviewIgnores=createReviewIgnores();
let ocrWordsPromise,referenceBill=null;
const ocrWords=()=>ocrWordsPromise??=Promise.all([...['index.dic','index.aff'].map(name=>fetch('./vendor/en_US/'+name).then(r=>r.text())),fetch('./data/lcb-spelling-words.json').then(r=>r.json())]).then(([dic,aff,guide])=>{
  const checker=new globalThis.Typo('en_US',aff,dic,{platform:'any'});
  return ocrDictionary(dic,[...checker.dictionaryTable.keys(),...guide.words.map(r=>r.word)]);
});
let offlineAuthority=null,authorityLookup=authorityIndex(null),authorityError='',authorityBusy=false;
const offlineAuthorityStore=authorityStore();
const authorityReady=offlineAuthorityStore.load().then(data=>{offlineAuthority=data;authorityLookup=authorityIndex(data);}).catch(error=>{authorityError=error.message;});
const externalDocs={};
const uploadedFiles=new Map();
const openUploadedPdf=createUploadedPdfViewer(pdfjs,uploadedFiles);
let digestDoc=null;
const hasAmendments=()=>!!(amendmentsDoc||digestDoc);
let amendmentsDoc=null,amendmentWorker=null,amendmentSequence=0,amendmentResults=[];
let amendmentIndex=-1,otherEdits=null;
let activeAmendmentIssue=null;
let reviewMode="changes",grammarIssues=[],grammarIndex=-1,amendmentsChecked=false;
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
let languageIssues=[],languageIndex=-1,languageChecked=false;
let languageRequestId=null,styleRequestId=null,spellingAbort=null,styleEngineWarning='',languageEngineWarning='';
let stylePending=false;
let personalWords = new Set();
let dictionaryError = '';
let allStyleIssues=[],styleIssues=[],styleIndex=-1,styleWorker=null,styleSequence=0,styleChecked=false;
const guideReferencePromises=new Map(),guidePdfPromises=new Map(),guideViews=new Map(STYLE_GUIDES.map(g=>[g.id,{page:g.defaultPage,query:''}]));
const guideTabs=[...STYLE_GUIDES,{id:'custom',title:'Custom Terms'},{id:'entities',title:'Entity Authority'},{id:'california-codes',title:'California Codes'},{id:'california-counties',title:'California Counties'},{id:'coverage',title:'Check Coverage'}];guideViews.set('custom',{query:''});guideViews.set('coverage',{query:''});guideViews.set('entities',{query:''});guideViews.set('california-codes',{query:''});guideViews.set('california-counties',{query:''});
let customTerms=[],customTermsError='';
try{customTerms=loadStyleTerms(localStorage);}catch{customTermsError='Saved custom terms could not be loaded.';}
let activeGuideId='lcb',guideContext=null,guidePage=1,guideRenderTask,guideRenderSequence=0;
const entityPanel=createEntityAuthorityPanel({$,getQuery:()=>$('guide-search').value.trim(),isActive:()=>activeGuideId==='entities',onChange:entityAuthorityChanged});
try { personalWords = loadDictionary(localStorage); }
catch { dictionaryError = 'Personal dictionary could not be loaded. Saved words may still be flagged.'; }

function setReviewMode(mode){
  if(mode!=='amendments'){activeAmendmentIssue=null;document.querySelectorAll('.current-amendment-issue').forEach(el=>el.classList.remove('current-amendment-issue'));}
  const changed=reviewMode!==mode;reviewMode=mode;document.body.dataset.review=mode;
  for(const [id,value] of [['review-amendments','amendments'],['review-changes','changes'],['check-spelling','language'],['check-style','style']])$(id).setAttribute('aria-pressed',String(mode===value));
  $('amendments-section').hidden=mode!=='amendments'||!hasAmendments();
  $('add-dictionary').disabled=mode!=='language'||spellingIndex<0||!spellingIssues.length;
  updateIgnoreControls();
  if(compared&&changed)renderDocuments();
}
function resetSpelling() {
  spellingAbort?.();spellingAbort=null;
  cancelOfflineLanguage(languageRequestId);languageRequestId=null;
  languageChecked=false;
  languageEngineWarning='';
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
  updateIgnoreControls();
}

function availability() {
  for(const side of [0,1])$('remove'+side).disabled=!(loading[side]||docs[side]);
  $('removeamendments').disabled=!(loading.digest||loading.amendments||digestDoc||amendmentsDoc);
  updateIgnoreControls();
  $('compare').disabled = !docs.every(Boolean) || loading[0] || loading[1] || !!compareWorker;
  $('review-amendments').disabled = !docs.every(Boolean) || !hasAmendments() || Object.values(loading).some(Boolean) || !!amendmentWorker;
  $('refresh').disabled = Object.values(loading).some(Boolean);
  $('continue-reference').disabled = !externalDocs[referenceBill] || Object.values(loading).some(Boolean);
  $('check-style').disabled = !docs.every(Boolean) || loading[0] || loading[1] || !!compareWorker || !!styleWorker || stylePending;
}
function invalidateAmendments(){
  activeAmendmentIssue=null;
  amendmentSequence++;amendmentWorker?.terminate();amendmentWorker=null;amendmentResults=[];
  otherEdits=null;amendmentsChecked=false;updateIssueNavigation();amendmentIndex=-1;$('next-amendment').disabled=true;$('previous-amendment').disabled=true;$('amendment-position').textContent='';
  updateChangeNavigation();
  if(compared)renderDocuments();
  $('amendment-results').replaceChildren();
  $('amendments-section').hidden=reviewMode!=='amendments'||!hasAmendments();
  $('amendment-status').textContent='Load both versions and select Amendments.';
}
function invalidateResults() {
  reviewIgnores.clear();
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
  const doc = side==='reference'?externalDocs[referenceBill]:side==='amendments'?amendmentsDoc:side==='digest'?digestDoc:docs[side];
  $('name' + side).textContent = doc.name;
  $('meta' + side).textContent = side==='digest'?`${doc.pages} page${doc.pages===1?'':'s'} · Digest · click to replace`:side==='amendments'?`${doc.pages} page${doc.pages===1?'':'s'} · ${parseAmendments(doc.text).length} amendment(s)${doc.endMarkerPage?` · ends at - 0 - on page ${doc.endMarkerPage}`:doc.ignoredFromPage?` · mockup pages ${doc.ignoredFromPage}–${doc.sourcePages} ignored`:''}${jrBoxMetadata(doc.jrBoxes)} · click to replace`:`${doc.pages} page${doc.pages === 1 ? '' : 's'} · ${doc.tokens.filter(t=>/[\p{L}\p{N}]/u.test(t.value)).length.toLocaleString()} words${jrBoxMetadata(doc.jrBoxes)} · click to replace`;
  if(side!=='amendments'&&doc.ocr){$('meta'+side).textContent+=' · '+billReadingSummary(doc);}
  const readings=side==='amendments'?amendmentReadingWarnings(doc):billReadingWarnings(doc);
  if(side!=='reference'&&readings.length){
    const review=document.createElement('button');review.type='button';review.className='quiet';review.textContent='Review PDF Reading';
    review.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();showReadingReview();});$('meta'+side).append(' ',review);
  }
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
  uploadedFiles.delete(side);
  const version = ++versions[side];
  const requestedBill=referenceBill;
  if(side!=='reference'){
    versions.reference++;pdfTasks.reference?.destroy().catch(()=>{});loading.reference=false;
    for(const key of Object.keys(externalDocs))delete externalDocs[key];
    for(const key of uploadedFiles.keys())if(key==='reference'||typeof key==='string'&&key.startsWith('reference:'))uploadedFiles.delete(key);
    $('reference-dialog').close();referenceBill=null;
  }
  pdfTasks[side]?.destroy().catch(()=>{});
  if(side==='reference'){delete externalDocs[requestedBill];uploadedFiles.delete('reference:'+requestedBill);invalidateAmendments();$('continue-reference').disabled=true;}else if(side==='amendments'||side==='digest'){reviewIgnores.clear();resetSpelling();resetStyle();if(side==='digest')digestDoc=null;else amendmentsDoc=null;invalidateAmendments();}else{invalidateResults();docs[side]=null;}
  loading[side] = true;
  $('error' + side).textContent = '';
  $('name' + side).textContent = file.name;
  $('meta' + side).textContent = 'Reading PDF…';
  availability();
  let task,localOcr;
  try {
    if (!/\.pdf$/i.test(file.name)) throw Error('Choose a PDF file.');
    if (file.size > 50 * 1024 * 1024) throw Error('This PDF exceeds the 50 MB limit.');
    const data = new Uint8Array(await file.arrayBuffer());
    if(versions[side]!==version)return;
    if (!new TextDecoder().decode(data.slice(0, 1024)).includes('%PDF-')) throw Error('This file is not a valid PDF.');
    task = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false, ...PDF_SOURCE_FONT_OPTIONS, cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href, cMapPacked: true, standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href, wasmUrl: new URL('./vendor/wasm/', import.meta.url).href });
    pdfTasks[side]=task;
    // Do not request or retain document passwords.
    task.onPassword = () => { task.destroy(); };
    const pdf = await task.promise;
    if (pdf.numPages > 1500) throw Error('This PDF exceeds the 1,500-page limit. Split it into smaller documents.');
    const pages = [],pageStrikes=[],pageFormatting=[];
    let hasOcr=false;const scanQuality=[];
    const blankPages = [],readingProblems=[];
    let total = 0,ignoredFromPage=null,endMarkerPage=null;const jrBoxes=[];
    for (let p = 1; p <= pdf.numPages; p++) {
      if (versions[side] !== version) return;
      $('meta' + side).textContent = `Reading page ${p} of ${pdf.numPages}…`;
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const operators=await page.getOperatorList();
      const fontStyles={...tc.styles};
      for(const name of Object.keys(fontStyles)){
        try{fontStyles[name]=pdfFontStyle(fontStyles[name],page.commonObjs.get(name));}catch{}
      }
      let items=side==='amendments'?printedAmendmentItems(tc.items,fontStyles,page.view[2]-page.view[0],page.view[3]-page.view[1]):tc.items;
      if(side==='amendments'&&Object.values(fontStyles).some(isOcrStyle)){
        hasOcr=true;
        const words=await ocrWords();
        items=items.map(item=>typeof item.str==='string'&&isOcrStyle(fontStyles[item.fontName])?{...item,str:repairOcrSpacing(item.str,words)}:item);
      }
      let layout=extractPageLayout(items,operators,pdfjs.OPS,fontStyles,page.view[2]-page.view[0]);
      markJrBoxGeometry(layout,operators,pdfjs.OPS);
      if(side==='amendments')jrBoxes.push(...jrBoxPageNotices({text:layout.text,annotations:await page.getAnnotations(),page:p}));
      if(side==='amendments'&&isProposedAmendmentsPage(layout.text)){
        ignoredFromPage=p;page.cleanup();break;
      }
      let end=side==='amendments'?instructionsEnd(layout.text):-1;
      const scanned=(Object.values(fontStyles).some(isOcrStyle)||!layout.text.trim()&&hasVisiblePdfContent(operators,pdfjs.OPS)||largeRasterCoverage(operators,pdfjs.OPS,page.view[2]-page.view[0],page.view[3]-page.view[1],page.view)>=.35&&(side==='amendments'?layout.text.replace(/\s/gu,'').length<300:true));
      if(scanned){
        hasOcr=true;
        const checkCancelled=()=>{if(versions[side]!==version)throw Error('Reading cancelled.');};
        localOcr??=await createOfflineOcr();checkCancelled();
        const scan=await readScannedInstructions(page,localOcr,pdfjs.OPS,checkCancelled,message=>{$('meta'+side).textContent=`Page ${p} of ${pdf.numPages} · ${message}`;},layout,{bill:side!=='amendments'});
        layout=scan.layout;
        if(side==='amendments')for(const notice of jrBoxPageNotices({text:layout.text,page:p}))if(!jrBoxes.some(n=>n.page===notice.page&&n.text===notice.text))jrBoxes.push(notice);
        if(side==='amendments'&&isProposedAmendmentsPage(layout.text)){ignoredFromPage=p;page.cleanup();break;}
        end=side==='amendments'?instructionsEnd(layout.text):-1;
        scanQuality.push({page:p,...scan.quality});
        if(end<0&&scan.marker){
          const height=page.view[3]-page.view[1],lines=layout.text.split('\n');
          const next=layout.lines.findIndex(line=>height-line.baseline>scan.marker.bottom+2);
          end=next<0?layout.text.length:lines.slice(0,next).reduce((n,line)=>n+line.length+1,0);
        }
      }
      const problems=pageReadingProblems(layout,operators,pdfjs.OPS,page.view[2]-page.view[0],page.view[3]-page.view[1],{end:end<0?layout.text.length:end,ocr:scanned,view:page.view});
      if(problems.length)readingProblems.push({page:p,problems});
      if(end>=0){
        layout.text=layout.text.slice(0,end).trimEnd();
        layout.strikes=layout.strikes.filter(r=>r.start<layout.text.length).map(r=>({...r,end:Math.min(r.end,layout.text.length)}));
        layout.lines=layout.lines.slice(0,layout.text.split('\n').length);
        ignoredFromPage=p+1;
        endMarkerPage=p;
      }
      pages.push(layout.text);pageStrikes.push(layout.strikes);pageFormatting.push(layout.lines);
      if (!layout.text.trim()&&hasVisiblePdfContent(operators,pdfjs.OPS)) blankPages.push(p);
      total += pages.at(-1).length;
      if (total > 10_000_000) throw Error('This PDF contains too much text. Split it into smaller documents.');
      page.cleanup();
      if(end>=0)break;
    }
    if (!total) throw Error(ignoredFromPage?'No instruction pages precede the PROPOSED AMENDMENTS mockup. Upload the instructional amendment pages.':'No readable text found. This may be a scanned PDF; run OCR on it first.');
    if (blankPages.length) throw Error(`No readable text on page${blankPages.length === 1 ? '' : 's'} ${blankPages.slice(0, 10).join(', ')}${blankPages.length > 10 ? '…' : ''}. Run OCR or remove blank pages before comparing, so changes are not missed.`);
    if(readingProblems.length)throw Error(`PDF reading could not be verified on page${readingProblems.length===1?'':'s'} ${readingProblems.slice(0,10).map(r=>r.page).join(', ')}${readingProblems.length>10?'…':''}: ${[...new Set(readingProblems.flatMap(r=>r.problems))].join('; ')}. Open the original PDF and supply a readable/OCR copy before comparing, so text is not silently missed.`);
    if (versions[side] !== version) return;
    const words=await ocrWords();
    if(versions[side]!==version)return;
    const document=makeDocument(pages,file.name,pageStrikes,pageFormatting,words);
    const heads=document.blocks.filter(b=>isBudgetRunningHead(document,b));
    if(heads.length){document.tokens=document.tokens.filter(t=>!heads.some(b=>t.start>=b.start&&t.end<=b.end));document.effectiveTokens=document.effectiveTokens.filter(t=>!heads.some(b=>t.start>=b.start&&t.end<=b.end));}
    document.ocr=hasOcr;document.scanQuality=scanQuality;
    if(side==='amendments'){document.sourcePages=pdf.numPages;document.ignoredFromPage=ignoredFromPage;document.endMarkerPage=endMarkerPage;document.scanQuality=scanQuality;document.jrBoxes=[...(document.jrBoxes||[]),...jrBoxes.filter(n=>!(document.jrBoxes||[]).some(existing=>existing.page===n.page&&existing.text===n.text))];}
    if(side==='reference'){legislativeBody(document,requestedBill);$('status').textContent=docs.every(Boolean)?'Ready to compare document text.':'Choose the other PDF to continue.';externalDocs[requestedBill]=document;}else if(side==='amendments')amendmentsDoc=document;else if(side==='digest'){digestPayload(document);digestDoc=document;}else docs[side]=document;
    metadata(side);
    uploadedFiles.set(side,file);$('name'+side).title='Open this PDF';$('name'+side).setAttribute('role','link');$('name'+side).tabIndex=0;
    if(side==='reference')uploadedFiles.set('reference:'+requestedBill,file);
    if(side==='amendments'||side==='digest'){$('amendments-section').hidden=reviewMode!=='amendments';$('amendment-status').textContent='Instructions loaded. Select Amendments to verify both versions.';}
    else if(side!=='reference') $('status').textContent = docs.every(Boolean) ? 'Ready to compare document text.' : 'Choose the other PDF to continue.';
  } catch (error) {
    if (versions[side] !== version) return;
    const message = /password|destroy/i.test(error.message) ? 'Password-protected PDFs are not supported. Save an unlocked copy first.' : error.message || 'Could not read this PDF. It may be damaged.';
    $('error' + side).textContent = message;
    $('name' + side).textContent = side==='amendments'?'Instructional Amendments':side==='digest'?'Digest':'Drop a PDF here';
    $('meta' + side).textContent = side==='amendments'||side==='digest'?'or click to choose a PDF · optional':'or click to choose a file · up to 50 MB';
    $(side==='amendments'||side==='digest'?'amendment-status':'status').textContent = 'The PDF could not be loaded. See the message above.';
  } finally {
    if(localOcr)await localOcr.terminate().catch(()=>{});
    if (task) await task.destroy().catch(() => {});
    if(pdfTasks[side]===task)pdfTasks[side]=null;
    if (versions[side] === version) loading[side] = false;
    availability();
    if((side==='amendments'||side==='digest')&&hasAmendments()&&versions[side]===version){
      const needsReference=requestReference();
      // Comparison may finish while PDF.js is still releasing the newly read
      // instruction PDF. Resume verification once loading has actually ended.
      if(!needsReference&&compared&&!compareWorker&&!amendmentsChecked&&!amendmentWorker)checkAmendments(false);
    }
  }
}

function removeFile(side){
  const sides=side==='amendments'?['digest','amendments']:[side];
  for(const slot of sides){
    uploadedFiles.delete(slot);$('name'+slot).removeAttribute('role');$('name'+slot).removeAttribute('tabindex');$('name'+slot).removeAttribute('title');
    versions[slot]++;pdfTasks[slot]?.destroy().catch(()=>{});pdfTasks[slot]=null;loading[slot]=false;
    if(slot==='amendments')amendmentsDoc=null;else if(slot==='digest')digestDoc=null;else docs[slot]=null;
    $('file'+slot).value='';$('error'+slot).textContent='';$('drop'+slot).classList.remove('drag');
    $('name'+slot).textContent=slot==='amendments'?'Instructional Amendments':slot==='digest'?'Digest':'Drop a PDF here';
    $('meta'+slot).textContent=slot==='amendments'||slot==='digest'?'or click to choose a PDF · optional':'or click to choose a file · up to 50 MB';
  }
  versions.reference++;pdfTasks.reference?.destroy().catch(()=>{});loading.reference=false;
  for(const key of Object.keys(externalDocs))delete externalDocs[key];referenceBill=null;$('reference-dialog').close();
  for(const key of uploadedFiles.keys())if(key==='reference'||typeof key==='string'&&key.startsWith('reference:'))uploadedFiles.delete(key);
  invalidateResults();setReviewMode('changes');
  for(const id of ['left','right']){$(id).replaceChildren();$(id+'-name').textContent='';$(id+'-page').value='1';$(id+'-page-total').textContent='0';}
  $('added').textContent='';$('removed').textContent='';availability();
  if(docs.every(Boolean))runComparison(true);else $('status').textContent=docs.some(Boolean)?'Choose the other PDF to continue.':'Choose two PDFs to begin. Your files stay on this computer.';
}
for (const side of [0,'digest','amendments',1]) {
  const drop = $('drop' + side), input = $('file' + side);
  if(side!=='digest')$('remove'+side).addEventListener('click',()=>removeFile(side));
  drop.addEventListener('click', event => {if(event.target.closest('#name'+side)&&uploadedFiles.has(side))openUploadedPdf(side);else input.click();});
  $('name'+side).addEventListener('keydown',event=>{if(uploadedFiles.has(side)&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();openUploadedPdf(side);}});
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
  if(otherEdits){doc.changeLocations={...otherEdits.locations[side]};return outsideDigest(doc,otherEdits.ranges[side]);}
  return outsideDigest(doc,ranges);
}
function renderDocument(root, doc, changes, side) {
  root.replaceChildren();
  const ranges=sideRanges(doc,changes,side);
  const showChanges=reviewMode==='changes'&&(!hasAmendments()||amendmentsChecked);
  const selectedAmendment=reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
  const deletionHighlights=amendmentDeletionRanges(doc,selectedAmendment,side);
  let previousPage=0,rangeIndex=0,spellIndex=0,pageRoot=root;
  doc.blocks.forEach((block,blockIndex)=>{
    if(block.page!==previousPage)for(let page=previousPage+1;page<=block.page;page++){pageRoot=document.createElement('section');pageRoot.className='pdf-page';root.append(pageRoot);const label=document.createElement('div');label.className='page-ref';label.textContent=`Page ${page}`;label.dataset.page=page;pageRoot.append(label);previousPage=page;}
    const row=document.createElement('div');row.className='text-line'+(block.margin?' has-margin':'');row.dataset.block=blockIndex;
    const gutter=document.createElement('span');gutter.className='margin-number';gutter.textContent=block.margin.replace(/^line\s*/i,'').trim();
    const body=document.createElement('span');body.className='line-body'+(block.ignored||block.runningHead?' layout-label':'');
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
    for(let i=spellIndex;i<doc.spelling.length && doc.spelling[i].start<end;i++){
      const issue=doc.spelling[i];
      for(const span of issue.spans||[issue])if(span.end>start&&span.start<end&&!block.ignored&&!block.runningHead)spells.push({...issue,start:span.start,end:span.end});
    }
    const amendments=side===1&&reviewMode==='amendments'?amendmentAdditionRanges(amendmentResults[amendmentIndex]).filter(r=>r.start<end&&r.end>start):[];
    const amendmentCoverage=amendmentResults.flatMap(result=>result.evidence.map(e=>({start:side?e.currentOffset:e.previousOffset,end:side?e.currentEndOffset:e.previousEndOffset}))).filter(r=>r.end>r.start&&r.start<end&&r.end>start);
    const active=side===0&&reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
    const currentReview=side===1&&reviewMode==='amendments'?amendmentResults[amendmentIndex]:null;
    const comparisons=currentReview?currentReview.evidence.map((e,i)=>({...e,id:`A${currentReview.number}.${i+1}`})):[];
    const reviewRanges=amendmentReviewRanges(currentReview).filter(e=>e.currentOffset<end&&e.currentEndOffset>start);
    const differences=comparisons.flatMap(e=>e.differenceRanges||[]).filter(r=>r.start<end&&r.end>start);
    const missing=comparisons.flatMap(e=>(e.missingPoints||[]).map((p,n)=>({...p,id:currentReview.digest?`${e.id}.M${n+1}`:e.id}))).filter(p=>p.offset>=start&&p.offset<=end);
    if(currentReview&&activeAmendmentIssue?.expectedText&&activeAmendmentIssue.i===amendmentIndex&&activeAmendmentIssue.currentStart===activeAmendmentIssue.currentEnd&&activeAmendmentIssue.currentStart>=start&&activeAmendmentIssue.currentStart<=end&&!missing.some(p=>p.offset===activeAmendmentIssue.currentStart))missing.push({offset:activeAmendmentIssue.currentStart,text:activeAmendmentIssue.expectedText,id:'selected-issue'});
    const sourceEdits=active?active.evidence.flatMap((e,i)=>(e.previousDeletionRanges??[{start:e.previousOffset,end:e.previousEndOffset??e.previousOffset}]).map((r,n)=>({...r,id:`A${active.number}.${i+1}${active.digest?'.D'+(n+1):''}`}))):[];
    const deletions=deletionHighlights.filter(r=>r.start<end&&r.end>start);
    const insertions=active?.digest?active.evidence.flatMap(e=>(e.previousInsertionPoints||[]).map(p=>p.offset)):active?.action==='insert'?sourceEdits.map(r=>r.start):active?.action==='replace'?sourceEdits.map(r=>r.end):[];
    // Digest deltas are inline red/blue text, without insertion badges.
    const points=active?.digest?[]:[...new Set(insertions)].filter(at=>at>=start&&at<=end);
    const appendInsertion=at=>{
      if(!points.includes(at))return;
      const marker=document.createElement('span');const afterLine=active.afterLine!=null||active.billEnd||active.patches?.some(p=>p.finalInsertion);const between=!afterLine&&(!!active.between||active.beforeLine!=null);marker.className=between?'amendment-insertion amendment-between-arrow':afterLine?'amendment-insertion amendment-after-arrow':'amendment-insertion amendment-selection';marker.textContent=between||afterLine?'➜':'+';if(afterLine)row.style.marginBottom='16px';if(between)row.style.marginTop=`max(16px, ${row.style.marginTop||'0px'})`;marker.dataset.outlineGroup=amendmentOutlineGroup(active,sourceEdits.find(r=>r.start===at||r.end===at)?.id||active.number);marker.dataset.amendmentInsertion=active.number;marker.dataset.sourceOffset=at;marker.title=active.directive;marker.setAttribute('aria-label',`${amendmentName(active)}: insert text here`);marker.tabIndex=0;body.append(marker);
    };
    const grammars=side===1&&reviewMode==='language'?grammarIssues.filter(r=>r.start<end&&r.end>start):[];
    const styles=side===1&&reviewMode==='style'&&!block.ignored&&!block.runningHead?styleIssues.filter(r=>r.start<end&&r.end>start):[];
    const boundaries=new Set([start,end]);
    for(const part of f?.headerParts||[])for(const offset of [part.start,part.end])if(block.start+offset>start&&block.start+offset<end)boundaries.add(block.start+offset);
    for(const run of f?.runs||[])for(const offset of [run.start,run.end])if(block.start+offset>start&&block.start+offset<end)boundaries.add(block.start+offset);
    for(const point of points)boundaries.add(point);
    for(const p of missing)boundaries.add(p.offset);
    for(const range of [...edits,...spells,...grammars,...styles,...strikes,...amendments,...amendmentCoverage,...deletions,...differences,...reviewRanges.map(e=>({start:e.currentOffset,end:e.currentEndOffset}))]){boundaries.add(Math.max(start,range.start));boundaries.add(Math.min(end,range.end));}
    const appendComparisonMarkers=at=>{
      for(const p of missing.filter(p=>p.offset===at)){
        const marker=document.createElement('span');marker.className='amendment-missing'+(currentReview.digest?'':' amendment-selection');marker.dataset.issueOffset=p.offset;if(activeAmendmentIssue?.i===amendmentIndex&&activeAmendmentIssue.currentStart===p.offset)marker.classList.add('current-amendment-issue');marker.textContent='[missing text]';marker.title=currentReview.directive;marker.setAttribute('aria-label',`${p.id}: missing requested text: ${p.text}`);marker.dataset.amendmentMissing=p.id;marker.dataset.outlineGroup=amendmentOutlineGroup(currentReview,p.id);body.append(marker);
      }
    };
    const cuts=[...boundaries].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const a=cuts[i],b=cuts[i+1];if(a===b)continue;
      appendInsertion(a);
      appendComparisonMarkers(a);
      const reviewing=reviewRanges.some(e=>e.currentOffset<=a&&e.currentEndOffset>=b);
      const related=amendmentCoverage.some(r=>r.start<=a&&r.end>=b);
      const edit=!showChanges||related||reviewing||block.ignored||strikes.some(r=>r.start<b&&r.end>a)?null:edits.find(r=>r.start<=a && r.end>=b);
      const spelling=reviewMode==='language'&&side===1&&spells.find(r=>r.start<=a && r.end>=b);
      const struck=strikes.some(r=>r.start<=a&&r.end>=b);
      const chunk=document.createElement(edit?'mark':'span');chunk.textContent=doc.text.slice(a,b);
      chunk.dataset.start=a;chunk.dataset.end=b;
      const fontRun=f?.runs?.find(r=>r.start<=a-block.start&&r.end>=b-block.start);
      if(fontRun){
        if(fontRun.sourceCharSpacing!==undefined)chunk.style.letterSpacing=`calc(${fontRun.sourceCharSpacing}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;
        if(fontRun.bold)chunk.style.fontWeight='700';if(fontRun.italic)chunk.style.fontStyle='italic';
        if(fontRun.smallCaps){chunk.classList.add('pdf-small-caps');chunk.style.fontSize=`calc(${fontRun.height*.67}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;}
        if(fontRun.fractionOffset!==undefined){chunk.style.fontSize=`calc(${fontRun.height}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;chunk.style.position='relative';chunk.style.top=`calc(${-fontRun.fractionOffset}px * var(--pdf-scale, ${16/Math.max(1,f.bodyHeight)}))`;}
      }
      if(f?.headerGaps?.some(r=>r.start<=a-block.start&&r.end>=b-block.start))chunk.classList.add('pdf-header-gap');
      if(edit){chunk.classList.add('other-change',edit.kind);chunk.dataset.change=edit.group;}
      if(edit&&amendmentCoverage.some(r=>r.start<=a&&r.end>=b))chunk.dataset.amendmentRelated='true';
      if(struck){chunk.classList.add('pdf-struck');chunk.title='Crossed out in the source PDF';if(side===0)chunk.classList.add('previous-source-struck');}
      if(spelling){chunk.classList.add('spelling');chunk.dataset.spelling=spelling.id;chunk.title=`Select spelling issue: ${spelling.word}`;chunk.tabIndex=0;chunk.setAttribute('role','button');chunk.setAttribute('aria-label',`Review spelling of ${spelling.word}`);}
      const grammar=grammars.find(r=>r.start<=a&&r.end>=b);
      if(grammar){chunk.classList.add('grammar');chunk.dataset.grammar=grammar.id;chunk.title=grammar.message+' · Suggested: '+grammar.suggestion;chunk.tabIndex=0;chunk.setAttribute('role','button');}
      const matchingStyles=styles.filter(r=>r.start<=a&&r.end>=b),style=matchingStyles.find(r=>r.id===styleIssues[styleIndex]?.id)||matchingStyles[0];
      if(style&&!struck){chunk.classList.add('stylistic');chunk.dataset.style=style.id;chunk.dataset.styleIds=matchingStyles.map(r=>r.id).join(' ');chunk.title=`${style.message}${style.suggestion?' Suggested: '+style.suggestion:''} · ${style.references.map(r=>guideById(r.guideId).title+" "+r.rule).join("; ")}`;chunk.tabIndex=0;chunk.setAttribute('role','button');chunk.setAttribute('aria-label',`Review potential style discrepancy: ${style.text}`);}
      const amendment=amendments.filter(r=>r.start<=a&&r.end>=b);
      const deleted=!(side===0&&struck)&&deletions.some(r=>r.start<=a&&r.end>=b);
      if(amendment.length&&!block.ignored&&!block.runningHead){chunk.classList.add('amendment-text');if(!deleted&&(currentReview?.action==='insert'||currentReview?.action==='replace'))chunk.classList.add('amendment-added');chunk.title=[...new Set(amendment.map(r=>r.directive))].join('\n');chunk.dataset.amendmentInstruction=chunk.title;if(!spelling)chunk.tabIndex=0;chunk.setAttribute('aria-description',chunk.title);}
      if(deleted){chunk.classList.add('amendment-deletion');chunk.dataset.amendmentDeletion=selectedAmendment.number;chunk.title=selectedAmendment.directive;}
      if(differences.some(r=>r.start<=a&&r.end>=b))chunk.classList.add('amendment-unexpected');
      if(side===1&&reviewMode==='amendments'&&activeAmendmentIssue?.i===amendmentIndex&&activeAmendmentIssue.currentStart<b&&activeAmendmentIssue.currentEnd>a)chunk.classList.add('current-amendment-issue');
      const selectionRange=side===1?reviewRanges.find(r=>r.currentOffset<=a&&r.currentEndOffset>=b):deletions.find(r=>r.start<=a&&r.end>=b);
      const part=f?.headerParts?.find(p=>p.start<=a-block.start&&p.end>=b-block.start);
      const chunkParent=headerParents.get(part)||body;
      const selected=!selectedAmendment?.digest&&selectionRange&&!block.ignored&&!block.runningHead&&!(side===0&&struck)&&!(side===1&&deleted)&&!!(side===1?currentReview?.insertText:active?.insertText)?.trim();
      const outlineGroup=amendmentOutlineGroup(side===1?currentReview:active,selectionRange?.id);
      if(selected){
        let wrapper=chunkParent.lastElementChild;
        if(!wrapper?.classList.contains('amendment-selection')||wrapper.dataset.selectionText!=='true'||wrapper.dataset.outlineGroup!==outlineGroup){
          wrapper=document.createElement('span');wrapper.className='amendment-selection';wrapper.dataset.selectionText='true';wrapper.dataset.outlineGroup=outlineGroup;chunkParent.append(wrapper);
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
  for(let page=previousPage+1;page<=doc.pages;page++){const section=document.createElement('section');section.className='pdf-page';const label=document.createElement('div');label.className='page-ref';label.textContent=`Page ${page}`;label.dataset.page=page;section.append(label);root.append(section);}
}
function renderDocuments(){
  docs.forEach((doc,side)=>{const root=$(side?'right':'left'),top=root.scrollTop;renderDocument(root,doc,currentChanges,side);root.scrollTop=top;updatePageCounter(side);});
  if(reviewMode==='changes'&&changeIndex>=0)document.querySelectorAll(`[data-change="${changeIndex}"]:not([data-amendment-related])`).forEach(el=>el.classList.add('current-change'));
  if(reviewMode==='language'&&spellingIndex>=0 && spellingIssues[spellingIndex])document.querySelectorAll(`[data-spelling="${spellingIssues[spellingIndex].id}"]`).forEach(el=>el.classList.add('current-spelling'));
  if(reviewMode==='language'&&grammarIndex>=0)document.querySelectorAll(`[data-grammar="${grammarIndex}"]`).forEach(el=>el.classList.add('current-grammar'));
  if(reviewMode==='style'&&styleIndex>=0&&styleIssues[styleIndex])document.querySelectorAll(`[data-style-ids~="${styleIssues[styleIndex].id}"]`).forEach(el=>el.classList.add('current-style'));
  if(reviewMode==='amendments'&&amendmentIndex>=0)focusAmendment(amendmentResults[amendmentIndex],false);
  drawReviewOutlines();
}
function drawReviewOutlines(){
  for(const root of [$('left'),$('right')]){
    const width=Number(root.dataset.columnWidth),body=root.querySelector('.line-body');
    if(width>0&&body?.clientWidth>0){
      const scale=Math.min(16/Math.max(1,Number(root.dataset.bodyHeight)||12),body.clientWidth/width);root.style.setProperty('--pdf-scale',scale);
    }
    root.querySelectorAll('.review-outline').forEach(el=>el.remove());
    const groups=new Map();
    const groupKey=(el,id)=>id+'|'+el.closest('.pdf-page').querySelector('.page-ref').dataset.page;
    if(reviewMode==='changes'){
      for(const el of root.querySelectorAll('.current-change')){const id=groupKey(el,el.dataset.change);const group=groups.get(id)||[];group.push(el);groups.set(id,group);}
    }else if(reviewMode==='amendments'&&!amendmentResults[amendmentIndex]?.digest&&amendmentResults[amendmentIndex]?.insertText.trim()){
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
const navigationPages=new WeakMap();
function retainNavigationPage(root,side,page){
  const doc=docs[side];
  if(doc&&Number.isInteger(page)&&page>=1&&page<=doc.pages)navigationPages.set(root,{doc,page,top:root.scrollTop});
  else navigationPages.delete(root);
  updatePageCounter(side);
}
function scrollInPane(root,target){
  if(!target)return;
  const top=target.getBoundingClientRect().top-root.getBoundingClientRect().top+root.scrollTop-root.clientHeight*.3;
  root.scrollTo({top:Math.max(0,top),behavior:'instant'});
  if(root.id==='right'||root.id==='left')retainNavigationPage(root,root.id==='right'?1:0,Number(target.closest('.pdf-page')?.querySelector('.page-ref')?.dataset.page));
}
function updatePageCounter(side){
  const doc=docs[side];if(!doc){navigationPages.delete($(side?'right':'left'));return;}
  const root=$(side?'right':'left'),input=$(root.id+'-page');
  // Preserve the page selected by an arrow or typed navigation while that
  // scroll position stays unchanged, including a short/blank final page.
  let anchor=navigationPages.get(root);
  if(anchor&&(anchor.doc!==doc||anchor.top!==root.scrollTop)){navigationPages.delete(root);anchor=null;}
  const top=root.getBoundingClientRect().top+root.clientHeight*.3;
  const labels=Array.from(root.querySelectorAll('[data-page]'));
  let page=anchor?.page;
  if(!page){
    // During free scrolling, use the reading focus rather than a preceding
    // footer at the very top. Labels are in document order; inspect only
    // logarithmically many rectangles even with 1,500 pages.
    let lo=0,hi=labels.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(labels[mid].getBoundingClientRect().top<=top)lo=mid+1;else hi=mid;}
    page=labels[Math.max(0,lo-1)]?.dataset.page||1;
  }
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
    retainNavigationPage(root,side,page);
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
  if(otherEdits?.uncertain){navigableChanges=[];changeCount=0;changeIndex=-1;$('next-change').disabled=true;$('previous-change').disabled=true;$('change-status').textContent=otherEdits.reason;return;}
  const otherGroups=new Set();
  if(hasAmendments()&&!amendmentsChecked){navigableChanges=[];changeCount=0;changeIndex=-1;$("next-change").disabled=true;$("previous-change").disabled=true;$("change-status").textContent="Select Amendments to identify non-amendment changes.";return;}
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
function updateIgnoreControls(){
  const language=compared&&!!docs[1]&&reviewMode==='language'&&!spellingWorker&&languageIndex>=0&&!!languageIssues[languageIndex];
  const style=compared&&!!docs[1]&&reviewMode==='style'&&!styleWorker&&styleIndex>=0&&!!styleIssues[styleIndex];
  const category=style?'style':language?'spelling or grammar':null;
  let matching=0;
  if(style)matching=reviewIgnores.matchingCount('style',styleIssues[styleIndex],styleIssues,docs[1].text);
  else if(language){
    const selected=languageIssues[languageIndex],issues=selected.kind==='spelling'?spellingIssues:grammarIssues;
    matching=reviewIgnores.matchingCount(selected.kind,issues[selected.index],issues,docs[1].text);
  }
  $('ignore-review').disabled=!(language||style);
  $('undo-ignore').disabled=!reviewIgnores.canUndo||!compared||!!compareWorker||!!spellingWorker||!!styleWorker||Object.values(loading).some(Boolean);
  $('ignore-all-review').disabled=matching<2;
  $('ignore-review').title=category?`Ignore the selected ${category} finding in the loaded files`:'Select a Spelling & Grammar or Stylistic Check finding to ignore';
  $('ignore-all-review').title=category?(matching<2?'Only one matching finding remains':`Ignore ${matching} matching ${category} findings in the loaded files`):'Select a Spelling & Grammar or Stylistic Check finding to ignore';
}
function ignoreLanguage(all){
  const selected=languageIssues[languageIndex];if(!selected||spellingWorker||reviewMode!=='language')return;
  const issue=selected.kind==='spelling'?spellingIssues[selected.index]:grammarIssues[selected.index],text=docs[1].text,oldIndex=languageIndex;
  reviewIgnores.ignore(selected.kind,issue,text,all);
  spellingIssues=spellingIssues.filter(i=>!reviewIgnores.has('spelling',i,text));docs[1].spelling=spellingIssues;
  grammarIssues=grammarIssues.filter(i=>!reviewIgnores.has('grammar',i,text));spellingIndex=-1;grammarIndex=-1;
  updateLanguageNavigation();renderDocuments();$('add-dictionary').disabled=true;$('add-dictionary').removeAttribute('title');
  if(languageIssues.length)selectLanguage(Math.min(oldIndex,languageIssues.length-1));
  else{$('grammar-status').textContent='';$('spelling-status').textContent='No remaining spelling or grammar findings. Ignore choices apply only to the loaded files; Refresh restores them.';}
  updateIgnoreControls();
}
function ignoreStyle(all){
  const issue=styleIssues[styleIndex];if(!issue||styleWorker||reviewMode!=='style')return;
  const oldIndex=styleIndex,text=docs[1].text;reviewIgnores.ignore('style',issue,text,all);
  guideContext=null;$('guide-rule-context').hidden=true;
  applyStyleReviewView(issue.id,oldIndex);
}
function updateLanguageNavigation(){
  languageIssues=[...spellingIssues.map((r,i)=>({kind:'spelling',index:i,start:r.start})),...grammarIssues.map((r,i)=>({kind:'grammar',index:i,start:r.start}))].sort((a,b)=>a.start-b.start||a.kind.localeCompare(b.kind));
  languageIndex=-1;
  $('next-spelling').disabled=!languageIssues.length;$('previous-spelling').disabled=!languageIssues.length;
  updateIgnoreControls();
}
function selectLanguage(index){
  if(index<0||index>=languageIssues.length)return;
  languageIndex=index;const issue=languageIssues[index];spellingIndex=-1;grammarIndex=-1;
  document.querySelectorAll('.current-spelling,.current-grammar').forEach(el=>el.classList.remove('current-spelling','current-grammar'));
  $('grammar-status').textContent='';$('spelling-status').textContent='';
  if(issue.kind==='spelling')selectSpelling(issue.index);else selectGrammar(issue.index);
  const status=$(issue.kind==='spelling'?'spelling-status':'grammar-status');
  status.textContent=`Issue ${index+1} of ${languageIssues.length} · `+status.textContent;
  updateIgnoreControls();
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
function entityAuthorityChanged(){
  const recheck=reviewMode==='style'&&(styleChecked||stylePending||!!styleWorker);
  reviewIgnores.clearKind('style');resetStyle();availability();
  if(compared)renderDocuments();
  if(compared&&recheck)checkStyle();
}
function resetStyle(){
  stylePending=false;
  cancelOfflineLanguage(styleRequestId);styleRequestId=null;
  styleEngineWarning='';
  styleSequence++;styleWorker?.terminate();styleWorker=null;allStyleIssues=[];styleIssues=[];styleIndex=-1;styleChecked=false;
  $('previous-style').disabled=true;$('next-style').disabled=true;$('style-rule').disabled=true;
  $('style-status').textContent='Review explicit LCB and GPO rules and applicable legislative exceptions.';
  updateIgnoreControls();
}
function selectStyle(index){
  if(index<0||index>=styleIssues.length)return;
  setReviewMode('style');styleIndex=index;
  document.querySelectorAll('.current-style').forEach(el=>el.classList.remove('current-style'));
  const issue=styleIssues[index],matches=$('right').querySelectorAll(`[data-style-ids~="${issue.id}"]`);
  matches.forEach(el=>el.classList.add('current-style'));scrollInPane($('right'),matches[0]);
  const block=docs[1].blocks.find(b=>b.start<=issue.start&&b.end>issue.start);
  const officePreference=issue.guideId==='custom'||issue.dictionaryEvidence?.authority==='Office preference list';
  const recommendation=issue.matchesPrimary||!issue.suggestion?'':`${officePreference?'Saved replacement':'Guide form'} to compare: “${issue.suggestion}”.`;
  const references=issue.references.map(r=>`${guideById(r.guideId).title} ${r.rule}${r.guidePrintedPage?", p. "+r.guidePrintedPage:""}`).join(' · ');
  $('style-status').textContent=`${officePreference?'Office preference review':'Style review'} ${index+1} of ${styleIssues.length} · p. ${block?.page||1}${issue.context?' · '+issue.context+' text':''} · ${issue.category}: “${issue.matchText||issue.text}”. ${recommendation} ${issue.message} ${references}${issue.conflict?' · LCB takes priority.':''}`+(styleEngineWarning?' '+styleEngineWarning:'');
  $('style-rule').disabled=false;
  updateIgnoreControls();
}
function nextStyle(direction=1){
  setReviewMode('style');if(!styleIssues.length)return;
  selectStyle(styleIndex<0?(direction>0?0:styleIssues.length-1):(styleIndex+direction+styleIssues.length)%styleIssues.length);
}
function applyStyleReviewView(preferredId=null,preferredIndex=0){
  const view=styleReviewView(allStyleIssues,{accept:issue=>!reviewIgnores.has('style',issue,docs[1].text)});
  styleIssues=view.issues;styleIndex=-1;
  $('previous-style').disabled=!styleIssues.length;$('next-style').disabled=!styleIssues.length;$('style-rule').disabled=true;
  const reviewCount=styleIssues.filter(issue=>issue.reviewSuggested).length,discrepancyCount=styleIssues.length-reviewCount;
  $('style-status').textContent=(styleIssues.length?`${discrepancyCount} guide-form comparison${discrepancyCount===1?'':'s'} · ${reviewCount} contextual review${reviewCount===1?'':'s'} requiring judgment · use arrows to review.`:'No findings from the supported guide checks. Manual review is still needed for unautomated rules.')+(styleEngineWarning?' '+styleEngineWarning:'');
  renderDocuments();
  if(styleIssues.length&&reviewMode==='style'){
    const retained=styleIssues.findIndex(i=>i.id===preferredId);
    selectStyle(retained>=0?retained:Math.min(Math.max(0,preferredIndex),styleIssues.length-1));
  }
  availability();updateIgnoreControls();
}
async function checkStyle(){
  if(!compared||compareWorker||!docs[1]||styleWorker||stylePending)return;
  setReviewMode('style');
  if(styleChecked){if(styleIndex>=0)selectStyle(styleIndex);return;}
  resetStyle();const seq=++styleSequence;stylePending=true;availability();
  $('style-status').textContent='Loading local style authorities…';
  await Promise.all([authorityReady,entityPanel.ready]);if(seq!==styleSequence||!compared||!docs[1]){if(seq===styleSequence)stylePending=false;return;}
  styleWorker=new Worker('./style-worker.mjs',{type:'module'});availability();
  $('style-status').textContent='Checking Current Version against LCB, GPO, California Codes, and California Counties…';
  const finish=()=>{stylePending=false;cancelOfflineLanguage(styleRequestId);styleWorker?.terminate();styleWorker=null;styleRequestId=null;availability();};
  styleWorker.onerror=()=>{if(seq!==styleSequence)return;finish();$('style-status').textContent='Stylistic check could not finish. Try again.';};
  styleWorker.onmessage=({data})=>{
    if(seq!==styleSequence)return;finish();
    if(data.error){$('style-status').textContent=data.error;return;}
    styleEngineWarning=[styleEngineWarning,data.lcbReadiness?.warning||''].filter(Boolean).join(' ');
    allStyleIssues=data.issues;styleChecked=true;styleIndex=-1;
    applyStyleReviewView();
  };
  const doc={...docs[1]},id=styleRequestId='style-'+crypto.randomUUID(),native=await reviewOfflineLanguage(doc,'style',id,undefined,{includeLcbReaderReview:false});
  if(seq!==styleSequence)return;
  if(native.cancelled||!styleWorker){finish();return;}
  styleEngineWarning=[native.warning||'',entityPanel.warning()].filter(Boolean).join(' ');
  styleWorker.postMessage({doc:{text:doc.text,blocks:doc.blocks,excluded:doc.excluded,struck:doc.struck,wrappedWords:doc.wrappedWords},terms:customTerms,engineIssues:native.issues,analysisCoverage:native.analysisCoverage||null,authority:offlineAuthority,entityAuthority:entityPanel.selected()});
}
function loadGuideReference(id=activeGuideId){
  if(!guideReferencePromises.has(id))guideReferencePromises.set(id,fetch(guideById(id).referenceUrl).then(response=>{if(!response.ok)throw Error(`${guideById(id).title} reference could not be loaded.`);return response.json();}).catch(error=>{guideReferencePromises.delete(id);throw error;}));
  return guideReferencePromises.get(id);
}
function renderCaliforniaCounties(query){
  const root=$('california-counties-results');root.replaceChildren();const rows=searchCaliforniaCounties(query);
  $('guide-search-status').textContent=rows.length+' of 58 counties. Use County of [Name] or Counties of [Name], [Name], … .';
  for(const row of rows){const card=document.createElement('article');card.className='guide-rule-card';const name=document.createElement('strong');name.textContent='County of '+row.name;const plural=document.createElement('p');plural.textContent='In a plural list: Counties of …, '+row.name+', …';card.append(name,plural);root.append(card);}
}
function renderCaliforniaCodes(query){
  const root=$('california-codes-results');root.replaceChildren();const rows=searchCaliforniaCodes(query);
  $('guide-search-status').textContent=`${rows.length} of 29 code names and shorthand pairs. Both forms are checked for exact matches.`;
  for(const row of rows){const card=document.createElement('article');card.className='guide-rule-card';const name=document.createElement('strong');name.textContent=row.name;const short=document.createElement('p');short.textContent=row.shorthand;card.append(name,short);root.append(card);}
}
async function renderGuideSearch(){
  const id=activeGuideId,query=$('guide-search').value.trim();guideViews.get(id).query=query;
  if(id==='custom'){renderCustomTerms(query);return;}
  if(id==='coverage'){renderCoverage(query);return;}
  if(id==='entities'){entityPanel.render(query);return;}
  if(id==='california-codes'){renderCaliforniaCodes(query);return;}
  if(id==='california-counties'){renderCaliforniaCounties(query);return;}
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
  if(['custom','coverage','entities','california-codes','california-counties'].includes(activeGuideId))return;
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
  const officePreference=guideContext.guideId==='custom'||guideContext.dictionaryEvidence?.authority==='Office preference list';
  $('guide-conflict-note').textContent=guideContext.countySource?'This finding compares county names and formatting with your California Counties list.':guideContext.codeSource?'This finding compares the citation with your California Codes list.':officePreference?'This finding comes from a saved or imported office preference. It is not a spelling error or a claim that LCB/GPO lists this word.':guideContext.conflict?guideContext.conflictNote:'LCB is the primary standard. GPO supplies secondary guidance. '+STYLE_EXCEPTION_SUMMARY;
  const task=document.createElement('article');task.className='guide-rule-card';
  const taskTitle=document.createElement('strong');taskTitle.textContent='Review this finding';
  const taskText=document.createElement('p');taskText.textContent=guideContext.reviewTask||guideContext.message;
  const scope=document.createElement('p');scope.textContent=guideContext.countySource?'Use County of [Name] or Counties of [Name], [Name], … . Check each name against the supplied list before editing.':guideContext.codeSource?'Check the name and shorthand against your supplied list. Differences are highlighted for review; section numbers are not checked.':officePreference?'Confirm the selected office preference and intended meaning before editing. Listed alternatives remain accepted forms.':STYLE_REVIEW_SCOPE;
  task.append(taskTitle,taskText,scope);root.append(task);
  const entitySource=guideContext.entitySource||guideContext.officialHeadEvidence?.registry;
  if(entitySource){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=entitySource.datasetId?'Selected entity authority':'Bundled entity snapshot';
    const source=document.createElement('p');source.textContent=[entitySource.sourceTitle,entitySource.sourceAuthority,entitySource.sourceCitation,entitySource.citation].filter(Boolean).join(' · ');
    const date=document.createElement('p');date.textContent=`Source as-of: ${entitySource.asOfDate||'unknown'}${entitySource.importedAt?' · Imported: '+entitySource.importedAt:''}`;
    const receipt=document.createElement('p');receipt.textContent=`${entitySource.inputFile||entitySource.file||entitySource.sourceFile} · SHA-256: ${entitySource.datasetId||entitySource.sha256||entitySource.sourceSHA256}`;
    const note=document.createElement('p');note.textContent='The source date and file hash identify the selected data; they do not establish freshness, legal status or authenticity. A missing name is not evidence of an error.';
    box.append(title,source,date,receipt,note);root.append(box);
  }
  if(guideContext.codeSource){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='California Codes · User-supplied list';
    const entry=document.createElement('p');const row=guideContext.codeSource.entry;entry.textContent=row?row.name+' — '+row.shorthand:'No exact listed form was identified.';
    const message=document.createElement('p');message.textContent=guideContext.message;
    const button=document.createElement('button');button.className='quiet';button.textContent='View California Codes';button.addEventListener('click',()=>selectGuide('california-codes'));
    box.append(title,entry,message,button);root.append(box);
  }
  if(guideContext.countySource){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='California Counties · User-supplied list and format';
    const entry=document.createElement('p');entry.textContent=guideContext.suggestion||'Confirm each county name against the supplied 58-county list.';
    const message=document.createElement('p');message.textContent=guideContext.message;
    const button=document.createElement('button');button.className='quiet';button.textContent='View California Counties';button.addEventListener('click',()=>selectGuide('california-counties'));
    box.append(title,entry,message,button);root.append(box);
  }
  if(guideContext.supplementarySource){
    const source=guideContext.supplementarySource,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=source.title+' · '+source.section+' · p. '+source.printedPage;
    const note=document.createElement('p');note.textContent=source.reason+' '+source.scope;
    const link=document.createElement('a');link.textContent='View supplementary citation source';link.href=source.url+'#page='+source.pdfPage;link.target='_blank';link.rel='noopener noreferrer';
    box.append(title,note,link);root.append(box);
  }
  for(const check of guideContext.citationFormChecks||[]){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Additional citation check · California Style Manual '+check.section;
    const reason=document.createElement('p');reason.textContent=check.reason+(check.preferred!==null?' Listed form: '+check.preferred+'.':'');
    const link=document.createElement('a');link.textContent='View this citation provision';link.href=guideContext.supplementarySource.url+'#page='+check.pdfPage;link.target='_blank';link.rel='noopener noreferrer';box.append(title,reason,link);root.append(box);
  }
  if(guideContext.citationContextReview?.length){
    for(const family of guideContext.citationContextReview){
      const box=document.createElement('article');box.className='guide-rule-card';
      const title=document.createElement('strong');title.textContent='Citation checks · California Style Manual '+(family.chapterRange?'· ':'§§ ')+(family.sectionLabel||family.sections.join(', '));
      const list=document.createElement(family.provisionChecks?.length?'div':'ul');
      if(family.provisionChecks?.length){
        for(const provision of family.provisionChecks){
          const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='§'+provision.section+' · source verification';
          const tasks=document.createElement('ul');for(const task of provision.tasks){const item=document.createElement('li');item.textContent=task;tasks.append(item);}
          const source=document.createElement('a');source.textContent='View §'+provision.section;source.href=guideContext.supplementarySource.url+'#page='+provision.pdfPage;source.target='_blank';source.rel='noopener noreferrer';details.append(summary,tasks,source);list.append(details);
        }
      }else for(const task of family.tasks){const item=document.createElement('li');item.textContent=task;list.append(item);}
      const link=document.createElement('a');link.textContent='View these citation provisions';link.href=guideContext.supplementarySource.url+'#page='+family.pdfPage;link.target='_blank';link.rel='noopener noreferrer';
      box.append(title,list,link);root.append(box);
    }
  }
  for(const reference of guideContext.references.filter(r=>!['california-codes','california-counties'].includes(r.guideId))){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`${guideById(reference.guideId).title}${reference.guideId==='lcb'?' · Primary':''} · ${reference.rule} · p. ${reference.guidePrintedPage}`;
    const form=document.createElement('p');form.textContent=`${reference.guideId==='lcb'?'Recommended LCB form':'GPO form'}: “${reference.preferred}”`;
    const rule=document.createElement('p');rule.textContent=reference.sourcePassage?.displayText||reference.sourcePassage?.text||reference.ruleText;
    const sourceLabel=document.createElement('p');sourceLabel.textContent=reference.sourcePassage?.kind||'Checking condition — consult the original guide page';
    const button=document.createElement('button');button.className='quiet';button.textContent=`View ${guideById(reference.guideId).title} page`;button.addEventListener('click',()=>selectGuide(reference.guideId,reference.guidePage));
    box.append(title);if(reference.preferred)box.append(form);box.append(sourceLabel,rule,button);root.append(box);
  }
  if(guideContext.modifierRoleEvidence){
    const evidence=guideContext.modifierRoleEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Listed modifier context';
    const text=document.createElement('p');text.textContent=`“${guideContext.matchText||guideContext.text}” directly precedes “${evidence.head.text}”. Confirm the unit-modifier meaning and any exception before editing.`;
    box.append(title,text);root.append(box);
  }
  if(guideContext.dictionaryEvidence){
    const evidence=guideContext.dictionaryEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Imported source: ${evidence.authority} · ${evidence.edition}`;
    const source=document.createElement('p');source.textContent=evidence.source;
    const entries=document.createElement('p');entries.textContent='Source entries: '+evidence.entries.map(r=>`${r.entry}: ${r.preferred}`).join(' · ');
    const note=document.createElement('p');note.textContent=officePreference?'Review the supplied office preference and intended sense.':'Confirm the selected dictionary entry and intended sense; its other listed spellings remain accepted.';
    box.append(title,source,entries,note);root.append(box);
  }
  if(guideContext.entityMatches?.length){
    for(const match of guideContext.entityMatches){
      const box=document.createElement('article');box.className='guide-rule-card';
      const title=document.createElement('strong');title.textContent=`Local California Entities match: ${match.name}`;
      const citation=document.createElement('p');citation.textContent=[match.category,match.citation,match.annotation].filter(Boolean).join(' · ');
      const note=document.createElement('p');note.textContent='This is a close match in the supplied local list. Confirm the intended institution and its current legal name before editing; the list may contain historical names.';
      box.append(title,citation,note);root.append(box);
    }
  }
  if(guideContext.predicateRoleEvidence){
    const e=guideContext.predicateRoleEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Parsed Predicate Context';
    const subject=document.createElement('p');subject.textContent='Subject: '+e.subject.parsedText;
    const predicate=document.createElement('p');predicate.textContent='Linking Verb: '+e.predicate.parsedText+(e.predicate.finiteAuxiliaries.length?' · Finite Auxiliaries: '+e.predicate.finiteAuxiliaries.map(a=>a.parsedText).join(' '):'');
    const parts=document.createElement('p');parts.textContent='Compound: '+e.components.map(c=>c.parsedText).join('-');
    const note=document.createElement('p');note.textContent='Confirm the grammatical role, lexical spelling and internal compound boundaries. Parser labels do not establish meaning or a required replacement.';
    box.append(title,subject,predicate,parts,note);if(e.relativeClause){const clause=document.createElement('p');clause.textContent='Intact Relative Clause: '+e.relativeClause.text;const explanation=document.createElement('p');explanation.textContent='Unrelated text elsewhere in the sentence is struck. This question relies on the displayed clause; confirm its meaning before editing.';box.append(clause,explanation);}root.append(box);
  }
  if(guideContext.postnominalRoleEvidence){
    const e=guideContext.postnominalRoleEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Postnominal Compound Context';
    const noun=document.createElement('p');noun.textContent='Modified Noun: '+e.modifiedNoun.parsedText;
    const parts=document.createElement('p');parts.textContent='Compound: '+e.components.map(c=>c.parsedText).join('-');
    const witness=document.createElement('p');witness.textContent='Modifier Context: '+e.members.map(c=>c.parsedText).join(' ');
    const note=document.createElement('p');note.textContent='Confirm the adjective/adverbial meaning, lexical spelling and internal boundaries. Parser attachments do not establish a required replacement.';
    box.append(title,noun,parts,witness,note);if(e.finiteRelative){const subject=document.createElement('p');subject.textContent='Relative Subject: '+e.finiteRelative.subject.parsedText;const aux=document.createElement('p');aux.textContent='Passive Auxiliaries: '+e.finiteRelative.auxiliaries.map(r=>r.parsedText).join(' ');const limit=document.createElement('p');limit.textContent='A verbal passive use alone is not a style error. Confirm adjective meaning before applying the postnominal hyphen rule.';box.append(subject,aux,limit);}root.append(box);
  }
  if(guideContext.nounRoleEvidence){
    const evidence=guideContext.nounRoleEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Parsed noun sequence: ${evidence.components.map(c=>c.parsedText).join(' ')}`;
    const head=document.createElement('p');head.textContent=`Parsed head: ${evidence.head}`;
    const predicate=document.createElement('p');predicate.textContent=`Clause predicate: ${evidence.predicate.parsedText}${evidence.predicate.finiteAuxiliaries.length?' · '+evidence.predicate.finiteAuxiliaries.map(a=>a.parsedText).join(' '):''}`;
    const note=document.createElement('p');note.textContent='These source-linked grammatical roles do not establish compound meaning. Confirm whether the words form one unit modifier before the noun; no replacement is asserted.';
    box.append(title,head,predicate,note);root.append(box);
  }
  if(guideContext.officialHeadEvidence){
    const evidence=guideContext.officialHeadEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Head title to review: ${evidence.head}`;
    const name=document.createElement('p');name.textContent=`Complete entity name: ${evidence.entityName}`;
    const source=document.createElement('p');source.textContent=`Name evidence: ${evidence.witnessKind}`;
    const person=document.createElement('p');person.textContent=`Person-name cue: ${evidence.person} · ${evidence.namePosition}`;
    if(evidence.creation){const clause=document.createElement('p');clause.textContent=evidence.creation.evidenceText||evidence.creation.declarationText;box.append(clause);}
    if(evidence.registry){const snapshot=document.createElement('p');snapshot.textContent=`${evidence.registry.sourceFile}${evidence.registry.citation?' · '+evidence.registry.citation:''}. ${evidence.registry.limitations}`;box.append(snapshot);}
    const note=document.createElement('p');note.textContent='Confirm whether this is the entity’s official head title or a generic role description. The name evidence does not establish the officer’s appointment, title or legal authority; no replacement is asserted.';
    box.prepend(title,person,name,source);box.append(note);root.append(box);
  }
  if(guideContext.titleWitness){
    const witness=guideContext.titleWitness,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Title established in this document: ${witness.name}`;
    const source=document.createElement('p');source.textContent=witness.evidenceText||witness.declarationText;
    const note=document.createElement('p');note.textContent=witness.sourceKind==='Document-local public-entity creation'?'Confirm the intended public entity and full official name. The creating clause supplies document-local evidence, not registry authority or a legal identity decision; no replacement is asserted.':witness.sourceKind==='Document-local intact self-designation'?'Confirm the intended official title and reference. The self-designation supplies the name for review; no replacement is asserted.':'Confirm that this later reference means the same fund or account. The creating clause supplies the title for this review; no replacement is asserted.';
    box.append(title,source,note);root.append(box);
  }
  if(guideContext.definitionEvidence){
    const evidence=guideContext.definitionEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Newly defined term: ${evidence.term}`;
    const source=document.createElement('p');source.textContent=evidence.clauseText;
    box.append(title,source);
    if(evidence.candidateForm){const comparison=document.createElement('p');comparison.textContent=`Rule form for comparison: ${evidence.candidateForm}`;box.append(comparison);}
    const note=document.createElement('p');note.textContent='Confirm the intended wording and meaning of this new definition. It may intentionally preserve another form; no replacement or legal meaning is asserted.';
    box.append(note);root.append(box);
  }
  if(guideContext.introducedSeriesEvidence){
    const evidence=guideContext.introducedSeriesEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Introduced Series Context';box.append(title);
    const text=document.createElement('p');text.textContent=evidence.text;box.append(text);
    const note=document.createElement('p');note.textContent='Confirm whether these phrases or clauses are parallel items at the same level. No punctuation change is selected.';box.append(note);root.append(box);
  }
  if(guideContext.groupedSeriesEvidence){
    const evidence=guideContext.groupedSeriesEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Grouped Series Context';box.append(title);
    const text=document.createElement('p');text.textContent=evidence.text;box.append(text);
    const note=document.createElement('p');note.textContent='Confirm whether the final “and” joins another group or belongs inside the last group. No punctuation change is selected.';box.append(note);root.append(box);
  }
  if(guideContext.timePossessiveEvidence){
    const evidence=guideContext.timePossessiveEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Time Expression Context';box.append(title);
    const text=document.createElement('p');text.textContent=evidence.text;box.append(text);
    const role=document.createElement('p');role.textContent='Possible head: '+evidence.head.text+'. Confirm the relationship; no punctuation change is selected.';box.append(role);
    root.append(box);
  }
  if(guideContext.quoteEvidence){
    const evidence=guideContext.quoteEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Quoted Term and Definition';
    const term=document.createElement('p');term.textContent=`Quoted term: ${guideContext.text}`;
    const definition=document.createElement('p');definition.textContent=`Definition: ${evidence.definitionVerb.text} ${evidence.description}`;
    const note=document.createElement('p');note.textContent='Confirm whether the final mark belongs to the quoted term. No punctuation change is selected.';
    box.append(title,term,definition,note);root.append(box);
  }
  if(guideContext.affixEvidence?.lexicalWitness){
    const evidence=guideContext.affixEvidence.lexicalWitness,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Suffix word-list witnesses';
    const words=document.createElement('p');words.textContent=`Possible base: ${evidence.base} · Closed word: ${evidence.closedWord}`;
    const relation=document.createElement('p');relation.textContent=evidence.relation;
    box.append(title,words,relation);
    if(evidence.lcbListedForm){const listed=document.createElement('p');listed.textContent=`LCB listed form (p. ${evidence.lcbListedForm.page}): ${evidence.lcbListedForm.word}`;box.append(listed);}
    const note=document.createElement('p');note.textContent='The bundled word list supplies recognition evidence, not Merriam-Webster preference ordering. Confirm the complete form, meaning and any justified hyphen before editing; no replacement is asserted.';
    box.append(note);root.append(box);
  }
  if(guideContext.openingClauseText){
    const box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Sentence-opening quantity for review';
    const source=document.createElement('p');source.textContent=guideContext.openingClauseText;
    const note=document.createElement('p');note.textContent='Confirm this is the beginning of a sentence. Preserve the full quantity and unit when spelling out the number or rephrasing; no replacement is supplied.';
    box.append(title,source,note);root.append(box);
  }
  if(guideContext.entityNameEvidence){
    const evidence=guideContext.entityNameEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=guideContext.sourceNameKind==='official-title'?'Source-created official title comparison':'Source-created entity name comparison';
    const operation=document.createElement('p');operation.textContent=`Word difference: ${evidence.operation}`;
    const expected=document.createElement('p');expected.textContent=`Earlier name words: ${evidence.canonicalWords.length?evidence.canonicalWords.join(' '):'(none at this position)'}`;
    const actual=document.createElement('p');actual.textContent=`Later name words: ${evidence.actualWords.length?evidence.actualWords.map(w=>w.word).join(' '):'(omitted between the adjacent words)'}`;
    const note=document.createElement('p');note.textContent=guideContext.sourceNameKind==='official-title'?'Compare the complete later title with the earlier intact creation or self-designation clause. It may be a shortened description or another legal instrument; no legal identity, error or replacement is asserted.':'Compare the complete later name with the earlier intact creation clause. It may be a shortened description or a different entity; no legal identity, error or replacement is asserted.';
    box.append(title,operation,expected,actual,note);root.append(box);
  }
  if(guideContext.affixEvidence?.productiveWitness){
    const evidence=guideContext.affixEvidence.productiveWitness,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Productive -like suffix review';
    const base=document.createElement('p');base.textContent=`Recognized root: ${evidence.base}`;
    const form=document.createElement('p');form.textContent=`Closed form for rule comparison: ${evidence.closedWord}`;
    const note=document.createElement('p');note.textContent='GPO6.31 generally closes words ending in like, with proper-name and triple-consonant exceptions. The complete closed form is absent from the bundled word list. Confirm the intended compound and office spelling authority; no valid spelling or replacement is asserted.';
    box.append(title,base,form,note);root.append(box);
  }
  if(guideContext.pronunciationEvidence?.sourceExpansion){
    const evidence=guideContext.pronunciationEvidence,witness=evidence.sourceExpansion,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent=`Earlier source expansion for ${witness.initials}`;
    const source=document.createElement('p');source.textContent=witness.evidenceText||witness.clauseText;
    const condition=document.createElement('p');condition.textContent=`If the letters are spoken individually: ${evidence.articleIfLettersSpoken} ${evidence.initials}`;
    const note=document.createElement('p');note.textContent='Confirm which abbreviation is intended here and how it is pronounced. An expansion does not establish pronunciation or legal scope; no replacement is asserted.';
    box.append(title,source,condition,note);root.append(box);
  }
  if(guideContext.repeatedCountEvidence){
    const evidence=guideContext.repeatedCountEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Repeated Count Phrase Context';
    const source=document.createElement('p');source.textContent=evidence.text;
    const note=document.createElement('p');note.textContent='Repeated wording is evidence to review, not proof of a noun role or the same numerical expression. Confirm the full quantities before editing.';
    box.append(title,source,note);root.append(box);
  }
  if(guideContext.relationshipEvidence){
    const evidence=guideContext.relationshipEvidence,box=document.createElement('article');box.className='guide-rule-card';
    const title=document.createElement('strong');title.textContent='Counts linked for review';
    for(const member of evidence.members){const line=document.createElement('p');line.textContent=guideContext.coordinationEvidence?(docs[1]?.text.slice(member.start,member.headEnd)||`${member.sourceText} ${member.head}`):`${member.sourceText||docs[1]?.text.slice(member.start,member.end)||member.value} ${member.head||evidence.head}${member.perUnit?' per '+member.perUnit:''}`;box.append(line);}
    if(evidence.sentenceText){const sentence=document.createElement('p');sentence.textContent=evidence.sentenceText;box.append(sentence);}
    const note=document.createElement('p');note.textContent='Confirm whether these quantities belong to the same numerical expression. Matching noun wording or parser attachment alone does not establish their meaning.';
    if(guideContext.coordinationEvidence){const witness=document.createElement('p');witness.textContent='Coordination Anchor: '+guideContext.coordinationEvidence.paths[0].at(-1).parsedText+'. Different quantity classes retain their own numeral treatment; this is a question for review, not an automatic correction.';box.append(witness);}
    box.prepend(title);box.append(note);root.append(box);
  }
  if(guideContext.mixedCountListEvidence){const box=document.createElement('article');box.className='guide-rule-card';const title=document.createElement('strong');title.textContent='Complete Counted List';box.append(title);for(const m of guideContext.mixedCountListEvidence.members){const line=document.createElement('p');line.textContent=docs[1]?.text.slice(m.start,m.headEnd)||`${m.sourceText} ${m.head}`;box.append(line);}const note=document.createElement('p');note.textContent='Confirm whether the quantities belong to the same numerical expression. This list supports review but does not establish common meaning or require an automatic edit.';box.append(note);root.append(box);}
}
function selectGuide(id,page=null,query=null){
  guideViews.get(activeGuideId).query=$('guide-search').value;
  const custom=id==='custom',coverage=id==='coverage',entities=id==='entities',codes=id==='california-codes',counties=id==='california-counties';$('california-counties-panel').hidden=!counties;$('california-codes-panel').hidden=!codes;$('custom-terms-panel').hidden=!custom;$('coverage-panel').hidden=!coverage;$('entity-panel').hidden=!entities;$('guide-content').hidden=custom||coverage||entities||codes||counties;
  $('guide-search-label').textContent=counties?'Search California Counties':codes?'Search California Codes':custom?'Search custom terms (case sensitive)':coverage?'Search check coverage':entities?'Search entity names and source citations':'Search the guide';
  $('guide-search').placeholder=counties?'Search a county name':codes?'Search a code name or shorthand':custom?'Search saved terms or replacements':coverage?'Search a rule area, context or limitation':entities?'Search an exact name, category, or citation':'Search a phrase, topic, or rule number (for example 6.20)';
  for(const item of guideTabs){const tab=$('guide-tab-'+item.id);tab.setAttribute('aria-selected',String(item.id===id));tab.tabIndex=item.id===id?0:-1;}
  if(custom||coverage||entities||codes||counties){
    activeGuideId=id;guideRenderSequence++;guideRenderTask?.cancel();guideRenderTask=null;$('guide-rule-context').hidden=!(codes||counties)||!guideContext;
    $('guide-description').textContent=counties?'Your supplied 58-county list · County of / Counties of':codes?'Your supplied reference list · Exact code names and shorthand':custom?'Your saved style terms · Case-sensitive matching and search':entities?'Selected local entity authority · Exact names and source provenance':'Supported checks and rules requiring manual review';
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
  selectGuide(id,page??(['custom','coverage','entities','california-codes','california-counties'].includes(id)?null:guideById(id).defaultPage),query);
}
async function renderCoverage(query=''){
  const root=$('coverage-list');root.replaceChildren();
  try{
  const [lcb,gpo]=await Promise.all([loadGuideReference('lcb'),loadGuideReference('gpo')]);
  if(activeGuideId!=='coverage'||$('guide-search').value.trim()!==query)return;
  const inventory=searchRuleInventory({lcb,gpo},query).filter(item=>item.status!=='Not applicable to legislative prose'),items=[...searchCoverage(query),...inventory].filter(item=>item.status!=='Not applicable to legislative prose');
  $('guide-search-status').textContent=`${inventory.length} source rule/passages matched. Inventory includes rules that are not automated; no complete-compliance certification.`;
  let rendered=0;
  const more=document.createElement('button');more.className='quiet';more.textContent='Show More Source Rules';
  const append=()=>{more.remove();for(const item of items.slice(rendered,rendered+100)){
    const card=document.createElement('article');card.className='guide-rule-card';
    const heading=document.createElement('strong');heading.textContent=item.title+' · '+item.status;
    const text=document.createElement('p');text.textContent=(item.scope?item.scope+'\n\n':'')+item.text;
    const button=document.createElement('button');button.className='quiet';button.textContent=`View ${guideById(item.guide).title} source page`;button.addEventListener('click',()=>selectGuide(item.guide,item.page));
    card.append(heading,text,button);root.append(card);
  }rendered+=100;if(rendered<items.length)root.append(more);};more.addEventListener('click',append);append();
  }catch(e){$('guide-search-status').textContent='Could not load rule coverage: '+e.message;}
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
  const recheck=reviewMode==='style'&&(styleChecked||stylePending||!!styleWorker);customTerms=next;customTermsError='';resetStyle();availability();if(compared)renderDocuments();renderCustomTerms();if(recheck)checkStyle();return true;
}
async function checkSpelling(selectMode=true){
  if(!compared || compareWorker || !docs.every(Boolean))return;
  resetSpelling();const seq=++spellingSequence;
  await authorityReady;if(seq!==spellingSequence||!compared||!docs.every(Boolean))return;
  grammarIssues=findGrammarIssues(docs[1]).filter(issue=>!reviewIgnores.has('grammar',issue,docs[1].text)).map((issue,id)=>({...issue,id}));
  
  $('grammar-status').textContent='Checking grammar locally in Current Version…';
  if(selectMode)setReviewMode('language');renderDocuments();
  spellingWorker=new Worker('./spelling-worker.js');
  updateIgnoreControls();
  $('check-spelling').disabled=true;
  $('spelling-status').textContent='Checking spelling locally in Current Version…';
  const doc=docs[1],id=languageRequestId='grammar-'+crypto.randomUUID();
  const spelling=new Promise(resolve=>{spellingAbort=()=>resolve({cancelled:true});spellingWorker.onerror=()=>resolve({error:'Spell check could not finish. Try again.'});spellingWorker.onmessage=({data})=>resolve(data);});
  spellingWorker.postMessage({candidates:docs.map((doc,side)=>side===0?[]:spellingCandidates(doc).filter(candidate=>!isAccepted(candidate.word,personalWords)&&!authorityAccepts(authorityLookup,candidate.word)&&!doc.struck.some(r=>r.start<candidate.end&&r.end>candidate.start)))});
  const [data,native]=await Promise.all([spelling,reviewOfflineLanguage(doc,'grammar',id)]);
  if(seq!==spellingSequence||native.cancelled)return;
  spellingWorker?.terminate();spellingWorker=null;languageRequestId=null;spellingAbort=null;
  grammarIssues=mergeOfflineGrammar(grammarIssues,native.issues).filter(issue=>!reviewIgnores.has('grammar',issue,doc.text));
  let counter=0;docs.forEach((item,side)=>{item.spelling=(side===1?(data.issues?.[1]||[]):[]).filter(issue=>!reviewIgnores.has('spelling',issue,item.text)).map(issue=>({...issue,id:counter++,side}));});
  languageEngineWarning=native.warning||'';
  spellingIssues=docs.flatMap(item=>item.spelling);renderDocuments();$('check-spelling').disabled=false;languageChecked=!data.error&&!native.warning;
  updateLanguageNavigation();
  $('grammar-status').textContent=(grammarIssues.length?`${grammarIssues.length} possible grammar issue(s).`:'No issues found by the supported grammar checks.')+(native.warning?' '+native.warning:'');
  $('spelling-status').textContent=data.error||(spellingIssues.length?`${spellingIssues.length} possible spelling issue${spellingIssues.length===1?'':'s'} · review names and specialist terms.`:'No spelling issues found in the English dictionary check.');
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
      if(change.added||change.removed){if(!inEdit||change.history)group++;inEdit=!change.history;return {...change,group};}
      inEdit=false;return change;
    });
    updateChangeNavigation();
    // The first render must measure a visible pane. Otherwise it uses the
    // fallback font scale until a later observer or category switch redraws it.
    $('results').hidden=false;$('empty').hidden=true;compared=true;
    renderDocuments();
    const added=currentChanges.filter(c=>c.added).reduce((n,c)=>n+c.words,0);
    const removed=currentChanges.filter(c=>c.removed).reduce((n,c)=>n+c.words,0);
    $('added').textContent=`${added.toLocaleString()} word${added===1?'':'s'} added`;
    $('removed').textContent=`${removed.toLocaleString()} word${removed===1?'':'s'} removed`;
    $('left-name').textContent=docs[0].name;$('right-name').textContent=docs[1].name;
    if(resetView===true)docs.forEach((_,side)=>{const root=$(side?'right':'left');root.scrollTo({top:0,left:0,behavior:'instant'});updatePageCounter(side);});
    $('next-change').disabled=!changeCount;$('previous-change').disabled=!changeCount;
    updateChangeNavigation();
    $('status').textContent='';
    if(amendmentResults.length){renderAmendments();if(reviewMode==='amendments')focusAmendment(amendmentResults[amendmentIndex],true);}
    if(hasAmendments()&&!amendmentsChecked&&!amendmentWorker)checkAmendments(false);
  };
  compareWorker.postMessage({left:comparisonTokensFor(docs[0],0).map(t=>t.value),right:comparisonTokensFor(docs[1],1).map(t=>t.value)});
}
const amendmentLabels={'implemented':'Implemented','not-implemented':'Not implemented','incorrect':'Incorrect','needs-review':'Needs review'};
function focusAmendment(result,scroll){
  document.querySelectorAll('.amendment-focus').forEach(row=>row.classList.remove('amendment-focus'));
  if(!result)return;
  const evidence=result.evidence[0];if(!evidence||!compared)return;
  docs.forEach((doc,side)=>{
    const root=$(side?'right':'left'),offset=result.digest?(side?evidence.currentAdditionRanges?.[0]?.start??evidence.differenceRanges?.[0]?.start??evidence.currentDeletionRanges?.[0]?.start??evidence.currentOffset:evidence.previousDeletionRanges?.[0]?.start??evidence.previousInsertionPoints?.[0]?.offset??evidence.previousOffset):side?(!result.insertText.trim()&&evidence.currentDeletionRanges?.length?evidence.currentDeletionRanges[0].start:evidence.currentOffset):evidence.previousOffset;
    const row=locationTarget(doc,root,offset);row?.classList.add('amendment-focus');
    if(scroll){
      const marker=side===0?Array.from(root.querySelectorAll('[data-amendment-insertion]')).find(el=>Number(el.dataset.sourceOffset)===offset):null;
      const text=Array.from(root.querySelectorAll('[data-start]')).find(el=>Number(el.dataset.start)<=offset&&Number(el.dataset.end)>offset);
      scrollInPane(root,marker||text||row);
    }
  });
}
function nextAmendment(direction=1){
  activeAmendmentIssue=null;
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
  const hasReadings=result?.readingWarnings?.length||result?.versionReadingWarnings?.length||result?.referenceReadingWarnings?.length;
  $('amendment-status').textContent=hasReadings?result.message:'';
  if(result?.readingWarnings?.length||result?.versionReadingWarnings?.length){const review=document.createElement('button');review.className='quiet';review.textContent='Review PDF Reading';review.addEventListener('click',showReadingReview);$('amendment-status').append(' ',review);}
  if(result?.referenceReadingWarnings?.length){
    const bill=result.externalReference.bill,source=externalDocs[bill],key='reference:'+bill;
    for(const page of [...new Set(result.referenceReadingWarnings.map(w=>w.page))].slice(0,10)){
      const open=document.createElement('button');open.type='button';open.className='quiet';open.textContent=`Open ${bill} source, page ${page}`;
      open.addEventListener('click',()=>{if(externalDocs[bill]!==source||!uploadedFiles.has(key)){ $('amendment-status').textContent='This source file has changed. Verify amendments again.';return;}openUploadedPdf(key,page);});$('amendment-status').append(' ',open);
    }
  }
  $('amendment-position').textContent=result?`${amendmentName(result)}${result.digest?'':` of ${amendmentResults.filter(r=>!r.digest).length}`} · ${amendmentLabels[result.status]}`:'';
  if(!result)return;
  const display=result.digest&&digestDoc?digestDisplay(digestDoc,docs[0]):amendmentsDoc?amendmentDisplays(amendmentsDoc).find(d=>d.number===(result.sourceNumber??result.number)):null;
  const card=document.createElement('div');card.className='amendment-card';
  const directive=document.createElement('p');directive.className='amendment-directive';appendAmendmentText(directive,display?.directive||{text:result.directive,strikes:[]});
  card.append(directive);
  if(result.externalReference||result.status==='needs-review'||result.evidence.some(e=>e.orderingViolation)){const note=document.createElement('p');note.className='tool-status';note.textContent=result.message;card.append(note);}
  const payload=result.referenceLoaded?{text:result.insertText,strikes:[]}:display?.payload||{text:result.insertText,strikes:[]};
  if(payload.text){
    const amendment=document.createElement('p');amendment.className='amendment-payload';
    const tokens=(payload.tokens||substantiveTokens(payload.text,docs[0].text)).filter(t=>!payload.strikes.some(r=>r.start<t.end&&r.end>t.start)),different=new Set(),focused=[];
    const canonical=value=>value.normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
    for(const [evidenceIndex,evidence] of result.evidence.entries()){
      const expected=comparisonTokens(evidence.expected).map(t=>canonical(t.value));
      const target=tokens.map(t=>canonical(t.value));
      const first=sequenceFind(expected,target);
      if(first<0)continue;
      if(activeAmendmentIssue?.i===amendmentIndex&&activeAmendmentIssue.evidenceIndex===evidenceIndex){
        for(let i=0;i<tokens.length;i++)if(i+first>=activeAmendmentIssue.expectedStart&&i+first<activeAmendmentIssue.expectedEnd)focused.push(tokens[i]);
      }
      let index=0;
      for(const part of evidence.expectedParts||[]){
        for(const token of comparisonTokens(part.text)){
          if(part.different&&index>=first&&index<first+tokens.length){
            different.add(index-first);const discrepancyIndex=(evidence.discrepancies||[]).findIndex(d=>d.expectedStart<=index&&d.expectedEnd>index);
            if(discrepancyIndex>=0)tokens[index-first].issueKey=`${amendmentIndex}:${evidenceIndex}:${discrepancyIndex}`;
          }
          index++;
        }
      }
    }
    appendAmendmentText(amendment,payload,tokens.filter((t,i)=>different.has(i)),focused);card.append(amendment);
  }
  if(activeAmendmentIssue?.i===amendmentIndex&&!card.querySelector('.current-amendment-issue')){
    const context=document.createElement('p');context.className='amendment-issue-context current-amendment-issue';
    context.textContent=activeAmendmentIssue.expectedText?`Expected: ${activeAmendmentIssue.expectedText}`:activeAmendmentIssue.actualText?`Unexpected text: ${activeAmendmentIssue.actualText}`:'Instruction needs review at this location.';card.append(context);
  }
  root.append(card);
}
function appendAmendmentText(root,styled,missing=[],focused=[]){
  const cuts=new Set([0,styled.text.length]);
  for(const range of [...styled.strikes,...(styled.additions||[]),...missing,...focused]){cuts.add(range.start);cuts.add(range.end);}
  const offsets=[...cuts].sort((a,b)=>a-b);
  for(let i=0;i<offsets.length-1;i++){
    const start=offsets[i],end=offsets[i+1],struck=styled.strikes.some(r=>r.start<=start&&r.end>=end);
    const flagged=!struck&&missing.some(r=>r.start<=start&&r.end>=end);
    const span=document.createElement(flagged?'mark':'span');span.textContent=styled.text.slice(start,end);
    if(struck){span.className='pdf-struck';span.title='Crossed out in the amendment PDF';}
    if(!struck&&styled.additions?.some(r=>r.start<=start&&r.end>=end))span.classList.add('amendment-added');
    if(flagged){span.className='amendment-missing';const issueKey=missing.find(r=>r.start<=start&&r.end>=end)?.issueKey;if(issueKey)span.dataset.issueKey=issueKey;}if(focused.some(r=>r.start<=start&&r.end>=end))span.classList.add('current-amendment-issue');root.append(span);
  }
}

function showReadingReview(){
  const list=$('reading-list');list.replaceChildren();$('reading-feedback').textContent='';
  const sources=[{side:'amendments',label:'Instructional Amendments',doc:amendmentsDoc},{side:0,label:'Previous Version',doc:docs[0]},{side:1,label:'Current Version',doc:docs[1]},{side:'digest',label:'Digest',doc:digestDoc}];
  let shown=0,total=0;
  for(const {side,label:sourceLabel,doc} of sources)for(const reading of side==='amendments'?amendmentReadingWarnings(doc):billReadingWarnings(doc)){
    total++;if(shown>=100)continue;shown++;
    const row=document.createElement('form');row.className='guide-page-navigation';
    const currentDocument=()=>side==='amendments'?amendmentsDoc:side==='digest'?digestDoc:docs[side];
    const page=document.createElement('button');page.type='button';page.className='quiet';page.textContent=`Open Page ${reading.page}`;page.addEventListener('click',()=>{if(currentDocument()!==doc){$('reading-feedback').textContent='This file has changed. Reopen PDF reading review.';return;}openUploadedPdf(side,reading.page);});
    const label=document.createElement('label');label.textContent=`${sourceLabel}${reading.number?` — Amendment ${reading.number}`:''}, page ${reading.page}: `;
    const input=document.createElement('input');input.type='text';input.value=reading.text;input.maxLength=200;input.setAttribute('aria-label',`Correct ${sourceLabel} reading ${reading.text} on page ${reading.page}`);label.append(input);
    const save=document.createElement('button');save.type='submit';save.className='quiet';save.textContent='Confirm Reading';
    row.append(page,label,save);
    if(reading.disagreement){const reason=document.createElement('span');reason.className='small-note';reason.textContent=reading.disagreement;
      const preview=text=>text.length>200?text.slice(0,200)+'…':text;
      if(reading.sourceWitness&&reading.ocrWitness)reason.textContent+=` Embedded text layer: “${preview(reading.sourceWitness.text)}”. Local pixel OCR: “${preview(reading.ocrWitness.text)}”.`;
      row.append(reason);
    }
    row.addEventListener('submit',async event=>{
      event.preventDefault();if(Object.values(loading).some(Boolean)||amendmentWorker)return;
      try{
        if(currentDocument()!==doc)throw Error('This file has changed. Reopen PDF reading review.');
        save.disabled=true;const words=await ocrWords();
        if(Object.values(loading).some(Boolean)||currentDocument()!==doc)throw Error('This file has changed. Reopen PDF reading review.');
        const updated=correctPdfReading(doc,reading,input.value,words),mode=reviewMode;
        if(side==='amendments'){amendmentsDoc=updated;invalidateAmendments();}
        else if(side==='digest'){digestPayload(updated);digestDoc=updated;invalidateAmendments();}
        else{
          const heads=updated.blocks.filter(b=>isBudgetRunningHead(updated,b));
          if(heads.length){updated.tokens=updated.tokens.filter(t=>!heads.some(b=>t.start>=b.start&&t.end<=b.end));updated.effectiveTokens=updated.effectiveTokens.filter(t=>!heads.some(b=>t.start>=b.start&&t.end<=b.end));}
          docs[side]=updated;invalidateResults();
        }
        metadata(side);showReadingReview();$('reading-feedback').textContent='Reading confirmed for this loaded file. Verification is being checked again.';
        if((side===0||side===1)&&docs.every(Boolean))runComparison();
        if(hasAmendments())checkAmendments(mode==='amendments');
      }catch(error){$('reading-feedback').textContent=error.message;}finally{save.disabled=false;}
    });list.append(row);
  }
  if(total>shown){const more=document.createElement('p');more.className='small-note';more.textContent=`Showing ${shown} of ${total} uncertain readings. Confirmed readings leave this list so the remaining readings can be reviewed. All unresolved readings remain marked for review.`;list.append(more);}
  if(!list.childElementCount)list.textContent='No uncertain readings remain.';
  if(!$('reading-dialog').open)$('reading-dialog').showModal();
}
$('reading-close').addEventListener('click',()=>$('reading-dialog').close());

function checkAmendments(selectMode=true){
  if(!docs.every(Boolean)||!hasAmendments()||Object.values(loading).some(Boolean)||amendmentWorker)return;
  if(requestReference())return;
  if(!compared && !compareWorker)runComparison();
  if(selectMode)setReviewMode('amendments');
  activeAmendmentIssue=null;otherEdits=null;amendmentsChecked=false;updateIssueNavigation();updateChangeNavigation();
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
    amendmentsChecked=true;otherEdits=data.otherEdits;amendmentResults=applyBillReadingWarnings(applyAmendmentReadingWarnings(data.results,amendmentReadingWarnings(amendmentsDoc)),docs).map(r=>r.digest?applyBillReadingWarnings([r],[null,digestDoc])[0]:r);amendmentIndex=amendmentResults.length?0:-1;updateChangeNavigation();renderAmendments();if(compared){renderDocuments();if(reviewMode==='amendments')focusAmendment(amendmentResults[amendmentIndex],true);}
  };
  const model=doc=>({name:doc.name,pages:doc.pages,text:doc.text,blocks:doc.blocks,tokens:doc.tokens,effectiveTokens:doc.effectiveTokens,struck:doc.struck,wrappedWords:doc.wrappedWords,scanQuality:doc.scanQuality});
  amendmentWorker.postMessage({text:amendmentsDoc?(amendmentsDoc.ocr?repairOcrInstructions(activeText(amendmentsDoc)):activeText(amendmentsDoc)):'',digest:digestDoc?model(digestDoc):null,previous:model(docs[0]),current:model(docs[1]),externalDocs:Object.fromEntries(Object.entries(externalDocs).map(([bill,doc])=>[bill,model(doc)]))});
}
function selectGrammar(index){
  setReviewMode('language');grammarIndex=index;
  $('add-dictionary').disabled=true;$('add-dictionary').removeAttribute('title');
  document.querySelectorAll('.current-grammar').forEach(el=>el.classList.remove('current-grammar'));
  const matches=$('right').querySelectorAll(`[data-grammar="${grammarIndex}"]`);
  matches.forEach(el=>el.classList.add('current-grammar'));scrollInPane($('right'),matches[0]);
  const issue=grammarIssues[grammarIndex];
  $('grammar-status').textContent=`Grammar issue ${grammarIndex+1} of ${grammarIssues.length} · ${issue.message} · Suggested: “${issue.suggestion}”`+(languageEngineWarning?' '+languageEngineWarning:'');
}
function issueAmendments(){return amendmentResults.flatMap((r,i)=>{
  const discrepancies=(r.evidence||[]).flatMap((e,evidenceIndex)=>(e.discrepancies||[]).map((d,index)=>({...d,r,i,evidenceIndex,key:`${i}:${evidenceIndex}:${index}`})));
  return discrepancies.length?discrepancies:r.status!=='implemented'?[{r,i,key:`${i}:review`,currentStart:r.evidence[0]?.currentOffset??0,currentEnd:r.evidence[0]?.currentOffset??0}]:[];
});}
function updateIssueNavigation(){
  const issues=issueAmendments(),enabled=amendmentsChecked&&!!issues.length;
  for(const id of ['previous-issue','next-issue','review-issues'])$(id).disabled=!enabled;
  $('issue-navigation').classList.toggle('has-issues',enabled);
  $('issue-status').textContent=!amendmentsChecked?'':issues.length?`${issues.length} amendment discrepancy/review item(s).`:'No amendment issues detected.';
}
function nextIssue(direction=1){
  const issues=issueAmendments();if(!amendmentsChecked||!issues.length||!compared)return;
  const previousIndex=amendmentIndex,sameMode=reviewMode==='amendments';
  setReviewMode('amendments');
  const selected=issues.findIndex(issue=>issue.key===activeAmendmentIssue?.key);
  const next=selected>=0?issues[(selected+direction+issues.length)%issues.length]:(direction>0?issues.find(x=>x.i>=amendmentIndex)||issues[0]:[...issues].reverse().find(x=>x.i<=amendmentIndex)||issues.at(-1));
  activeAmendmentIssue=next;amendmentIndex=next.i;
  if(!sameMode||previousIndex!==amendmentIndex){renderAmendments();renderDocuments();focusAmendment(amendmentResults[amendmentIndex],true);}
  else{
    $('amendment-results').querySelectorAll('.current-amendment-issue').forEach(el=>el.classList.remove('current-amendment-issue'));
    $('amendment-results').querySelector('.amendment-issue-context')?.remove();
    for(const el of $('amendment-results').querySelectorAll('[data-issue-key]'))if(el.dataset.issueKey===next.key)el.classList.add('current-amendment-issue');
    if(!$('amendment-results').querySelector('.current-amendment-issue')){
      const context=document.createElement('p');context.className='amendment-issue-context current-amendment-issue';context.textContent=next.expectedText?`Expected: ${next.expectedText}`:next.actualText?`Unexpected text: ${next.actualText}`:'Instruction needs review at this location.';$('amendment-results').querySelector('.amendment-card').append(context);
    }
    $('right').querySelectorAll('.current-amendment-issue').forEach(el=>el.classList.remove('current-amendment-issue'));
    for(const el of $('right').querySelectorAll('[data-start],[data-issue-offset]')){
      if(el.dataset.issueOffset!==undefined?Number(el.dataset.issueOffset)===next.currentStart:Number(el.dataset.start)<next.currentEnd&&Number(el.dataset.end)>next.currentStart)el.classList.add('current-amendment-issue');
    }
  }
  // A review warning can have a location without any discrepant text. Scroll
  // to that row without painting its unchanged wording or margin as an error.
  const target=$('right').querySelector('.current-amendment-issue')||locationTarget(docs[1],$('right'),next.currentStart);if(target)scrollInPane($('right'),target);
  scrollInPane($('amendment-results'),$('amendment-results').querySelector('.current-amendment-issue'));
  $('issue-status').textContent=`Issue ${issues.findIndex(x=>x.key===next.key)+1} of ${issues.length} · ${amendmentName(next.r)}`;
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
  $('dictionary-dialog').showModal();$('dictionary-search').focus();renderAuthority();authorityReady.then(renderAuthority);
}
function requestReference(){
  if(!amendmentsDoc)return false;
  const rule=parseAmendments(amendmentsDoc.text).find(r=>r.externalReference&&!externalDocs[r.externalReference.bill]);
  if(!rule)return false;
  referenceBill=rule.externalReference.bill;
  $('reference-description').textContent=`Amendment ${rule.number} requires ${referenceBill}${rule.externalReference.description?': '+rule.externalReference.description:''}. Upload that bill to continue.`;
  $('namereference').textContent=`Drop ${referenceBill} here`;$('metareference').textContent='or click to choose a PDF';$('errorreference').textContent='';$('continue-reference').disabled=true;
  if(!$('reference-dialog').open)$('reference-dialog').showModal();
  return true;
}
$('close-reference').addEventListener('click',()=>$('reference-dialog').close());
$('dropreference').addEventListener('click',()=>$('filereference').click());
$('filereference').addEventListener('change',event=>{const file=event.target.files[0];if(file)readFile(file,'reference');event.target.value='';});
$('dropreference').addEventListener('dragover',event=>{event.preventDefault();$('dropreference').classList.add('dragover');});
$('dropreference').addEventListener('dragleave',()=>$('dropreference').classList.remove('dragover'));
$('dropreference').addEventListener('drop',event=>{event.preventDefault();$('dropreference').classList.remove('dragover');const files=event.dataTransfer.files;if(files.length!==1){$('errorreference').textContent='Drop one referenced bill PDF at a time.';return;}readFile(files[0],'reference');});
$('continue-reference').addEventListener('click',()=>{if(loading.reference||!externalDocs[referenceBill])return;$('reference-dialog').close();if(!requestReference())checkAmendments();});
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
  if(mode==='amendments'){if(hasAmendments()&&!amendmentsChecked&&!amendmentWorker)checkAmendments();else focusAmendment(amendmentResults[amendmentIndex],true);}
  
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
  if(guide.id==='coverage')tab.setAttribute('aria-controls','coverage-panel');
  if(guide.id==='entities')tab.setAttribute('aria-controls','entity-panel');
  if(guide.id==='california-codes')tab.setAttribute('aria-controls','california-codes-panel');
  if(guide.id==='california-counties')tab.setAttribute('aria-controls','california-counties-panel');
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
$('check-spelling').addEventListener('click',()=>{if(languageChecked){setReviewMode('language');if(languageIndex>=0)selectLanguage(languageIndex);}else checkSpelling();});
$('next-spelling').addEventListener('click',()=>nextSpelling(1));
$('previous-spelling').addEventListener('click',()=>nextSpelling(-1));
$('add-dictionary').addEventListener('click',addToDictionary);
$('ignore-review').addEventListener('click',()=>{if(reviewMode==='language')ignoreLanguage(false);else if(reviewMode==='style')ignoreStyle(false);});
$('undo-ignore').addEventListener('click',()=>{
  if($('undo-ignore').disabled)return;
  const action=reviewIgnores.undo();if(!action)return;
  if(action.kind==='style'){resetStyle();checkStyle();}else checkSpelling();
  updateIgnoreControls();
});
$('ignore-all-review').addEventListener('click',()=>{if(reviewMode==='language')ignoreLanguage(true);else if(reviewMode==='style')ignoreStyle(true);});
for(const pane of [$('left'),$('right')]){
  function selectIssue(event){
    const style=event.target.closest('[data-style]');
    if(style&&reviewMode==='style'){if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;if(event.type==='keydown')event.preventDefault();selectStyle(styleIssues.findIndex(issue=>issue.id===Number(style.dataset.style)));return;}
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
export function snapshot() { return { docs: docs.map(doc => doc && ({ name: doc.name, pages: doc.pages, blocks: doc.blocks, struck:doc.struck, ocr:doc.ocr, scanQuality:doc.scanQuality, jrBoxes:doc.jrBoxes })), digestDoc:digestDoc&&({name:digestDoc.name,pages:digestDoc.pages,text:digestDoc.text,struck:digestDoc.struck,scanQuality:digestDoc.scanQuality}), amendmentsDoc:amendmentsDoc&&({text:amendmentsDoc.text,struck:amendmentsDoc.struck,scanQuality:amendmentsDoc.scanQuality,jrBoxes:amendmentsDoc.jrBoxes}), status: $('status').textContent, resultsVisible: !$('results').hidden, changeCount, changeIndex, languageCount:languageIssues.length,languageIndex,spellingCount:spellingIssues.length, spellingIndex, amendmentResults, amendmentIndex, reviewMode, styleIssues, styleCount:styleIssues.length, styleIndex, styleChecked, grammarCount:grammarIssues.length, grammarIndex, amendmentIssueCount:issueAmendments().length }; }






function renderAuthority(){
 const data=offlineAuthority,query=$('authority-search').value.toLowerCase().trim();
 $('authority-summary').textContent=data?`${data.authority} · ${data.edition} · ${data.entries.length.toLocaleString()} entries. Scope: only listed spellings; complete dictionary coverage is not certified. Source: ${data.source}. Dataset SHA-256: ${data.datasetId||'unavailable'}.`:'No imported authority installed. The bundled Merriam-Webster preference subset and LCB spelling list remain available; the complete Merriam-Webster dictionary is unavailable.';
 $('authority-feedback').textContent=authorityError;
 $('authority-import').disabled=authorityBusy;$('authority-remove').disabled=authorityBusy||!data;
 const root=$('authority-entries');root.replaceChildren();let found=0;
 for(const row of data?.entries||[]){if(query&&!row.spellings.some(s=>s.toLowerCase().includes(query))&&!row.entry.toLowerCase().includes(query))continue;found++;if(found>100)continue;const li=document.createElement('li');li.textContent=row.spellings.join(' → ')+' · '+row.entry;root.append(li);}
 $('authority-count').textContent=data?`${found.toLocaleString()} matching entries; displaying the first ${Math.min(found,100)}. First form in each row is preferred for that source entry. Other forms remain valid spellings.`:'';
}
function authorityChanged(data){offlineAuthority=data;authorityLookup=authorityIndex(data);resetStyle();resetSpelling();availability();if(compared)renderDocuments();}
$('authority-import').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;authorityBusy=true;authorityError='Importing local authority…';renderAuthority();
 try{await authorityReady;if(file.size>50*1024*1024)throw Error('Authority files must be at most 50 MB.');const bytes=await file.arrayBuffer(),data=validateAuthority(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));data.datasetId=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');const saved=await offlineAuthorityStore.save(data);authorityChanged(saved);authorityError='Installed locally. Run spelling and stylistic checks again to apply this list.';}
 catch(error){authorityError='Import failed. '+error.message+' The previous installed authority is unchanged.';}
 finally{authorityBusy=false;event.target.value='';renderAuthority();}
});
$('authority-remove').addEventListener('click',async()=>{
 authorityBusy=true;authorityError='Removing imported authority…';renderAuthority();
 try{await authorityReady;await offlineAuthorityStore.remove();authorityChanged(null);authorityError='Imported authority removed. Run checks again to use the bundled lists.';}catch(error){authorityError=error.message;}finally{authorityBusy=false;renderAuthority();}
});
$('authority-search').addEventListener('input',renderAuthority);
