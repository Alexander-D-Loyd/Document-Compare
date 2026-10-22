import test from 'node:test';
import assert from 'node:assert/strict';
import {citationRecoveryRegions,citationRecoveryCoordinates} from '../app/style-california-citation-recovery.mjs';
import {citationReviewFamilies,CALIFORNIA_CITATION_REVIEW_CATALOG} from '../app/style-california-citation-review-catalog.mjs';

test('printed abbreviations reach their actual family without requiring a word boundary after punctuation',()=>{
 const samples=[
  ['treaty','24 U.S.T. 1234; T.I.A.S. No. 1234'],['treaty','1 U.N.T.S. 123'],
  ['california-legislative','25 Cal. Law Revision Com. Rep. (1995) p. 621'],
  ['california-legislative','Ballot Pamp., Gen. Elec. (Nov. 5, 1996) analysis of Prop. 209, p. 30'],
  ['california-legislative','Cal. Legis. Analyst, Analysis of the 1998-1999 Budget Bill, p. 20'],
  ['california-legislative','Gov. Wilson, letter to Sen. Smith, Sept. 1, 1998'],
  ['federal-code','Int.Rev. Code, § 7237(c)'],['federal-code','Pub.L. No. 104-193 (Aug. 22, 1996) 110 Stat. 2105'],
  ['federal-legislative','Sen. No. 2301, 105th Cong., 2d Sess. (1998)'],['federal-legislative','Sen.Rep. No. 100-100, 2d Sess. (1988)'],
  ['federal-legislative','Sen.J.Res. No. 59, 86th Cong., 1st Sess. (1959) 73 Stat. 111'],
  ['federal-compilation','1998 U.S. Code Cong. & Admin. News, p. 2'],
  ['model-law','U. Arbitration Act, § 2 (1955)'],
  ['treatise','Cal. Civil Appellate Practice (Cont.Ed.Bar 3d ed. 1996) § 6.1, p. 123'],
  ['dictionary',"Black's Law Dict. (6th ed. 1990) p. 810"],['dictionary','17A Words and Phrases (1958) p. 63'],
  ['newspaper','Budnick, Muzzling the Campaign Watchdog, S.F. Recorder (Apr. 7, 1998) p. 1'],
  ['magazine','Gladwell, Do Parents Matter? (Aug. 17, 1998) The New Yorker, at p. 57'],
  ['miscellaneous-report','Nat. Center for State Cts., 1995 Ann. Rep., p. 6']
 ];
 for(const [id,text]of samples)assert.ok(citationReviewFamilies(text).some(r=>r.id===id),id+' '+text);
 assert.equal(CALIFORNIA_CITATION_REVIEW_CATALOG.length,40,'Source provision inventory remains unchanged.');
});

test('specific case families retain general identity pinpoint and typography tasks while jurisdiction is not invented',()=>{
 for(const [id,text]of [
  ['case-administrative','Packard v. P.T. & T. Co. (1970) 71 Cal.P.U.C. 469'],
  ['case-administrative','Gallo Vineyards, Inc. (1995) 21 ALRB No. 3'],
  ['case-administrative','Dept. Fair Empl. & Hous. v. Smith (1990) No. 90-03, FEHC Precedential Decs. 1990-1991, CEB 1, p. 26'],
  ['case-attorney-general','80 Ops. Cal. Atty. Gen. 203 (1997)'],
  ['case-state-bar','In the Matter of Smith (1997) 3 Cal. State Bar Ct. Rptr. 109'],
  ['case-other-state','Alpha v. Beta (Utah 1998) 12 P.2d 186'],
  ['case-federal-trial','Alpha v. Beta (D.Cal. 1998) 2 F.R.D. 3'],
  ['case-federal-trial','Alpha v. Beta (N.D. Cal. 1998) 2 F.R.D. 3']
 ]){const ids=citationReviewFamilies(text).map(r=>r.id);assert.ok(ids.includes(id),text);assert.ok(ids.includes('case-general'),text);if(id==='case-federal-trial')assert.ok(!ids.includes('case-california'),text);}
 for(const text of ['Sacramento Mun. Code, § 5.04.010','Int.Rev. Code, § 7237(c)','Mystery Code, § 1'])assert.ok(!citationReviewFamilies(text).some(r=>r.id==='california-code'),text);
 for(const text of ['Civil Code section 51','Civ. Code, § 51','Code of Civil Procedure section 631','Welf. & Inst. Code, § 707'])assert.ok(citationReviewFamilies(text).some(r=>r.id==='california-code'),text);
});

