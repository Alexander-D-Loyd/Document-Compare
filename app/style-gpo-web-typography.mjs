import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {knownPdfRunItalic} from './pdf-font-style.mjs';

export const GPO_WEB_TYPOGRAPHY_SCOPE='GPO 11.16 supplies conditional typography review for complete selected ASCII http/https/www addresses and conventional ASCII email addresses in the physical source document. Every selected character must have exactly one coherent known original font-run witness from the finite 12 standard Times/Helvetica/Courier faces, with at least one positively italic run. Generated or unknown font identities, OCR, conflicting metadata, missing/overlapping coverage and malformed or wrapped addresses cannot establish a finding. Complete current and original token boundaries, actual quotations, bill-local wording, names, tables, headings, strikes and unknown exclusions remain protected. A narrow technical-literal exception applies only to a freshly validated complete address and its source-font evidence. Review Suggested does not assert a violation or prescribe a text/font replacement: retain italics required for legislative additions, amendment markup or faithful source reproduction, and confirm their purpose in the original PDF. Unencoded address syntax, link identity/validity, visual font appearance, insertion-markup purpose and general page layout remain manual.';
const checkId='gpo-web-typography-review';
const message='Review Suggested: original source-font metadata identifies italic type within this address. GPO 11.16 ordinarily sets websites and email addresses in roman. Retain italics required for legislative additions, amendment markup or faithful source reproduction, and confirm their purpose in the original PDF. This finding prescribes no text or font replacement and does not verify the address or its destination.';
const overlaps=(a,start,end)=>a.start<end&&a.end>start;
const wordBoundary=/[\p{L}\p{N}\p{M}_]/u;
const label='[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
const host=new RegExp('^(?:'+label+'\\.)+[A-Za-z]{2,63}$','u');
const url=/https?:\/\/[^\s<>"“”‘’'()[\]{}]+|www\.[^\s<>"“”‘’'()[\]{}]+/giu;
const rawUri=/(?:https?:\/\/|www\.)[^\s<>"“”‘’']+/giu;
const email=/[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+/gu;
const titleHead='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)';
const titleTail=new RegExp('^\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3}'+titleHead+'(?![\\p{L}\\p{N}\\p{M}_])','u');
const creationTail=/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const beforePoint=(text,at)=>[...text.slice(Math.max(0,at-2),at)].at(-1)||'';
const atPoint=(text,at)=>[...text.slice(at,at+2)][0]||'';
function boundaries(text,start,end,kind){
 const before=beforePoint(text,start),after=atPoint(text,end);
 if(wordBoundary.test(before)||wordBoundary.test(after))return false;
 // An unencoded email local part must not expose a simpler suffix after its
 // punctuation. Only whitespace/source start or a direct enclosure opens
 // this finite email grammar, rather than every RFC local-part character.
 if(kind==='email'&&before&&!/\s/u.test(before)&&!(/[([]/u.test(before)&&(!beforePoint(text,start-1)||/[\s([{]/u.test(beforePoint(text,start-1)))))return false;
 if(/[\p{N}_.@%+\-/:\\#’'“”‘"]/u.test(before)||/[_@%+\-/:\\#’'“”‘"(]/u.test(after))return false;
 if(kind==='email'&&after==='.'&&wordBoundary.test(atPoint(text,end+1)))return false;
 return true;
}
function completeAddressTail(source,start,tail){
 if(/^[.,;!?]?$/u.test(tail))return true;
 const enclosure=/^([)\]}])([.,;!?])?$/u.exec(tail);if(!enclosure)return false;
 return beforePoint(source,start)===({')':'(',']':'[','}':'{'})[enclosure[1]];
}
function completeUriParent(source,parent,row){
 return row.kind==='url'&&row.start===parent.start&&completeAddressTail(source,parent.start,source.slice(row.end,parent.end));
}
function urlForm(text){
 if(!/^[\x21-\x7e]+$/u.test(text))return false;
 const body=text.replace(/^(?:https?:\/\/|www\.)/iu,''),slash=body.indexOf('/'),domain=slash<0?body:body.slice(0,slash),path=slash<0?'':body.slice(slash);
 return host.test(domain)&&/^(?:\/[A-Za-z0-9._~%/-]*)?$/u.test(path)&&!/%(?![A-Fa-f0-9]{2})/u.test(path);
}
function emailForm(text){
 const parts=text.split('@');if(parts.length!==2)return false;
 const [local,domain]=parts;
 return local.length<=64&&/^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_%+-])?$/u.test(local)&&!local.includes('..')&&host.test(domain);
}
// Discovery never joins address fragments. A trailing sentence mark is outside
// this selected address grammar; unencoded syntax is left for manual review.
function tokens(source){
 const rows=[],parents=[...source.matchAll(rawUri)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [pattern,kind,valid]of [[url,'url',urlForm],[email,'email',emailForm]])for(const m of source.matchAll(pattern)){
  if(/[.,;!?]{2,}$/u.test(m[0]))continue;
  const text=m[0].replace(/[.,;!?]$/u,''),start=m.index,end=start+text.length;
  const row={start,end,kind,sourceText:text};
  const emailTail=kind==='email'?/^[^\s<>"“”‘’']*/u.exec(source.slice(end))[0]:null;
  if(!text||!valid(text)||!boundaries(source,start,end,kind)||emailTail!==null&&!completeAddressTail(source,start,emailTail)||rows.some(r=>overlaps(r,start,end))||parents.some(p=>p.start<=start&&p.end>=end&&!completeUriParent(source,p,row)))continue;
  rows.push(row);
 }
 return rows.sort((a,b)=>a.start-b.start);
}
function originalLineContinuation(original,row){
 const next=/^[^\S\n]*\n(?:[^\S\n]*\n)*[^\S\n]*(\S+)/u.exec(original.slice(row.end));if(!next)return false;
 const token=next[1].replace(/[.,;!?]$/u,'');
 // This is negative physical evidence only. Never reconstruct an address
 // from these lines or infer that ordinary following prose belongs to it.
 return row.kind==='url'&&/[/-]$/u.test(row.sourceText)&&/^[A-Za-z0-9._~%/-]/u.test(token)||/^[./@%_-]/u.test(token)||/[\/@%_]/u.test(token)||/^[A-Za-z0-9._~-]+\.[A-Za-z0-9._~-]+$/u.test(token);
}
function fontProof(doc,row){
 const blocks=doc.blocks.filter(b=>overlaps(b,row.start,row.end));if(blocks.length!==1)return null;
 const b=blocks[0],runs=b.formatting?.runs;
 if(!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.text!==doc.text.slice(b.start,b.end)||!Array.isArray(runs)||!runs.length)return null;
 if(runs.some(r=>!Number.isInteger(r?.start)||!Number.isInteger(r.end)||r.start<0||r.end<r.start||r.end>b.text.length))return null;
 const selected=runs.filter(r=>b.start+r.start<row.end&&b.start+r.end>row.start).sort((a,c)=>a.start-c.start||a.end-c.end),proof=[];
 let cursor=row.start,italic=false;
 for(const run of selected){
  const start=Math.max(row.start,b.start+run.start),end=Math.min(row.end,b.start+run.end),value=knownPdfRunItalic(run);
  if(start!==cursor||end<=start||value===null)return null;
  italic||=value;cursor=end;
  proof.push({start,end,runStart:b.start+run.start,runEnd:b.start+run.end,italic:value,fontStyleProvenance:{...run.fontStyleProvenance}});
 }
 return cursor===row.end&&italic?proof:null;
}
function evidenceRows(doc,{context,protectedRanges=[]}={}){
 if(typeof doc?.text!=='string'||!Array.isArray(doc.blocks))return [];
 const ctx=context||styleContext(doc);if(typeof ctx.source!=='string'||ctx.source.length!==doc.text.length)return [];
 const originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source,originalRows=tokens(original);
 const quotes=[...ctx.literalRanges,...originalContext.literalRanges,...styleSingleQuoteRanges(ctx.source),...styleSingleQuoteRanges(original)],quoted=billQuotedTermProtection(doc,ctx),out=[];
 for(const row of tokens(ctx.source)){
  const {start,end}=row;
  if(doc.text.slice(start,end)!==row.sourceText||!originalRows.some(r=>r.start===start&&r.end===end&&r.kind===row.kind&&r.sourceText===row.sourceText)||!boundaries(doc.text,start,end,row.kind)||[start,end].some(at=>cutsOriginalStyleWord(doc,at)))continue;
  if(ctx.at(start)==='Heading'||originalContext.at(start)==='Heading'||quotes.some(r=>overlaps(r,start,end))||quoted({start,end})||protectedRanges.some(r=>overlaps(r,start,end)))continue;
  // Exempt only this independently recognized complete token. Actual quote
  // ranges and all technical-literal queries outside it retain their guards.
  const candidateContext={...ctx,literalAt:(a,b=a+1)=>ctx.literalRanges.some(r=>overlaps(r,a,b))||ctx.technicalRanges.some(r=>overlaps(r,a,b)&&(a<start||b>end))};
  if(styleEvidenceGuard(doc,candidateContext)(start,end))continue;
  const before=original.slice(0,start),after=original.slice(end);
  if(identifier.test(before)||titleTail.test(after)||/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(before)&&creationTail.test(after)||originalLineContinuation(original,row))continue;
  const fontRuns=fontProof(doc,row);if(!fontRuns)continue;
  out.push({...row,fontRuns});
 }
 return out;
}
const proof=row=>({version:1,kind:'complete-web-address-source-fonts',tokenKind:row.kind,start:row.start,end:row.end,sourceText:row.sourceText,fontRuns:row.fontRuns});
export function gpoWebTypographyIssues(doc,references,options={}){
 const page=references?.gpo?.pages?.[285];if(page?.page!==286||!page.text?.includes('11.16.'))return [];
 const ctx=options.context||styleContext(doc);
 return evidenceRows(doc,{...options,context:ctx}).map(row=>({start:row.start,end:row.end,evidenceStart:row.start,evidenceEnd:row.end,text:doc.text.slice(row.start,row.end),suggestion:null,reviewSuggested:true,confidence:'Review Suggested',reviewKind:'web-typography',guideId:'gpo',guidePage:286,guidePrintedPage:page.printedPage,rule:'11.16',category:'Address typography review',checkId,conflict:false,context:ctx.at(row.start),message,webTypographyEvidence:proof(row),references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:286,guidePrintedPage:page.printedPage,rule:'11.16',preferred:null,ruleText:'Internet websites and email addresses should be set in roman.'}]}));
}
// The shared policy may grant a narrow technical-literal exception only after
// this fresh physical-source proof. An issue flag or retained old proof alone
// never exempts an address, quote, table or removed source fragment.
export function validGpoWebTypographyFinding(doc,issue,{context}={}){
 if(issue?.checkId!==checkId||issue.guideId!=='gpo'||issue.guidePage!==286||issue.rule!=='11.16'||issue.reviewSuggested!==true||issue.suggestion!==null||issue.conflict!==false||issue.message!==message||issue.evidenceStart!==issue.start||issue.evidenceEnd!==issue.end)return false;
 if(!Array.isArray(issue.references)||issue.references.length!==1||!issue.references.every(r=>r.guideId==='gpo'&&r.guidePage===286&&r.rule==='11.16'&&r.preferred===null)||issue.text!==doc?.text?.slice(issue.start,issue.end))return false;
 const row=evidenceRows(doc,{context}).find(r=>r.start===issue.start&&r.end===issue.end);
 return !!row&&JSON.stringify(issue.webTypographyEvidence)===JSON.stringify(proof(row));
}
