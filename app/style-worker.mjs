import {jointStylisticIssues} from './joint-style.mjs';
import {STYLE_GUIDES} from './style-guides.mjs';
import {customStyleIssues} from './custom-style.mjs';
self.onmessage=async({data})=>{
  try{
    const references=Object.fromEntries(await Promise.all(STYLE_GUIDES.map(async guide=>{
      const response=await fetch(guide.referenceUrl);if(!response.ok)throw Error(`${guide.title} reference could not be loaded.`);
      return [guide.id,await response.json()];
    })));
    const issues=[...jointStylisticIssues(data.doc,references),...customStyleIssues(data.doc,data.terms||[])].sort((a,b)=>a.start-b.start||a.end-b.end).map((issue,id)=>({...issue,id}));
    self.postMessage({issues});
  }catch(error){self.postMessage({error:error.message||'Stylistic check could not finish.'});}
};
