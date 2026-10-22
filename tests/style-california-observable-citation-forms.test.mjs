import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {californiaCitationReview} from '../app/style-california-citations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>({...makeDocument([text],'Current'),styleDocumentType:'opinion'}),check=d=>californiaCitationReview(typeof d==='string'?make(d):d,refs).issues;
const cases=[
 ['(Civ. Code, § 1810.2–1812.12.)','§2:6'],['(Civ. Code, § 51 et seq., 52 et seq.)','§2:6'],['(Civ. Code, §§ 51.)','§2:6'],
 ['(Civ. Code, § 51 subd. (a).)','§2:7'],['(Civ. Code, § 51, subd. (a) and (b).)','§2:7'],['(Civ. Code, § 51, subds. (a)(1), (2).)','§2:7'],['(Civ. Code, § 51, subd. (a)(1), (b)(2).)','§2:7'],['(Civ. Code, § 51, subd. (a), paragraph (1).)','§2:7'],
 ['California Rules of Court, rule 8.204, subdivision (a), applies.','§2:18'],['(Cal. Rules of Court, rules 8.204, subds. (a).)','§2:18'],['(Rules Prof. Conduct, rule 3-110, subd. (A).)','§2:18'],['(Super. Ct. L.A. County, Local Rules, rule 10.16, subd. (a).)','§2:18'],
 ['42 U.S.C. § 1983, subd. (a), applies.','§2:37'],['(42 U.S.C. § 1983, subds. (a).)','§2:37'],['42 United States Code section 1983, subdivision (a), applies.','§2:37'],
 ['(32 C.F.R. part 581.3 (1997).)','§2:44'],['(32 C.F.R. § 581.3; 45 C.F.R. § 201.3 (1997).)','§2:44'],['32 C.F.R. § 581.3 (1997) applies.','§2:44'],['45 Code of Federal Regulations part 201.3(a) applies.','§2:44'],
 ['(CALJIC 2.20.)','§3:5'],['BAJI number 6.20 applies.','§3:5'],['(CALJIC No 2.20.)','§3:5'],
 ['(Annot., Example (1998) 12 A.L.R.3d p. 186.)','§3:7[A]'],['Annotation, Example (1998) 12 A.L.R.3d page 186.','§3:7[A]'],['(Able, Example (1998) 12 Alpha L.Rev. p. 186.)','§3:8[A]'],['Able, Example (1998) 12 Alpha L.J. page 186.','§3:8[A]'],
];
test('observable code symbol ranges and complete subdivision lists receive their exact source provision',()=>{
 for(const [text,section]of cases.slice(0,8)){const d=make(text),before=JSON.stringify(d),found=check(d);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section);assert.equal(found[0].suggestion,null);assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(d),before);}
 for(const text of ['(Civ. Code, §§ 1810.2–1812.12.)','(Civ. Code, §§ 51 et seq., 52 et seq.)','(Civ. Code, § 51, subd. (a)(1), (2).)','(Civ. Code, § 51, subds. (a)(1) & (b)(2).)','(Civ. Code, § 51, subds. (a)-(c).)','Civil Code section 51, subdivision (a), applies.'])assert.deepEqual(check(text),[],text);
 for(const text of ['(Civ. Code§ 51.)','(Civ. Codesec. 51.)','(Civ. Code secs. 51, 52.)']){const found=check(text);assert.ok(found.some(i=>i.suggestion?.startsWith(', ')),text);assert.ok(found.every(i=>i.end>i.start),'A missing gap still has a nonempty physical selection');}
 assert.ok(!check('(prefixCiv. Code § 51.)').some(i=>i.suggestion===', '),'An attached word cannot manufacture a precise code punctuation correction');
});
test('court and federal subpart conventions apply in prose and parentheses without importing code conventions',()=>{
 for(const [text,section]of cases.slice(8,15)){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section);assert.equal(found[0].suggestion,null);}
 for(const text of ['California Rules of Court, rule 8.204(a), applies.','Rules of Professional Conduct, rule 3-110(A), applies.','(Rules Prof. Conduct, rule 3-110(A).)','42 United States Code section 1983(a) applies.','(42 U.S.C. § 1983(a).)'])assert.deepEqual(check(text),[],text);
});
test('CFR edition evidence belongs to its own citation and parts remain distinct from parenthetical symbols',()=>{
 for(const [text,section]of cases.slice(15,19)){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section);assert.equal(found[0].suggestion,null);}
 for(const text of ['(32 C.F.R. § 581.3 (1997); 45 C.F.R. § 201.3 (1996).)','(32 C.F.R. §§ 581.3, 581.4 (1997).)','45 Code of Federal Regulations part 201.3(a) (1997) applies.','32 C.F.R. part 581.3 (1997) applies.'])assert.deepEqual(check(text),[],text);
});
test('jury instruction No. checks preserve exact coordinates and leave edition identity for the reader',()=>{
 for(const [text]of cases.slice(19,22)){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,'§3:5');assert.match(found[0].suggestion,/^(?:BAJI|CALJIC) No\. /u);assert.equal(found[0].reviewSuggested,false);}
 for(const text of ['(CALJIC No. 2.20.)','BAJI No. 6.20 applies.','(BAJI No. 2.60 (7th ed. 1986).)','CALJIC 2.20alpha is a technical token.'])assert.deepEqual(check(text),[],text);
});
test('initial annotation and law-periodical page labels remain distinct from short references and supplements',()=>{
 for(const [text,section]of cases.slice(22)){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].supplementarySource.section,section);assert.equal(found[0].suggestion,null);}
 for(const text of ['(Annot., Example (1998) 12 A.L.R.3d 186.)','Annotation, Example (1998) 12 A.L.R.3d 186.','(Able, Example (1998) 12 Alpha L.Rev. 186.)','(Able, supra, 12 Alpha L.Rev. at p. 186.)','(Annot., Example (1998) 12 A.L.R.3d 186, and later cases (1999 supp.) p. 18.)'])assert.deepEqual(check(text),[],text);
});
test('every complete citation source witness survives both removal channels modes literal quotes and physical wrapping',()=>{
 for(const [text]of cases){const d=make(text);for(const field of ['struck','excluded']){const rows=check(d);assert.ok(rows.length,text);const first=rows[0];for(let p=first.evidenceStart;p<first.evidenceEnd;p++){const changed=structuredClone(d);changed[field].push({start:p,end:p+1});assert.deepEqual(check(changed),[],field+' '+p+' '+text);}}
  const bill=structuredClone(d);bill.styleDocumentType='bill';assert.deepEqual(check(bill),[]);assert.deepEqual(check('“'+text+'”'),[]);
 }
 const d=makeDocument(['(Civ. Code, § 1810.2–\nline 1 1812.12.)'],'Current');d.styleDocumentType='cover-letter';const found=check(d);assert.equal(found.length,1);assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);
});
