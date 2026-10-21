import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {styleContext} from '../app/style-context.mjs';
import {styleWordDivisionView} from '../app/style-word-divisions.mjs';
import {pdfFontStyle} from '../app/pdf-font-style.mjs';
import {PDF_SOURCE_FONT_OPTIONS} from '../app/pdf-source-font-options.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {styleFindingPolicy} from '../app/style-finding-policy.mjs';
import {gpoWebTypographyIssues,validGpoWebTypographyFinding,GPO_WEB_TYPOGRAPHY_SCOPE} from '../app/style-gpo-web-typography.mjs';

const refs=Object.fromEntries(['gpo','lcb'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const face=name=>pdfFontStyle({fontFamily:'serif'},{name});
function formatted(text,name='Times-Italic'){
 const d=makeDocument([text],'Current',[],[],new Set(['employment']));
 for(const b of d.blocks)b.formatting={runs:[{start:0,end:b.text.length,...face(name)}]};
 return d;
}
function run(input,options){
 const d=typeof input==='string'?formatted(input):input,before=JSON.stringify(d),issues=gpoWebTypographyIssues(d,refs,options);
 assert.equal(JSON.stringify(d),before);
 for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(i.rule,'11.16');assert.equal(i.guidePage,286);assert.equal(i.guidePrintedPage,'272');assert.ok(validGpoWebTypographyFinding(d,i));}
 return issues;
}

test('complete explicit web/email tokens receive conditional source-font review without a replacement',()=>{
 assert.match(refs.gpo.pages[285].text,/Internet websites and email addresses should be set in roman/u);
 assert.match(GPO_WEB_TYPOGRAPHY_SCOPE,/legislative additions/u);
 for(const token of ['https://example.org','http://example.org/path/file.pdf','www.example.org/path','https://EXAMPLE.org/a%20b','alex+legal@example.org']){
  const [i]=run('Visit '+token+'.');assert.ok(i,token);assert.equal(i.text,token);assert.match(i.message,/Retain italics required for legislative additions, amendment markup or faithful source reproduction/u);assert.match(i.message,/no text or font replacement/u);assert.match(i.message,/original PDF/u);
  assert.equal(i.webTypographyEvidence.sourceText,token);assert.equal(i.webTypographyEvidence.tokenKind,token.includes('@')?'email':'url');
 }
 for(const type of ['bill','opinion','cover-letter']){const d=formatted('Contact alex@example.org.');d.styleDocumentType=type;assert.equal(run(d).length,1,type);}
 assert.deepEqual(gpoWebTypographyIssues(formatted('Visit https://example.org.'),{}),[]);
});

test('unencoded and malformed address syntax cannot expose a supported suffix token',()=>{
 for(const text of ['Use example.org.','Visit ftp://example.org.','Use mailto:alex@example.org.','Visit https://example.org?x=1.','Visit https://user@example.org.','Visit https://example.org:8080.','Visit https://example.org/a(b).','Visit https://example.org/%zz.','Visit https://example.org...','Use a..b@example.org.','Use .alex@example.org.','Use +alex@example.org.','Use alex@example.org/path.','Use alex@-example.org.','Use alex@example.org_key.','Use éalex@example.org.','Visit éhttps://example.org.','Visit https://example.orgé.','Visit https://example.\norg.'])assert.deepEqual(run(text),[],text);
});

test('maximal original URI parents and unsupported email atoms cannot expose supported suffixes',()=>{
 const cases=[
  ['Visit https://example.org/?contact=alex@example.org.','/?contact='],
  ['Visit https://example.org?alex@example.org.','?'],
  ['Visit https://example.org/path)tail.',')'],
  ['Visit https://example.org/path]tail.',']'],
  ['Contact alex@example.org?subject=hello.','?'],
  ['Contact alex@example.org!tail.','!'],
  ['Contact alex@example.org)tail.',')'],
  ['Contact alex@example.org]tail.',']'],
  ['Contact alex@example.org$tail.','$'],
  ...['!','$','&','^','=','?','`','{','/','~','|','*'].map(mark=>['Contact a'+mark+'b@example.org.',mark])
 ];
 for(const [text,part]of cases){
  assert.deepEqual(run(text),[],text);
  for(const field of ['struck','excluded']){const d=formatted(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});assert.deepEqual(run(d),[],field+' '+text);}
  assert.equal(reviewStyleIssues(formatted(text),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='gpo-web-typography-review').length,0,text);
 }
 for(const text of ['Visit (https://example.org/path).','Visit [https://example.org/path].','Contact (alex@example.org).','Contact alex@example.org?','Contact alex@example.org!'])assert.equal(run(text).length,1,text);
});

