import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';import{billQuotedTermRanges,billQuotedTermProtection}from'../app/style-quoted-terms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current'),own=d=>{const before=structuredClone(d),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.deepEqual(d,before);for(const i of all)assert.equal(d.text.slice(i.start,i.end),i.text);return all.filter(i=>i.checkId==='lcb-contextual-names'&&i.text.includes('executive order'));};

test('exact quoted terminal No. protects the complete selected title prefix in all quote styles and initial cases',()=>{
 for(const[open,close]of[['“','”'],['"','"'],['‘','’'],["'","'"]])for(const first of['e','E']){const d=make('The literal '+open+first+'xecutive order No.'+close+' is printed. The executive order No. 34 applies.');assert.equal(own(d).length,0,open+close+' '+first);const plain=make('The executive order No. 34 applies.');assert.equal(own(plain).length,1);assert.equal(own(d).length,0,'A later independent bill cannot alter prior local authority');}
});

test('exact and punctuation-trimmed quoted payloads coexist without requiring an abbreviation guess',()=>{
 for(const payload of['health-care.','example.','example,','F.B.I.','No.']){const d=make('The literal “'+payload+'” is printed. '+payload+' is repeated.'),at=d.text.lastIndexOf(payload),ranges=billQuotedTermRanges(d),protect=billQuotedTermProtection(d);assert.ok(ranges.some(r=>r.start===at&&r.end===at+payload.length),payload);assert.equal(protect({start:at,end:at+payload.length}),true);const trimmed=payload.replace(/[.,]$/u,'');assert.equal(protect({start:at,end:at+trimmed.length}),true);}
});

test('a quoted shorter prefix cannot authorize a larger owner or a directly continued identifier',()=>{
 assert.equal(own(make('The literal “executive order” is printed. The executive order No. 34 applies.')).length,1);
 for(const suffix of['Identifier','α','𐐀','\u0301','_id','7','-code','‐code','—code','-𐐀','—𐐀','/id',':id','\\id','#id','@id','.code','/𐐀','@𐐀'])for(const field of[null,'struck','excluded']){const payload='example.',d=make('The literal “'+payload+'” is printed. '+payload+suffix+' is repeated.'),at=d.text.lastIndexOf(payload);if(field)d[field].push({start:at+payload.length,end:at+payload.length+suffix.length});assert.equal(billQuotedTermProtection(d)({start:at,end:at+payload.length}),false,suffix+' '+field);}
 const d=make('The literal “example.” is printed. example. continuation follows.'),at=d.text.lastIndexOf('example.');assert.equal(billQuotedTermProtection(d)({start:at,end:at+'example. continuation'.length}),false);
});

test('full quoted numbered titles and compound terms retain their established whole-form protection',()=>{
 assert.equal(own(make('The literal “executive order No. 34” is printed. The executive order No. 34 applies.')).length,0);
 const d=make('The literal “health-care-based.” is printed. The program is health-care-based.'),before=structuredClone(d),all=jointStylisticIssues(d,refs);assert.deepEqual(d,before);assert.equal(all.filter(i=>i.text.includes('health-care')).length,0);
});

test('exact terminal punctuation authority restores recognized physical word and page divisions',()=>{
 for(const splitQuote of[false,true]){const first='The literal “executive order No.” is printed. The execu-',last='tive order No. 34 applies.',d=makeDocument(['The people do enact as follows:\nline 1 '+(splitQuote?'The literal “execu-':first),'AB 224 — 2 —\nline 1 '+(splitQuote?'tive order No.” is printed. The executive order No. 34 applies.':last)],'Current',[],[],new Set(['executive'])),head=d.blocks.find(b=>b.layoutLabel&&b.ignored);head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};assert.equal(own(d).length,0,String(splitQuote));const protect=billQuotedTermProtection(d),start=d.text.lastIndexOf(splitQuote?'executive':'execu-'),end=d.text.lastIndexOf('No.')+3;assert.equal(protect({start,end}),true);}
});

test('damaged establishing quotation marks cannot supply bill-local terminal-period authority',()=>{
 for(const[open,close]of[['“','”'],['"','"'],['‘','’'],["'","'"]])for(const field of['struck','excluded'])for(const side of['open','close']){const d=make('The literal '+open+'executive order No.'+close+' is printed. The executive order No. 34 applies.'),at=side==='open'?d.text.indexOf(open):d.text.lastIndexOf(close);d[field].push({start:at,end:at+1});assert.equal(own(d).length,1,open+close+' '+field+' '+side);}
});
