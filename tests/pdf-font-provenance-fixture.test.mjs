import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
// Install the existing same-version dependency's Node compatibility methods.
// Parsing, worker execution and font extraction below use the shipped files.
import 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjs from '../app/vendor/pdf.mjs';
import {pdfFontStyle,knownPdfRunItalic} from '../app/pdf-font-style.mjs';
import {PDF_SOURCE_FONT_OPTIONS} from '../app/pdf-source-font-options.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument} from '../app/core.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../app/vendor/pdf.worker.mjs',import.meta.url).href;
const fixture=new URL('./fixtures/pdf-font-style-source.pdf',import.meta.url);
const withoutProvenance=value=>{const copy=structuredClone(value);for(const line of copy.lines)for(const run of line.runs){delete run.italicKnown;delete run.fontStyleConflict;delete run.fontStyleProvenance;}return copy;};

test('actual PDF standard Roman Italic mixed and unknown faces retain complete physical provenance',async()=>{
 const data=new Uint8Array(await fs.readFile(fixture));
 const task=pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,...PDF_SOURCE_FONT_OPTIONS,disableFontFace:true,standardFontDataUrl:fileURLToPath(new URL('../app/vendor/standard_fonts/',import.meta.url)).replaceAll('\\','/')});
 try{
  const pdf=await task.promise;assert.equal(pdf.numPages,1);const page=await pdf.getPage(1),tc=await page.getTextContent(),operators=await page.getOperatorList();
  const styles={...tc.styles},legacy={...tc.styles},fonts=[];
  for(const key of Object.keys(styles)){const font=page.commonObjs.get(key);fonts.push(font.name);styles[key]=pdfFontStyle(styles[key],font);legacy[key]={...styles[key]};delete legacy[key].italicKnown;delete legacy[key].fontStyleConflict;delete legacy[key].fontStyleProvenance;}
  assert.ok(fonts.includes('Times-Roman'));assert.ok(fonts.includes('Times-Italic'));assert.ok(fonts.some(name=>name.includes('BitstreamVeraSans-Oblique')));
  const layout=extractPageLayout(tc.items,operators,pdfjs.OPS,styles,612),original=extractPageLayout(tc.items,operators,pdfjs.OPS,legacy,612);
  assert.deepEqual(withoutProvenance(layout),withoutProvenance(original),'The additive evidence does not change source text, physical geometry, rendering flags, quality or strike spans');
  const text=['Roman: https://example.com/path42','Italic: contact42@example.com','Mixed: https://example42.com','Unknown: unknown42@example.com','Strike: old42@example.com'];assert.equal(layout.text,text.join('\n'));
  const expected=[false,true,'mixed',null,true];
  for(let n=0;n<text.length;n++){
   const line=layout.lines[n],start=text[n].indexOf(':')+2,address=text[n].slice(start);
   for(let at=start;at<text[n].length;at++){
    const runs=line.runs.filter(r=>Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start<=at&&r.end>at);assert.equal(runs.length,1,'Every address letter, digit and punctuation has exactly one physical source run: '+n+' '+at);
    const want=expected[n]==='mixed'?at>=text[n].indexOf('example42')&&at<text[n].indexOf('.com'):expected[n];assert.equal(knownPdfRunItalic(runs[0]),want,n+' '+address+' '+at);
   }
  }
  assert.equal(layout.strikes.map(r=>layout.text.slice(r.start,r.end)).join(''),'old42@example.com');
  const doc=makeDocument([layout.text],'Current',[layout.strikes],[layout.lines]);assert.equal(doc.text,layout.text);for(let n=0;n<text.length;n++)assert.deepEqual(doc.blocks[n].formatting.runs,layout.lines[n].runs);
  assert.equal(doc.struck.map(r=>doc.text.slice(r.start,r.end)).join(''),'old42@example.com');
 }finally{await task.destroy();}
});
