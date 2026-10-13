import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
import {digestPayload,digestDisplay,amendmentName} from '../app/digest-amendment.mjs';
import {amendmentDeletionRanges} from '../app/amendment-highlights.mjs';
import {applyAmendmentReadingWarnings} from '../app/pdf-reading-quality.mjs';
const heading='LEGISLATIVE COUNSEL’S DIGEST',enact='The people of the State of California do enact as follows:';
const bill=(digest,body='line 1 SECTION 1. Existing law.')=>makeDocument([`ASSEMBLY BILL No. 99\nAn act relating to programs.\n${heading}\n${digest}\n${enact}\n${body}\n- 0 -`],'bill');
const old=bill('AB 99. Programs.\nExisting law funds ten programs.\nVote: majority. Appropriation: no.'),replacement=makeDocument(['AB 99. Programs.\nExisting law funds twelve programs.\nVote: majority. Appropriation: no.'],'digest');
test('replacement digest is labeled Digest and original instruction numbering remains unchanged',()=>{
 const instructions='Amendment 8\nOn page 1, in line 1, strike out “Existing law” and insert:\nRevised law';
 const current=bill(replacement.text,'line 1 SECTION 1. Revised law.');
 const results=verifyAmendments(instructions,old,current,{},replacement);
 assert.deepEqual(results.map(r=>[r.number,r.status]),[['Digest','implemented'],['8','implemented']]);
 assert.equal(amendmentName(results[0]),'Digest');assert.equal(amendmentName(results[1]),'Amendment 8');
 assert.match(results[0].evidence[0].original,/ten/);assert.match(results[0].evidence[0].actual,/twelve/);
 assert.ok(amendmentDeletionRanges(old,results[0],0).some(r=>old.text.slice(r.start,r.end).includes('ten')));
 assert.deepEqual(nonAmendmentEdits(instructions,old,current,results,{},replacement).ranges,[[],[]]);
 const warnings=applyAmendmentReadingWarnings(results,[{number:'8',page:1,text:'Revised'}]);assert.equal(warnings[0].status,'implemented');assert.equal(warnings[1].status,'needs-review');
});
test('digest mismatch, absent replacement and unrelated enacted-body edits remain distinct',()=>{
 assert.equal(verifyAmendments('',old,old,{},replacement)[0].status,'not-implemented');
 const bad=bill(replacement.text.replace('twelve','thirteen'),'line 1 SECTION 1. Other law.');
 const results=verifyAmendments('',old,bad,{},replacement);assert.equal(results[0].status,'incorrect');assert.ok(results[0].evidence[0].differenceRanges.some(r=>bad.text.slice(r.start,r.end)==='thirteen'));
 const edits=nonAmendmentEdits('',old,bad,results,{},replacement);assert.ok(edits.ranges[1].some(r=>bad.text.slice(r.start,r.end)==='Other'));
 assert.ok(results[0].evidence[0].currentEndOffset<bad.text.indexOf(enact));
 const renamed=makeDocument([bill(replacement.text).text.replace('An act relating to programs.','An act relating to services.')],'current');
 assert.equal(verifyAmendments('',old,renamed,{},replacement)[0].status,'implemented','A nearby title edit is not a digest discrepancy');
});
test('digest source wrapper excludes title, enactment and body; bare digest and multipage source retain text',()=>{
 assert.equal(digestPayload(bill(replacement.text)).text,digestPayload(replacement).text);
 const multi=makeDocument([heading+'\nFirst paragraph.','AB 99 — 2 —\nSecond paragraph.\n'+enact+'\nline 1 Law.'],'digest');
 assert.equal(digestDisplay(multi).payload.text,'First paragraph.\nSecond paragraph.');
 assert.throws(()=>digestPayload(makeDocument([enact+'\nline 1 Law.'],'wrong')),/without an identifiable/);
 assert.equal(verifyAmendments('',makeDocument(['line 1 Law.'],'wrong'),old,{},replacement)[0].status,'needs-review');
});
test('digest source strikeouts stay visible but are excluded from requested active wording',()=>{
 const d=makeDocument(['Old New summary.'],'digest',[[{start:0,end:4}]]);
 assert.equal(digestPayload(d).text,'New summary .');assert.equal(digestDisplay(d).payload.strikes.length,1);
 assert.equal(verifyAmendments('',old,bill('New summary.'),{},d)[0].status,'implemented');
});
test('digest verification and displayed discrepancy tokens retain recognized source word divisions',()=>{
 const doc=makeDocument([heading+'\nThe govern-','AB 99 — 2 —\nment funds programs.'],'digest',[],[],new Set(['government'])),display=digestDisplay(doc).payload;
 const word=display.tokens.find(t=>t.value==='government');assert.ok(word);assert.equal(display.text.slice(word.start,word.end),'govern-\nment');
 assert.equal(verifyAmendments('',old,bill('The government funds programs.'),{},doc)[0].status,'implemented');
});
for(const directive of ['On page 1, between lines 2 and 3, insert:','On page 1, after line 2, insert:','At the end of the bill, insert:','After the last line of the bill, insert:'])test('final insertion resolves before zero: '+directive,()=>{
 const previous=makeDocument(['line 1 SECTION 1. Existing law.\nline 2 This act takes effect immediately.\n- 0 -'],'previous'),current=makeDocument(['line 1 SECTION 1. Existing law.\nline 2 This act takes effect immediately.\nline 3 SEC. 2. New law.\n- 0 -'],'current'),text='Amendment 1\n'+directive+'\nSEC. 2. New law.';
 const r=verifyAmendments(text,previous,current)[0];assert.equal(r.status,'implemented',r.message);assert.equal(r.evidence[0].previousOffset,previous.blocks[1].end);assert.equal(r.evidence[0].actual,'SEC . 2 . New law .');
 assert.deepEqual(nonAmendmentEdits(text,previous,current,[r]).ranges,[[],[]]);
 assert.equal(verifyAmendments(text,previous,previous)[0].status,'not-implemented');
 assert.equal(verifyAmendments(text,previous,makeDocument([current.text.replace('New','Wrong')],'bad'))[0].status,'incorrect');
});
test('unprinted following line only resolves at proven bill end, not missing intermediate lines or reversed boundaries',()=>{
 for(const [pages,directive] of [
 [['line 2 Old law.','line 1 Later law.\n- 0 -'],'On page 1, between lines 2 and 3, insert:'],
 [['line 2 Old law.\nUnnumbered substantive appendix.'],'On page 1, between lines 2 and 3, insert:'],
 [['line 2 Old law.\n- 0 -'],'On page 1, between lines 2 and 4, insert:'],
 [['line 2 Old law.\n- 0 -'],'On page 1, between lines 3 and 2, insert:']]){
  const previous=makeDocument(pages,'previous');assert.equal(verifyAmendments('Amendment 1\n'+directive+'\nNew law.',previous,previous)[0].status,'needs-review');
 }
});
test('single printed zero or O is structural only after final numbered text',()=>{
 for(const zero of ['0','O']){
  const previous=makeDocument(['line 1 Old law.\n'+zero],'previous'),current=makeDocument(['line 1 Old law.\nline 2 New law.\n'+zero],'current');
  assert.equal(previous.blocks.at(-1).ignored,true);assert.equal(verifyAmendments('On page 1, after line 1, insert:\nNew law.',previous,current)[0].status,'implemented');
 }
 assert.equal(makeDocument(['0\nline 1 Old law.'],'bill').blocks[0].ignored,false);
});
test('an empty printed line after the final body line is a valid insertion boundary',()=>{
 const previous=makeDocument(['line 1 Old law.\nline 2\n- 0 -'],'previous'),current=makeDocument(['line 1 Old law.\nline 2 New law.\n- 0 -'],'current');
 for(const directive of ['On page 1, between lines 1 and 2, insert:','On page 1, after the last line, insert:'])assert.equal(verifyAmendments(directive+'\nNew law.',previous,current)[0].status,'implemented');
});
test('text after the zero is not accepted as a correctly placed final insertion',()=>{
 const previous=makeDocument(['line 1 Old law.\n- 0 -'],'previous'),current=makeDocument(['line 1 Old law.\n- 0 -\nline 2 New law.'],'bad');
 const r=verifyAmendments('On page 1, after line 1, insert:\nNew law.',previous,current)[0];assert.notEqual(r.status,'implemented');
});
test('digest paragraph baseline is independent of a far-left enacted table while real paragraph indent survives',()=>{
 const pages=[heading+'\nA long digest continuation that establishes its own text column.\nA paragraph beginning farther right remains slightly indented.\n'+enact+'\nline 1 A wide enacted table extends far to the left and right.'];
 const fmt=[{x:150,right:420},{x:150,right:470},{x:162,right:470},{x:150,right:470},{x:15,right:500}].map(f=>({...f,pageWidth:612,height:12,bodyHeight:12,runs:[]}));
 const d=makeDocument(pages,'bill',[],[fmt]);assert.equal(d.blocks[1].formatting.indent,0);assert.ok(Math.abs(d.blocks[2].formatting.indent-12/485)<.0001);assert.equal(d.blocks[4].formatting.columnLeft,15);
 assert.equal(d.text,pages[0]);
});
