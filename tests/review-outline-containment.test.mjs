import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewOutline} from '../app/review-outline.mjs';
const contains=(polygon,x,y)=>{
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
};
test('stepped contours enclose every glyph on tightly spaced lines with different widths',()=>{
 for(const gap of [0,1,2,5,12])for(const reverse of [false,true]){
  const rects=[{left:reverse?10:90,right:reverse?200:130,top:0,bottom:20},{left:reverse?90:10,right:reverse?130:200,top:20+gap,bottom:40+gap}];
  const o=reviewOutline(rects),polygon=[...o.path.matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
  for(const r of rects)for(const x of [r.left+.1,r.right-.1])for(const y of [r.top+.1,r.bottom-.1])assert.ok(contains(polygon,x-o.left,y-o.top),JSON.stringify({gap,reverse,r,x,y,path:o.path}));
 }
});
