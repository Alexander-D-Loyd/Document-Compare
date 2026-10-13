import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {stylisticIssues} from '../app/gpo-style.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),direct=d=>stylisticIssues(d,refs.gpo).filter(i=>i.rule==='6.20'),joint=d=>jointStylisticIssues(d,refs).filter(i=>i.references?.some(r=>r.guideId==='gpo'&&r.rule==='6.20'));
// Exact source example plus ordinary legislative roles under LCB8 item3/GPO6.20.
const cases=[['unusually','well','preserved','specimen'],['fully','federally','funded','program'],['newly','publicly','owned','utility'],['highly','well','trained','employee'],['previously','privately','operated','hospital']];
test('multi-adverb modifiers receive one complete correction for either or both hyphens',()=>{
 for(const [a,b,c,n]of cases)for(const [x,y]of [['-','-'],[' ','-'],['-',' ']]){const phrase=a+x+b+y+c,d=make('The '+phrase+' '+n+' is available.'),r=direct(d);assert.equal(r.length,1,phrase);assert.equal(d.text.slice(r[0].start,r[0].end),phrase);assert.equal(r[0].suggestion,[a,b,c].join(' '));const final=joint(d);assert.equal(final.length,1,phrase+' joint');assert.equal(final[0].guideId,'lcb');assert.equal(final[0].guidePage,8);assert.equal(final[0].references.find(r=>r.guideId==='gpo').guidePage,116);}
});
test('open multi-adverb controls and ordinary well-known exceptions remain clear',()=>{
 for(const [a,b,c,n]of cases)assert.equal(direct(make('The '+[a,b,c,n].join(' ')+' is available.')).length,0);
 for(const s of ['A well-known lawyer acts.','A well-kept secret remains.','A family-owned business acts.','An early-career employee acts.','A friendly-faced worker acts.','A daily-paid employee acts.','The Unusually Well-Preserved Specimen Act applies.'])assert.equal(direct(make(s)).length,0,s);
});
test('complete supporting nouns and bridges cannot be established by strikeouts or masked text',()=>{
 for(const [a,b,c,n]of cases)for(const part of [n,'bridge']){const phrase=a+'-'+b+'-'+c,d=make('The '+phrase+' '+n+' is available.'),at=d.text.indexOf(n,d.text.indexOf(phrase)+phrase.length);d.struck=[{start:part==='bridge'?at-1:at,end:part==='bridge'?at:at+n.length}];assert.equal(direct(d).length,0,phrase+' '+part);assert.equal(joint(d).length,0,phrase+' joint '+part);}
 for(const [a,b,c,n]of cases){const d=make('The '+a+'-'+b+'-'+c+' unknown '+n+' is available.'),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});assert.equal(direct(d).length,0,a);}
});
test('unknown heads and incomplete Unicode words do not yield fragment corrections',()=>{
 for(const [a,b,c,n]of cases){assert.equal(direct(make('The '+a+'-'+b+'-'+c+' zznoun applies.')).length,0,a);
 for(const [word,tail]of [[n,'α'],[n,'\u0301'],[c,'α'],[c,'\u0301'],[a,'α']]){const text='The '+a+'-'+b+'-'+c+' '+n+' is available.',at=text.indexOf(word)+word.length,d=make(text.slice(0,at)+tail+text.slice(at));d.excluded.push({start:at,end:at+tail.length});assert.equal(direct(d).length,0,a+' '+word+tail);}}
});
test('table rows and wrapped literal context protect the whole multi-adverb phrase',()=>{
 for(const [a,b,c,n]of cases)for(const s of ['The '+a+'-'+b+'-'+c+'\n'+n+'........100','The term "'+a+'-'+b+'-\n'+c+' '+n+'" is literal.']){assert.equal(direct(make(s)).length,0,s);assert.equal(joint(make(s)).length,0,s+' joint');}
});
test('numbered and known page-head wrapping keeps whole exact selections and source text',()=>{
 for(const [a,b,c,n]of cases){const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The '+a+'-'+b+'-','AB 9999 — 2 —\nline 1 '+c+' '+n+' is available.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const saved=JSON.stringify(d),r=direct(d);assert.equal(r.length,1,a);assert.equal(r[0].suggestion,[a,b,c].join(' '));assert.match(d.text.slice(r[0].start,r[0].end),/AB 9999/);assert.equal(JSON.stringify(d),saved);}
});
test('capitalization and dash variants preserve a complete advisory selection',()=>{
 for(const phrase of ['Unusually well-preserved','UNUSUALLY-WELL-PRESERVED','unusually‑well‐preserved']){const d=make(phrase+' specimen is available.'),r=direct(d);assert.equal(r.length,1,phrase);assert.equal(d.text.slice(r[0].start,r[0].end),phrase);assert.equal(r[0].suggestion,phrase===phrase.toUpperCase()?'UNUSUALLY WELL PRESERVED':/^[A-Z]/.test(phrase)?'Unusually well preserved':'unusually well preserved');}
});
test('masked parent words cannot leave independent partial warnings',()=>{
 for(const [a,b,c,n]of cases)for(const word of [a,b,c]){const d=make('The '+a+'-'+b+'-'+c+' '+n+' is available.'),at=d.text.indexOf(word)+1;d.struck=[{start:at,end:at+1}];assert.equal(direct(d).length,0,a+' '+word);}
});
test('source citations and visible coverage state the finite scope honestly',()=>{
 assert.match(refs.lcb.pages[7].text,/adverb ending in/);assert.match(refs.gpo.pages[115].text,/unusually well preserved specimen/);
 const scope=CHECK_COVERAGE.find(r=>r.title==='Complete multi-adverb modifiers');assert.equal(scope.page,8);assert.match(scope.text,/longer chains/);assert.match(scope.text,/no universal/);
 const inventory=styleRuleInventory(refs);assert.match(inventory.find(r=>r.id==='gpo-6.20').scope,/longer chains/);assert.match(inventory.find(r=>r.id==='lcb-8-3').scope,/three-word/);
});

test('visible body em/en/figure dashes cannot manufacture an -ly hyphenation finding',()=>{
 for(const dash of ['—','–','‒','―'])for(const text of ['The federally'+dash+'funded programs apply.','The newly'+dash+'well'+dash+'trained personnel act.']){
  const doc=make(text),saved=JSON.stringify(doc);assert.equal(direct(doc).length,0,text);assert.equal(joint(doc).length,0,text);assert.equal(JSON.stringify(doc),saved);
 }
 for(const hyphen of ['-','‐','‑'])assert.ok(joint(make('The publicly'+hyphen+'owned utility applies.')).some(i=>i.suggestion==='publicly owned'));
});
