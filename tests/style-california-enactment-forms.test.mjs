import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {californiaEnactmentCandidates,californiaEnactmentSourceRegions,supportedCaliforniaLegislativeSession} from '../app/style-california-enactment-forms.mjs';
import {makeDocument} from '../app/core.mjs';import {californiaCitationReview} from '../app/style-california-citations.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>({...makeDocument([text],'Current'),styleDocumentType:'opinion'});
const cases=[
 ['(Stats., ch. 4, § 1.)','statutes-coordinate-fields'],['(Stats. 1996, § 3.)','statutes-coordinate-fields'],
 ['(Cal. Law Revision Com. com., 32 West’s Ann. Gov. Code, foll. § 845, p. 452.)','annotated-commentary-fields'],
 ['(Pen. Code, § 502.8, Deering’s Adv. Legis. Service, p. 2781.)','advance-service-fields'],
 ['(Deering’s Ann. Wat.-Uncod. Acts (1997 supp.) Act 6915, p. 275.)','uncodified-collection-reference'],
 ['(Cal. Reg. Notice Register 98, No. 24-Z.)','notice-register-fields'],['(Sen. Res. No. 1.)','california-resolution-session'],['(Assem. Const. Amend. No. 1.)','california-amendment-session'],
 ['(Ops. Cal. Legis. Counsel, No. 22732, p. 4.)','legislative-counsel-opinion-fields'],['(Ballot Pamp., Gen. Elec., text of Prop. 11, p. 2.)','ballot-pamphlet-fields'],
 ['(Pub.L. No. 104-193, 110 Stat. 2105.)','public-law-fields'],['(H.R. No. 49, § 2.)','congressional-measure-fields'],['(Sen.Rep. No. 103-88 (1993).)','congressional-report-fields'],['(H.R.Doc. No. 246 (1957).)','congressional-document-fields'],
 ['(51 Fed.Reg. 10504.)','federal-register-date'],['(Fed. Rules Civ.Proc., rule 4.)','federal-rule-title'],['(U.S. Code Cong. & Admin. News, p. 374.)','compilation-year'],['(Exec. Order No. 12832, 58 Fed.Reg. 5905.)','federal-executive-fields'],
 ['(Model Pen. Code & Commentaries, com. to § 221.1.)','model-commentary-fields'],['(ABA Com. on Prof. Ethics, opn. No. 91-359 (1991).)','aba-opinion-fields'],['(ABA Stds. for Crim. Justice, std. 15-3.4.)','aba-standard-date'],
 ['(Santa Ana Municipal Code, supra, § 10-400.)','local-enactment-supra'],['(Santa Ana Ord. number 24680.)','local-enactment-number']
];
test('observable enactment source fields have source-specific questions and retain the whole physical authority',()=>{
 for(const [text,id]of cases){const found=californiaEnactmentCandidates(text),i=found.find(i=>i.checkId===id);assert.ok(i,id);assert.equal(i.suggestion,null);assert.ok(i.section.startsWith('§2:'));assert.ok(i.page>=45&&i.page<=85);assert.ok(i.start>=0&&i.end<=text.length&&i.end>i.start);assert.equal(i.evidenceStart,0);assert.equal(i.evidenceEnd,text.length);assert.match(i.reason,/verif|Verify/u);}
});
test('printed source-form controls retain historical and source-dependent exceptions without invented fields',()=>{
 for(const text of ['(Stats. 1949, ch. 456, § 1, p. 799.)','(Stats. 1919, p. lxxxiii, § 2.)','(Cal. Reg. Notice Register 98, No. 24-Z, p. 1595.)','(Sen. Res. No. 1 (1991-1992 Reg. Sess.).)','(Sen. Const. Amend. No. 1 (1997-1998 Reg. Sess.).)','(Ops. Cal. Legis. Counsel, No. 22732 (Sept. 26, 1986) p. 4.)','(Ballot Pamp., Primary Elec. (June 2, 1998) text of Prop. 220, p. 65.)','(Pub.L. No. 104-193 (Aug. 22, 1996) 110 Stat. 2105.)','(H.R. No. 49, 105th Cong., 1st Sess., § 2, p. 1 (1997).)','(Sen.Rep. No. 103-361, 2d Sess. (1994), reprinted in 1994 U.S. Code Cong. & Admin. News, p. 3262.)','(H.R.Doc. No. 246, 85th Cong., 1st Sess., pt. 2 (1957) pp. 698-702.)','(51 Fed.Reg. 10504 (Mar. 26, 1986).)','(Fed. Rules Civ.Proc., rule 4, 28 U.S.C.)','(1991 U.S. Code Cong. & Admin. News, at pp. 374-375.)','(Exec. Order No. 12832, 58 Fed.Reg. 5905 (Jan. 19, 1993).)','(Pres. Proc. No. 6616 (Oct. 20, 1993), 3 C.F.R. 142 (1994).)','(Model Pen. Code & Commentaries, com. 2 to § 2.02, p. 235.)','(7 West’s U. Laws Ann. (1985) U. Arbitration Act, § 12, subd. (a).)','(ABA Stds. for Lawyers Who Represent Children (1996) std. G-1.)','(ABA Com. on Prof. Ethics, opn. No. 91-359 (1991) p. 4.)','(Model Pen. Code & Commentaries, supra, com. to § 221.1.)'])assert.deepEqual(californiaEnactmentCandidates(text),[],text);
});
test('California legislative session recognition distinguishes source periods without asserting actual bill identity',()=>{
 for(const text of ['(1972 Reg. Sess.)','(1971 1st Ex. Sess.)','(1993-1994 Reg. Sess.)','(2025–2026 2d Ex. Sess.)'])assert.equal(supportedCaliforniaLegislativeSession(text),true,text);
 for(const text of ['(2025 Reg. Sess.)','(1994-1995 Reg. Sess.)','(1993-1995 Reg. Sess.)','(1971-1972 Reg. Sess.)','(0197 Reg. Sess.)','(1972 Reg. Sess.) extra'])assert.equal(supportedCaliforniaLegislativeSession(text),false,text);
 for(const text of ['(Sen. Bill No. 176 (1972 Reg. Sess.) § 1.)','(Assem. Bill No. 20 (1971 1st Ex. Sess.) § 4.)'])assert.deepEqual(californiaCitationReview(make(text),refs).issues,[],text);
 assert.ok(californiaCitationReview(make('(Sen. Bill No. 176 (2025 Reg. Sess.) § 1.)'),refs).issues.some(i=>i.supplementarySource.section.includes('2:25')));
 assert.ok(californiaEnactmentCandidates('(Sen.Rep. No. 103-1993, 1st Sess.)').some(i=>i.checkId==='congressional-report-fields'&&/report year/u.test(i.reason)),'An identifier suffix is not a year field.');
 assert.ok(californiaEnactmentCandidates('(ABA Stds. for Crim. Justice, std. 15-1993.)').some(i=>i.checkId==='aba-standard-date'),'A standard coordinate is not its edition date.');
});
test('valid and incomplete prose sources expose source coordinates without absorbing nearby ordinary quantities',()=>{
 for(const text of ['Executive Order No. 12832, 58 Federal Register 5905 (Jan. 19, 1993) governs the 2 employees.','Statutes 1919, chapter 178, section 7, pages 267-268 govern the 2 employees.','Senate Joint Resolution No. 10 (1995-1996 Reg. Sess.) resolution chapter 70 concerns the 2 employees.','Rules of Professional Conduct, rule 3-110(A) governs the 2 employees.']){const rows=californiaEnactmentSourceRegions(text),at=text.lastIndexOf('2 employees');assert.ok(rows.length,text);assert.ok(rows.every(r=>r.end<=at),text);assert.ok(rows.every(r=>r.coordinateRanges.every(c=>c.start>=r.start&&c.end<=r.end&&c.end<=at&&c.end>c.start)),text);}
 const text='(Exec. Order No. 12832, 58 Fed.Reg. 5905 (Jan. 19, 1993) addresses 2 employees.)',at=text.indexOf('2 employees');assert.ok(californiaEnactmentSourceRegions(text).some(r=>r.start===0&&r.end===text.length));assert.ok(californiaEnactmentSourceRegions(text).every(r=>r.coordinateRanges.every(c=>!(c.start<=at&&c.end>at))),'Narrative inside an outer citation owner is not a coordinate range.');
});
test('production enactment questions retain original source witnesses document choice literal and table protections',()=>{
 for(const [text,id]of cases){const d=make(text),before=JSON.stringify(d),pure=californiaEnactmentCandidates(text).find(i=>i.checkId===id),found=californiaCitationReview(d,refs).issues;assert.ok(found.some(i=>i.suggestion===null&&(i.supplementarySource.section===pure.section||i.citationFormChecks?.some(c=>c.section===pure.section))),text);assert.equal(JSON.stringify(d),before);
  for(const field of ['struck','excluded'])for(let p=pure.evidenceStart;p<pure.evidenceEnd;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(californiaCitationReview(changed,refs).issues,[],field+' '+p+' '+text);}
  assert.deepEqual(californiaCitationReview(make('“'+text+'”'),refs).issues,[]);const bill=structuredClone(d);bill.styleDocumentType='bill';assert.deepEqual(californiaCitationReview(bill,refs).issues,[]);const table=structuredClone(d);for(const block of table.blocks)block.formatting={headerGaps:[{},{}]};assert.deepEqual(californiaCitationReview(table,refs).issues,[]);
 }
});
test('production source-coordinate ranges preserve neighboring ordinary prose counts and physical offsets',()=>{
 for(const text of ['Executive Order No. 12832, 58 Federal Register 5905 (Jan. 19, 1993) governs the 2 employees.','(Exec. Order No. 12832, 58 Fed.Reg. 5905 (Jan. 19, 1993) addresses 2 employees.)']){const d=make(text),at=d.text.indexOf('2 employees'),found=reviewStyleIssues(d,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(found.some(i=>i.start===at&&i.suggestion==='two'),text);assert.ok(!found.some(i=>i.checkId==='numerals'&&i.start<at),text);}
 const d=makeDocument(['(Cal. Reg. Notice Register 98,\nline 1 No. 24-Z.)'],'Current');d.styleDocumentType='cover-letter';const found=californiaCitationReview(d,refs).issues;assert.ok(found.some(i=>i.supplementarySource.section==='§2:16[B]'));assert.ok(found.every(i=>d.text.slice(i.start,i.end)===i.text));
});
