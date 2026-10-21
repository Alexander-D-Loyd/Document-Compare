const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),readline=require('node:readline');
function createEngineHost({runtimeRoot,idleMs=120000,timeoutMs=300000,stopGraceMs=8000,spawnProcess=spawn,killProcess=pid=>process.kill(pid)}={}){
 let child=null,javaPid=null,idle=null,lines=null;const pending=new Map();
 const unavailable=()=>({issues:[],error:'Bundled offline language engines are unavailable. Existing local checks remain available.'});
 const resolveAll=()=>{for(const r of pending.values()){clearTimeout(r.timer);r.resolve(unavailable());}pending.clear();};
 const schedule=()=>{clearTimeout(idle);if(!pending.size)idle=setTimeout(()=>stop(),idleMs).unref();};
 const send=value=>{if(child?.stdin.writable)child.stdin.write(JSON.stringify(value)+'\n');};
 function stop(){
  clearTimeout(idle);idle=null;const previous=child;child=null;lines?.close();lines=null;resolveAll();
  if(previous){const ownedJava=javaPid;javaPid=null;const cleanupJava=()=>{if(ownedJava)try{killProcess(ownedJava);}catch{}};const timer=setTimeout(()=>{try{previous.kill();}catch{}cleanupJava();},stopGraceMs).unref();previous.once('exit',()=>{clearTimeout(timer);cleanupJava();});try{previous.stdin.end(JSON.stringify({type:'shutdown'})+'\n');}catch{}}
 }
 function ensure(){
  if(child)return true;
  const python=path.join(runtimeRoot,'python','python.exe'),script=path.join(runtimeRoot,'offline-worker.py');
  if(!fs.existsSync(python)||!fs.existsSync(script))return false;
  try{
   child=spawnProcess(python,['-I','-B','-u',script,runtimeRoot],{cwd:runtimeRoot,windowsHide:true,stdio:['pipe','pipe','ignore'],env:{...process.env,OMP_NUM_THREADS:'1',OPENBLAS_NUM_THREADS:'1',BLIS_NUM_THREADS:'1',PYTHONNOUSERSITE:'1'}});
   const current=child;lines=readline.createInterface({input:current.stdout});
   lines.on('line',line=>{let data;try{data=JSON.parse(line);}catch{return;}
    if(current!==child)return;
    if(data.event==='java-started'&&Number.isInteger(data.pid)&&data.pid>0){javaPid=data.pid;return;}
    const request=pending.get(data.id);if(!request)return;
    if(data.event==='progress'){request.progress?.(data.completed,data.total);return;}
    clearTimeout(request.timer);pending.delete(data.id);request.resolve(data);schedule();
   });
   current.on('error',()=>{if(current===child)stop();});
   current.on('exit',()=>{if(current!==child)return;child=null;lines?.close();lines=null;if(javaPid)try{killProcess(javaPid);}catch{}javaPid=null;resolveAll();schedule();});
   current.stdin.on('error',()=>{if(current===child)stop();});return true;
  }catch{child=null;return false;}
 }
 function valid({id,kind,chunks,includeLcbReaderReview}={}){
  return typeof id==='string'&&/^[\w-]{1,80}$/.test(id)&&['grammar','style'].includes(kind)&&(includeLcbReaderReview===undefined||typeof includeLcbReaderReview==='boolean')&&Array.isArray(chunks)&&chunks.length<=3000&&chunks.every(c=>c&&typeof c.text==='string'&&c.text.length<=11000&&Number.isSafeInteger(c.start)&&c.start>=0&&typeof c.completeStart==='boolean'&&typeof c.completeEnd==='boolean')&&chunks.reduce((n,c)=>n+c.text.length,0)<=25000000;
 }
 return {
  review(request,{progress}={}){if(!valid(request))return Promise.resolve({issues:[],error:'Invalid offline language request.'});if(pending.has(request.id))return Promise.resolve({issues:[],error:'Offline request is already running.'});clearTimeout(idle);if(!ensure())return Promise.resolve(unavailable());
   return new Promise(resolve=>{const timer=setTimeout(()=>{stop();},timeoutMs).unref();pending.set(request.id,{resolve,timer,progress});send(request);});},
  cancel(id){const request=pending.get(id);if(!request)return;send({type:'cancel',id});clearTimeout(request.timer);pending.delete(id);request.resolve({cancelled:true,issues:[]});schedule();},
  stop,
  get running(){return !!child;}
 };
}
module.exports={createEngineHost};
