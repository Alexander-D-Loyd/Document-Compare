importScripts('vendor/typo.js');
let dictionary;
async function loadDictionary() {
  const texts=await Promise.all(['index.aff','index.dic'].map(async file=>{
    const response=await fetch('vendor/en_US/'+file);
    if(!response.ok)throw Error('Could not load the local spelling dictionary.');
    return response.text();
  }));
  return new Typo('en_US',texts[0],texts[1],{platform:'any'});
}
self.onmessage=async ({data})=>{
  try{
    dictionary ||= loadDictionary();
    const checker=await dictionary;
    const known=new Map();
    const issues=data.candidates.map(words=>words.filter(candidate=>{
      const word=candidate.word.replace(/’/g,"'");
      if(!known.has(word))known.set(word,checker.check(word) || (/['’]s$/i.test(word) && checker.check(word.slice(0,-2))));
      if(candidate.parts&&candidate.parts.every(part=>checker.check(part)))return false;
      return !known.get(word);
    }));
    self.postMessage({issues});
  }catch(error){self.postMessage({error:error.message || 'Spell check could not finish.'});}
};
