import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {californiaCitationReview} from '../app/style-california-citations.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {californiaSecondarySourceCandidates as candidates,californiaSecondarySourceRegions as regions} from '../app/style-california-secondary-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>({...makeDocument([text],'Current'),styleDocumentType:'opinion'});
const cases=[
 ['(vol. IV Witkin, Summary of Cal. Law (9th ed. 1987) § 800.)','§3:1[A]','vol. IV'],
 ['(4 Witkin, Summary of California Law (9th ed. 1987) § 800.)','§3:1[A]','California'],
 ['(4 Witkin, Summary of Cal. Law (9th ed. 1987) section 800, page 977.)','§3:1[A]','section'],
 ['(2 Witkin, Cal. Procedure (4th ed. 1996 & 1999 supp.) § 342, p. 411.)','§3:1[C]','(4th ed. 1996 & 1999 supp.)'],
 ['(Weil & Brown, Cal. Practice Guide (The Rutter Group 1997) ¶ 8:15–8:18.)','§3:1[A]','8:15–8:18'],
 ['(Cal. Tort Guide (Cont.Ed.Bar 3d ed.) § 3.2.)','§3:2','(Cont.Ed.Bar 3d ed.)'],
 ['(5 California Jurisprudence Third (1993) Contracts, § 2.)','§3:3[A]–[B]','California Jurisprudence Third'],
 ['(Oxford English Dictionary (2d ed. 1989) page 556, column 2.)','§3:4','Dictionary'],
 ['(CALJIC No. 2.27 (1997 rev.).)','§3:5','(1997 rev.)'],
 ['(Rest., Contracts, § 342, com. a; 4 Witkin, Cal. Procedure (1998) § 2, p. 10.)','§3:6','Rest., Contracts, § 342, com. a'],
 ['Restatement Second of Torts, section 868, comment c applies.','§3:6','Restatement Second of Torts, section 868, comment c'],
 ['(Rest.2d Torts (1965), § 868, comment c.)','§3:6','Rest.2d Torts (1965), § 868, comment c'],
 ['(Annotation, Example (1998) 19 A.L.R.5th 439.)','§3:7[A]','Annotation'],
 ['(Smith, Annot., Example (1998) 19 A.L.R.5th 439.)','§3:7[A]','(Smith, Annot.'],
 ['(Annot., Example (1998) 19 American Law Reports, Fifth Series 439.)','§3:7[C]','American Law Reports, Fifth Series'],
 ['(Able, Example (1998) 12 Harvard Law Review 100.)','§3:8[A]','Law Review'],
 ['(Able, Example (1998) 12 Harv.L.Rev.100.)','§3:8[A]','Harv.L.Rev.'],
 ['(Comm., Example (1998) 12 Harv. L.Rev. 100.)','§3:8[A]','Comm.'],
 ['(Able, Example (1998) 12 Alpha Law Reporter 100.)','§3:9','Law Reporter'],
 ['(Cal. Style Manual (4th ed.) § 1:1.)','§3:10','(4th ed.)'],
 ['(Able, Example, Time (1998) page 2.)','§3:11','page'],
 ['(Able, Example (1998) 274 JAMA page 952.)','§3:11','page'],
 ['(Able, Example, L.A. Times (January 2, 1998) page A2.)','§3:12','(January 2, 1998)'],
 ['(Shakespeare, Hamlet, act 3, scene 2.)','§3:13[G]','act 3'],
 ['(Able, Report (1998) page 2.)','§3:14','page'],
 ['(Cal. Trial Practice (CD-ROM Apr. 1998) § 1.9.)','§3:15','(CD-ROM Apr. 1998)'],
 ['(Cal. Trial Practice (Publisher CD-ROM) § 1.9.)','§3:15','CD-ROM'],
 ['(Able, Example Report (1998) <https://example.test/report>.)','§3:15','>'],
 ['(Able, Example Report (1998) <https://example.test/report> (as of Jan. 2, 1999).)','§3:15',' (as of']
];

