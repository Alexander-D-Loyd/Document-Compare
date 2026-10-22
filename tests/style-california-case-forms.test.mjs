import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {californiaCaseFormCandidates as forms,californiaCaseSourceRegions as regions} from '../app/style-california-case-forms.mjs';
import {makeDocument} from '../app/core.mjs';
import {californiaCitationReview} from '../app/style-california-citations.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const by=(text,section)=>forms(text).filter(c=>c.section===section);
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>({...makeDocument([text],'Current'),styleDocumentType:'opinion'}),production=doc=>californiaCitationReview(typeof doc==='string'?make(doc):doc,refs,{includeContextReview:true}).issues;

test('full citation inception-page form and absent federal court designations receive source-specific questions',()=>{
 for(const [text,section,page]of [
  ['(Alpha v. Beta (1998) 12 Cal.4th at p. 186.)','§1:1[E]',6],
  ['(Alpha v. Beta (1998) 12 F.3d 186.)','§1:33[A]',34],
  ['Alpha v. Beta (1998) 12 F.Supp. 186.','§1:34[A]–[D]',35],
  ['Alpha v. Beta (1998) 12 F.R.D. 186.','§1:34[A]–[D]',35],
  ['Alpha v. Beta (1998) 12 Fed.Cl. 186.','§1:34[A]–[D]',35],
  ['In re Alpha (1998) 12 B.R. 186.','§1:34[A]–[D]',35]
 ]){
  const [c]=by(text,section);assert.ok(c,text);assert.equal(c.page,page);assert.equal(c.suggestion,null);assert.match(c.reason,/Verify|verify/);assert.equal(c.evidenceStart,0);assert.ok(c.evidenceEnd>=c.end);assert.ok(text.slice(c.start,c.end));
 }
 for(const text of ['(Alpha v. Beta (9th Cir. 1998) 12 F.3d 186.)','Alpha v. Beta (N.D.Cal. 1998) 12 F.Supp. 186.','Alpha v. Beta (1998) 12 Cal.4th 186.','Alpha, supra, 12 Cal.4th at p. 186.'])assert.deepEqual(forms(text),[],text);
 assert.ok(by('Alpha v. Beta (1998) 12 P.2d 186.','§1:1[D]; §1:29').length);
 assert.equal(by('Alpha v. Beta (Temp. Emer. Ct. App. 1973) 12 F.2d 186.','§1:33[B]')[0].suggestion,'Temp.Emer.Ct.App.');
 assert.ok(by('(Alpha v. Beta (1998) 12 Cal.App.4th 186 Supp.)','§1:15').length);
 assert.deepEqual(by('(Alpha v. Beta (1998) 12 Cal.App.4th Supp. 186.)','§1:15'),[]);
});

test('case footnotes and appendices distinguish prose and parenthetical forms and text-note conjunctions',()=>{
 for(const [text,section,reason]of [
  ['(Alpha v. Beta (1998) 12 Cal.4th 186, 200, footnote 4.)','§1:8',/abbreviate footnote/],
  ['Alpha v. Beta (1998) 12 Cal.4th 186, 200, fn. 4.','§1:8',/spell out footnote/],
  ['(Alpha v. Beta (1998) 12 Cal.4th 186, 200 and fn. 4.)','§1:8',/ampersand/],
  ['Alpha v. Beta (1998) 12 Cal.4th 186, 200 & footnote 4.','§1:8',/Use and/],
  ['(Alpha v. Beta (1998) 12 Cal.4th 186, 200, appendix.)','§1:9',/abbreviate appendix/],
  ['Alpha v. Beta (1998) 12 Cal.4th 186, 200, appen.','§1:9',/spell out appendix/]
 ]){const [c]=by(text,section);assert.ok(c,text);assert.match(c.reason,reason);assert.equal(c.suggestion,null);assert.ok(c.evidenceStart<=text.indexOf('Alpha'));assert.ok(c.evidenceEnd>=c.end);}
 for(const text of ['(Alpha v. Beta (1998) 12 Cal.4th 186, 200, fn. 4.)','Alpha v. Beta (1998) 12 Cal.4th 186, 200 and footnote 4.','(Alpha v. Beta (1998) 12 Cal.4th 186, 200 & fn. 4.)','(Alpha v. Beta (1998) 12 Cal.4th 186, 200, appen.)','Alpha v. Beta (1998) 12 Cal.4th 186, 200, appendix.'])assert.deepEqual(forms(text),[],text);
});

