import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {guidePassage} from '../app/style-guide-evidence.mjs';
const reference=JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)));
const raw='2 by 4 or 2 x 4 (lumber) (not 2/H115034)';
const citation={guideId:'gpo',guidePage:290,rule:'12.9(j)',sourcePassage:{page:290,start:938,end:978,text:raw}};
test('visually verified lumber multiplication sign displays without changing raw source evidence',()=>{
 const before=JSON.stringify(reference),finding=guidePassage(reference,citation);
 assert.equal(finding.text,raw);assert.equal(reference.pages[289].text.slice(finding.start,finding.end),finding.text);
 assert.equal(finding.displayText,'2 by 4 or 2 x 4 (lumber) (not 2×4)');assert.equal(finding.glyphTranscription.reading,'×');
 assert.equal(JSON.stringify(reference),before);assert.equal(citation.sourcePassage.text,raw);
});
test('changed, duplicate, unrelated or unverified source passages never acquire a glyph transcription',()=>{
 for(const edit of [r=>r.pages[289].text+=' ',r=>r.pages[289].printedPage='275',r=>r.pages.push({...r.pages[289]})]){
  const copy=structuredClone(reference);edit(copy);assert.equal(guidePassage(copy,citation).displayText,undefined);
 }
 const different={...citation,sourcePassage:{...citation.sourcePassage,start:939,text:raw.slice(1)}};
 assert.equal(guidePassage(reference,different).displayText,undefined);
 const unrelated={...citation,guidePage:289,sourcePassage:null};assert.equal(guidePassage(reference,unrelated).displayText,undefined);
});
