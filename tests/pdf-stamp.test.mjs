import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
test('rotated secured-copy stamps are excluded while ordinary body copy remains',()=>{
 const body={str:'Copy this provision.',transform:[12,0,0,12,60,700],width:100,height:12,fontName:'body'};
 const stamp=str=>({str,transform:[0,32,-32,0,130,650],width:120,height:32,fontName:'stamp'});
 const layout=extractPageLayout([body,stamp('SECURED'),stamp('COPY')],{fnArray:[],argsArray:[]},{},{},612);
 assert.equal(layout.text,'Copy this provision.');assert.equal(layout.lines.length,1);
});