test('explanatory descriptions retain separate-opinion, short-title, parallel-reporter and temporary-locator exceptions',()=>{
 for(const text of ['(Alpha v. Beta (1998) 12 Cal.4th 186 (holding that the rule applies).)','Alpha v. Beta (1998) 12 Cal.4th 186 [holding that the rule applies].']){const [c]=by(text,'§1:6');assert.ok(c,text);assert.equal(c.suggestion,null);assert.match(c.reason,/Distinguish/);}
 for(const text of ['(Alpha v. Beta (1998) 12 Cal.4th 186 [holding that the rule applies].)','Alpha v. Beta (1998) 12 Cal.4th 186 (holding that the rule applies).','(Alpha v. Beta (1998) 12 Cal.4th 186 (dis. opn. of Able, J.).)','(Alpha v. Beta (1998) 12 Cal.4th 186 (hereafter Alpha).)','(Alpha v. Beta (1998) 12 Cal.4th 186 (Alpha).)','Alpha v. Beta (1998) 12 Cal.4th 186 [12 Cal.Rptr.2d 1].','Alpha v. Beta (1998) _ Cal.4th _ [pp. 8-12].','Alpha v. Beta (1998) _ Cal.4th _ [nonpub. opn.].'])assert.deepEqual(by(text,'§1:6'),[],text);
});

test('printed state and regional reporter tables authorize only exact existing abbreviation comparisons',()=>{
 const text='(Alpha v. Beta (New York 1998) 12 N. E. 2d 186.)',found=forms(text);
 assert.ok(found.some(c=>text.slice(c.start,c.end)==='New York'&&c.suggestion==='N.Y.'&&c.section==='§1:30[A]'));
 assert.ok(found.some(c=>text.slice(c.start,c.end)==='N. E. 2d'&&c.suggestion==='N.E.2d'&&c.section==='§1:30[B]'));
 for(const [state,wanted]of [['West Virginia','W.Va.'],['North Carolina','N.C.'],['Washington','Wash.'],['Puerto Rico','P.R.'],['Rhode Island','R.I.']])assert.ok(forms('Alpha v. Beta ('+state+' 1998) 12 A.2d 186.').some(c=>c.suggestion===wanted),state);
 for(const state of ['Alaska','Hawaii','Idaho','Iowa','Ohio','Utah'])assert.deepEqual(forms('Alpha v. Beta ('+state+' 1998) 12 P.2d 186.'),[],state);
 for(const reporter of ['N.E.3d','F.4th','F.Supp.2d','F.Supp.3d','Cal.5th','Cal.Rptr.3d'])assert.ok(!forms('Alpha v. Beta (1998) 12 '+reporter+' 186.').some(c=>c.suggestion!==null),reporter+' has no source-unprinted spelling guess');
 const district='Alpha v. Beta (N. D. Cal. 1998) 12 F.Supp. 186.',d=by(district,'§1:34[A]');assert.equal(d.length,1);assert.equal(d[0].suggestion,'N.D.Cal.');assert.equal(district.slice(d[0].start,d[0].end),'N. D. Cal.');
});

test('Attorney General year placement is distinguished from ordinary case and correct year-after-page forms',()=>{
 const text='(Example Opinion (1998) 80 Ops.Cal.Atty.Gen. 203.)',[c]=by(text,'§1:23');assert.ok(c);assert.equal(c.page,25);assert.equal(c.suggestion,null);assert.equal(c.evidenceStart,0);assert.equal(c.evidenceEnd,text.length);
 for(const text of ['80 Ops.Cal.Atty.Gen. 203 (1998)','(Revocation of Parole, 80 Ops.Cal.Atty.Gen. 203, 204 (1998).)','(_ Ops.Cal.Atty.Gen. _ (Sept. 4, 1998).)','Alpha v. Beta (1998) 12 Cal.4th 186.'])assert.deepEqual(by(text,'§1:23'),[],text);
});