test('observable secondary source conditions retain exact source provisions selections and whole source evidence',()=>{
 for(const [text,section,selection]of cases){const found=candidates(text),i=found.find(i=>i.section===section&&text.slice(i.start,i.end)===selection);assert.ok(i,text+' '+selection);assert.ok(i.evidenceStart<=i.start&&i.evidenceEnd>=i.end);assert.ok(i.reason);assert.ok(i.suggestion===null||typeof i.suggestion==='string');}
 const roman=candidates(cases[0][0])[0];assert.equal(roman.suggestion,null);
 const oldSeries=candidates('(Annot., Example (1998) 19 American Law Reports, Sixth Series 439.)');assert.ok(!oldSeries.some(i=>i.section==='§3:7[C]'),'An unprinted later series does not inherit a made-up abbreviation.');
 assert.ok(!candidates(cases[14][0]).some(i=>i.section==='§3:9'),'American Law Reports is an annotation reporter, not a generic topical Law Reports title.');
});

test('valid source patterns preserve optional dates pages revisions and legal source title distinctions',()=>{
 for(const text of [
  '(4 Witkin, Summary of Cal. Law (9th ed. 1987) § 800, p. 977.)',
  '(See 3 Witkin & Epstein, Cal. Criminal Law (2d ed. 1989 & 1998 supp.) § 1418.)',
  '(Weil & Brown, Cal. Practice Guide (The Rutter Group 1997) ¶¶ 8:15 to 8:18, pp. 8-4 to 8-6.)',
  '(Cal. Tort Guide (Cont.Ed.Bar 3d ed. 1996) Animals, § 3.2, p. 67.)',
  '(5 Cal.Jur.3d (1993) Contracts, § 2.)','(2 Blackstone, Commentaries 296.)',
  '(Oxford English Dict. (2d ed. 1989) p. 556, col. 2.)',
  '(BAJI No. 7.70 (1992 re-rev.) (7th ed. 1986).)','(CALJIC No. 2.27 (6th ed. 1997).)',
  '(Rest., Contracts, § 342, com. a, p. 561.)','(Rest.2d Torts, § 868.)',
  'Restatement Second of Torts, section 868, comment c, page 275 applies.',
  '(Annot., Example (1998) 19 A.L.R.5th 439.)',
  '(Able, Example (1998) 12 Harv. L.Rev. 100.)','(Comment, Example (1998) 12 Harv. L.Rev. 100.)',
  '(Able, supra, 12 Harv. L.Rev. at p. 100.)',
  '(Able, Example (1998) 12 Alpha L.Rptr. 100.)','(Cal. Style Manual (4th ed. 2000) § 1:1.)',
  '(Able, Example, Time (1998) p. 2.)','(Able, Example, Nat.L.J. (Jan. 2, 1998) p. A2.)',
  '(Shakespeare, Hamlet, act III, scene 2.)','(Leviticus 19:33-19:34.)',
  '(Able, Report (1998) p. 2.)','(Cal. Trial Practice (Publisher CD-ROM Apr. 1998) § 1.9.)',
  '(Able, Example (1998) 274 JAMA 952.)',
  '(4 Witkin, Summary of Cal. Law (9th ed. 1987) § 2, p. 2, page 3 of this document disagrees.)',
  '(Able, Example Report (1998) <https://example.test/report> [as of Jan. 2, 1999].)'
 ])assert.deepEqual(candidates(text),[],text);
});

