import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoExplicitSpellingIssues as check,GPO_EXPLICIT_SPELLING_SCOPE} from '../app/style-gpo-explicit-spelling.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
function run(input,options={},references=refs){const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),found=check(d,references,options);assert.equal(JSON.stringify(d),before);for(const i of found){assert.equal(d.text.slice(i.start,i.end),i.text);const c=i.references[0],p=references.gpo.pages[96];assert.equal(p.text.slice(c.sourcePassage.start,c.sourcePassage.end),c.sourcePassage.text);}return found;}
test('only the one original printed negative spelling row creates a finite base-word comparison',()=>{
 assert.match(GPO_EXPLICIT_SPELLING_SCOPE,/One exact printed/);const [i]=run('Keep inflammable liquids separate.');assert.ok(i);assert.equal(i.text,'inflammable');assert.equal(i.suggestion,'flammable');assert.equal(i.guidePage,97);assert.equal(i.guidePrintedPage,'83');assert.match(i.references[0].sourcePassage.text,/flammable \(not\s+inflammable\)/);
 for(const text of ['Keep flammable liquids separate.','Keep Inflammable liquids separate.','Keep INFLAMMABLE liquids separate.','Keep inflammables separate.','Keep noninflammable liquids separate.','The device and devise are listed.','The discreet and discrete forms are listed.','Ensure and insure are valid.'])assert.deepEqual(run(text),[],text);
});
test('the complete original spelling must survive every character under both source removal channels',()=>{
 const d=make('Keep inflammable liquids separate.'),at=d.text.indexOf('inflammable');for(const channel of ['struck','excluded'])for(let n=0;n<'inflammable'.length;n++){const copy=structuredClone(d);copy[channel].push({start:at+n,end:at+n+1});assert.deepEqual(run(copy),[],channel+' '+n);}
});
test('quotes declared local forms names headings tables and technical identities remain protected',()=>{
 for(const text of ['Keep “inflammable” liquids.','Keep "inflammable" liquids.',"Keep 'inflammable' liquids.",'“inflammable” is the term. Keep inflammable liquids.','For this section inflammable means material. Keep inflammable liquids.','For this section inflammable shall mean material. Keep inflammable liquids.','For this section inflammable is defined as material. Keep inflammable liquids.','The inflammable Program applies.','The inflammable West Foundation is hereby established.','The identifier inflammable applies.','The token: inflammable applies.','Use path/inflammable.','Use inflammable.json.','Use non-inflammable.'])assert.deepEqual(run(text),[],text);
 const table=make('Keep inflammable liquids.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
 assert.deepEqual(run(makeDocument(['Keep inflammable liquids.\nThe people do enact as follows:'],'Current')),[]);
 for(const channel of ['struck','excluded'])for(const [text,word]of [['“inflammable” is the word.','“'],['The inflammable West Foundation is hereby established.','West'],['For this section inflammable means material. Keep inflammable liquids.','means']]){const d=make(text),at=d.text.indexOf(word);d[channel].push({start:at,end:at+word.length});assert.deepEqual(run(d),[],channel+' '+text);}
});
test('masked Unicode delimiters cannot expose attached technical or lexical fragments',()=>{
 for(const [pre,post]of [['é',''],['𐐀',''],['\u0301',''],['pre-',''],['path/',''],['','é'],['','\u0301'],['','_key'],['','/key'],['','.key'],['',"'s"]]){
  const d=make('Keep '+pre+'inflammable'+post+'.');assert.deepEqual(run(d),[],pre+' / '+post);for(const channel of ['struck','excluded']){const copy=structuredClone(d),at=d.text.indexOf(pre||post);copy[channel].push({start:at,end:at+(pre||post).length});assert.deepEqual(run(copy),[],channel+' '+pre+' / '+post);}
 }
});
test('only an explicit contradictory primary preference, not dictionary acceptance, vetoes this GPO choice',()=>{
 const d=make('Keep inflammable liquids.'),[i]=run(d);assert.deepEqual(run(d,{existingIssues:[{guideId:'lcb',start:i.start,end:i.end}]}),[]);
 for(const authority of ['Office preference list','Merriam-Webster'])assert.deepEqual(run(d,{authority:{authority,entries:[{entry:'licensed/source row',spellings:['inflammable','flammable']}]}}),[]);
 for(const spellings of [['inflammable'],['inflammable','inflammables'],['flammable','inflammable']])assert.equal(run(d,{authority:{authority:'Merriam-Webster',entries:[{entry:'source word',spellings}]}}).length,1);
 const accepted=structuredClone(refs);accepted.lcb.pages[2].lexicalEntries=['inflammable'];assert.equal(run(d,{},accepted).length,1);
 const changed=structuredClone(refs),p=changed.gpo.pages[96],w=i.references[0].sourcePassage;p.text=p.text.slice(0,w.start)+'X'+p.text.slice(w.start+1);assert.deepEqual(run(d,{},changed),[]);
});