test('correct non-v administrative, historical and international citation forms receive bounded source owners',()=>{
 const examples=[
  'Example Company (1998) 21 ALRB No. 3',
  'Example District (1998) PERB Dec. No. 1234 [21 PERC ¶ 28099]',
  'Example v. Beta (Nov. 5, 1997) No. 97-12, FEHC Precedential Decs. 1996-1997, CEB 1, p. 2',
  'Appeal of Example (1992) 5 SBE 57 [Cal. Tax Rptr. (CCH) ¶ 402-272]',
  'Example Company (1997) 324 NLRB 992',
  'Matter of Example Association (1938) 41 C.R.C. 184',
  'Example Company (1983) 10 Cal.P.U.C.2d 773, 785',
  'Example Company (1983) Cal.P.U.C. Dec. No. 83-09-007',
  'In the Matter of Example (Review Dept. 1993) 2 Cal. State Bar Ct. Rptr. 366',
  '80 Ops.Cal.Atty.Gen. 203 (1997)',
  'Cal. Atty. Gen., Indexed Letter, No. IL 76-133 (July 21, 1976)',
  'Alpha v. Beta (N.Y. 1823) 2 Cowen 118',
  'Estate of Alpha (1890) 5 Coffey’s Prob. Dec. 286',
  'Estate of Alpha (1879) Myrick’s Prob. Rep. 232',
  'Example Case (1843) 8 Eng.Rep. 718',
  'Alpha v. Beta (1911) App.Cas. 179',
  'Alpha v. Beta (Fr. 1963) D.Jur. 555',
  'Alpha v. Beta (1992) Ont. Lexis 199, 200',
  'Alpha v. Beta, 1998 N.D. 8, ¶ 18',
  'Alpha v. Beta (S.D.N.Y. 1990) 52 Fair Empl.Prac.Cas. (BNA) 1865'
 ];
 for(const term of examples){const text='The source '+term+' applies to the 2 employees.',r=regions(text);assert.ok(r.some(r=>r.start===text.indexOf(term)&&r.end===text.indexOf(term)+term.length),term);assert.ok(r.every(r=>!r.text.includes('2 employees')),term);for(const c of r)assert.equal(c.text,text.slice(c.start,c.end));}
 assert.deepEqual(regions('Estate of Alpha (1890) 5 Coffey’s Prob. Dec. 286')[0].caseSourceFamilies,['case-california']);
 assert.deepEqual(regions('Alpha v. Beta (N.Y. 1823) 2 Cowen 118')[0].caseSourceFamilies,['case-other-state']);
 for(const text of ['The agency considered 2 employees in 1998.','The State Bar has 2 employees.','An ALRB action is pending.','NLRB is an agency.','80 Ops.Cal.Atty.Gen. 203α (1997)'])assert.deepEqual(regions(text),[],text);
});

test('shared outer citation owners merge only actual coordinate spans and keep explanatory quantities outside those spans',()=>{
 const text='(Example Company (1998) 21 ALRB No. 3; Other Company (1997) 324 NLRB 992; 2 employees.)',r=regions(text);assert.equal(r.length,1);assert.equal(r[0].start,0);assert.equal(r[0].end,text.length);assert.equal(r[0].coordinateRanges.length,2);
 const count=text.lastIndexOf('2 employees');assert.ok(r[0].coordinateRanges.every(c=>c.end<=count));assert.deepEqual(r[0].coordinateRanges.map(c=>text.slice(c.start,c.end)),['Example Company (1998) 21 ALRB No. 3','Other Company (1997) 324 NLRB 992']);
});

