import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {parseAmendments,verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';

const heading='Introduced by Assembly Member Bonta',coauthor='(Principal coauthor: Senator Menjivar)',date='January 9, 2025';
const title='An act relating to health care coverage.';
const bill=(headingRows=[heading],titleRows=[title])=>makeDocument([
  ['ASSEMBLY BILL No. 224',...headingRows,date,...titleRows,'LEGISLATIVE COUNSEL’S DIGEST','AB 224. Health care coverage.','The people of the State of California do enact as follows:','line 1 SECTION 1. Existing law.','- 0 -'].join('\n')
],'bill');

for(const relation of ['below','after'])test(`heading ${relation} line 1 verifies the AB 224 coauthor insertion without renumbering`,()=>{
  const instructions=`Amendment 1\nIn the heading, ${relation} line 1, insert:\n${coauthor}`;
  const previous=bill(),current=bill([heading,coauthor]),results=verifyAmendments(instructions,previous,current);
  assert.equal(results[0].status,'implemented',results[0].message);
  assert.equal(results[0].number,'1');assert.equal(results[0].evidence[0].previousOffset,previous.blocks.find(b=>b.text===heading).end);
  assert.equal(current.text.slice(results[0].evidence[0].currentOffset,results[0].evidence[0].currentEndOffset),coauthor);
  assert.deepEqual(nonAmendmentEdits(instructions,previous,current,results).ranges,[[],[]]);
  assert.equal(verifyAmendments(instructions,previous,previous)[0].status,'not-implemented');
  assert.equal(verifyAmendments(instructions,previous,bill([heading,coauthor.replace('Menjivar','Other')]))[0].status,'incorrect');
});

for(const relation of ['above','before'])test(`heading ${relation} line 2 inserts above the selected physical row`,()=>{
  const previous=bill([heading,'(Coauthor: Assembly Member Sample)']);
  const current=bill([heading,coauthor,'(Coauthor: Assembly Member Sample)']);
  const instruction=`In the heading, ${relation} line 2, insert:\n${coauthor}`;
  const result=verifyAmendments(instruction,previous,current)[0];assert.equal(result.status,'implemented',result.message);
  assert.equal(result.evidence[0].previousOffset,previous.text.indexOf('(Coauthor:'));
});

test('title relative lines stay inside the title rather than using enacted margin line 1',()=>{
  const instruction='In the title, below line 1, insert:\nand providing funding.';
  const previous=bill(),current=bill([heading],[title,'and providing funding.']);
  assert.equal(verifyAmendments(instruction,previous,current)[0].status,'implemented');
  const misplaced=makeDocument([previous.text.replace('line 1 SECTION 1. Existing law.','line 1 SECTION 1. Existing law.\nline 2 and providing funding.')],'current');
  assert.notEqual(verifyAmendments(instruction,previous,misplaced)[0].status,'implemented');
});

test('missing, nonpositive, multiple and wrong-page heading/title relative locations remain review cases',()=>{
  const previous=bill(),current=bill([heading,coauthor]);
  for(const directive of [
    'In the heading, below line 2, insert:',
    'In the heading, below line 0, insert:',
    'On page 2, in the heading, below line 1, insert:',
    'In the heading, below line 1 and above line 1, insert:',
    'In the heading and in the title, below line 1, insert:',
    'On page 1, below line 1, insert:',
    'In the heading, below line 1, strike out “Bonta” and insert:'
  ])assert.equal(verifyAmendments(`${directive}\n${coauthor}`,previous,current)[0].status,'needs-review',directive);
  assert.deepEqual(parseAmendments('In the heading, below line 1, insert:\n'+coauthor)[0].relativeLine,{position:'below',line:1});
});
