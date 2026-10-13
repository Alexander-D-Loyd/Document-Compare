import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';import {digestDisplay,digestPayload} from '../app/digest-amendment.mjs';import {amendmentDeletionRanges,amendmentAdditionRanges,amendmentReviewRanges,amendmentOutlineGroup} from '../app/amendment-highlights.mjs';
const heading='LEGISLATIVE COUNSEL’S DIGEST',enact='The people of the State of California do enact as follows:';
const bill=text=>makeDocument([heading+'\n'+text+'\n'+enact+'\nline 1 Existing body.\n- 0 -'],'bill');
const selected=(doc,ranges)=>ranges.map(r=>doc.text.slice(r.start,r.end));
test('digest replacement colors only removed and added words, keeping common context plain',()=>{
 const old=bill('Existing law funds ten programs.\nVote: majority.'),now=bill('Existing law funds twelve programs.\nVote: majority.'),upload=makeDocument(['Existing law funds twelve programs.\nVote: majority.'],'digest'),result=verifyAmendments('',old,now,{},upload)[0];
 assert.equal(result.status,'implemented');assert.deepEqual(selected(old,amendmentDeletionRanges(old,result,0)),['ten']);assert.deepEqual(selected(now,amendmentAdditionRanges(result)),['twelve']);
 const display=digestDisplay(upload,old).payload;assert.deepEqual(display.additions.map(r=>display.text.slice(r.start,r.end)),['twelve']);assert.deepEqual(nonAmendmentEdits('',old,now,[result],{},upload).ranges,[[],[]]);
});
test('separate digest edits keep exact source identities and anchors but share the selected amendment contour',()=>{
 const old=bill('Existing law funds ten programs. Another law funds five programs.'),now=bill('Existing law funds twelve programs. Another law funds six programs.'),upload=makeDocument(['Existing law funds twelve programs. Another law funds six programs.'],'digest'),result=verifyAmendments('',old,now,{},upload)[0];
 const removed=amendmentDeletionRanges(old,result,0),added=amendmentAdditionRanges(result),review=amendmentReviewRanges(result);
 assert.equal(new Set(removed.map(r=>r.id)).size,2);assert.equal(new Set(added.map(r=>r.id)).size,2);assert.equal(new Set(review.map(r=>r.id)).size,2);
 assert.equal(new Set([...removed,...added,...review].map(r=>amendmentOutlineGroup(result,r.id))).size,1);
 assert.deepEqual(result.evidence[0].previousInsertionPoints.map(p=>p.offset),[old.text.indexOf('ten')+3,old.text.indexOf('five')+4]);
 const deletionOnly=verifyAmendments('',old,bill('Existing law funds programs. Another law funds programs.'),{},makeDocument(['Existing law funds programs. Another law funds programs.'],'digest'))[0];assert.deepEqual(deletionOnly.evidence[0].previousInsertionPoints,[]);
});
test('identical and deletion-only digests never receive a full blue replacement range',()=>{
 const old=bill('Existing law funds programs. Extra language.'),same=makeDocument(['Existing law funds programs. Extra language.'],'digest'),short=makeDocument(['Existing law funds programs.'],'digest');
 const noop=verifyAmendments('',old,old,{},same)[0];assert.deepEqual(amendmentDeletionRanges(old,noop,0),[]);assert.deepEqual(amendmentAdditionRanges(noop),[]);
 const now=bill(short.text),removed=verifyAmendments('',old,now,{},short)[0];assert.equal(removed.status,'implemented');assert.deepEqual(selected(old,amendmentDeletionRanges(old,removed,0)),['Extra language.']);assert.deepEqual(amendmentAdditionRanges(removed),[]);
});
test('full digest discrepancies remain verified independently of localized requested changes',()=>{
 const old=bill('Existing law funds ten programs.'),upload=makeDocument(['Existing law funds twelve programs.'],'digest'),wrong=bill('Changed law funds thirteen programs.'),result=verifyAmendments('',old,wrong,{},upload)[0];
 assert.equal(result.status,'incorrect');assert.deepEqual(selected(old,amendmentDeletionRanges(old,result,0)),['ten']);assert.deepEqual(selected(wrong,amendmentAdditionRanges(result)),['Changed','thirteen']);assert.deepEqual(selected(wrong,result.evidence[0].differenceRanges),['Changed','thirteen']);
 const absent=verifyAmendments('',old,old,{},upload)[0];assert.equal(absent.status,'not-implemented');assert.deepEqual(amendmentAdditionRanges(absent),[]);assert.deepEqual(selected(old,amendmentDeletionRanges(old,absent,1)),['ten']);
});
test('tracked digest deletions and additions retain physical source offsets without coloring unchanged words',()=>{
 const old=bill('Existing law funds ten programs.'),raw='Existing law funds ten twelve programs.',start=raw.indexOf('ten'),upload=makeDocument([raw],'digest',[[{start,end:start+3}]]),now=makeDocument([heading+'\n'+raw+'\n'+enact+'\nline 1 Existing body.'],'current',[[{start:heading.length+1+start,end:heading.length+1+start+3}]]),result=verifyAmendments('',old,now,{},upload)[0];
 assert.equal(result.status,'implemented');assert.deepEqual(selected(now,amendmentDeletionRanges(now,result,1)),['ten']);assert.deepEqual(selected(now,amendmentAdditionRanges(result)),['twelve']);
 const display=digestDisplay(upload,old).payload;assert.equal(display.text,raw);assert.deepEqual(display.additions.map(r=>display.text.slice(r.start,r.end)),['twelve']);assert.equal(display.strikes.length,1);
});
test('editorial digest barcode/header/footer are excluded from active payload and display',()=>{
 const upload=makeDocument(['07/08/25 08:31 PM\n29070 RN 25 19534 PAGE 1\nSubstantive\n'+heading+'\nExisting law funds programs.\nRN2519534'],'digest');
 assert.equal(digestPayload(upload).text,'Existing law funds programs .');assert.equal(digestDisplay(upload).payload.text,'Existing law funds programs.');assert.equal(verifyAmendments('',bill('Old.'),bill('Existing law funds programs.'),{},upload)[0].status,'implemented');
});