test('unknown sources retain their complete original bibliographic or reporter coordinates without a guessed family',()=>{
 for(const term of ['(Able, Example Book (1998) p. 2.)','(Mystery Code, § 51.)','12 ZZZ. 3','Able, Example Book (1998) p. 2']){
  const text='🦉 '+term+' applies.',found=citationRecoveryRegions(text);assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].recoveryKind,'unknown-family');assert.equal(text.slice(found[0].start,found[0].end),term);assert.equal(found[0].family,undefined);assert.equal(found[0].section,undefined);
  assert.deepEqual(citationRecoveryRegions(text,[{start:found[0].start,end:found[0].end}]),[],term+' Known complete family owns the task.');
 }
});

test('ambiguous short references remain reference-chain tasks without choosing a case book or statute',()=>{
 for(const term of ['Smith, supra, at p. 3','Smith, supra, § 3','Smith, supra','Id. at p. 2','Ibid.','(Smith, supra, p. 3.)']){
  const text='The source '+term+' applies.',found=citationRecoveryRegions(text);assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].recoveryKind,'unknown-family');assert.equal(found[0].family,undefined);
 }
});

test('oversized complete parentheses retain one whole owner despite known citation fragments',()=>{
 const term='(Civ. Code, § 51, '+('additional source context '.repeat(150))+'.)',text='Start. '+term+' End.',inner=text.indexOf('Civ. Code'),found=citationRecoveryRegions(text,[{start:inner,end:inner+16}]);
 assert.equal(found.length,1);assert.equal(found[0].text,term);assert.equal(found[0].recoveryKind,'oversized-parenthetical');assert.equal(text.slice(found[0].start,found[0].end),term);
 assert.equal(citationRecoveryRegions('('+('ordinary wording '.repeat(220))+')').length,0,'Size alone does not establish a citation.');
});

test('unbalanced original source owns inner year and reporter fragments through the paragraph boundary',()=>{
 for(const term of ['(Civ. Code, § 51','(Able, Example Book (1998) p. 2','Able, Example Book (1998 p. 2','Civ. Code, § 51.)']){
  const text=term+'\n\nThe next paragraph contains 2 employees.',found=citationRecoveryRegions(text,[{start:1,end:Math.min(15,term.length)}]);assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].recoveryKind,'unbalanced-parenthetical');assert.equal(found[0].end,term.length);
 }
 const text='(Able, Example Book (1998) p. 2';assert.equal(citationRecoveryRegions(text,[{start:20,end:26}]).length,1,'Inner year cannot settle an unclosed citation.');
});

test('ordinary prose dates parentheticals technical tokens and malformed noncitation punctuation stay outside recovery',()=>{
 for(const text of ['(There were 12 employees in 1998, and p. 2 was removed.)','(The annual meeting had 1998 attendees.)','(Time is needed.)','(The committee shall act.)','(https://example.test/1998.pdf)','There are 12 Ordinary 3 items.','(Ordinary text','Ordinary text)','The report shall be filed in 1998.'])assert.deepEqual(citationRecoveryRegions(text),[],text);
});

test('unresolved coordinates preserve reporter title date and point pages while neighboring prose numbers stay live',()=>{
 const source='🦉 (1 Able, The 3 Categories of Example Law (2d ed. 1776) p. 2, 2 employees.)',region=citationRecoveryRegions(source)[0],coordinates=citationRecoveryCoordinates(region),protectedAt=at=>coordinates.some(r=>r.start<=at&&r.end>at);
 for(const term of ['1 Able','3 Categories','1776','p. 2'])assert.ok(protectedAt(source.indexOf(term)),term);
 assert.ok(!protectedAt(source.lastIndexOf('2 employees')));
 const reporter='12 ZZZ. 3, 2 employees',unknown=citationRecoveryRegions(reporter)[0],r=citationRecoveryCoordinates(unknown);assert.ok(r.some(c=>reporter.slice(c.start,c.end)==='12 ZZZ. 3'));assert.ok(!r.some(c=>c.start<=reporter.indexOf('2 employees')&&c.end>reporter.indexOf('2 employees')));
 assert.ok(citationRecoveryRegions('(Able, Unknown Book (1660) p. 2.)').length,'Historical dates are source cues, not a current-year restriction.');
});

test('unfamiliar named chapter and verse locators remain unclassified rather than implying Bible identity',()=>{
 for(const term of ['Ecclesiastes 3:1','New Sourcebook 3:1-3:5','2 Unfamiliar Work 1:2']){const source=term+' concerns 2 employees.',found=citationRecoveryRegions(source);assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.equal(found[0].recoveryShape,'named-chapter-verse');assert.match(found[0].reason,/No Bible identity/);const coords=citationRecoveryCoordinates(found[0]);assert.ok(coords.some(r=>r.start===0&&r.end===term.length));assert.ok(!coords.some(r=>r.start<=source.indexOf('2 employees')&&r.end>source.indexOf('2 employees')));}
 for(const term of ['Ratio 3:4','Table 3:4','Section 3:4','https://example.test/Ecclesiastes3:1','LabelEcclesiastes3:1'])assert.deepEqual(citationRecoveryRegions(term),[],term);
});
