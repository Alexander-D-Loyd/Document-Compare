import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoListedCompoundIssues} from '../app/style-gpo-listed-compounds.mjs';
import {GPO_LISTED_COMPOUND_FORMS as rows,GPO_LISTED_COMPOUND_COUNTS as counts,GPO_LISTED_COMPOUND_SOURCE_PAGES as sourcePages,GPO_LISTED_COMPOUND_EXCLUSIONS as excluded,GPO_LISTED_COMPOUND_EXCLUSION_REASONS as reasons} from '../app/data/gpo-listed-compound-forms.mjs';
import {GPO_NOMINAL_FORMS} from '../app/gpo-nominal-forms.mjs';
import {attachGuideEvidence} from '../app/style-guide-evidence.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const make=text=>makeDocument(Array.isArray(text)?text:[text],'Current');
const check=text=>gpoListedCompoundIssues(make(text),refs);
const mutation=r=>r.preferred.includes('-')?r.preferred.replace(/-/gu,' '):r.preferred.includes(' ')?r.preferred.replace(/ /gu,'-'):r.head?r.head+' '+r.raw.replace(/\s*\(.*$/u,'').replace(/^[-#]/u,''):r.preferred.slice(0,2)+' '+r.preferred.slice(2);
const seeds=[['cyber security','cybersecurity'],['cyber bullying','cyberbullying'],['data set','dataset'],['crow bar','crowbar'],['cry baby','crybaby']];

test('independently transcribed original page142 seeds correct only with complete nominal evidence',()=>{
 for(const [variant,preferred] of seeds){const doc=make('The '+variant+' is recorded.'),found=gpoListedCompoundIssues(doc,refs);assert.equal(found.length,1,variant);const i=found[0];assert.equal(i.suggestion,preferred);assert.equal(i.guidePage,142);assert.equal(i.guidePrintedPage,'128');assert.equal(i.checkId,'gpo-listed-compounds');assert.equal(doc.text.slice(i.start,i.end),variant);assert.equal(doc.text.slice(i.evidenceStart,i.evidenceEnd),'The '+variant+' is');assert.equal(i.rule,'7. Compounding Examples');assert.equal(check('The '+preferred+' is recorded.').length,0);assert.equal(check(variant+' appears.').length,0);assert.equal(check('The '+variant+' program operates.').length,0);for(const c of attachGuideEvidence(i,refs).references){const p=refs.gpo.pages.find(p=>p.page===c.guidePage);assert.equal(p.text.slice(c.sourcePassage.start,c.sourcePassage.end),c.sourcePassage.text);}}
});

test('complete physical reconstruction is bounded, source-exact and explicitly accounts for unimplemented rows',()=>{
 assert.equal(counts.physicalPages,80);assert.equal(counts.physicalLines,13650);assert.equal(counts.logicalRows,13461);assert.equal(counts.boldHeads,1969);assert.equal(counts.sourceLineAlignmentMisses,0);assert.equal(rows.length,7176);assert.equal(counts.explicitNominalRows,233);assert.equal(counts.unqualifiedRows,6943);assert.equal(counts.manualRows,3765);assert.equal(counts.existingOwnedRows,551);assert.equal(excluded.length,4316);assert.equal(rows.length+counts.excludedRows,counts.logicalRows);assert.equal(new Set(rows.map(r=>r.key)).size,rows.length);
 assert.equal(sourcePages.length,82);for(const p of sourcePages)assert.equal(refs.gpo.pages.find(r=>r.page===p.page).text,p.text);
 for(const r of rows){assert.equal(r.key,r.preferred.replace(/[ -]/gu,''));assert.ok(r.page>=127&&r.page<=206);assert.equal(r.printedPage,String(r.page-14));assert.ok(r.sourcePassages.length);assert.ok(r.physical.every(p=>p.column>=0&&p.column<=3));for(const p of r.sourcePassages)assert.equal(refs.gpo.pages.find(r=>r.page===p.page).text.slice(p.start,p.end),p.text);}
 assert.ok(excluded.every(r=>r[0]>=127&&r[0]<=206&&reasons[r[3]]));assert.ok(excluded.some(r=>/Prefix\/combining/.test(reasons[r[3]])));assert.ok(excluded.some(r=>/literal\/nonliteral/.test(reasons[r[3]])));assert.ok(excluded.some(r=>/different compounding\/meaning/.test(reasons[r[3]])));
});

test('every finite mapped row accepts its canonical form and detects a same-letter spacing mutation',()=>{
 for(const r of rows){assert.equal(check('The '+r.preferred+' is recorded.').length,0,r.id);assert.ok(check('The '+mutation(r)+' is recorded.').some(i=>i.suggestion===r.preferred),r.id+' '+r.preferred);}
});

test('internal of/is words and adjacent nominal cues are scanned without prematurely truncating listed forms',()=>{
 for(const [variant,preferred] of [['here of','hereof'],['jack of all trades','jack-of-all-trades'],['middle of the roader','middle-of-the-roader'],['mother of pearl','mother-of-pearl'],['what is it','what-is-it'],['where of','whereof']])assert.ok(check('The '+variant+' is recorded.').some(i=>i.suggestion===preferred),variant);
 assert.deepEqual(check(seeds.map(([s])=>'The '+s+' is recorded.').join(' ')).map(i=>i.suggestion),seeds.map(r=>r[1]));
});

test('authority requires unique complete original support and physical source pages, even on source-head continuations',()=>{
 const doc=make('The cyber security is recorded.');assert.equal(gpoListedCompoundIssues(doc,{}).length,0);
 for(const page of [125,126,142])for(const kind of ['remove','change','duplicate','duplicate-changed']){const r=structuredClone(refs),p=r.gpo.pages.find(p=>p.page===page);if(kind==='remove')r.gpo.pages=r.gpo.pages.filter(p=>p.page!==page);if(kind==='change')p.text+='\nchanged';if(kind.startsWith('duplicate'))r.gpo.pages.push({...p,text:p.text+(kind==='duplicate-changed'?' changed':'')});assert.equal(gpoListedCompoundIssues(doc,r).length,0,page+' '+kind);}
 const r=rows.find(r=>r.headPage&&r.headPage!==r.page);assert.ok(r);const d=make('The '+mutation(r)+' is recorded.');assert.equal(gpoListedCompoundIssues(d,refs).length,1);const altered=structuredClone(refs);altered.gpo.pages.find(p=>p.page===r.headPage).text+=' changed';assert.equal(gpoListedCompoundIssues(d,altered).length,0);
});

test('every original cue, compound, separator and nominal continuation character survives both removal channels',()=>{
 for(const [variant] of seeds){const doc=make('The '+variant+' is recorded.'),[issue]=gpoListedCompoundIssues(doc,refs);assert.ok(issue);for(const channel of ['struck','excluded'])for(let at=issue.evidenceStart;at<issue.evidenceEnd;at++){const d=structuredClone(doc);d[channel]=[{start:at,end:at+1}];assert.equal(gpoListedCompoundIssues(d,refs).length,0,variant+' '+channel+' '+at);}}
});

test('literal enclosures, local defined forms, source names and their removed boundaries are protected',()=>{
 for(const [o,c] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text='Print '+o+'The cyber security is recorded'+c+'.',doc=make(text);assert.equal(gpoListedCompoundIssues(doc,refs).length,0,text);for(const channel of ['struck','excluded'])for(const at of [text.indexOf(o),text.lastIndexOf(c)]){const d=structuredClone(doc);d[channel]=[{start:at,end:at+1}];assert.equal(gpoListedCompoundIssues(d,refs).length,0,text+' '+channel);}}
 for(const text of ['“cyber security” is the defined term. The cyber security is recorded.','The Cyber Security is recorded.','THE CYBER SECURITY IS RECORDED.','The cyber security is hereby established.','The cyber security is created.','Model The cyber security is recorded.'])assert.equal(check(text).length,0,text);
});

test('source headings, tables and technical attachments never supply compound-noun evidence',()=>{
 const phrase='The cyber security is recorded.';const heading=make([phrase+'\nLEGISLATIVE COUNSEL’S DIGEST\nExisting law applies.','The people of the State of California do enact as follows:\nThe law applies.']);assert.equal(gpoListedCompoundIssues(heading,refs).length,0);
 const table=make(phrase);table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(gpoListedCompoundIssues(table,refs).length,0);
 for(const affix of ['X','é','𐐀','_','/','#','@','-','1','e\u0301'])for(const side of ['prefix','suffix']){const text=(side==='prefix'?affix:'')+phrase.replace(' is recorded.',' is'+(side==='suffix'?affix:'')+' recorded.'),base=make(text);assert.equal(gpoListedCompoundIssues(base,refs).length,0,text);for(const channel of ['struck','excluded']){const d=structuredClone(base),start=side==='prefix'?0:phrase.indexOf(' is')+3;d[channel]=[{start,end:start+affix.length}];assert.equal(gpoListedCompoundIssues(d,refs).length,0,channel+' '+text);}}
 for(const text of ['https://example.test/The cyber security is recorded.','The cyber security-ID is recorded.','The cyber/security is recorded.','The cyber - security is recorded.','The cyber--security is recorded.','The cyber—security is recorded.'])assert.equal(check(text).length,0,text);
});

test('LCB lexical owners and their differing or role-qualified alternatives are never overridden by this registry',()=>{
 const lcb=JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url))),keys=new Set();for(const p of lcb.pages.filter(p=>(p.page>=3&&p.page<=5)||(p.page>=9&&p.page<=15)))for(const raw of p.text.split('\n')){const form=raw.trim().replace(/^but:\s*/u,'').replace(/\s*\([^)]*\).*$/u,'').trim();if(/^[a-z]+(?:[ -][a-z]+)*$/u.test(form))keys.add(form.replace(/[ -]/gu,''));}
 assert.ok(rows.every(r=>!keys.has(r.key)));assert.ok(rows.every(r=>!GPO_NOMINAL_FORMS.some(n=>n.variant.replace(/[ -]/gu,'')===r.key)));
 for(const form of ['health care','horse race','groundwater','wildland','database','hands-free','cost-effective','startup','start up','bylaws','certificate holder','schoolbus'])assert.equal(check('The '+form+' is recorded.').length,0,form);
});

test('conditional source meanings, unlisted compounds, arbitrary modifiers and known human false positives remain quiet',()=>{
 for(const text of ['The base line is recorded.','The real time is recorded.','The common sense is recorded.','The free will is recorded.','The up tight is recorded.','The resource adequacy is sufficient.','The resource procurement is required.','The electric service is supplied.','The community choice is recorded.','The load-serving entities are listed.','The state-mandated local program is required.','The commission, if it determines that the consolidation is not feasible, shall explain its reasons.','The fictitious compound is recorded.'])assert.equal(check(text).length,0,text);
});

test('PDF word-division restoration preserves original offsets and does not mistake physical hyphen wraps for lexical errors',()=>{
 const doc=make('line 1 The cyber\nline 2 security is recorded.');const found=gpoListedCompoundIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].suggestion,'cybersecurity');assert.equal(check('The cyber-\nsecurity is recorded.').length,0);
 assert.equal(check('The cyber\u2011security is recorded.')[0]?.suggestion,'cybersecurity');
});
