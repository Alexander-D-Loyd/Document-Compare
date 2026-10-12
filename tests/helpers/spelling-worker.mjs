import fs from 'node:fs';import vm from 'node:vm';
const app=new URL('../../app/',import.meta.url);
let response;
const context=vm.createContext({self:{postMessage:value=>{response=value;}},fetch:async file=>({ok:true,text:async()=>fs.readFileSync(new URL(file,app),'utf8')})});
context.importScripts=file=>vm.runInContext(fs.readFileSync(new URL(file,app),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('spelling-worker.js',app),'utf8'),context);
export async function workerSpell(candidates){
 response=undefined;await context.self.onmessage({data:{candidates:[[],candidates]}});
 if(response?.error)throw Error(response.error);
 return JSON.parse(JSON.stringify(response.issues[1]));
}
export async function workerWords(){
 await workerSpell([]);const dictionary=await vm.runInContext('dictionary',context);
 const guide=JSON.parse(fs.readFileSync(new URL('data/lcb-spelling-words.json',app),'utf8'));
 return new Set([...Array.from(dictionary.dictionaryTable.keys(),w=>w.toLowerCase()),...guide.words.map(r=>r.word.toLowerCase())]);
}
