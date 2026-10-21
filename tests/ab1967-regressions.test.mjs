import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {digestRange} from '../app/change-scope.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ab1967-source.json',import.meta.url))),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const model=key=>{const m=fixture[key];return makeDocument(m.pages,m.name,structuredClone(m.strikes),structuredClone(m.formatting));};
test('actual AB1967 Digest and all eight instructions verify, including amendment3 after its page4 line2 comma',()=>{
 const old=model('previous'),now=model('current'),digest=model('digest'),before=JSON.stringify([old,now,digest]),results=verifyAmendments(fixture.instructions,old,now,{},digest);
 assert.deepEqual(results.map(r=>[r.number,r.status]),['Digest','1','2','3','4','5','6','7','8'].map(n=>[n,'implemented']));
 const row=old.blocks.find(b=>b.page===4&&/^line 2\s/u.test(b.text)),comma=old.text.indexOf(',',row.start);assert.ok(comma<row.end);const insertion=results.find(r=>r.number==='3'),e=insertion.evidence[0];assert.equal(e.previousOffset,comma+1);assert.equal(e.previousEndOffset,e.previousOffset);assert.match(now.text.slice(e.currentOffset,e.currentEndOffset),/or by the minor[’']s attorney,/u);
 assert.equal(nonAmendmentEdits(fixture.instructions,old,now,results,{},digest).ranges[1].some(r=>r.start<e.currentEndOffset&&r.end>e.currentOffset),false);assert.equal(JSON.stringify([old,now,digest]),before);
});
test('actual AB1967 coordinated in-kind assistance receives one precise LCB11 finding without changing its insertion',()=>{
 const d=model('current'),before=JSON.stringify(d),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true}),rows=issues.filter(i=>i.text==='in kind');assert.equal(rows.length,1);const i=rows[0];assert.equal(i.suggestion,'in-kind');assert.equal(i.guideId,'lcb');assert.equal(i.guidePage,11);assert.match(d.text.slice(i.end,i.end+30),/or cash assistance/u);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.references[0].sourcePassage.text,'in-kind (u.m.)');assert.equal(JSON.stringify(d),before);
});
test('actual AB1967 left-column Digest prose preserves paragraph indentation without accidental centering on either version',()=>{
 for(const key of ['previous','current']){const d=model(key),range=digestRange(d),heading=d.blocks.find(b=>b.start<=range.start&&b.end>range.start),paragraphs=d.blocks.filter(b=>!b.ignored&&!b.margin&&b.start>range.start&&b.end<=range.end&&/^\(2\) Existing law|^This bill would expand/u.test(b.text));assert.ok(paragraphs.length>=2);assert.equal(heading.formatting.centered,true);for(const b of paragraphs){assert.equal(b.formatting.centered,false,b.text);assert.ok(b.formatting.indent>0&&b.formatting.indent<.04,b.text);assert.equal(b.formatting.x,58);}assert.equal(d.text,fixture[key].pages.join('\n'));}
});