test('original physical address continuations remain manual without joining or exposing line prefixes',()=>{
 for(const text of ['Visit https://example.org/path/\nfile.pdf.','Visit https://example.org/a-\nb.','Visit https://example.org/long\npath/file.pdf.','Contact alex@example.org\n/path.']){
  assert.deepEqual(run(text),[],text);
  assert.equal(reviewStyleIssues(formatted(text),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='gpo-web-typography-review').length,0,text);
  const at=text.indexOf('\n')+1;
  for(const field of ['struck','excluded']){const d=formatted(text);d[field].push({start:at,end:text.length-1});assert.deepEqual(run(d),[],field+' '+text);}
 }
 assert.equal(run('Visit https://example.org/path\nThe office will act.').length,1,'Ordinary independent prose does not manufacture an address continuation.');
});

test('complete coherent known font coverage is required and a mixed roman/italic address stays conditional',()=>{
 const text='Visit https://example.org.',base=formatted(text),at=text.indexOf('https'),end=text.length-1;
 assert.deepEqual(run(formatted(text,'Times-Roman')),[]);
 const mixed=structuredClone(base);mixed.blocks[0].formatting.runs=[{start:0,end:at+8,...face('Times-Roman')},{start:at+8,end:text.length,...face('Times-Italic')}];assert.equal(run(mixed).length,1);
 for(const change of [
  d=>{d.blocks[0].formatting.runs=[];},
  d=>{delete d.blocks[0].formatting.runs[0].italicKnown;},
  d=>{d.blocks[0].formatting.runs[0].fontStyleConflict=true;},
  d=>{d.blocks[0].formatting.runs[0].fontStyleProvenance.sourceFace='g_d0_f5';},
  d=>{d.blocks[0].formatting.runs[0].fontStyleProvenance.missingFile=true;},
  d=>{d.blocks[0].formatting.runs[0].fontStyleProvenance.isType3Font=true;},
  d=>{d.blocks[0].formatting.runs[0].italic=false;},
  d=>{d.blocks[0].formatting.runs=[{start:at,end:at+5,...face('Times-Italic')},{start:at+6,end,...face('Times-Italic')}];},
  d=>{d.blocks[0].formatting.runs.push({...d.blocks[0].formatting.runs[0],start:at+1,end:at+3});},
  d=>{d.blocks[0].formatting.runs[0].start=at+.5;},
  d=>{d.blocks[0].formatting.runs[0].end=text.length+1;},
  d=>{d.blocks[0].formatting.runs=[{start:0,end:at+8,...face('Times-Italic')},{start:at+8,end:text.length,italic:true,italicKnown:false,fontStyleConflict:false}];}
 ]){const d=structuredClone(base);change(d);assert.deepEqual(run(d),[]);}
});

test('fresh proof validation rejects forged flags changed source and stale font metadata',()=>{
 const base=formatted('Visit https://example.org.'),[finding]=run(base);assert.ok(validGpoWebTypographyFinding(base,finding));
 for(const change of [
  i=>{delete i.webTypographyEvidence;},i=>{i.webTypographyEvidence.fontRuns[0].italic=false;},i=>{i.webTypographyEvidence.sourceText='https://other.org';},i=>{i.evidenceStart--;},i=>{i.start++;},i=>{i.text='different';},i=>{i.suggestion='Use roman';},i=>{i.reviewSuggested=false;},i=>{i.rule='11.2';},i=>{i.references[0].preferred='roman';},i=>{i.message='Certain violation';}
 ]){const i=structuredClone(finding);change(i);assert.equal(validGpoWebTypographyFinding(base,i),false);}
 for(const change of [
  d=>{d.blocks[0].formatting.runs[0].italicKnown=false;},
  d=>{d.blocks[0].formatting.runs[0].fontStyleProvenance.italicFlag=false;},
  d=>{d.blocks[0].formatting.runs[0].start=1;},
  d=>{d.struck.push({start:finding.start,end:finding.start+1});},
  d=>{d.excluded.push({start:finding.end-1,end:finding.end});},
  d=>{d.blocks[0].formatting.headerGaps=[{},{}];},
  d=>{d.text=d.text.replace('example','changed');}
 ]){const d=structuredClone(base);change(d);assert.equal(validGpoWebTypographyFinding(d,finding),false);}
 const guessed={...finding,webTypographyEvidence:null,typographyBypass:true};assert.equal(validGpoWebTypographyFinding(base,guessed),false);
});

