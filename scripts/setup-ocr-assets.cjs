const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(__dirname,'../app/vendor/ocr'),manifest=JSON.parse(fs.readFileSync(path.join(out,'MANIFEST.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const packages=Object.fromEntries(['tesseract.js','tesseract.js-core'].map(n=>{const p=require.resolve(n+'/package.json');if(JSON.parse(fs.readFileSync(p,'utf8')).version!=='7.0.0')throw Error('Expected pinned '+n+' 7.0.0');return [n,path.dirname(p)];}));
const mappings={'tesseract.esm.min.js':['tesseract.js','dist/tesseract.esm.min.js'],'worker.min.js':['tesseract.js','dist/worker.min.js'],'worker.min.js.LICENSE.txt':['tesseract.js','dist/worker.min.js.LICENSE.txt'],'tesseract.js-LICENSE.txt':['tesseract.js','LICENSE.md'],'tesseract.js-core-LICENSE.txt':['tesseract.js-core','LICENSE']};
async function main(){for(const [name,record]of Object.entries(manifest.files)){let bytes;const existing=path.join(out,name);if(fs.existsSync(existing)&&sha(fs.readFileSync(existing))===record.sha256)continue;
if(name==='eng.traineddata'||name==='tessdata-LICENSE.txt'){const remote=name==='eng.traineddata'?name:'LICENSE';const response=await fetch('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/'+manifest.tessdata_fast_commit+'/'+remote);if(!response.ok)throw Error('Could not restore '+name);bytes=Buffer.from(await response.arrayBuffer());}
else{const [pkg,file]=mappings[name]||['tesseract.js-core',name];bytes=fs.readFileSync(path.join(packages[pkg],file));}
if(bytes.length!==record.bytes||sha(bytes)!==record.sha256)throw Error('Pinned OCR integrity check failed: '+name);fs.writeFileSync(existing,bytes);}
console.log('Restored pinned OCR assets and verified every SHA-256. Document review uses only these local assets.');}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
