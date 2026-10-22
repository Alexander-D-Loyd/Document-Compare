import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoStandardItDefinitionIssues,gpoStandardAbbreviationDefinitionIssues,gpoItAbbreviationDefinitionIssues} from '../app/style-gpo-standard-it-definitions.mjs';
import {GPO_STANDARD_IT_DEFINITIONS as rows,GPO_STANDARD_IT_DEFINITION_EXCLUSIONS as exclusions,GPO_STANDARD_IT_DEFINITION_COUNTS as counts} from '../app/data/gpo-standard-it-definitions.mjs';
import {attachGuideEvidence} from '../app/style-guide-evidence.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const make=text=>makeDocument(Array.isArray(text)?text:[text],'Current');
const check=text=>gpoStandardItDefinitionIssues(make(text),refs);
const original=(doc,issue)=>{
 assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 assert.ok(issue.evidenceStart<=issue.start&&issue.evidenceEnd>=issue.end);
 for(const c of attachGuideEvidence(issue,refs).references){assert.ok(['9.61','9.64'].includes(c.rule));const p=refs.gpo.pages.find(p=>p.page===c.guidePage);assert.equal(p.text.slice(c.sourcePassage.start,c.sourcePassage.end),c.sourcePassage.text);assert.equal(c.guidePrintedPage,p.printedPage);}
};
// Independent page-by-page transcriptions of original printed rows.
const probes=[
 [252,'Alcoholics Anonymous','A.A.'],[253,'automatic teller machine','ATM'],[254,'cardiopulmonary resuscitation','CPR'],[255,'Department of State','DoS'],[256,'government furnished equipment','GFE'],[257,'inspector general','IG'],[258,'National Association of Counties','NACo.'],[259,'personal identification number','PIN'],[260,'standard operating procedure','SOP'],[261,'World Health Organization','WHO'],
 [270,'Application Programming Interface','API'],[271,'denial of service','DoS'],[272,'Internet of Things','IoT'],[273,'optical character recognition','OCR'],[274,'transport layer security','TLS'],[275,'Extensible Markup Language','XML']
];

test('all sixteen physically inspected source pages supply exact definition authority and independent corrections',()=>{
 assert.equal(new Set(probes.map(r=>r[0])).size,16);
 for(const [page,name,symbol]of probes){const wrong=symbol===symbol.toLowerCase()?symbol.toUpperCase():symbol.toLowerCase();const doc=make('Use '+name+' ('+wrong+').'),found=gpoStandardItDefinitionIssues(doc,refs);assert.equal(found.length,1,name);assert.equal(found[0].suggestion,symbol);assert.ok(found[0].references.some(c=>c.guidePage===page),name);original(doc,found[0]);}
});

test('all included physical rows and every printed alternative are quiet and source-bound',()=>{
 assert.deepEqual(counts,{mappedSourceRows:726,mappedByFamily:{standard:424,it:302},excludedSourceRows:131,excludedByFamily:{standard:114,it:17},physicalSourcePages:16});
 assert.equal(rows.length,726);assert.equal(exclusions.length,131);
 for(const r of rows){const p=refs.gpo.pages.find(p=>p.page===r.page);assert.equal(p.text.slice(r.start,r.end),r.sourceText,r.id);assert.ok(r.sourceText.includes('—'));for(const form of r.forms)assert.equal(check('Use '+r.name+' ('+form+').').length,0,r.id+' / '+form);}
 assert.ok(exclusions.every(r=>r.reason&&refs.gpo.pages.find(p=>p.page===r.page).text.slice(r.start,r.end)===r.sourceText));
});