test('every original address character and original attached boundary remains required after masking',()=>{
 const text='Visit https://example.org/path.',base=formatted(text),[i]=run(base);
 for(const field of ['struck','excluded'])for(let at=i.start;at<i.end;at++){const d=structuredClone(base);d[field].push({start:at,end:at+1});assert.deepEqual(run(d),[],field+' '+at);}
 for(const field of ['struck','excluded'])for(const [text,part]of [['Visit éhttps://example.org.','é'],['Visit https://example.orgé.','é'],['Visit path/https://example.org.','path/'],['Use +alex@example.org.','+'],['Use alex@example.org/path.','/path']]){const d=formatted(text),at=text.indexOf(part);d[field].push({start:at,end:at+part.length});assert.deepEqual(run(d),[],field+' '+text);}
});

test('real original quotes bill-local wording names tables headings and protected roles remain protected',()=>{
 for(const token of ['https://example.org','alex@example.org']){
  for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text='Use '+open+token+close+'.';assert.deepEqual(run(text),[]);for(const field of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const d=formatted(text);d[field].push({start:at,end:at+1});assert.deepEqual(run(d),[],field+' quote');}}
  assert.deepEqual(run('The term “'+token+'” is defined. Use '+token+'.'),[]);
  for(const suffix of [' Program is established.',' West Foundation is established.',' is hereby established.',', Inc., is hereby established.']){const text='The '+token+suffix;assert.deepEqual(run(text),[],text);for(const field of ['struck','excluded']){const d=formatted(text),at=text.indexOf(suffix);d[field].push({start:at,end:text.length-1});assert.deepEqual(run(d),[],field+' name');}}
 }
 const table=formatted('Visit https://example.org.');table.blocks[0].formatting.headerGaps=[{},{}];assert.deepEqual(run(table),[]);
 assert.deepEqual(run(formatted('Visit https://example.org.\nThe people do enact as follows:')),[]);
 const protectedDoc=formatted('Visit https://example.org.'),start=protectedDoc.text.indexOf('https');assert.deepEqual(run(protectedDoc,{protectedRanges:[{start,end:start+19}]}),[]);
});

test('technical-literal exception belongs only to the complete freshly proved address',()=>{
 const d=formatted('Visit https://example.org. Other 4 reports.'),ctx=styleContext(d),[i]=run(d,{context:ctx});assert.ok(ctx.technicalAt(i.start,i.end));assert.ok(validGpoWebTypographyFinding(d,i,{context:ctx}));
 assert.equal(validGpoWebTypographyFinding(d,{...i,start:d.text.indexOf('4'),end:d.text.indexOf('4')+1,text:'4'}),false);
 const unknown=formatted('Visit https://example.org. Unrelated text.');unknown.excluded.push({start:unknown.text.indexOf('Unrelated'),end:unknown.text.indexOf('Unrelated')+9});assert.equal(run(unknown).length,1,'Unrelated uncertainty must not turn the original URL technical protection into a blanket veto.');
});

test('font witnesses stay in physical source coordinates after earlier discretionary word divisions',()=>{
 const d=formatted('The people do enact as follows:\nThe office provides employ-\nment.\nVisit https://example.org.'),view=styleWordDivisionView(d);assert.ok(view);
 const [i]=run(d);assert.ok(i);assert.equal(i.start,d.text.indexOf('https'));assert.equal(i.webTypographyEvidence.fontRuns[0].start,i.start);assert.ok(validGpoWebTypographyFinding(d,i));
 assert.equal(validGpoWebTypographyFinding(view.doc,i),false,'Physical proof cannot be replayed against length-changing normalized text.');
});

