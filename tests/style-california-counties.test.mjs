import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {CALIFORNIA_COUNTIES,CALIFORNIA_COUNTIES_SOURCE,CALIFORNIA_COUNTIES_SCOPE,searchCaliforniaCounties} from '../app/data/california-counties.mjs';
import {californiaCountyIssues} from '../app/style-california-counties.mjs';
const doc=text=>makeDocument([text],'Current');
const run=input=>{const d=typeof input==='string'?doc(input):input,before=JSON.stringify(d),issues=californiaCountyIssues(d);assert.equal(JSON.stringify(d),before);for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.guideId,'california-counties');assert.equal(i.references[0].guidePage,undefined);assert.equal(i.countySource.title,'California Counties');}return issues;};
test('the separate user reference contains exactly the supplied 58 immutable county names',()=>{
 assert.equal(CALIFORNIA_COUNTIES.length,58);assert.equal(new Set(CALIFORNIA_COUNTIES.map(r=>r.name)).size,58);assert.ok(Object.isFrozen(CALIFORNIA_COUNTIES)&&CALIFORNIA_COUNTIES.every(Object.isFrozen));
 assert.deepEqual(searchCaliforniaCounties('san luis'),[{name:'San Luis Obispo',preferred:'County of San Luis Obispo'}]);assert.equal(searchCaliforniaCounties('Santa').length,3);assert.deepEqual(searchCaliforniaCounties('missing'),[]);assert.equal(CALIFORNIA_COUNTIES_SOURCE.suppliedBy,'User-supplied county reference list');assert.match(CALIFORNIA_COUNTIES_SCOPE,/Counties of/);
});
for(const row of CALIFORNIA_COUNTIES)test('exact list membership and singular form: '+row.name,()=>{
 assert.deepEqual(run(row.preferred+' shall act.'),[]);
 for(const phrase of ['county of '+row.name.toLowerCase(),row.name+' County',row.name.toLowerCase()+' county']){const found=run(phrase+' shall act.');assert.equal(found.length,1,phrase);assert.equal(found[0].suggestion,row.preferred,phrase);assert.equal(found[0].text,phrase);}
});
test('plural lists accept each supplied name and conventional comma/conjunction separators',()=>{
 for(const join of [', ',' and ',' or ',' & ', ', and ', ', or '])assert.deepEqual(run('Counties of '+CALIFORNIA_COUNTIES.map(r=>r.name).join(join)+'.'),[],join);
 for(const text of ['Counties of Los Angeles, Orange, and San Diego.','Counties of San Luis Obispo and San Francisco.','The City and County of San Francisco shall act.'])assert.deepEqual(run(text),[],text);
 const issues=run('counties of los angeles, Orange, and san diego.');assert.deepEqual(issues.map(i=>i.suggestion),['Counties of','Los Angeles','San Diego']);
});
test('unlisted explicit names are review only and no similar county is guessed',()=>{
 for(const text of ['County of Atlantis shall act.','County of San Bernadino shall act.','County of Orange Park shall act.']){const found=run(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.match(found[0].message,/no county name is guessed/);}
 const found=run('Counties of Los Angeles, Atlantis, and orange.');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['Atlantis',null],['orange','Orange']]);
});
test('bounded reversed lists retain separators and do not guess unknown members',()=>{
 for(const [text,wanted]of [['Los Angeles and Orange Counties.','Counties of Los Angeles and Orange'],['The Los Angeles, Orange, and San Diego Counties shall act.','Counties of Los Angeles, Orange, and San Diego'],['San Luis Obispo & San Francisco Counties.','Counties of San Luis Obispo & San Francisco'],['alameda and contra costa counties shall act.','Counties of Alameda and Contra Costa']]){const found=run(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,wanted,text);}
 const [unknown]=run('Los Angeles and Atlantis Counties.');assert.ok(unknown);assert.equal(unknown.suggestion,null);
 for(const prefix of ['Atlantis, ','Washington, ','Atlantis and ','The Atlantis, ']){const found=run(prefix+'Alameda and Orange Counties.');assert.equal(found.length,1,prefix);assert.equal(found[0].suggestion,null,prefix);assert.match(found[0].text,/Atlantis|Washington/u);}
 for(const text of ['atlantis, Alameda and Orange Counties.','atlantis, alameda and orange counties.'])assert.ok(run(text).every(i=>i.suggestion===null),text);
 for(const property of ['struck','excluded'])for(const selected of ['atlantis',',']){const d=doc('atlantis, Alameda and Orange Counties.'),start=d.text.indexOf(selected);d[property].push({start,end:start+selected.length});assert.ok(run(d).every(i=>i.suggestion===null),property+' '+selected);}
});
test('bounded unlisted reversed titles receive review without a guessed county',()=>{
 for(const name of ['Atlantis','San Bernadino','New Orange','Lake Superior']){const found=run(name+' County shall act.');assert.equal(found.length,1,name);assert.equal(found[0].suggestion,null,name);assert.equal(found[0].text,name+' County');}
 for(const phrase of ['A county','Any County','Each County'])assert.deepEqual(run(phrase+' shall act.'),[],phrase);
 for(const [phrase,wanted]of [['In Los Angeles County, the service applies.','County of Los Angeles'],['For Orange County, the service applies.','County of Orange'],['In Alameda and Orange Counties, the service applies.','Counties of Alameda and Orange']]){const found=run(phrase);assert.equal(found.length,1,phrase);assert.equal(found[0].suggestion,wanted,phrase);assert.ok(!/^(?:In|For) /u.test(found[0].text));}
});
test('explicit quoted table and institutional references are included',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text='The form is '+open+'los angeles county'+close+'.';assert.deepEqual(run(text).map(i=>i.suggestion),['County of Los Angeles'],text);}
 const table=doc('los angeles county');table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(run(table)[0].suggestion,'County of Los Angeles');
 assert.equal(run('The Los Angeles County Department of Public Health shall act.')[0].suggestion,'County of Los Angeles');assert.equal(run('The county of los angeles Department of Public Health shall act.')[0].suggestion,'County of Los Angeles');
 for(const phrase of ['County of Los Angeles Fire Department','County of Alameda Superior Court','County of Orange Public Works','County of Orange Health Care Agency']){assert.deepEqual(run(phrase+' shall act.'),[],phrase);const found=run(phrase.toLowerCase()+' shall act.');assert.equal(found.length,1,phrase);assert.equal(found[0].suggestion,phrase.match(/^County of (?:Los Angeles|Alameda|Orange)/u)[0]);}
 for(const phrase of ['County of Orange Park','County of Lake Superior']){const [unknown]=run(phrase+'.');assert.ok(unknown,phrase);assert.equal(unknown.suggestion,null,phrase);}
});
test('bare city names generic references and incomplete list cues are not inferred',()=>{
 for(const text of ['Los Angeles and Orange shall act.','The City of Los Angeles shall act.','The county of residence shall act.','A county of origin is recorded.','County of the applicant.','Counties of each district.','The county of his residence.','The county of her choice.','The county of their residence.','The county of operation.','The county of assignment.'])assert.deepEqual(run(text),[],text);
});
test('clear completed list cardinality and duplicate county suffixes are checked without overlapping rewrites',()=>{
 for(const [text,wanted]of [['County of Alameda and Orange.','Counties of Alameda and Orange'],['Counties of Alameda.','County of Alameda'],['County of Los Angeles County.','County of Los Angeles'],['Counties of Alameda County, Contra Costa.','Alameda'],['Orange County of Education.','County of Orange']]){const found=run(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,wanted,text);}
 for(const tail of ['including several cities','excluding Orange','subject to approval','along with their employees','and their employees','participate in the program']){const found=run('Counties of Alameda, '+tail+'.');assert.ok(found.every(i=>i.checkId!=='california-counties-unknown'),tail);assert.ok(found.every(i=>i.text==='Counties of Alameda'),tail);}
});
test('every original character in singular and plural evidence is required',()=>{
 for(const phrase of ['los angeles county','county of los angeles','Counties of orange and Atlantis'])for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const d=doc(phrase+'.');d[property].push({start:n,end:n+1});assert.deepEqual(run(d),[],property+' '+phrase+' '+n);}
 for(const property of ['struck','excluded'])for(const phrase of ['County of old orange','Counties of orange and old Atlantis']){const d=doc(phrase+'.'),start=phrase.indexOf('old');d[property].push({start,end:start+3});assert.deepEqual(run(d),[],property+' '+phrase);}
 for(const property of ['struck','excluded']){const d=doc('Orange County of Education.');d[property].push({start:0,end:6});assert.deepEqual(run(d),[],property+' original institutional reference');}
 for(const property of ['struck','excluded'])for(const phrase of ['New Orange County shall act.','New Alameda and Orange Counties shall act.']){const d=doc(phrase);d[property].push({start:0,end:3});assert.deepEqual(run(d),[],property+' original unknown proper-name prefix');}
});
test('original Unicode and technical attachments remain negative evidence even when removed',()=>{
 for(const [before,after]of [['é',''],['𐐀',''],['path/',''],['pre-',''],['','.field'],['','_field'],['','/field'],['','é'],['','\u0301']]){const phrase='los angeles county',text=before+phrase+after+'.';assert.deepEqual(run(text),[],text);for(const property of ['struck','excluded']){const d=doc(text),start=before?0:phrase.length;d[property].push({start,end:start+(before||after).length});assert.deepEqual(run(d),[],property+' '+text);}}
});
test('recognized physical wraps margins page heads and divisions retain exact source spans',()=>{
 const d=makeDocument(['line 1 The county of los','line 1 angeles shall act.'],'Current'),[i]=run(d);assert.ok(i);assert.equal(i.suggestion,'County of Los Angeles');assert.match(i.text,/line 1/);
 const divided=doc('line 1 The county of sacra-\nline 2 mento shall act.'),[j]=run(divided);assert.ok(j);assert.equal(j.suggestion,'County of Sacramento');assert.match(j.text,/sacra-/);
 const headed=makeDocument(['The people do enact as follows:\nline 1 Counties of orange and','AB 999 — 2 —\nline 1 los angeles shall act.'],'Current'),head=headed.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=run(headed);assert.deepEqual(found.map(i=>i.suggestion),['Orange','Los Angeles']);
 const unknown=structuredClone(headed),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;assert.deepEqual(run(unknown),[]);
});
test('printed en and em body dashes cannot supply an exact registered divided name',()=>{
 for(const dash of ['–','—'])for(const phrase of ['River'+dash+'\nside County shall act.','County of River'+dash+'\nside shall act.','Counties of River'+dash+'\nside and Orange.']){
  const d=doc(phrase),at=phrase.indexOf(dash),last=phrase.indexOf('side');d.wrappedWords=[{word:'Riverside',parts:['River','side'],spans:[{start:phrase.indexOf('River'),end:at},{start:last,end:last+4}],start:phrase.indexOf('River'),end:last+4,recognized:true}];
  const found=run(d);assert.equal(found.length,1,phrase);assert.equal(found[0].suggestion,null,phrase);assert.match(found[0].matchText,new RegExp(dash,'u'));
 }
});
test('real corpus Citizens Redistricting Commission tail retains canonical county and exact physical evidence',()=>{
 const phrase='(dd) County of Los An-\nline 15 geles Citizens Redis-\nline 16 tricting Commis-\nline 17 sion (Ch. 781, Stats. 2022).';assert.deepEqual(run(phrase),[]);
 const lower=phrase.replace('County of Los An-','county of los an-').replace('geles Citizens','geles Citizens'),d=doc(lower),[i]=run(d);assert.ok(i);assert.equal(i.suggestion,'County of Los Angeles');assert.match(i.text,/los an-/u);assert.equal(i.text.includes('Citizens'),false);
 for(const property of ['struck','excluded'])for(const selected of ['Citizens','Redis-','tricting','Commis-','sion']){const x=doc(lower),start=lower.indexOf(selected);x[property].push({start,end:start+selected.length});assert.deepEqual(run(x),[],property+' '+selected);}
 for(const text of ['County of Los Angeles Citizens Park.','County of Los Angeles Citizens Redistricting.']){const found=run(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,null);}
});
test('real corpus separator dash captions do not become unknown reversed county names',()=>{
 for(const dash of ['–','—'])for(const gap of [' ','\nline 27 '])assert.deepEqual(run('Apportionment'+dash+gap+'County'),[],dash+' '+gap);
 for(const dash of ['–','—']){const [i]=run('River'+dash+'\nline 27 side County shall act.');assert.ok(i);assert.equal(i.suggestion,null);}
 const [compound]=run('Veterans Home of California—Greater Los Angeles Ventura\nline 26 County—GLAVC');assert.ok(compound);assert.equal(compound.suggestion,null);
});
