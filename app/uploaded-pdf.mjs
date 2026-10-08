// Render the original uploaded PDF locally, independently of the comparison.
export function createUploadedPdfViewer(pdfjs,files){
 const $=id=>document.getElementById(id);let task=null,pdf=null,render=null,sequence=0,page=1;
 async function close(){sequence++;render?.cancel();render=null;const old=task;task=null;pdf=null;await old?.destroy().catch(()=>{});}
 async function showPage(value){
  if(!pdf)return;const selected=pdf,seq=++sequence;page=Math.max(1,Math.min(pdf.numPages,Number(value)||1));render?.cancel();
  $('uploaded-pdf-page').value=page;$('uploaded-pdf-previous').disabled=page===1;$('uploaded-pdf-next').disabled=page===pdf.numPages;
  try{const source=await selected.getPage(page);if(seq!==sequence)return;const base=source.getViewport({scale:1}),viewport=source.getViewport({scale:Math.min(1.5,900/base.width)}),canvas=$('uploaded-pdf-canvas');canvas.width=viewport.width;canvas.height=viewport.height;render=source.render({canvasContext:canvas.getContext('2d'),viewport});await render.promise;if(seq===sequence){$('uploaded-pdf-status').textContent='';source.cleanup();}}catch(e){if(seq===sequence&&e.name!=='RenderingCancelledException')$('uploaded-pdf-status').textContent='This page could not be displayed.';}
 }
 $('uploaded-pdf-close').addEventListener('click',()=>$('uploaded-pdf-dialog').close());
 $('uploaded-pdf-dialog').addEventListener('close',()=>{if(!$('uploaded-pdf-dialog').open)close();});
 $('uploaded-pdf-previous').addEventListener('click',()=>showPage(page-1));$('uploaded-pdf-next').addEventListener('click',()=>showPage(page+1));
 $('uploaded-pdf-form').addEventListener('submit',e=>{e.preventDefault();showPage($('uploaded-pdf-page').value);});
 return async side=>{
  const file=files.get(side);if(!file)return;await close();const seq=sequence;
  $('uploaded-pdf-title').textContent=file.name;$('uploaded-pdf-status').textContent='Opening PDF…';$('uploaded-pdf-canvas').width=0;$('uploaded-pdf-page-total').textContent='';$('uploaded-pdf-previous').disabled=true;$('uploaded-pdf-next').disabled=true;$('uploaded-pdf-dialog').showModal();
  try{const bytes=new Uint8Array(await file.arrayBuffer());if(seq!==sequence)return;task=pdfjs.getDocument({data:bytes,isEvalSupported:false,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href});pdf=await task.promise;if(seq!==sequence)return;$('uploaded-pdf-page-total').textContent=pdf.numPages;$('uploaded-pdf-page').max=pdf.numPages;await showPage(1);}catch(e){if(seq===sequence)$('uploaded-pdf-status').textContent='The original PDF could not be opened.';}
 };
}

