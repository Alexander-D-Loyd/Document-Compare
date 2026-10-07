export const STYLE_GUIDES=[
  {id:'lcb',title:'LCB',name:'LCB Style Manual',edition:'2019',totalPages:23,defaultPage:1,referenceUrl:'./data/lcb-reference.json',pdfUrl:'./data/lcb-stylemanual-2019.pdf',primary:true},
  {id:'gpo',title:'GPO',name:'GPO Style Manual',edition:'2016',totalPages:475,defaultPage:5,referenceUrl:'./data/gpo-reference.json',pdfUrl:'./data/gpo-stylemanual-2016.pdf'}
];
export const guideById=id=>STYLE_GUIDES.find(g=>g.id===id)||STYLE_GUIDES[0];
