import {citationParentheticals} from './style-california-citation-families.mjs';
import {proseCitationRegions,citationNumberCoordinates} from './style-california-prose-citations.mjs';
import {citationReviewFamilies} from './style-california-citation-review-catalog.mjs';
import {citationRecoveryCoordinates,citationRecoveryRegions} from './style-california-citation-recovery.mjs';

// Only observable source forms are compared here. Source identity, original
// titles/italics, first-reference status, editions and unavailable pages remain
// explicit questions; none can be supplied by a bibliography-shaped string.
const year='[12]\\d{3}',number='[A-Z]?\\d+[A-Za-z]*(?:[.:-]\\d+[A-Za-z]*)*';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const sourceNamePattern=s=>escape(s).replaceAll(' ','\\s+').replace(/[’']/gu,"[’']");
const encyclopediaForms=[['American Jurisprudence Second','Am.Jur.2d'],['American Jurisprudence','Am.Jur.'],['California Jurisprudence Third','Cal.Jur.3d'],['California Jurisprudence Second','Cal.Jur.2d'],['California Jurisprudence','Cal.Jur.'],['Corpus Juris Secundum','C.J.S.'],['Corpus Juris','C.J.']];
const annotationForms=[['American and English Annotated Cases','Am. & Eng.Ann.Cas.'],['American Annotated Cases','Ann.Cas.'],['American Decisions','Am.Dec.'],['American Law Reports, Second Series','A.L.R.2d'],['American Law Reports, Third Series','A.L.R.3d'],['American Law Reports, Fourth Series','A.L.R.4th'],['American Law Reports, Fifth Series','A.L.R.5th'],['American Law Reports, Federal Series','A.L.R.Fed.'],['American Law Reports','A.L.R.'],["Lawyers’ Reports Annotated (New Series)",'L.R.A.(N.S.)'],["Lawyers’ Reports Annotated",'L.R.A.']];
const parentheticalOnly=new Set(['treatise','encyclopedia','dictionary','restatement','citation-manual','general-work','miscellaneous-report','newspaper','magazine']);
const metadata= new RegExp('\\([^()]*\\b'+year+'\\b[^()]*\\)','u');
const titleWord='[\\p{Lu}][\\p{L}\\p{M}’\'.-]*',titleWords=titleWord+'(?:[ \\t]+(?:'+titleWord+'|and|or|of|the|on|for|to|in|under|&)){0,24}';
const bibliographyHead='(?:\\d+[A-Z]?\\s+)?'+titleWords+'(?:,\\s*'+titleWords+'){0,2}';
const dateInfo='\\([^()\\n]{0,100}(?:'+year+'|(?:\\d+(?:st|nd|rd|th|d)|rev\\.)\\s+ed\\.|CD-ROM|Cont\\.Ed\\.Bar|CJER)[^()\\n]{0,30}\\)';
const coordinateLabel='(?:§{1,2}|¶{1,2}|pp?\\.|pages?|sections?|paragraphs?|chapters?|ch\\.|columns?|cols?\\.)\\s*'+number;
const bibliographyPattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])'+bibliographyHead+'\\s*'+dateInfo+'(?:[ \\t]+[^;()\\n]{0,80}?)?\\s*'+coordinateLabel+'(?:\\s*,\\s*'+coordinateLabel+')*','gu');
const pointPages='\\d+(?:[-–]\\d+)?(?:\\s*,\\s*\\d+(?:[-–]\\d+)?(?=\\s*[,;.)\\]]|$))*';
// The reviewed source permits a physical line division immediately after /.
// Retain that division in the witness; never reconstruct or fetch the URI.
export const SECONDARY_ANGLE_URL_PATTERN='<https?:\\/\\/(?:[^\\s<>]|(?<=/)\\r?\\n[ \\t]*)+>';

