// Use the PDF drawing stream only for bounded, independently located text.
// Unknown transforms, font geometry, large TJ gaps and ambiguous item matches
// remain unchanged. Never remove a space explicitly present in a source word.
const matrix=args=>args?.length===1&&(Array.isArray(args[0])||ArrayBuffer.isView(args[0]))?Array.from(args[0]):args;
const horizontal=m=>m?.length===6&&m.every(Number.isFinite)&&Math.abs(m[0]-1)<1e-6&&Math.abs(m[1])+Math.abs(m[2])<1e-6&&Math.abs(m[3]-1)<1e-6;
const identity=m=>horizontal(m)&&Math.abs(m[4])+Math.abs(m[5])<1e-6;
const supportedTextMatrix=m=>m?.length===6&&m.every(Number.isFinite)&&m[0]>=.75&&m[0]<=1.5&&Math.abs(m[1])+Math.abs(m[2])<1e-6&&Math.abs(m[3]-1)<1e-6;
const compact=s=>s.replace(/\s/g,'');
export function sourceDrawingEvidence(operators,OPS){
 let state={font:null,size:0,spacing:0,wordSpacing:0,white:false,mode:0,tm:null,supported:true},pending=null;
 const stack=[],words=[],labels=[];
 const flush=()=>{if(pending){words.push(pending);pending=null;}};
 for(let i=0;i<operators.fnArray.length;i++){
  const op=operators.fnArray[i],a=operators.argsArray[i];
  if(op===OPS.save){stack.push({...state,tm:state.tm&&[...state.tm]});continue;}
  if(op===OPS.restore){flush();state=stack.pop()||{...state,tm:null,supported:false};continue;}
  if(op===OPS.paintFormXObjectBegin){flush();stack.push({...state,tm:state.tm&&[...state.tm]});if(a[0]&&!identity(a[0]))state.supported=false;continue;}
  if(op===OPS.paintFormXObjectEnd){flush();state=stack.pop()||{...state,tm:null,supported:false};continue;}
  if(op===OPS.transform){flush();if(a.some((v,j)=>Math.abs(v-[1,0,0,1,0,0][j])>1e-6))state.supported=false;continue;}
  if(op===OPS.setFont){state.font=a[0];state.size=a[1];continue;}
  if(op===OPS.setCharSpacing){state.spacing=a[0];continue;}
  if(op===OPS.setWordSpacing){state.wordSpacing=a[0];continue;}
  if(op===OPS.setTextRenderingMode){state.mode=a[0];continue;}
  if(op===OPS.setFillRGBColor){state.white=typeof a[0]==='string'?/^#(?:fff|ffffff)$/i.test(a[0]):a.length===3&&a.every(v=>v===1);continue;}
  if(op===OPS.setFillGray){state.white=a[0]===1;continue;}
  if(op===OPS.setFillColor||op===OPS.setFillCMYKColor||op===OPS.setFillColorN){state.white=false;continue;}
  if(op===OPS.setHScale&&a[0]!==100){flush();state.supported=false;continue;}
  if(op===OPS.beginText){flush();state.tm=null;continue;}
  if(op===OPS.setTextMatrix){state.tm=matrix(a);continue;}
  if([OPS.moveText,OPS.setLeadingMoveText,OPS.nextLine].includes(op)){flush();state.tm=null;continue;}
  if(op!==OPS.showText)continue;
  const glyphs=a[0],s=state;
  if(!s.supported||!supportedTextMatrix(s.tm)||!(s.size>=6&&s.size<=30)||!Array.isArray(glyphs)||glyphs.some(g=>typeof g==='number'?!Number.isFinite(g):typeof g?.unicode!=='string'||!Number.isFinite(g.width))){flush();state.tm=null;continue;}
  const scaleX=s.tm[0];
  let x=s.tm[4];const y=s.tm[5],raw=glyphs.map(g=>typeof g==='number'?'':g.unicode).join('');
  // A white native "line" label must begin left of the printed number. The
  // decoded item can have drifted into the body; its font/baseline still match.
  if(horizontal(s.tm)&&s.white&&s.mode===0&&s.spacing===0&&/^\s+line\s*$/.test(raw)&&x>=0&&x<60){
   // Accessibility labels can inherit the body's large word spacing. Their
   // white glyph location is not the printed gutter: retain the native text
   // origin and ordinary leading-space advance for this proven margin label.
   let left=x;for(const g of glyphs){if(typeof g==='number'||!/^\s+$/.test(g.unicode))break;left+=g.width*s.size/1000;}
   labels.push({x:left,y,font:s.font});
  }
  // Unsupported advances cannot establish the next drawing's origin. Wait
  // for an explicit text matrix rather than reusing a stale text location.
  if(!(s.spacing>.1)||glyphs.some(g=>typeof g==='number'&&Math.abs(g)>100)){flush();state.tm=null;continue;}
  for(const g of glyphs){
   if(typeof g==='number'){x-=g*s.size*scaleX/1000;continue;}
   const space=/^\s+$/.test(g.unicode),advance=(g.width*s.size/1000+s.spacing+(space?s.wordSpacing:0))*scaleX;
   if(space){flush();x+=advance;continue;}
   const gap=pending?x-pending.advanceEnd:0;
   // Small negative kerning at a new text matrix keeps a tracked word intact;
   // a positive separating gap or an explicit source space starts a new word.
   if(!pending||pending.font!==s.font||pending.size!==s.size||pending.spacing!==s.spacing||pending.scaleX!==scaleX||Math.abs(pending.y-y)>.05||gap<-.5||gap>.1){flush();pending={x,y,font:s.font,size:s.size,spacing:s.spacing,scaleX,text:'',glyphs:[],visibleEnd:x,advanceEnd:x};}
   pending.glyphs.push({text:g.unicode,x,width:g.width*s.size*scaleX/1000,start:pending.text.length,end:pending.text.length+g.unicode.length});
   pending.text+=g.unicode;pending.visibleEnd=x+g.width*s.size*scaleX/1000;pending.advanceEnd=x+advance;x+=advance;
  }
  state.tm=[...s.tm.slice(0,4),x,y];
 }
 flush();
 return {words,labels};
}
export function sourceTextEvidence(items,operators,OPS){
 const {words,labels}=sourceDrawingEvidence(operators,OPS);
 const corrected=items.map(item=>{
  if(typeof item.str!=='string')return item;
  const label=labels.filter(r=>item.str.trim()==='line'&&item.fontName===r.font&&Math.abs(item.transform[5]-r.y)<.1);
  if(label.length===1&&items.filter(other=>other.str?.trim()==='line'&&other.fontName===label[0].font&&Math.abs(other.transform[5]-label[0].y)<.1).length===1&&items.some(other=>/^\d+$/.test(other.str?.trim()||'')&&Math.abs(other.transform[5]-label[0].y)<.1&&other.transform[4]>label[0].x+item.width&&other.transform[4]+other.width<=70)){
   return {...item,transform:[...item.transform.slice(0,4),label[0].x,item.transform[5]],sourceMarginLabel:true};
  }
  const matches=words.filter(w=>w.font===item.fontName&&Math.abs(w.y-item.transform[5])<.1&&Math.abs(w.x-item.transform[4])<.1&&Math.abs(w.visibleEnd-w.x-item.width)<.25&&compact(item.str)===w.text&&(w.scaleX===1||Math.abs(item.height-w.size)<.1&&Math.abs(item.transform[0]-w.size*w.scaleX)<.1&&Math.abs(item.transform[1])+Math.abs(item.transform[2])<1e-6&&Math.abs(item.transform[3]-w.size)<.1));
  if(matches.length!==1||items.filter(other=>typeof other.str==='string'&&other.fontName===item.fontName&&Math.abs(other.transform[4]-item.transform[4])<.1&&Math.abs(other.transform[5]-item.transform[5])<.1).length!==1)return item;
  const word=matches[0];
  return {...item,str:word.text,sourceCharSpacing:physicalTracking(word),...(word.scaleX!==1?{sourceGlyphs:word.glyphs}: {})};
 });
 return mergeTrackedFragments(corrected,words);
}

// Large positive tracking can make PDF.js emit one item per glyph, with
// synthetic zero-height spaces between them. Join only a complete native word
// after verifying every fragment boundary and each gap against source glyphs.
function mergeTrackedFragments(items,words){
 const replacements=new Map(),removed=new Set();
 for(const word of words){
  if(words.some(other=>other!==word&&Math.abs(other.y-word.y)<.1&&other.x<word.visibleEnd&&other.visibleEnd>word.x))continue;
  const candidates=items.map((item,index)=>({item,index})).filter(({item})=>typeof item.str==='string'&&Math.abs(item.transform[5]-word.y)<.1&&item.transform[4]+item.width>word.x+.05&&item.transform[4]<word.visibleEnd-.05);
  const visible=candidates.filter(({item})=>item.str.trim());if(visible.length<2||candidates.some(({item,index})=>removed.has(index)||item.fontName!==word.font)||visible.some(({item})=>Boolean(item.ocrStruck)!==Boolean(visible[0].item.ocrStruck)))continue;
  candidates.sort((a,b)=>a.item.transform[4]-b.item.transform[4]||a.index-b.index);
  let glyph=0,valid=true,previous=null;
  for(const {item}of candidates){
   const x=item.transform[4];
   if(!item.str.trim()){
    const next=word.glyphs[glyph];
    if(item.height!==0||!previous||!next||Math.abs(x-previous.x-previous.width)>.1||Math.abs(x+item.width-next.x)>.1){valid=false;break;}
    continue;
   }
   if(Math.abs(item.height-word.size)>.1||Math.abs(item.transform[1])+Math.abs(item.transform[2])>1e-6||word.scaleX!==1&&Math.abs(item.transform[0]-word.size*word.scaleX)>.1||!word.glyphs[glyph]||Math.abs(x-word.glyphs[glyph].x)>.1){valid=false;break;}
   const text=compact(item.str);let shown='';
   while(glyph<word.glyphs.length&&shown.length<text.length){previous=word.glyphs[glyph++];shown+=previous.text;}
   if(shown!==text||Math.abs(x+item.width-previous.x-previous.width)>.25){valid=false;break;}
  }
  if(!valid||glyph!==word.glyphs.length)continue;
  const first=visible.reduce((a,b)=>a.item.transform[4]<b.item.transform[4]?a:b),last=visible.reduce((a,b)=>a.item.transform[4]>b.item.transform[4]?a:b);
  replacements.set(first.index,{...first.item,str:word.text,width:word.visibleEnd-word.x,sourceCharSpacing:physicalTracking(word),sourceGlyphs:word.glyphs,hasEOL:last.item.hasEOL});
  for(const {index}of candidates)if(index!==first.index)removed.add(index);
 }
 return items.flatMap((item,index)=>removed.has(index)?[]:[replacements.get(index)||item]);
}

// Separate text matrices can contain small source kerning. For newly supported
// stretched text, derive displayed tracking from the actual source origins.
// Existing unscaled tracking retains its original metadata and typography.
function physicalTracking(word){
 if(word.scaleX===1||word.glyphs.length<2)return word.spacing;
 return word.glyphs.slice(1).reduce((sum,g,i)=>sum+g.x-word.glyphs[i].x-word.glyphs[i].width,0)/(word.glyphs.length-1);
}
