import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {californiaCitationReview} from '../app/style-california-citations.mjs';import {CALIFORNIA_CODE_CITATION_ABBREVIATIONS} from '../app/style-california-citation-families.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>({...makeDocument([t],'Current'),styleDocumentType:'opinion'}),check=d=>californiaCitationReview(typeof d==='string'?make(d):d,refs).issues;
const cases=[['(Cal. Const., art. 4, § 1.)','§2:1–2:3'],['(U.S. Const., art. 6.)','§2:1–2:3'],['(Cal. Code Regs., § 925.4.)','§2:16[A]'],['(Cal. Rules of Court, rule 8.204, subd. (a).)','§2:18'],['(42 U.S.C. § 1983, subdivision (a).)','§2:37'],['(32 C.F.R. § 581.3(c)(5).)','§2:44'],['(Sen. Bill No. 123, § 1.)','§2:25[A], [C]'],['(Rest.2d Torts, § 868, com. c.)','§3:6'],['(4 Witkin, Summary of Cal. Law (9th ed.) Real Property, § 800, p. 977.)','§3:1[A]'],['(Civ. Code, § 51, subdivision (a).)','§2:6–2:7'],['(Civ. Code, § 51(a).)','§2:7']];
test('additional citation families ask source-specific questions without inventing missing coordinates',()=>{
 for(const [text,section] of cases){const d=make(text),saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section,text);assert.equal(found[0].suggestion,null);assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.equal(found[0].evidenceStart,0);assert.equal(found[0].evidenceEnd,text.length);assert.equal(JSON.stringify(d),saved);}
});
test('all printed code abbreviations share punctuation and singular et seq checks',()=>{
 for(const code of CALIFORNIA_CODE_CITATION_ABBREVIATIONS){const text='('+code+' § 51.)',i=check(text);assert.equal(i.length,1,code);assert.equal(i[0].suggestion,', ');assert.deepEqual(check('('+code+', § 51.)'),[]);const plural=check('('+code+', §§ 51 et seq.)');assert.equal(plural.length,1,code);assert.equal(plural[0].suggestion,code+', § 51 et seq.');}
});
test('intact alternate citation structures and ordinary mentions stay quiet',()=>{
 for(const text of ['(Cal. Const., art. IV, § 1.)','(U.S. Const., 6th Amend.)','(Cal. Code Regs., tit. 14, § 925.4.)','(Cal. Rules of Court, rule 8.204(a).)','(42 U.S.C. § 1983(a).)','(32 C.F.R. § 581.3(c)(5) (1997).)','(Sen. Bill No. 123 (1993-1994 Reg. Sess.) § 1.)','(Assem. Bill No. 2 (2025-2026 1st Ex. Sess.) § 1.)','(Rest.2d Torts, § 868, com. c, p. 275.)','(Rest.2d Torts, § 868.)','(4 Witkin, Summary of Cal. Law (9th ed. 1987) Real Property, § 800, p. 977.)','(Civ. Code, § 51, subd. (a).)','(Civ. Code, §§ 51, 52 et seq.)','The California Rules of Court apply.','The annual report discusses first editions.'])assert.deepEqual(check(text),[],text);
 for(const [text]of cases){const d=make(text);d.styleDocumentType='bill';assert.deepEqual(check(d),[]);}
});
test('complete balanced evidence must survive strikes exclusions literals and physical divisions',()=>{
 for(const [text]of cases){const d=make(text);for(const field of ['struck','excluded'])for(let p=0;p<text.length;p++){const damaged=structuredClone(d);damaged[field].push({start:p,end:p+1});assert.deepEqual(check(damaged),[],field+' '+p+' '+text);}for(const enclosure of [['“','”'],["'","'"]])assert.deepEqual(check(enclosure[0]+text+enclosure[1]),[],text);}
 const physical=makeDocument(['(Cal. Code Regs.,\nline 1 § 925.4.)'],'Current');physical.styleDocumentType='cover-letter';const found=check(physical);assert.equal(found.length,1);assert.equal(found[0].text,physical.text.slice(found[0].start,found[0].end));
});
test('case series separate opinions parallel reporters and history retain their own source reasons',()=>{
 const rows=[['(Alpha v. Beta (1998) 12 Cal.4th 186, Gamma v. Delta (1997) 11 Cal.4th 100.)','§1:7'],['(Alpha v. Beta (1998) 12 Cal.4th 186 [dis. opn. of Able, J.].)','§1:10'],['(Alpha v. Beta (1998) 12 Cal.4th 186, 47 Cal.Rptr.2d 569.)','§1:1[F]'],['(Alpha v. Beta (1998) 12 Cal.4th 186, review granted Jan. 2, 1999.)','§1:11; §1:25–1:27'],['(Alpha v. Beta (1998) 12 Cal.4th 186, revd. (1999) 13 Cal.4th 100.)','§1:11; §1:25–1:27']];
 for(const [text,section]of rows){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section);assert.equal(found[0].suggestion,null);for(const field of ['struck','excluded'])for(let p=0;p<text.length;p++){const d=make(text);d[field].push({start:p,end:p+1});assert.deepEqual(check(d),[],field+' '+p+' '+text);}}
 for(const text of ['(Alpha v. Beta (1998) 12 Cal.4th 186; Gamma v. Delta (1997) 11 Cal.4th 100.)','(Alpha v. Beta (1998) 12 Cal.4th 186 (dis. opn. of Able, J.).)','(Alpha v. Beta (1998) 12 Cal.4th 186 [47 Cal.Rptr.2d 569].)','(Alpha v. Beta (1998) 12 Cal.4th 186, same cause (1999) 13 Cal.4th 100.)'])assert.deepEqual(check(text),[],text);
});
test('nonadversarial and disambiguated case titles keep reporter numbers out of ordinary count checks',()=>{
 for(const title of ['In re Marriage of Able','Adoption of Able T.','Estate of Able','Conservatorship of Able','Guardianship of Able','Matter of Able','People v. Superior Court (Able)']){
  const text=title+' (1998) 2 Cal.4th 1, 3 governs the 2 employees.',d=make(text),result=californiaCitationReview(d,refs);assert.equal(result.ranges.length,1,title);assert.deepEqual(result.issues,[]);const issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}),at=text.lastIndexOf('2');assert.ok(!issues.some(i=>i.checkId==='numerals'&&i.start<at),title);assert.ok(issues.some(i=>i.start===at&&i.suggestion==='two'),title);
 }
 assert.equal(californiaCitationReview(make('Annual Report (1998) 2 employees and 3 contractors.'),refs).ranges.length,0);
});