test('same-letter case/dot/spacing variants compare only the exact printed abbreviation and preserve expansion case',()=>{
 for(const [text,want]of [
  ['Use CARDIOPULMONARY RESUSCITATION (c.p.r.).','CPR'],
  ['Use application programming interface (a p i).','API'],
  ['Use Alcoholics Anonymous (A A).','A.A.'],
  ['Use Department of Defense (DOD).','DoD'],
  ['Use Internet of Things (IOT).','IoT'],
  ['Use Extensible Stylesheet Language (x. s. l.).','XSL']
 ]){const doc=make(text),saved=JSON.stringify(doc),found=gpoStandardItDefinitionIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),[want],text);original(doc,found[0]);assert.equal(JSON.stringify(doc),saved);assert.ok(!found[0].text.includes('RESUSCITATION'));}
 for(const text of ['Use bachelor of arts (A.B.) and bachelor of arts (B.A.).','Use bachelor of science (B.Sc.) and bachelor of science (B.S.).','Use inspector general (Insp. Gen.) and inspector general (IG).'])assert.equal(check(text).length,0,text);
});

test('all included uppercase/lowercase alternatives have complete name/abbreviation mutation coverage',()=>{
 let forms=0;
 for(const r of rows)for(const form of r.forms){const wrong=form===form.toLowerCase()?form.toUpperCase():form.toLowerCase(),found=check('Use '+r.name+' ('+wrong+').');assert.equal(found.length,1,r.id+' / '+form);assert.equal(found[0].suggestion,form);forms++;}
 assert.equal(forms,732);
});

test('full names disambiguate each duplicated acronym; unknown and unpaired identities stay quiet',()=>{
 for(const [name,symbol]of [['Integrated Development Environment','IDE'],['Integrated Drive Electronics','IDE'],['System Design Diagram','SDD'],['System Design Document','SDD'],['Solid State Drive','SSD'],['System Security Diagram','SSD'],['hardware security module','HSM'],['Hierarchical Storage Management','HSM']])assert.deepEqual(check('Use '+name+' ('+symbol.toLowerCase()+').').map(i=>i.suggestion),[symbol],name);
 for(const text of ['The cpr, api, IDE, SDD and SSD entries are identifiers.','Use cardiopulmonary recovery (cpr).','Use cardiopulmonary resuscitation (CPA).','Use transport layer security (TSL).','Use API (Application Programming Interface).','Use Application Programming Interface [api].','Use a newer agency name (fbi).','Use Universal Unique Identifier (uuid).'])assert.equal(check(text).length,0,text);
});

test('source typos, conditional numbered rows, explanatory and superscript exclusions remain explicit',()=>{
 for(const [symbol,page]of [['UUID',274],['DPT',255],['H.R. (with number)',256],['4 ̊',252],['SQL/XML',274],['SPAR',260]])assert.ok(exclusions.some(r=>r.symbol===symbol&&r.page===page&&r.reason),symbol);
 assert.equal(check('Use Universal Unique Identifer (uuid).').length,0);
 assert.equal(check('Use House bill (h.r.).').length,0);
 assert.equal(check('Use System Design Diagram (sdd).').length,1,'multiple meanings are checked only with a complete identity witness');
});

test('missing altered or duplicated source authority cannot authorize a correction',()=>{
 const doc=make('Use cardiopulmonary resuscitation (cpr).'),r=rows.find(r=>r.name==='cardiopulmonary resuscitation');
 assert.equal(gpoStandardItDefinitionIssues(doc,{}).length,0);
 for(const change of [s=>s.replace(r.sourceText,'CPR—unrelated phrase'),s=>s+'\n'+r.sourceText]){const altered=structuredClone(refs),p=altered.gpo.pages.find(p=>p.page===254);p.text=change(p.text);assert.equal(gpoStandardItDefinitionIssues(doc,altered).length,0);}
 const altered=structuredClone(refs);altered.gpo.pages.find(p=>p.page===252).text=altered.gpo.pages.find(p=>p.page===252).text.replace('9.61.','9.62.');assert.equal(gpoStandardItDefinitionIssues(doc,altered).length,0);
 const it=make('Use transport layer security (tls).'),missing=structuredClone(refs);missing.gpo.pages.find(p=>p.page===270).text=missing.gpo.pages.find(p=>p.page===270).text.replace('Use these forms, if abbreviations are required:','Use unspecified alternatives:');assert.equal(gpoStandardItDefinitionIssues(it,missing).length,0);
});

