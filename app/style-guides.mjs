export const STYLE_GUIDES=[
  {id:'lcb',title:'LCB',name:'LCB Style Manual',edition:'2019',totalPages:23,defaultPage:1,referenceUrl:'./data/lcb-reference.json',pdfUrl:'./data/lcb-stylemanual-2019.pdf',primary:true},
  {id:'gpo',title:'GPO',name:'GPO Style Manual',edition:'2016',totalPages:475,defaultPage:5,referenceUrl:'./data/gpo-reference.json',pdfUrl:'./data/gpo-stylemanual-2016.pdf'}
];
export const CALIFORNIA_CODE_GUIDE=Object.freeze({id:'california-codes',title:'California Codes',name:'California Codes'});
export const CALIFORNIA_COUNTY_GUIDE=Object.freeze({id:'california-counties',title:'California Counties',name:'California Counties'});
export const guideById=id=>[...STYLE_GUIDES,CALIFORNIA_CODE_GUIDE,CALIFORNIA_COUNTY_GUIDE].find(g=>g.id===id)||STYLE_GUIDES[0];
