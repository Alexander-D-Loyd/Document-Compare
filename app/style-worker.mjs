import {reviewStyleIssues} from './style-review.mjs';
import {STYLE_GUIDES} from './style-guides.mjs';
import {customStyleIssues} from './custom-style.mjs';
import {lcbReviewReadiness} from './lcb-review-readiness.mjs';
self.onmessage=async({data})=>{
  try{
    const references=Object.fromEntries(await Promise.all(STYLE_GUIDES.map(async guide=>{
      const response=await fetch(guide.referenceUrl);if(!response.ok)throw Error(`${guide.title} reference could not be loaded.`);
      return [guide.id,await response.json()];
    })));
    const issues=[...reviewStyleIssues(data.doc,references,{engineIssues:data.engineIssues||[],includeReviewSuggestions:true,includeCompleteLcbReview:true,authority:data.authority||null,entityAuthority:data.entityAuthority||null}),...customStyleIssues(data.doc,data.terms||[])].sort((a,b)=>a.start-b.start||a.end-b.end).map((issue,id)=>({...issue,id}));
    self.postMessage({issues,lcbReadiness:lcbReviewReadiness(references,{authority:data.authority||null,entityAuthority:data.entityAuthority||null,analysisCoverage:data.analysisCoverage||null})});
  }catch(error){self.postMessage({error:error.message||'Stylistic check could not finish.'});}
};
