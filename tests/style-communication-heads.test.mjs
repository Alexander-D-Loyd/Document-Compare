import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbRoleFormIssues,LCB_ROLE_FORMS} from '../app/style-lcb-role-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=t=>jointStylisticIssues(make(t),refs);
test('audio/video compound variants before communication select the complete source-listed form',()=>{
 assert.match(refs.lcb.pages[8].text,/\naudiovideo\s*\n/);for(const variant of ['audio-video','audio video'])for(const head of ['communication','communications']){const d=make('The animal is examined using synchronous '+variant+' '+head+'.'),r=jointStylisticIssues(d,refs);assert.deepEqual(r.map(i=>i.suggestion),['audiovideo']);assert.equal(r[0].text,variant);assert.equal(r[0].guidePage,9);assert.equal(d.text.slice(r[0].start,r[0].end),variant);assert.equal(check(d.text.replace(variant,'audiovideo')).length,0);}
});
test('additional noun head applies only to the encoded modifier-capable forms',()=>{
 for(const r of LCB_ROLE_FORMS.filter(r=>r.role==='noun or modifier')){const text='The '+r.variant+' communications shall apply.',found=lcbRoleFormIssues(make(text),refs);assert.ok(found.some(i=>i.suggestion===r.preferred),r.variant);assert.equal(lcbRoleFormIssues(make(text.replace(r.variant,r.preferred)),refs).length,0,r.variant);}
 for(const variant of ['case-law','full-time','part-time','first-aid'])assert.equal(lcbRoleFormIssues(make('The '+variant+' communications shall apply.'),refs).length,0,'The noun-only variant remains an allowed modifier here');
});
test('communication head must be a complete noun token rather than a substring or unrelated role',()=>{
 for(const text of ['The audio-video communicate results.','The audio-video communicational label is unknown.','The audio-video communications2 value is unknown.','The audio-video communicationα value is unknown.','The audio-video communication𐐀 value is unknown.','The Audio-Video Communications Association is named.','A change in service communication occurs.'])assert.equal(lcbRoleFormIssues(make(text),refs).length,0,text);
});
test('complete communication modifier/head evidence protects source strikes, literals and interior tables',()=>{
 const text='line 1 The audio-video\nline 2 communication shall apply.',d=make(text),b=d.blocks[1];b.formatting={headerGaps:[{},{}]};assert.equal(jointStylisticIssues(d,refs).length,0);const s=make(text),start=s.text.indexOf('communication');s.struck=[{start,end:start+13}];assert.equal(jointStylisticIssues(s,refs).length,0);assert.equal(check('The term "audio-video\ncommunication" is literal.').length,0);
});
test('unknown ignored communication bridges stay protected and a known page head preserves the selected phrase',()=>{
 const u=make('line 1 The audio-video\nunknown marker\nline 2 communication shall apply.'),b=u.blocks[1];b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(lcbRoleFormIssues(u,refs).length,0);
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The audio','AB 9999 — 2 —\nline 1 video communication shall apply.']),r=jointStylisticIssues(d,refs);assert.deepEqual(r.map(i=>i.suggestion),['audiovideo']);assert.equal(r[0].text,d.text.slice(r[0].start,r[0].end));assert.ok(r[0].text.includes('AB 9999'));assert.equal(r[0].end,d.text.indexOf('video communication')+5);
});