test('both rendered source abbreviation tables retain every printed series without inheriting new ones',()=>{
 const encyclopedias=[['American Jurisprudence','Am.Jur.'],['American Jurisprudence Second','Am.Jur.2d'],['California Jurisprudence','Cal.Jur.'],['California Jurisprudence Second','Cal.Jur.2d'],['California Jurisprudence Third','Cal.Jur.3d'],['Corpus Juris','C.J.'],['Corpus Juris Secundum','C.J.S.']];
 const reporters=[['American and English Annotated Cases','Am. & Eng.Ann.Cas.'],['American Annotated Cases','Ann.Cas.'],['American Decisions','Am.Dec.'],['American Law Reports','A.L.R.'],['American Law Reports, Second Series','A.L.R.2d'],['American Law Reports, Third Series','A.L.R.3d'],['American Law Reports, Fourth Series','A.L.R.4th'],['American Law Reports, Fifth Series','A.L.R.5th'],['American Law Reports, Federal Series','A.L.R.Fed.'],["Lawyers' Reports Annotated",'L.R.A.'],["Lawyers' Reports Annotated (New Series)",'L.R.A.(N.S.)']];
 for(const [title,short]of encyclopedias){const source='(5 '+title+' (1993) Contracts, § 2.)';assert.ok(candidates(source).some(i=>i.suggestion===short),title);}
 for(const [title,short]of reporters){const source='(Annot., Example (1998) 19 '+title+' 439.)';assert.ok(candidates(source).some(i=>i.suggestion===short),title);}
 const divided='(5 California\nJurisprudence Third (1993) Contracts, § 2.)';assert.ok(candidates(divided).some(i=>i.suggestion==='Cal.Jur.3d'));
 const d=makeDocument(['(5 California\nline 1 Jurisprudence Third (1993) Contracts, § 2.)'],'Current');d.styleDocumentType='cover-letter';const found=californiaCitationReview(d,refs).issues.find(i=>i.suggestion==='Cal.Jur.3d');assert.ok(found);assert.equal(d.text.slice(found.start,found.end),found.text);
});

test('valid prose sources receive intact bounded regions and coordinates without swallowing subsequent prose counts',()=>{
 const works=[
  '1 Witkin, California Criminal Law (2d ed. 1988) section 13, page 17',
  'California Conservatorships and Guardianships (Cont.Ed.Bar 1990) sections 15.88, pages 872',
  'Oxford English Dictionary (2d ed. 1989) page 556',
  'Annotation, Example (1998) 19 A.L.R.5th 439',
  'Able, Example (1998) 12 Harv. L.Rev. 100',
  'Cal. Style Manual (4th ed. 2000) section 1:1',
  'Restatement Second of Trusts, section 100',
  'Shakespeare, Hamlet, act III, scene 2',
  'Leviticus 19:33-19:34',
  'Platoon (Hemdale Film Corp. 1986)'
 ];
 for(const term of works){const source='🦉 '+term+' concerns 2 employees.',found=regions(source),r=found.find(r=>r.start<=source.indexOf(term)&&r.end>=source.indexOf(term)+term.length);assert.ok(r,term);assert.equal(source.slice(r.start,r.end),r.text);assert.ok(r.coordinateRanges.every(c=>c.start>=r.start&&c.end<=r.end),term+' Physical coordinates stay inside their owner.');assert.ok(!r.coordinateRanges.some(c=>c.start<=source.indexOf('2 employees')&&c.end>source.indexOf('2 employees')),term);}
 const source='(2 employees discuss 4 Witkin, The 3 Categories of Cal. Law (9th ed. 1987) § 800, p. 2, 2 employees.)',r=regions(source)[0];assert.ok(r);for(const at of [source.indexOf('2 employees'),source.lastIndexOf('2 employees')])assert.ok(!r.coordinateRanges.some(c=>c.start<=at&&c.end>at),'Explanatory quantities remain checkable.');
});

