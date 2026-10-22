import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
import {applyExternalReferenceReadingWarnings} from '../app/bill-ocr-policy.mjs';
const heading='The people of the State of California do enact as follows:\n';
const instruction='Amendment 1\nOn page 1, before line 1, insert:\nSECTION 1. [Insert contents of SB 879]';
function documents(){
 const reference=makeDocument(['SENATE BILL No. 879\n'+heading+'line 1 SECTION 1.00. New law.'],'SB 879 original.pdf'),at=reference.rawPages[0].indexOf('New');
 reference.ocr=true;reference.scanQuality=[{page:1,uncertain:[{start:at,end:at+3,text:'New',confidence:98,disagreement:'Original pixel readings differ: New / Now'}]}];
 return {reference,previous:makeDocument([heading+'line 1 Old law.'],'previous'),current:makeDocument([heading+'line 1 SECTION 1.00. New law.\nline 2 Old law.'],'current')};
}
test('a matching disputed external OCR insertion requires review while retaining verified evidence',()=>{
 const {reference,previous,current}=documents(),before=JSON.stringify([reference,previous,current]),external={'SB 879':reference};
 const [result]=verifyAmendments(instruction,previous,current,external);
 assert.equal(result.status,'needs-review');assert.equal(result.evidence[0].status,'implemented');assert.match(result.message,/Referenced SB 879, page 1/);
 assert.equal(result.referenceReadingWarningCount,1);assert.equal(result.referenceReadingWarnings[0].bill,'SB 879');assert.equal(result.referenceReadingWarnings[0].sourceName,reference.name);
 assert.equal(result.referenceReadingWarnings[0].confidence,98);assert.ok(nonAmendmentEdits(instruction,previous,current,[result],external).uncertain);
 assert.equal(JSON.stringify([reference,previous,current]),before);
});
test('external OCR uncertainty cannot certify an apparent mismatch and does not mask its discrepancy evidence',()=>{
 const {reference,previous,current}=documents();current.text=current.text.replace('New','Now');
 const different=makeDocument([current.text],'different'),[result]=verifyAmendments(instruction,previous,different,{'SB 879':reference});
 assert.equal(result.status,'needs-review');assert.equal(result.evidence[0].status,'incorrect');assert.ok(result.evidence[0].expectedParts.some(p=>p.different));
});
test('external warnings scope only the referenced result and preserve complete uncertainty counts',()=>{
 const {reference}=documents(),unrelated={number:'2',status:'implemented',message:'Matches.',evidence:[]},related={...unrelated,number:'1',externalReference:{bill:'SB 879'}};
 const results=applyExternalReferenceReadingWarnings([related,unrelated],{'SB 879':reference});assert.equal(results[0].status,'needs-review');assert.equal(results[1],unrelated);
 assert.equal(applyExternalReferenceReadingWarnings([related],{'AB 109':reference})[0],related);
 reference.scanQuality[0].uncertain=Array.from({length:125},()=>({...reference.scanQuality[0].uncertain[0]}));
 const [many]=applyExternalReferenceReadingWarnings([related],{'SB 879':reference});assert.equal(many.referenceReadingWarningCount,125);assert.equal(many.referenceReadingWarnings.length,100);
});
test('a reference with no remaining uncertain readings retains the ordinary verification result',()=>{
 const {reference,previous,current}=documents();reference.scanQuality[0].uncertain=[];
 const [result]=verifyAmendments(instruction,previous,current,{'SB 879':reference});assert.equal(result.status,'implemented');assert.equal(result.referenceReadingWarnings,undefined);
});
test('deletion sharing a disputed external insertion boundary requires review while an independent edit stays implemented',()=>{
 const {reference}=documents(),previous=makeDocument([heading+'line 1 Old law.\nline 2 Other old.'],'previous'),current=makeDocument([heading+'line 1 SECTION 1.00. New law.\nline 2 Other new.'],'current');
 const instructions=instruction+'\nAmendment 2\nOn page 1, strike out line 1.\nAmendment 3\nOn page 1, in line 2, strike out “old” and insert:\nnew';
 const results=verifyAmendments(instructions,previous,current,{'SB 879':reference});
 assert.equal(results[0].status,'needs-review');assert.equal(results[1].status,'needs-review');assert.match(results[1].message,/unresolved referenced insertion/);assert.equal(results[2].status,'implemented');
});
