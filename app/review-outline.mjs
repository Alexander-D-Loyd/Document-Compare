// A single stepped contour follows the text on each visual line, rather than
// boxing unchanged text before the first word or after the last word.
export function reviewOutline(rects,padding=3){
  const rows=[];
  for(const rect of rects.filter(r=>r.right>r.left&&r.bottom>r.top).sort((a,b)=>a.top-b.top||a.left-b.left)){
    const row=rows.find(r=>Math.min(r.bottom,rect.bottom)-Math.max(r.top,rect.top)>Math.min(r.bottom-r.top,rect.bottom-rect.top)*.5);
    if(row){row.left=Math.min(row.left,rect.left);row.right=Math.max(row.right,rect.right);row.top=Math.min(row.top,rect.top);row.bottom=Math.max(row.bottom,rect.bottom);}
    else rows.push({left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom});
  }
  if(!rows.length)return null;
  rows.sort((a,b)=>a.top-b.top);
  const left=Math.min(...rows.map(r=>r.left))-padding,top=rows[0].top-padding;
  const right=Math.max(...rows.map(r=>r.right))+padding,bottom=rows.at(-1).bottom+padding;
  const bands=rows.map(r=>({left:r.left-left-padding,right:r.right-left+padding,top:r.top-top-padding,bottom:r.bottom-top+padding}));
  const points=[[bands[0].left,0],[bands[0].right,0]];
  for(let i=0;i<bands.length-1;i++){
    const a=bands[i],b=bands[i+1],upper=Math.min(a.bottom,b.top),lower=Math.max(a.bottom,b.top);
    // Follow the union of the padded line bands. A midpoint transition can
    // clip the end of a tall glyph when adjacent lines are tightly spaced.
    points.push([a.right,upper],[Math.max(a.right,b.right),upper],[Math.max(a.right,b.right),lower],[b.right,lower]);
  }
  const last=bands.at(-1);points.push([last.right,bottom-top],[last.left,bottom-top]);
  for(let i=bands.length-1;i>0;i--){
    const a=bands[i],b=bands[i-1],upper=Math.min(b.bottom,a.top),lower=Math.max(b.bottom,a.top);
    points.push([a.left,lower],[Math.min(a.left,b.left),lower],[Math.min(a.left,b.left),upper],[b.left,upper]);
  }
  return {left,top,width:right-left,height:bottom-top,rows,path:points.map((p,i)=>`${i?'L':'M'} ${p[0]} ${p[1]}`).join(' ')+' Z'};
}