test('production requires opt-in contextual review and preserves physical offsets and independent prose checks',()=>{
 const d=formatted('The people do enact as follows:\nThe office provides employ-\nment.\nVisit https://example.org. The office files 4 reports.');assert.ok(styleWordDivisionView(d));
 const before=JSON.stringify(d),selected=options=>reviewStyleIssues(d,refs,options).filter(i=>i.checkId==='gpo-web-typography-review');
 assert.deepEqual(selected(),[]);assert.deepEqual(selected({includeReviewSuggestions:false}),[]);
 const [i]=selected({includeReviewSuggestions:true});assert.ok(i);assert.equal(i.start,d.text.indexOf('https'));assert.equal(i.text,'https://example.org');assert.ok(validGpoWebTypographyFinding(d,i));assert.equal(i.references[0].sourcePassage.text,'11.16. Internet websites and email addresses should be set in roman.');
 const all=reviewStyleIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(i=>i.text==='4'&&i.suggestion==='four'));assert.equal(JSON.stringify(d),before);
 for(const text of ['The term “https://example.org” is defined. Visit https://example.org.','The https://example.org Program is established.','The text is “https://example.org”.'])assert.equal(reviewStyleIssues(formatted(text),refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='gpo-web-typography-review').length,0,text);
});

test('shared policy admits only fresh complete typography proof without opening ordinary technical findings',()=>{
 const base=formatted('Visit https://example.org.'),[i]=run(base),ctx=styleContext(base),policy=styleFindingPolicy(base,{context:ctx});
 assert.equal(policy(i),true);assert.equal(policy({...i,checkId:'contractions',webTypographyEvidence:undefined,typographyBypass:true}),false);
 assert.equal(policy({...i,webTypographyEvidence:undefined,typographyBypass:true}),false);
 assert.equal(policy({...i,suggestion:'replacement'}),false);
 assert.equal(policy({...i,webTypographyEvidence:{...i.webTypographyEvidence,sourceText:'different'}}),false);
 for(const change of [
  d=>{d.blocks[0].formatting.runs[0].italicKnown=false;},
  d=>{d.blocks[0].formatting.runs[0].fontStyleProvenance.sourceFace='Helvetica';},
  d=>{d.blocks[0].formatting.runs.push({...d.blocks[0].formatting.runs[0]});},
  d=>{d.struck.push({start:i.start,end:i.start+1});},
  d=>{d.excluded.push({start:i.end-1,end:i.end});},
  d=>{d.blocks[0].formatting.headerGaps=[{},{}];},
  d=>{d.text='"'+d.text.slice(1,-1)+'"';d.blocks[0].text=d.text;}
 ]){const d=structuredClone(base);change(d);assert.equal(styleFindingPolicy(d,{context:styleContext(d)})(i),false);}
 const names=[{start:i.start,end:i.end}];assert.equal(styleFindingPolicy(base,{context:ctx,names})(i),false);
});

test('actual producer PDF yields only the italic email and partially italic URL through production review',async()=>{
 // Node compatibility methods come from the existing same-version dependency;
 // actual parsing, worker execution and font extraction use shipped PDF.js.
 await import('pdfjs-dist/legacy/build/pdf.mjs');
 const pdfjs=await import('../app/vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../app/vendor/pdf.worker.mjs',import.meta.url).href;
 const data=new Uint8Array(fs.readFileSync(new URL('./fixtures/pdf-font-style-source.pdf',import.meta.url))),task=pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,...PDF_SOURCE_FONT_OPTIONS,disableFontFace:true,standardFontDataUrl:fileURLToPath(new URL('../app/vendor/standard_fonts/',import.meta.url)).replaceAll('\\','/')});
 try{
  const pdf=await task.promise,page=await pdf.getPage(1),tc=await page.getTextContent(),operators=await page.getOperatorList(),styles={...tc.styles};
  for(const key of Object.keys(styles))styles[key]=pdfFontStyle(styles[key],page.commonObjs.get(key));
  const layout=extractPageLayout(tc.items,operators,pdfjs.OPS,styles,612),d=makeDocument([layout.text],'Current',[layout.strikes],[layout.lines]),before=JSON.stringify(d);
  assert.deepEqual(run(d).map(i=>i.text),['contact42@example.com','https://example42.com']);
  const all=reviewStyleIssues(d,refs,{includeReviewSuggestions:true}),issues=all.filter(i=>i.checkId==='gpo-web-typography-review');assert.deepEqual(issues.map(i=>i.text),['contact42@example.com','https://example42.com']);
  for(const i of issues){assert.ok(validGpoWebTypographyFinding(d,i));assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.references[0].sourcePassage.text,'11.16. Internet websites and email addresses should be set in roman.');}
  assert.equal(issues[1].webTypographyEvidence.fontRuns.length,3,'The whole mixed address retains all original Roman/Italic/Roman spans.');
  assert.equal(reviewStyleIssues(d,refs).filter(i=>i.checkId==='gpo-web-typography-review').length,0);
  assert.equal(JSON.stringify(d),before);
 }finally{await task.destroy();}
});
