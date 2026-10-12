import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
const item=(str,x,y,width,height=12)=>({str,transform:[height,0,0,height,x,y],width,height,fontName:'body'});
const read=items=>extractPageLayout(items,{fnArray:[],argsArray:[]},{},{},612);
test('Raised vote fraction stays inline while retaining its printed vertical offsets',()=>{
 const result=read([item('Vote: ',100,298.638,37.444),item('2',137.444,302.278,4,8),item('⁄',141.444,298.638,2.004),item('3',143.448,296.638,4,8),item('. Appropriation: yes.',147.448,298.638,100)]);
 assert.equal(result.text,'Vote: 2⁄3. Appropriation: yes.');
 assert.equal(result.lines.length,1);
 const digits=result.lines[0].runs.filter(r=>r.fractionOffset!==undefined);
 assert.equal(digits.length,2);assert.ok(Math.abs(digits[0].fractionOffset-3.64)<.001);assert.equal(digits[1].fractionOffset,-2);
});
test('Standalone page numbers and raised footnotes do not merge with ordinary prose',()=>{
 const result=read([item('2',137,304,4,8),item('Vote: majority.',100,298,100),item('98',500,40,10,8)]);
 assert.equal(result.lines.length,3);assert.ok(result.lines.every(r=>r.runs.every(run=>run.fractionOffset===undefined)));
});
test('A full-sized number on a separate line is not a numerator',()=>{
 const result=read([item('2',137,304,4,12),item('⁄3',141,298,10,12)]);
 assert.equal(result.lines.length,2);
});
