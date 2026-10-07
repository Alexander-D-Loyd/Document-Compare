import assert from 'node:assert/strict';
import {reviewOutline} from '../app/review-outline.mjs';
const outline=reviewOutline([
  {left:150,right:300,top:10,bottom:28},
  {left:50,right:130,top:40,bottom:58},
  {left:130,right:200,top:40,bottom:58}
]);
assert.equal(outline.rows.length,2,'Font and review spans on one line share one contour');
assert.equal(outline.rows[0].left,150,'First line begins at the first changed character');
assert.equal(outline.rows[1].right,200,'Last line ends at the last changed character');
assert.ok(outline.path.startsWith('M 100 0 L 256 0'));
assert.ok(outline.path.includes('L 156 54 L 0 54'));
assert.equal((outline.path.match(/M /g)||[]).length,1,'Wrapped text uses one connected outline');
assert.ok(outline.path.endsWith(' Z'));
assert.equal(reviewOutline([]),null);
assert.equal(reviewOutline([{left:0,right:0,top:0,bottom:10}]),null,'Hidden source text has no outline');
console.log('PASS: connected outline follows exact first/last text bounds across wrapped lines and font runs');