export function californiaSecondarySourceRegions(source){
 const enclosed=citationParentheticals(source),found=[];
 const add=r=>{
  const owner=enclosed.find(p=>p.start<=r.start&&p.end>=r.end)||r;
  let row=found.find(p=>p.start===owner.start&&p.end===owner.end);
  if(!row){row={...owner,coordinateRanges:[...citationNumberCoordinates(owner),...citationRecoveryCoordinates(owner)]};found.push(row);}
  // This is an actual matched bibliographic prefix, not every word or number
  // before a date in an outer parenthetical containing explanatory prose.
  const date=metadata.exec(r.text);
  if(date&&source[r.start]!=='(')row.coordinateRanges.push({start:r.start,end:r.start+date.index+date[0].length,kind:'Secondary work title and edition coordinates'});
  row.coordinateRanges.push(...citationNumberCoordinates(r),...citationRecoveryCoordinates(r));
  for(const m of r.text.matchAll(new RegExp('\\b(?:columns?|cols?\\.)\\s*'+number+'(?=\\s*[,;.)\\]]|$)','gu')))row.coordinateRanges.push({start:r.start+m.index,end:r.start+m.index+m[0].length,kind:'Secondary source column locator'});
 };
 for(const r of [...enclosed,...proseCitationRegions(source,enclosed)])if(citationReviewFamilies(r.text).some(f=>f.chapter===3))add(r);
 for(const r of citationRecoveryRegions(source))if(r.recoveryKind==='unknown-family'&&(r.recoveryShape==='named-chapter-verse'||citationReviewFamilies(r.text).some(f=>f.chapter===3)))add(r);
 for(const m of source.matchAll(bibliographyPattern))add({start:m.index,end:m.index+m[0].length,text:m[0]});
 const rest=new RegExp('(?:Rest\\.(?:2d|3d)?\\s*,?\\s+|Restatement (?:Second|Third) of\\s+)[\\p{L}\\p{M}, ]+\\s*(?:\\([^()]{0,100}\\)\\s*)?,?\\s*\\(?(?:§{1,2}|sections?)\\s*'+number+'(?:\\s*,\\s*(?:com\\.|comment|illus\\.|illustration)\\s+[A-Za-z0-9]+)*(?:\\s*,\\s*(?:pp?\\.|pages?)\\s*'+number+')?','gu');
 const annotation=new RegExp('(?:Annotation|Annot\\.),?\\s*(?:[^;()\\n]{0,220})?\\('+year+'\\)\\s+\\d+\\s+(?:A\\.L\\.R\\.(?:2d|3d|4th|5th|Fed\\.)?|'+annotationForms.map(([full])=>sourceNamePattern(full)).join('|')+')\\s+(?:pp?\\.\\s*|pages?\\s+)?\\d+(?:[-–]\\d+)?','gu');
 const legalPeriodical=new RegExp(bibliographyHead+'\\s*'+dateInfo+'\\s+\\d+\\s+[\\p{Lu}][\\p{L}\\p{M}.’\'& -]{0,100}?(?:L\\.(?:Rev|J|Q|Rptr|Rep)\\.|Law Review|Law Journal|Law Reporter|Law Reports)\\s*(?:pp?\\.\\s*|pages?\\s+)?'+pointPages,'gu');
 const monthly=new RegExp(titleWords+',\\s*[^;()\\n]{0,220},\\s*(?:volume|vol\\.)\\s*'+year+',\\s*No\\.\\s*\\d+,\\s*[A-Z][\\p{L}\\p{M}.’\'& -]{0,100}?Rptr\\.\\s*\\d+','gu');
 const plays=new RegExp('(?:Shakespeare,\\s*)?'+titleWords+',\\s+act\\s+(?:[IVXLCDM]+|\\d+),\\s+scene\\s+\\d+(?:,\\s+line\\s+\\d+)?','gu');
 const bible=/\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Psalms|Proverbs|Isaiah|Matthew|Mark|Luke|John|Acts|Romans|Revelation)\s+\d+:\d+(?:[-–](?:\d+:)?\d+)?/gu;
 const media=new RegExp(titleWords+'\\s*\\([^()\\n]{0,100}(?:Film Corp\\.|Pictures|television broadcast)[^()\\n]{0,60}'+year+'\\)','gu');
 const interview=new RegExp('[A-Z][^;()\\n]{1,220}\\(interview with[^()\\n]{1,180}\\)\\s*[^;()\\n]{1,100}'+dateInfo+'\\s*(?:pp?\\.|pages?)\\s*'+number,'gu');
 const internet=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_/#@-])[A-Z][^;()\\n<>]{1,220}'+dateInfo+'[^;()\\n<>]{0,180}'+SECONDARY_ANGLE_URL_PATTERN+'(?:\\s*\\(as of[^()\\n]{1,80}\\))?','gu');
 for(const pattern of [rest,annotation,legalPeriodical,monthly,plays,bible,media,interview,internet])for(const m of source.matchAll(pattern)){
  const r={start:m.index,end:m.index+m[0].length,text:m[0]};add(r);
  // Act/scene, biblical verse and release metadata are source coordinates.
  // A following ordinary quantity is outside this matched reference.
  if([plays,bible,media,legalPeriodical,monthly].includes(pattern)){
   const owner=enclosed.find(p=>p.start<=r.start&&p.end>=r.end)||r,row=found.find(p=>p.start===owner.start&&p.end===owner.end);
   row.coordinateRanges.push({start:r.start,end:r.end,kind:'Secondary work structural locator'});
   if(pattern===bible)row.citationSourceFamilies=[...new Set([...(row.citationSourceFamilies||[]),'general-work'])];
  }
 }
 for(const row of found)row.coordinateRanges=row.coordinateRanges.filter((r,n,all)=>!all.some((p,j)=>j<n&&p.start===r.start&&p.end===r.end));
 return found.sort((a,b)=>a.start-b.start||b.end-a.end);
}