test('production secondary form findings preserve every original owner character and never edit literal URLs',()=>{
 const sample=cases.filter(([t])=>!t.includes('https:')).map(([t])=>t);
 for(const text of sample){const d=make(text),before=JSON.stringify(d),base=californiaCitationReview(d,refs).issues;assert.ok(base.length,text+' Production integration is required.');for(const i of base){assert.equal(i.text,d.text.slice(i.start,i.end));assert.ok(i.suggestion===null||!i.suggestion.includes('1999'),'No missing date is invented.');}
  const owner=regions(text).find(r=>r.start<=base[0].start&&r.end>=base[0].end);assert.ok(owner,text);
  for(const field of ['struck','excluded'])for(let p=owner.start;p<owner.end;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(californiaCitationReview(changed,refs).issues,[],field+' '+p+' '+text);}
  const bill=structuredClone(d);bill.styleDocumentType='bill';assert.deepEqual(californiaCitationReview(bill,refs).issues,[]);assert.deepEqual(californiaCitationReview(make('“'+text+'”'),refs).issues,[]);assert.equal(JSON.stringify(d),before);
 }
 for(const [text]of cases.filter(([t])=>t.includes('https:'))){const d=make(text),found=californiaCitationReview(d,refs).issues;assert.ok(found.some(i=>i.supplementarySource.section==='§3:15'));assert.ok(found.every(i=>i.suggestion===null||!i.text.includes('https:')));for(const field of ['struck','excluded'])for(let p=0;p<text.length;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(californiaCitationReview(changed,refs).issues,[],field+' '+p+' '+text);}}
});

test('printed topical interview and electronic prose sources retain full owners including slash-divided URLs',()=>{
 const samples=[
  ['Eastman, Correcting the Ten Most Common Misconceptions About CEQA (Cont.Ed.Bar 1998) 21 Real Prop. L.Rptr. 97','topical-service'],
  ['Suarez, From the Jaws of Defeat: Miranda After Peevy, volume 1998, No. 7, Cal. Crim. Defense Prac. Rptr. 406','topical-service'],
  ['Military Spendings: Impact on Business (interview with David Packard, Deputy Sect. of Defense) U.S. News & World Report (Aug. 3, 1970) page 44','general-work'],
  ['Fenigstein & Kaufman, Trade Wind: The Arrival of Online Securities Offerings (June 1996) Institute for Cyberspace Law and Policy <https://example.test/te.html> (as of June 18, 1996)','electronic-source'],
  ['(Alden, Editorial Opinion (May 3, 1998) <https://example.test/\nNews/1371editorial.htm> [as of Sept. 21, 1998].)','electronic-source']
 ];
 for(const [term,family]of samples){const d=make(term),found=californiaCitationReview(d,refs,{includeContextReview:true}).issues;assert.equal(found.length,1,term);assert.equal(found[0].text,term);assert.ok(found[0].citationContextReview.some(f=>f.id===family),term);assert.equal(found[0].suggestion,null);for(const field of ['struck','excluded'])for(let p=0;p<term.length;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(californiaCitationReview(changed,refs,{includeContextReview:true}).issues,[],field+' '+p+' '+term);}}
 const periodical='(Fellmeth, Example (1995) 15 Cal. Reg. L.Rptr. 1, 8, 2 employees.)',doc=make(periodical),issues=reviewStyleIssues(doc,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true}),at=periodical.lastIndexOf('2 employees');assert.ok(!issues.some(i=>i.checkId==='numerals'&&i.start<at));assert.ok(issues.some(i=>i.start===at&&i.suggestion==='two'));
});

test('known verse labels use general work tasks and unknown named locators never inherit a Bible identity',()=>{
 for(const [term,family]of [['Exodus 20:13','general-work'],['Ecclesiastes 3:1','unclassified-citation'],['New Sourcebook 3:1','unclassified-citation']]){
  const text=term+' concerns 2 employees.',d=make(text),found=californiaCitationReview(d,refs,{includeContextReview:true}).issues;assert.equal(found.length,1,term);assert.ok(found[0].citationContextReview.some(f=>f.id===family),term);if(family==='unclassified-citation')assert.ok(!found[0].citationContextReview.some(f=>f.id==='general-work'));
  const numerical=reviewStyleIssues(d,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});assert.ok(!numerical.some(i=>i.checkId==='numerals'&&i.start<term.length));assert.ok(numerical.some(i=>i.text==='2'&&i.suggestion==='two'));
  for(const field of ['struck','excluded'])for(let p=0;p<term.length;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(californiaCitationReview(changed,refs,{includeContextReview:true}).issues,[],field+' '+p+' '+term);}
 }
});
