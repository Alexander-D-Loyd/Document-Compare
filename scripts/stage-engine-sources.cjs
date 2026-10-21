// Refresh only application-owned Python sources in an existing portable
// runtime. Third-party engines, models, Java and configuration stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../engines'),runtime=path.join(root,'runtime'),manifestFile=path.join(runtime,'runtime-manifest.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
for(const [file,field] of [['language-config.json','configSHA256'],['bridge/OfflineGrammar.class','grammarClassSHA256']]){
 if(hash(fs.readFileSync(path.join(runtime,file)))!==manifest[field])throw Error('Existing runtime integrity mismatch: '+file);
}
if(hash(fs.readFileSync(path.join(root,'language-config.json')))!==manifest.configSHA256)throw Error('Configuration changed; stage the complete runtime before refreshing these sources.');
const receipt={};
for(const [file,field] of [['offline-worker.py','workerSHA256'],['lcb_parser.py','parserSHA256']]){
 const source=fs.readFileSync(path.join(root,file));receipt[file]={previous:hash(fs.readFileSync(path.join(runtime,file))),current:hash(source)};
 fs.writeFileSync(path.join(runtime,file),source);manifest[field]=receipt[file].current;
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
for(const [file,row] of Object.entries(receipt))if(hash(fs.readFileSync(path.join(runtime,file)))!==row.current)throw Error('Runtime source refresh failed: '+file);
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
