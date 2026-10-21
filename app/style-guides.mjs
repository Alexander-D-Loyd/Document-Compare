export const STYLE_GUIDES=[
  {id:'lcb',title:'LCB',name:'LCB Style Manual',edition:'2019',totalPages:23,defaultPage:1,referenceUrl:'./data/lcb-reference.json',pdfUrl:'./data/lcb-stylemanual-2019.pdf',primary:true},
  {id:'gpo',title:'GPO',name:'GPO Style Manual',edition:'2016',totalPages:475,defaultPage:5,referenceUrl:'./data/gpo-reference.json',pdfUrl:'./data/gpo-stylemanual-2016.pdf'}
];
export const CALIFORNIA_CODE_GUIDE=Object.freeze({id:'california-codes',title:'California Codes',name:'California Codes'});
export const guideById=id=>STYLE_GUIDES.find(g=>g.id===id)||(id===CALIFORNIA_CODE_GUIDE.id?CALIFORNIA_CODE_GUIDE:STYLE_GUIDES[0]);