function authorityParts(region){
 const out=[];let depth=0,start=0;
 for(let p=0;p<region.text.length;p++){
  const c=region.text[p];if(c==='(')depth++;else if(c===')')depth--;
  if(c===';'&&depth<2){out.push({start:region.start+start,end:region.start+p,text:region.text.slice(start,p)});start=p+1;}
 }
 out.push({start:region.start+start,end:region.end,text:region.text.slice(start)});return out;
}

export function californiaSecondarySourceCandidates(source){
 const enclosed=citationParentheticals(source),regions=californiaSecondarySourceRegions(source),out=[];
 const add=(owner,start,end,section,page,reason,suggestion=null,allowUrlContext=false)=>{
  if(end<=start)return;
  const prior=out.find(r=>r.start===start&&r.end===end);
  if(prior){if(!prior.reason.includes(reason))prior.reason+=' '+reason;return;}
  out.push({start,end,evidenceStart:owner.start,evidenceEnd:owner.end,suggestion,section,page,reason,allowUrlContext});
 };
 const match=(owner,m,section,page,reason,suggestion=null,offset=0)=>add(owner,owner.start+offset+m.index,owner.start+offset+m.index+m[0].length,section,page,reason,suggestion);
 for(const owner of regions){
  const parenthetical=source[owner.start]==='(';
  for(const region of authorityParts(owner)){
   const text=region.text,families=new Set(citationReviewFamilies(text).map(r=>r.id)),date=metadata.exec(text),tailStart=date?date.index+date[0].length:0,tail=text.slice(tailStart);
   const listedEncyclopedia=encyclopediaForms.some(([full])=>new RegExp('\\b'+sourceNamePattern(full),'u').test(text));if(listedEncyclopedia)families.add('encyclopedia');
   const listedAnnotation=annotationForms.some(([full])=>new RegExp('\\b'+sourceNamePattern(full),'u').test(text));if(listedAnnotation)families.add('annotation');
   if(families.has('treatise')){
    const volume=/\bvol(?:ume)?\.?\s+[IVXLCDM]+(?=\s|[,;.)])/iu.exec(text);
    if(volume)match(owner,volume,'§3:1[A]',89,'Treatise volume designations use Arabic numbers. Verify that this explicitly labelled Roman token denotes the volume, rather than part of an author or title; no volume value is inferred.',null,region.start-owner.start);
    const combined=new RegExp('\\([^()]*'+year+'\\s*(?:&|and)\\s*'+year+'\\s+supp\\.\\)','u').exec(text);
    if(combined&&/\bpp?\.\s*\d/u.test(text.slice(combined.index+combined[0].length)))match(owner,combined,'§3:1[C]',92,'A combined volume-and-supplement citation is permitted for general text discussion, but not with point pages. Verify which source each page supports and use separate volume/supplement references when required; no page or authority is selected.',null,region.start-owner.start);
    if(parenthetical&&date){
     const prefix=text.slice(0,date.index),comma=prefix.indexOf(',');
     if(comma>=0){const title=prefix.slice(comma+1),titleRole=new RegExp('^\\s*'+titleWords+'\\s*$','u').test(title);for(const m of title.matchAll(/\bCalifornia\b/gu))match(owner,m,'§3:1[A]',89,'Within a parenthetical treatise title, abbreviate California as Cal. Confirm that this word belongs to the title, and verify the exact work and author separately.',titleRole?'Cal.':null,region.start-owner.start+comma+1);}
    }
    const rutter=/\b(?:Rutter Group|Practice Guide)\b/u.test(text);
    if(rutter)for(const m of text.matchAll(/\b\d+:\d+(?:\.\d+)?\s*[-–]\s*\d+:\d+(?:\.\d+)?|\bpp?\.\s*\d+-\d+(?:\.\d+)?\s*[-–]\s*\d+-\d+(?:\.\d+)?/gu))match(owner,m,'§3:1[A]',91,'Rutter paragraph and page coordinates already contain colons or hyphens; use to between range endpoints. Confirm the complete endpoints rather than splitting an internal page designation.',null,region.start-owner.start);
   }
   if(/\b(?:Cont\.\s*Ed\.\s*Bar|CJER)\b/u.test(text)){
    const missing=/\((?:Cont\.\s*Ed\.\s*Bar|CJER)\s+(?:\d+(?:st|nd|rd|th|d)|rev\.)\s+ed\.\)/u.exec(text);
    if(missing)match(owner,missing,'§3:2',94,'CEB and CJER publication citations identify the publisher and publication year in their parenthetical, with the edition when applicable. This explicit edition parenthetical has no year; verify the volume used without guessing it.',null,region.start-owner.start);
   }
   if(parenthetical&&families.has('encyclopedia'))for(const [full,short]of encyclopediaForms){
    const p=new RegExp('\\b'+sourceNamePattern(full)+'(?=\\s*\\(|\\s*,?\\s*(?:§|sections?\\b))','gu');
    for(const m of text.matchAll(p))match(owner,m,'§3:3[A]–[B]',95,'Legal encyclopedia titles are abbreviated inside parentheses; preserve the cited edition/series and verify the source independently.',short,region.start-owner.start);
   }
   if(parenthetical&&families.has('dictionary')&&date){
    for(const m of text.slice(0,date.index).matchAll(/\bDictionary\b/gu))match(owner,m,'§3:4',96,'A dictionary citation uses Dict. inside parentheses. Confirm that this word belongs to the dictionary title, rather than an author or a different type of work; no title is reconstructed.',null,region.start-owner.start);
   }
   if(/\b(?:BAJI|CALJIC)\s+No\.\s*\d/u.test(text)){
    const revision=new RegExp('\\('+year+'\\s+(?:new|rev\\.|re-rev\\.)\\)','u').exec(text);
    if(revision&&!new RegExp('^\\s*\\([^()]*\\bed\\.\\s*'+year+'\\)','u').test(text.slice(revision.index+revision[0].length))&&!/\bsupra\b/u.test(text))match(owner,revision,'§3:5',97,'When an annual instruction supplement is cited as new, revised or re-revised, identify the bound-volume edition it updates as well as the revision year. Verify whether this is the initial historical citation and which edition applies; no edition is supplied.',null,region.start-owner.start);
   }
   if(families.has('annotation')){
    if(parenthetical)for(const m of text.matchAll(/\bAnnotation(?=\s*[, (])/gu))match(owner,m,'§3:7[A]',98,'Inside parentheses, use Annot. as the annotation designation; preserve the annotation’s actual title.','Annot.',region.start-owner.start);
    for(const [full,short]of annotationForms)for(const m of text.matchAll(new RegExp('(?<=\\d\\s+)'+sourceNamePattern(full)+'(?=\\s+\\d)','gu')))match(owner,m,'§3:7[C]',100,'The reviewed source prints this annotation reporter abbreviation. This does not approve an unprinted later series or verify the annotation’s identity.',short,region.start-owner.start);
    const author=/^\s*\(?\s*(?:(?:See(?: generally| also)?|Cf\.)\s+)?[\p{Lu}][\p{L}\p{M}’'-]+,\s*(?:Annot\.|Annotation)(?![\p{L}\p{N}\p{M}_])/u.exec(text);
    if(author)match(owner,author,'§3:7[A]',99,'Annotation citations do not give an author’s name. Confirm whether this leading name is being presented as the annotation author or whether separate authorities need different boundaries; no person or title is removed.',null,region.start-owner.start);
   }
   if(families.has('law-periodical')||/\bLaw (?:Review|Journal)\b/u.test(text)){
    const location=new RegExp('\\('+year+'\\)\\s+\\d+\\s+[^;()]*','u').exec(text);
    if(location){
     for(const m of location[0].matchAll(/\bLaw (Review|Journal)(?=\s+\d)/gu))match(owner,m,'§3:8[A]',100,'Always abbreviate the periodical designation Law Review as L.Rev. and Law Journal as L.J. Verify the remaining institution/journal abbreviation separately.',m[1]==='Review'?'L.Rev.':'L.J.',region.start-owner.start+location.index);
     if(!families.has('newspaper'))for(const m of location[0].matchAll(/\b[A-Z][A-Za-z.]*\.L\.(?:Rev|J)\.(?=\s*\d)/gu))match(owner,m,'§3:8[A]',100,'Insert a space between the school or journal abbreviation and L.Rev. or L.J. Preserve every abbreviation and verify the periodical identity.',m[0].replace(/L\.(?:Rev|J)\.$/u,s=>' '+s),region.start-owner.start+location.index);
    }
    const comment=/^\s*\(?\s*(?:See\s+)?(?:Comm\.|Cmt\.)(?=\s*,)/u.exec(text);
    if(comment){const label=/\b(?:Comm\.|Cmt\.)/u.exec(comment[0]);match(owner,label,'§3:8[A]',100,'When the cited article is a Comment, spell out Comment even in parentheses; Note and Comment replace the author designation. Confirm this is a comment label rather than an institutional author abbreviation.',null,region.start-owner.start+comment.index);}
   }
   if(families.has('topical-service')&&!families.has('annotation'))for(const m of text.matchAll(/\bLaw (Reporter|Reports)(?=\s*(?:\(|,|\d))/gu))match(owner,m,'§3:9',102,'Topical service publication titles are abbreviated both in text and in parentheses. The source prints L.Rptr. for Law Reporter and L.Rep. for Law Reports; confirm the complete publication title.',m[1]==='Reporter'?'L.Rptr.':'L.Rep.',region.start-owner.start);
   if(families.has('citation-manual')){
    const edition=/\((?:\d+(?:st|nd|rd|th|d)|rev\.)\s+ed\.\)/u.exec(text);
    if(edition)match(owner,edition,'§3:10',103,'A citation manual reference identifies the edition and publication date. Verify the missing year against the manual used; no date is inferred.',null,region.start-owner.start);
   }
   if(families.has('newspaper'))for(const m of text.matchAll(/\((January|February|March|April|August|September|October|November|December)\s+\d{1,2},\s*[12]\d{3}\)/gu))match(owner,m,'§3:12',104,'Newspaper citations abbreviate the month. Verify the publication date and use the applicable printed month abbreviation; no day or year is changed.',null,region.start-owner.start);
   if(families.has('general-work')){
    const act=/\bact\s+\d+(?=\s*[,;.)])/u.exec(text);
    if(act)match(owner,act,'§3:13[G]',106,'Citations to Shakespeare or another play identify the act with Roman numerals, followed by the scene. Confirm the act against the work; no intended number is selected.',null,region.start-owner.start);
   }
   if(parenthetical&&date&&[...families].some(f=>parentheticalOnly.has(f))){
    const id=families.has('dictionary')?'3:4':families.has('encyclopedia')?'3:3[A]':families.has('restatement')?'3:6':families.has('citation-manual')?'3:10':families.has('newspaper')?'3:12':families.has('magazine')?'3:11':families.has('general-work')?'3:13':families.has('miscellaneous-report')?'3:14':'3:1[A]';
    const page={'3:4':96,'3:3[A]':95,'3:6':98,'3:10':103,'3:12':104,'3:11':103,'3:13':104,'3:14':107,'3:1[A]':89}[id];
    for(const m of tail.matchAll(new RegExp('\\b(?<label>pages?|sections?|paragraphs?|columns?)\\s+'+number+'(?:\\([A-Za-z0-9]+\\))*(?=\\s*[,;.)\\]]|$)','gu'))){
     const label=m.groups.label;if(label.startsWith('column')&&!families.has('dictionary')&&!families.has('newspaper'))continue;
     if(label.startsWith('section')&&(families.has('newspaper')||families.has('magazine')))continue;
     if(families.has('magazine')&&/\b\d+\s+JAMA\s+(?:pp?\.|pages?)\s*\d/u.test(tail)&&label.startsWith('page')){
      add(owner,region.start+tailStart+m.index,region.start+tailStart+m.index+label.length,'§3:11',103,'Professional publications use journal-like initial reporter locations without page or p., while general-interest magazines use a page label. Verify this professional-publication and initial-reference role before editing; no replacement is selected.');continue;
     }
     const suggestion=label==='page'?'p.':label==='pages'?'pp.':label==='section'?'§':label==='sections'?'§§':null;
     add(owner,region.start+tailStart+m.index,region.start+tailStart+m.index+label.length,'§'+id,page,'Inside a parenthetical citation of this source type, abbreviate this locator designation. Confirm that it labels the source coordinate rather than quoted title wording or explanatory prose.',suggestion);
    }
   }
   if(/\bCD-ROM\b/u.test(text)){
    const cd=metadata.exec(text),edition=new RegExp('\\([^()]*\\bCD-ROM\\b[^()]*'+year+'[^()]*\\)','u').exec(text);
    if(!edition&&!/\bsupra\b/u.test(text)){
     const token=/\bCD-ROM\b/u.exec(text);match(owner,token,'§3:15',108,'A CD-ROM citation identifies the publisher and issuance date in parentheses. Verify that information for the disc used; a print-volume edition or year alone does not establish it.',null,region.start-owner.start);
    }else if(cd&&edition&&new RegExp('^\\(\\s*CD-ROM\\s+(?:[A-Z][a-z]+\\.?\\s+)?'+year+'\\s*\\)$','u').test(edition[0]))match(owner,edition,'§3:15',108,'Verify the publisher of the CD-ROM as well as its issuance date. A bare disc designation and date do not identify the publisher.',null,region.start-owner.start);
   }
   if(new RegExp(SECONDARY_ANGLE_URL_PATTERN,'u').test(text)&&date){
    const url=new RegExp(SECONDARY_ANGLE_URL_PATTERN,'u').exec(text),after=text.slice(url.index+url[0].length);
    if(!/\bas of\b/u.test(after))add(owner,region.start+url.index+url[0].length-1,region.start+url.index+url[0].length,'§3:15',109,'The reviewed Internet-citation convention asks for an as of access/read date after the URL. Verify the cited version and current applicable electronic convention; no date or URL change is inferred.',null,true);
    else if(parenthetical&&/^\s*\(as of\b/u.test(after))add(owner,region.start+url.index+url[0].length,region.start+url.index+url[0].length+after.match(/^\s*\(as of\b/u)[0].length,'§3:15',109,'The reviewed Internet convention puts the as of date in brackets when the complete citation is parenthetical. Verify the access date and applicable electronic convention before changing delimiters.',null,true);
   }
  }
 }
 // Restatement dates are optional. Pages for comments/illustrations are not;
 // a page attached to another semicolon-separated authority cannot satisfy it.
 const rest=/(?:Rest\.(?:2d|3d)?\s*,?\s+|Restatement (?:Second|Third) of\s+)[\p{L}\p{M}, ]+\s*(?:\([^()]{0,100}\)\s*)?,?\s*\(?(?:§{1,2}|sections?)\s*\d+[A-Za-z]*(?:\.\d+)*(?:\s*,\s*(?:com\.|comment|illus\.|illustration)\s+[A-Za-z0-9]+)+/gu;
 for(const m of source.matchAll(rest)){
  const enclosedOwner=enclosed.find(r=>r.start<=m.index&&r.end>=m.index+m[0].length),remaining=source.slice(m.index+m[0].length),tail=/^[^;\n)]*/u.exec(remaining)[0];
  if(/\b(?:pp?\.|pages?)\s*\d/u.test(tail))continue;
  const owner=enclosedOwner||{start:m.index,end:m.index+m[0].length+tail.length};
  add(owner,m.index,m.index+m[0].length,'§3:6',98,'Restatement comments and illustrations include a page locator. Verify the complete cited comment/illustration and its page in the edition or draft used; a page from another authority does not satisfy this citation. Dates are optional for an approved Restatement, and no page is guessed.');
 }
 return out.sort((a,b)=>a.start-b.start||a.end-b.end);
}
