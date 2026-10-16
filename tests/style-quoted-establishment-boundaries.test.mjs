import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';import{billQuotedTermRanges,billQuotedTermProtection}from'../app/style-quoted-terms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),quotes=[['“','”'],['"','"'],['‘','’'],["'","'"]],make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current'),check=d=>{const before=structuredClone(d),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.deepEqual(d,before);for(const i of all)assert.equal(d.text.slice(i.start,i.end),i.text);return all;},named=d=>check(d).filter(i=>i.checkId==='lcb-contextual-names'&&i.suggestion==='Executive Order No.');

test('unknown excluded word after establishing quote cannot create authority, while intentional whole suffix deletion stays active',()=>{
 for(const[open,close]of quotes)for(const suffix of['Code','α','𐐀','\u0301','_id','7']){const d=make('The identifier '+open+'executive order No.'+close+suffix+' is recorded. The executive order No. 34 applies.'),at=d.text.indexOf(close+suffix)+close.length;assert.equal(named(d).length,1,open+close+' live '+suffix);const hidden=structuredClone(d);hidden.excluded.push({start:at,end:at+suffix.length});assert.equal(named(hidden).length,1,open+close+' unknown '+suffix);const struck=structuredClone(d);struck.struck.push({start:at,end:at+suffix.length});assert.equal(named(struck).length,0,open+close+' deleted '+suffix);const both=structuredClone(struck);both.excluded.push({start:at,end:at+suffix.length});assert.equal(named(both).length,0,'Deliberate deletion remains removed in negative view');}
});

test('unknown prefix before a word-embedded opening quote retains the original quote-discovery rejection',()=>{
 for(const[open,close]of quotes)for(const prefix of['Code','α','_id','7']){const d=make('The identifier '+prefix+open+'executive order No.'+close+' is recorded. The executive order No. 34 applies.'),at=d.text.indexOf(prefix+open);assert.equal(named(d).length,1,prefix+open);const hidden=structuredClone(d);hidden.excluded.push({start:at,end:at+prefix.length});assert.equal(named(hidden).length,1,prefix+' unknown');const struck=structuredClone(d);struck.struck.push({start:at,end:at+prefix.length});assert.equal(named(struck).length,0,prefix+' deleted');}
});

test('partially excluded suffixes cannot hide Unicode quote-boundary evidence, and outside unknown prose does not erase valid authority',()=>{
 for(const[open,close]of quotes)for(const suffix of['Code','𐐀Code']){const d=make('The identifier '+open+'executive order No.'+close+suffix+' is recorded. The executive order No. 34 applies.'),at=d.text.indexOf(close+suffix)+close.length;for(let n=1;n<suffix.length;n++){const bad=structuredClone(d);bad.excluded.push({start:at,end:at+n});assert.equal(named(bad).length,1,open+close+' prefix '+n);}}
 const d=make('The label “executive order No.” is recorded. Unreadable material follows. The executive order No. 34 applies.'),at=d.text.indexOf('Unreadable');d.excluded.push({start:at,end:at+'Unreadable'.length});assert.equal(named(d).length,0,'Unrelated unknown text supplies no adjacency veto');
});

test('multiple surrounding quotes cannot turn a rejected identifier quote into a cross-paired term',()=>{
 for(const[open,close]of quotes){const d=make('The identifier '+open+'executive order No.'+close+'Code is recorded. The label '+open+'(valid label)'+close+' is printed. The executive order No. 34 applies.'),at=d.text.indexOf('Code');d.excluded.push({start:at,end:at+4});assert.equal(named(d).length,1,open+close);const ranges=billQuotedTermRanges(d);assert.ok(!ranges.some(r=>r.term.includes('recorded. The label')));}
});

test('same-object reuse changes document mode and replaces local quoted authority without retaining context or metadata mutations',()=>{
 const slot=make('The label “executive order No.” is printed. The executive order No. 34 applies.'),reset=(body,mode)=>{for(const key of Reflect.ownKeys(slot))delete slot[key];Object.assign(slot,makeDocument([body],'Current'));if(mode)slot.styleDocumentType=mode;slot.auditMetadata={unchanged:undefined};};
 const bodies=['The label “executive order No.” is printed. The executive order No. 34 applies. The fee is ten dollars. Under Section 123 et seq. the rule applies.','The label “Other term.” is printed. The executive order No. 34 applies. The fee is ten dollars. Under Section 123 et seq. the rule applies.','LEGISLATIVE COUNSEL’S DIGEST\nThe office has two employees. The fee is ten dollars ($10).\nThe people do enact as follows:\nline 1 The executive order No. 34 applies.'];
 for(const body of bodies)for(const mode of['bill','opinion','cover-letter',undefined,'bill']){reset(body,mode);const fresh=makeDocument([body],'Current');if(mode)fresh.styleDocumentType=mode;fresh.auditMetadata={unchanged:undefined};assert.deepEqual(check(slot),check(fresh),String(mode));if(body.startsWith('The label “Other'))assert.equal(named(slot).length,1);}
});

test('unknown quote boundary survives normalized physical word/page coordinates with narrow selected highlights',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 The identifier “executive order No.”Code is recorded. The execu-','AB 224 — 2 —\nline 1 tive order No. 34 applies.'],'Current',[],[],new Set(['executive'])),head=d.blocks.find(b=>b.layoutLabel&&b.ignored);head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}],auditExtra:{kept:true}};const at=d.text.indexOf('Code');d.excluded.push({start:at,end:at+4});const found=named(d);assert.equal(found.length,1);assert.match(found[0].text,/execu-\nAB 224 — 2 —\nline 1 tive order No\./u);assert.equal(found[0].suggestion,'Executive Order No.');
});
