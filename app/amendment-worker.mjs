import {verifyAmendments,nonAmendmentEdits} from './amendments.mjs';
self.onmessage=({data})=>{
  try{const results=verifyAmendments(data.text,data.previous,data.current);const otherEdits=nonAmendmentEdits(data.text,data.previous,data.current,results);self.postMessage({results,otherEdits});}
  catch(error){self.postMessage({error:error.message || 'Amendment verification failed.'});}
};