test('every original full name separator parenthesis and abbreviation character is required through both removal channels',()=>{
 for(const text of ['Use cardiopulmonary resuscitation (c.p.r.).','Use Application Programming Interface (a p i).']){const base=make(text),[issue]=gpoStandardItDefinitionIssues(base,refs);assert.ok(issue);for(const channel of ['struck','excluded'])for(let at=issue.evidenceStart;at<issue.evidenceEnd;at++){const d=structuredClone(base);d[channel]=[{start:at,end:at+1}];assert.equal(gpoStandardItDefinitionIssues(d,refs).length,0,channel+' '+at+' '+JSON.stringify(text[at]));}}
});

test('literal and bill-local quotations including original removed enclosure marks stay protected',()=>{
 const phrase='cardiopulmonary resuscitation (cpr)';
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text='Print '+open+phrase+close+'.',d=make(text);assert.equal(gpoStandardItDefinitionIssues(d,refs).length,0,text);for(const channel of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const x=structuredClone(d);x[channel]=[{start:at,end:at+1}];assert.equal(gpoStandardItDefinitionIssues(x,refs).length,0,text+' '+channel);}}
 assert.equal(check('“cardiopulmonary resuscitation (cpr)” is the defined form. Use '+phrase+'.').length,0);
 assert.equal(check('“cpr” is the local defined spelling. Use '+phrase+'.').length,0);
});

test('headings tables names identifiers and original Unicode/technical attachments cannot expose a partial definition',()=>{
 const phrase='cardiopulmonary resuscitation (cpr)';
 for(const text of ['The '+phrase+' Program is created.','The '+phrase+' is hereby established.','Model '+phrase+'.','Use https://example.test/'+phrase+'.','Use '+phrase+'/ID.','Use '+phrase+'#1.','Use _'+phrase+'.'])assert.equal(check(text).length,0,text);
 for(const affix of ['X','é','𐐀','_','/','#','@','-','1','e\u0301'])for(const side of ['prefix','suffix']){const text='Use '+(side==='prefix'?affix:'')+phrase+(side==='suffix'?affix:'')+'.',base=make(text);assert.equal(gpoStandardItDefinitionIssues(base,refs).length,0,text);for(const channel of ['struck','excluded']){const d=structuredClone(base),start=side==='prefix'?4:4+phrase.length;d[channel]=[{start,end:start+affix.length}];assert.equal(gpoStandardItDefinitionIssues(d,refs).length,0,channel+' '+text);}}
 const heading=make([phrase+'\nLEGISLATIVE COUNSEL’S DIGEST\nExisting law applies.','The people of the State of California do enact as follows:\nThe law applies.']);assert.equal(gpoStandardItDefinitionIssues(heading,refs).length,0);
 const table=make(phrase+'\nThe office acts.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(gpoStandardItDefinitionIssues(table,refs).length,0);
});

test('explicit structural dash glyphs are retained and source PDF word divisions map to exact physical highlights',()=>{
 for(const [actual,want]of [['c-span','C-SPAN'],['c–span','C–SPAN']])assert.deepEqual(check('Use Cable Satellite Public Affairs Network ('+actual+').').map(i=>i.suggestion),[want]);
 const doc=make('line 1 Use cardiopulmonary resus-\nline 2 citation (c p r).'),found=gpoStandardItDefinitionIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'c p r');assert.equal(found[0].suggestion,'CPR');original(doc,found[0]);
 assert.equal(check('Use high—definition television (hdtv).').length,0,'narrative dash cannot create a listed name');
});

test('family-specific exports share complete witness guards and do not expand the other table implicitly',()=>{
 const doc=make('Use cardiopulmonary resuscitation (cpr), transport layer security (tls), and high definition television (hdtv).');assert.deepEqual(gpoStandardAbbreviationDefinitionIssues(doc,refs).map(i=>i.suggestion),['CPR','HDTV']);assert.deepEqual(gpoItAbbreviationDefinitionIssues(doc,refs).map(i=>i.suggestion),['TLS','HDTV']);
});