test('case series punctuation broadens to recognized regional authorities while same-cause qualification remains a reader decision',()=>{
 const text='(Alpha v. Beta (N.Y. 1998) 12 N.E.2d 186, Gamma v. Delta (Ohio 1997) 14 N.E.2d 200.)',[c]=by(text,'§1:7');assert.ok(c);assert.equal(c.evidenceStart,0);assert.equal(c.evidenceEnd,text.length);assert.match(c.reason,/same cause/);assert.equal(c.suggestion,null);
 assert.deepEqual(by(text.replace('186, Gamma','186; Gamma'),'§1:7'),[]);
 assert.deepEqual(by(text.slice(1,-1),'§1:7'),[],'Prose commas remain permitted.');
});

test('production case checks require every establishing original-source character and preserve literal, table and document-type protections',()=>{
 for(const text of ['(Alpha v. Beta (1998) 12 Cal.4th 186, 200, footnote 4.)','(Alpha v. Beta (New York 1998) 12 N. E. 2d 186.)','(Alpha v. Beta (N. D. Cal. 1998) 12 F.Supp. 186.)','(Example Opinion (1998) 80 Ops.Cal.Atty.Gen. 203.)','(Alpha v. Beta (1998) 12 Cal.4th 186 (holding that the rule applies).)']){
  const doc=make(text),before=JSON.stringify(doc);assert.ok(production(doc).some(i=>i.checkId==='california-citation-form'),text);assert.equal(JSON.stringify(doc),before);
  for(const field of ['struck','excluded'])for(let at=0;at<text.length;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.deepEqual(production(damaged),[],field+' '+at+' '+text);}
  assert.deepEqual(production('“'+text+'”'),[],text+' quoted');
  const bill=structuredClone(doc);bill.styleDocumentType='bill';assert.deepEqual(production(bill),[]);
  const table=structuredClone(doc);for(const b of table.blocks)b.formatting={headerGaps:[{},{}]};assert.deepEqual(production(table),[]);
 }
});

test('production non-v and historical owners protect only actual citation coordinates and keep adjacent prose quantities checkable',()=>{
 const review=doc=>reviewStyleIssues(typeof doc==='string'?make(doc):doc,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
 for(const term of ['Example Company (1998) 21 ALRB No. 3','Example Company (1997) 324 NLRB 992','80 Ops.Cal.Atty.Gen. 203 (1997)','Estate of Alpha (1890) 5 Coffey’s Prob. Dec. 286','Alpha v. Beta (N.Y. 1823) 2 Cowen 118']){
  const text='The source '+term+' applies to the 2 employees.',found=review(text),at=text.lastIndexOf('2 employees');
  assert.ok(found.some(i=>i.citationContextReview?.some(r=>r.id==='case-general')),term);
  assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>[i.start,i.suggestion]),[[at,'two']],term);
  for(const field of ['struck','excluded'])for(let p=text.indexOf(term);p<text.indexOf(term)+term.length;p++){const doc=make(text);doc[field].push({start:p,end:p+1});const result=review(doc);assert.ok(!result.some(i=>i.checkId==='numerals'&&i.start<at),field+' '+p+' '+term);}
 }
 const text='(Example Company (1998) 21 ALRB No. 3; Other Company (1997) 324 NLRB 992; 2 employees.)',at=text.lastIndexOf('2 employees'),found=review(text);assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>[i.start,i.suggestion]),[[at,'two']]);
});

test('case form source navigation retains the exact physical original passage across numbered lines',()=>{
 const text='(Alpha v. Beta (1998) 12 Cal.4th 186, 200, footnote 4.)',cut=text.indexOf('4.)'),doc={...makeDocument(['line 1 '+text.slice(0,cut),'line 2 '+text.slice(cut)],'Current'),styleDocumentType:'opinion'},found=production(doc),issue=found.find(i=>i.supplementarySource?.section==='§1:8');
 assert.ok(issue);assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.ok(issue.text.includes('line 2'));assert.match(issue.supplementarySource.reason,/footnote/);assert.ok(issue.evidenceStart<=issue.start&&issue.evidenceEnd>=issue.end);
});
