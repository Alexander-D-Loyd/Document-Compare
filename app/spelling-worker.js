importScripts('vendor/typo.js');
let dictionary;
let guideWords;
async function loadDictionary() {
  const texts=await Promise.all(['index.aff','index.dic'].map(async file=>{
    const response=await fetch('vendor/en_US/'+file);
    if(!response.ok)throw Error('Could not load the local spelling dictionary.');
    return response.text();
  }));
  const response=await fetch('data/lcb-spelling-words.json');
  if(!response.ok)throw Error('Could not load the local guide spelling supplement.');
  const records=JSON.parse(await response.text());
  guideWords=new Set(records.words.flatMap(({word})=>[word,word[0].toUpperCase()+word.slice(1)]));
  return new Typo('en_US',texts[0],texts[1],{platform:'any'});
}
self.onmessage=async ({data})=>{
  try{
    dictionary ||= loadDictionary();
    const checker=await dictionary;
    const known=new Map();
    const issues=data.candidates.map(words=>words.filter(candidate=>{
      const word=candidate.word.replace(/’/g,"'").replace(/[\u2010\u2011]/g,'-');
      if(!known.has(word))known.set(word,guideWords.has(word)||checker.check(word) || (/['’]s$/i.test(word) && (guideWords.has(word.slice(0,-2))||checker.check(word.slice(0,-2)))) || (/s['’]$/i.test(word)&&guideWords.has(word.slice(0,-1))));
      if(candidate.parts?.length===2&&candidate.parts.every(part=>checker.check(part)))return false;
      return !known.get(word);
    }));
    self.postMessage({issues});
  }catch(error){self.postMessage({error:error.message || 'Spell check could not finish.'});}
};
