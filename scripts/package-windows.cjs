'use strict';
// Local, offline Windows folder/ZIP packaging. Existing outputs are never
// removed or replaced. Dependencies and offline engines must be restored first.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const DEFAULT_PYTHON=path.join(ROOT,'engines/runtime/python/python.exe');
const ELECTRON_FILES=['chrome_100_percent.pak','chrome_200_percent.pak','d3dcompiler_47.dll','dxcompiler.dll','dxil.dll','ffmpeg.dll','icudtl.dat','LICENSE','LICENSES.chromium.html','resources.pak','snapshot_blob.bin','v8_context_snapshot.bin','version','vk_swiftshader_icd.json','vk_swiftshader.dll','vulkan-1.dll'];
const APP_MAIN_FILES=['package.json','main.cjs','preload.cjs','engine-host.cjs','STYLE_COVERAGE_STATUS.json'];
const MANUALS=new Set(['lcb-stylemanual-2019.pdf','gpo-stylemanual-2016.pdf']);
const RUNTIME_DIRS=['python','java','languagetool','bridge'];
const RUNTIME_FILES=['offline-worker.py','lcb_parser.py','language-config.json','runtime-manifest.json'];
const REQUIRED_APP=['index.html','app.mjs','style-worker.mjs','assets/document-compare.ico','assets/document-compare.png','data/lcb-reference.json','data/gpo-reference.json','data/lcb-stylemanual-2019.pdf','data/gpo-stylemanual-2016.pdf','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/LICENSE','vendor/typo.js','vendor/typo-LICENSE','vendor/diff-LICENSE','vendor/en_US/index.aff','vendor/en_US/index.dic','vendor/en_US/license','vendor/ocr/MANIFEST.json'];
const slashes=s=>s.split(path.sep).join('/');
function sha(file){const hash=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.allocUnsafe(1024*1024);try{let count;while((count=fs.readSync(fd,buffer,0,buffer.length,null)))hash.update(buffer.subarray(0,count));}finally{fs.closeSync(fd);}return hash.digest('hex');}
function requireFile(file){if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Required packaging input is missing: '+slashes(path.relative(ROOT,file)));if(fs.lstatSync(file).isSymbolicLink())throw Error('Packaging refuses symbolic links: '+slashes(path.relative(ROOT,file)));}
function requireDir(dir){if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())throw Error('Required packaging directory is missing: '+slashes(path.relative(ROOT,dir)));if(fs.lstatSync(dir).isSymbolicLink())throw Error('Packaging refuses linked directories: '+slashes(path.relative(ROOT,dir)));}
function walk(dir){const out=[];for(const row of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const file=path.join(dir,row.name);if(row.isSymbolicLink())throw Error('Packaging refuses symbolic links: '+slashes(path.relative(ROOT,file)));if(row.isDirectory())out.push(...walk(file));else if(row.isFile())out.push(file);else throw Error('Unsupported packaging input: '+slashes(path.relative(ROOT,file)));}return out;}
function isAppFileAllowed(relative){
 const parts=relative.replaceAll('\\','/').split('/');if(parts.some(p=>!p||p==='.'||p==='..'||/^(?:\.git|node_modules|qa-output|profiles?|userData|__pycache__)$/iu.test(p)))return false;
 if(parts.length===1)return /\.(?:mjs|cjs|js|css|html|json)$/u.test(parts[0]);
 if(parts[0]==='data')return parts.length===2&&(/\.(?:mjs|json)$/u.test(parts[1])||MANUALS.has(parts[1]));
 if(parts[0]==='assets')return parts.length===2&&/\.(?:png|ico|svg|json)$/u.test(parts[1]);
 return parts[0]==='vendor'&&!/\.pdf$/iu.test(parts.at(-1));
}
function isRuntimeFileAllowed(relative){return !relative.replaceAll('\\','/').split('/').some(part=>/^__pycache__$/iu.test(part));}
function outputPaths(root,version,allowExistingStage=false){
 if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version))throw Error('A safe semantic package version is required.');
 const dist=path.resolve(root,'dist'),name='Document-Compare-Windows-'+version,stage=path.join(dist,name),folder=path.join(stage,'Document Compare'),zip=path.join(dist,name+'.zip');
 if(path.relative(dist,stage).startsWith('..')||path.dirname(stage)!==dist)throw Error('Build output must stay inside this project dist directory.');
 if(fs.existsSync(dist)&&(fs.lstatSync(dist).isSymbolicLink()||fs.realpathSync(dist)!==path.join(fs.realpathSync(root),'dist')))throw Error('Build output cannot use a linked or redirected dist directory.');
 for(const file of [...(allowExistingStage?[]:[stage]),zip,zip+'.sha256'])if(fs.existsSync(file))throw Error('Packaging output already exists; keep it or choose a new package version: '+slashes(path.relative(root,file)));
 return {dist,name,stage,folder,zip};
}
function readOptions(args){const options={electronBase:path.join(ROOT,'node_modules/electron/dist'),python:DEFAULT_PYTHON,check:false};for(let n=0;n<args.length;n++){const key=args[n];if(key==='--check')options.check=true;else if(key==='--stage-only')options.stageOnly=true;else if(key==='--archive-existing')options.archiveExisting=true;else if(key==='--refresh-docs')options.refreshDocs=true;else if(key==='--electron-base'||key==='--python'){if(!args[n+1]||args[n+1].startsWith('--'))throw Error('Missing value for '+key);options[key==='--python'?'python':'electronBase']=args[++n];}else if(key==='--help')options.help=true;else throw Error('Unknown packaging option: '+key);}if(options.stageOnly&&options.archiveExisting)throw Error('Choose --stage-only or --archive-existing.');if(options.refreshDocs&&!options.archiveExisting)throw Error('--refresh-docs requires --archive-existing.');return options;}
function validateRuntime(runtime){
 requireDir(runtime);const manifestFile=path.join(runtime,'runtime-manifest.json');requireFile(manifestFile);const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 for(const [relative,field]of [['offline-worker.py','workerSHA256'],['lcb_parser.py','parserSHA256'],['language-config.json','configSHA256'],['bridge/OfflineGrammar.class','grammarClassSHA256']]){const file=path.join(runtime,relative);requireFile(file);if(!/^[a-f0-9]{64}$/u.test(manifest[field]||'')||sha(file)!==manifest[field])throw Error('Offline runtime integrity mismatch: '+relative);}
 for(const relative of RUNTIME_DIRS)requireDir(path.join(runtime,relative));for(const relative of RUNTIME_FILES)requireFile(path.join(runtime,relative));
 for(const relative of ['python/python.exe','java/bin/java.exe'])requireFile(path.join(runtime,relative));requireDir(path.join(runtime,'languagetool/libs'));
 return manifest;
}
function createPlan(options={}){
 const root=ROOT,pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),outputs=outputPaths(root,pkg.version,!!options.archiveExisting),base=path.resolve(root,options.electronBase||'node_modules/electron/dist'),installed=path.join(root,'node_modules/electron/dist'),runtime=path.join(root,'engines/runtime');
 requireDir(base);const electronVersion=pkg.devDependencies?.electron;if(!/^\d+\.\d+\.\d+$/u.test(electronVersion||''))throw Error('Pin the Electron version before packaging.');requireFile(path.join(base,'version'));if(fs.readFileSync(path.join(base,'version'),'utf8').trim()!==electronVersion)throw Error('The packaging Electron runtime does not match the pinned version.');
 const exe=fs.existsSync(path.join(base,'Document Compare.exe'))?'Document Compare.exe':'electron.exe';requireFile(path.join(base,exe));requireDir(path.join(base,'locales'));
 for(const file of ELECTRON_FILES)requireFile(path.join(base,file));
 // The downloaded app EXE may contain its existing icon resources. Every
 // other Electron runtime byte must match the installed pinned distribution.
 if(path.resolve(installed)!==base){requireDir(installed);for(const file of [...ELECTRON_FILES,...walk(path.join(base,'locales')).map(f=>path.relative(base,f))]){requireFile(path.join(installed,file));if(sha(path.join(base,file))!==sha(path.join(installed,file)))throw Error('Electron runtime differs from the pinned installation: '+slashes(file));}}
 const runtimeManifest=validateRuntime(runtime),app=path.join(root,'app');for(const file of ['README.md','DESKTOP_VERIFICATION.md'])requireFile(path.join(root,file));for(const file of REQUIRED_APP)requireFile(path.join(app,file));for(const dir of ['vendor/cmaps','vendor/standard_fonts','vendor/wasm']){requireDir(path.join(app,dir));if(!walk(path.join(app,dir)).length)throw Error('Generated PDF assets are empty: '+dir);}
 const ocrRoot=path.join(app,'vendor/ocr'),ocr=JSON.parse(fs.readFileSync(path.join(ocrRoot,'MANIFEST.json'),'utf8'));for(const [name,record]of Object.entries(ocr.files)){const file=path.join(ocrRoot,name);requireFile(file);if(fs.statSync(file).size!==record.bytes||sha(file)!==record.sha256)throw Error('Pinned OCR asset integrity mismatch: '+name);}
 const plan=[];const add=(source,relative)=>{requireFile(source);plan.push({source,relative:relative.replaceAll('\\','/')});};
 for(const file of ELECTRON_FILES)add(path.join(base,file),file);add(path.join(base,exe),'Document Compare.exe');for(const file of walk(path.join(base,'locales')))add(file,slashes(path.relative(base,file)));
 for(const file of APP_MAIN_FILES)add(path.join(root,file),'resources/app/'+file);
 for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.md')).sort())add(path.join(root,file),'resources/app/'+file);
 for(const file of walk(app)){const relative=slashes(path.relative(app,file));if(isAppFileAllowed(relative))add(file,'resources/app/app/'+relative);}
 for(const directory of RUNTIME_DIRS)for(const file of walk(path.join(runtime,directory))){const relative=slashes(path.relative(runtime,file));if(isRuntimeFileAllowed(relative))add(file,'resources/offline-engines/'+relative);}
 for(const file of RUNTIME_FILES)add(path.join(runtime,file),'resources/offline-engines/'+file);
 const duplicates=new Set();for(const row of plan){const key=row.relative.toLowerCase();if(duplicates.has(key))throw Error('Duplicate package path: '+row.relative);duplicates.add(key);if(row.relative.startsWith('/')||row.relative.split('/').includes('..'))throw Error('Unsafe package path: '+row.relative);}
 plan.sort((a,b)=>a.relative<b.relative?-1:a.relative>b.relative?1:0);
 return {root,pkg,outputs,base,exe,electronVersion,runtimeManifest,files:plan};
}
function copyVerified(source,destination,replace=false){fs.mkdirSync(path.dirname(destination),{recursive:true});const before=sha(source);fs.copyFileSync(source,destination,replace?0:fs.constants.COPYFILE_EXCL);if(sha(destination)!==before||sha(source)!==before)throw Error('Input changed while packaging: '+path.basename(source));return before;}
const ZIP_SCRIPT=String.raw`
import sys,json,hashlib,zipfile,shutil
from pathlib import Path
folder=Path(sys.argv[1]).resolve();archive=Path(sys.argv[2]).resolve()
manifest=json.loads((folder/'PACKAGE-MANIFEST.json').read_text(encoding='utf-8'))
expected={row['path']:row for row in manifest['files']}
files=sorted((p for p in folder.rglob('*') if p.is_file()),key=lambda p:p.relative_to(folder).as_posix())
if set(p.relative_to(folder).as_posix() for p in files)!=set(expected)|{'PACKAGE-MANIFEST.json'}:raise ValueError('Staged file set changed before archiving')
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for p in files:
  relative=p.relative_to(folder).as_posix();info=zipfile.ZipInfo('Document Compare/'+relative,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  with p.open('rb') as source,z.open(info,'w',force_zip64=True) as target:shutil.copyfileobj(source,target,1024*1024)
with zipfile.ZipFile(archive) as z:
 names=z.namelist()
 if len(names)!=len(files) or len(set(names))!=len(names):raise ValueError('Unexpected or duplicate archive entries')
 for entry in z.infolist():
  prefix='Document Compare/'
  if not entry.filename.startswith(prefix):raise ValueError('Unsafe archive root')
  relative=entry.filename[len(prefix):]
  if relative.startswith('/') or '..' in relative.split('/'):raise ValueError('Unsafe archive entry')
  digest=hashlib.sha256()
  with z.open(entry) as f:
   while True:
    chunk=f.read(1024*1024)
    if not chunk:break
    digest.update(chunk)
  if relative=='PACKAGE-MANIFEST.json':
   if digest.hexdigest()!=hashlib.sha256((folder/relative).read_bytes()).hexdigest():raise ValueError('Archive manifest differs')
  elif entry.file_size!=expected[relative]['bytes'] or digest.hexdigest()!=expected[relative]['sha256']:raise ValueError('Archive file integrity mismatch: '+relative)
print(json.dumps({'archiveEntriesVerified':len(files),'manifestFilesVerified':len(expected)}))
`;
function planSummary(plan){return {version:plan.pkg.version,electronVersion:plan.electronVersion,inputFiles:plan.files.length,folder:slashes(path.relative(plan.root,plan.outputs.folder)),archive:slashes(path.relative(plan.root,plan.outputs.zip))};}
function documentationPath(relative){return /^resources\/app\/[^/]+\.md$/u.test(relative)||relative==='resources/app/STYLE_COVERAGE_STATUS.json';}
function manifestForPlan(plan,rows){return {format:'document-compare.windows-package',manifestVersion:1,applicationVersion:plan.pkg.version,electronVersion:plan.electronVersion,electronExecutableSHA256:sha(path.join(plan.base,plan.exe)),offlineRuntimeManifestSHA256:sha(path.join(plan.root,'engines/runtime/runtime-manifest.json')),scope:'Complete Windows folder. Manifest excludes itself; archive SHA-256 is recorded beside the ZIP. No user profiles, uploaded PDFs, development dependencies or QA artifacts are included.',files:rows};}
function checkPython(options){const python=options.python||DEFAULT_PYTHON,probe=spawnSync(python,['-B','-c','import zipfile,hashlib;print("ready")'],{encoding:'utf8',windowsHide:true});if(probe.error||probe.status!==0)throw Error('Python with zipfile is required; pass --python with its executable path.');return python;}
function stagePackage(options={}){
 if(options.archiveExisting)throw Error('Fresh staging cannot use --archive-existing.');
 const plan=createPlan(options),summary=planSummary(plan);if(options.check)return {...summary,checkedOnly:true};
 // Check the archive helper before creating the fresh build directory.
 checkPython(options);fs.mkdirSync(plan.outputs.dist,{recursive:true});fs.mkdirSync(plan.outputs.stage);fs.mkdirSync(plan.outputs.folder);
 const rows=[];for(const row of plan.files){const destination=path.join(plan.outputs.folder,...row.relative.split('/')),digest=copyVerified(row.source,destination);rows.push({path:row.relative,bytes:fs.statSync(destination).size,sha256:digest});}
 const startHere=`Document Compare ${plan.pkg.version}\r\n\r\nOpen Document Compare.exe and keep this entire folder together.\r\nPDF, OCR, spelling, grammar and style review run locally.\r\nLCB retains priority over differing GPO guidance. California Codes checks\r\nuse the supplied name/shorthand list and do not validate section numbers.\r\nStyle coverage is partial; review the source provisions and exceptions.\r\nSee resources/app/DESKTOP_VERIFICATION.md for verification scope.\r\nPACKAGE-MANIFEST.json records the SHA-256 of every packaged file except itself.\r\nIncluded Electron, PDF/OCR, dictionary and offline-engine licenses/notices\r\nare retained in their original folders.\r\n`;
 const readme=path.join(plan.outputs.folder,'START HERE.txt');fs.writeFileSync(readme,startHere,{flag:'wx'});rows.push({path:'START HERE.txt',bytes:Buffer.byteLength(startHere),sha256:sha(readme)});rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 fs.writeFileSync(path.join(plan.outputs.folder,'PACKAGE-MANIFEST.json'),JSON.stringify(manifestForPlan(plan,rows),null,2)+'\n',{flag:'wx'});
 return {...summary,stagedOnly:true,packagedFiles:rows.length+1};
}
function verifyStagedPackage(plan,manifest,{refreshDocs=false}={}){
 if(manifest.format!=='document-compare.windows-package'||manifest.manifestVersion!==1||manifest.applicationVersion!==plan.pkg.version||manifest.electronVersion!==plan.electronVersion||!Array.isArray(manifest.files))throw Error('Staged manifest format/version does not match this package.');
 const wanted=new Set([...plan.files.map(r=>r.relative),'START HERE.txt']),rows=new Map();
 for(const row of manifest.files){if(typeof row.path!=='string'||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').includes('..')||!wanted.has(row.path)||rows.has(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||!/^[a-f0-9]{64}$/u.test(row.sha256||''))throw Error('Unexpected staged manifest entry.');rows.set(row.path,row);}
 if(rows.size!==wanted.size)throw Error('The application input file set changed after staging. Restage and repeat native verification.');
 const actual=walk(plan.outputs.folder).map(f=>slashes(path.relative(plan.outputs.folder,f)));if(actual.length!==rows.size+1||actual.some(r=>r!=='PACKAGE-MANIFEST.json'&&!rows.has(r)))throw Error('The staged folder contains unexpected or missing files.');
 for(const [relative,row]of rows){const file=path.join(plan.outputs.folder,...relative.split('/'));if(fs.statSync(file).size!==row.bytes||sha(file)!==row.sha256)throw Error('Staged file changed after native verification: '+relative);}
 for(const input of plan.files){const row=rows.get(input.relative);if(!(refreshDocs&&documentationPath(input.relative))&&(fs.statSync(input.source).size!==row.bytes||sha(input.source)!==row.sha256))throw Error('Source input changed after staging: '+input.relative+'. Restage and repeat native verification.');}
 return rows;
}
function archivePackage(options={}){
 const plan=createPlan({...options,archiveExisting:true});requireDir(plan.outputs.folder);const manifestFile=path.join(plan.outputs.folder,'PACKAGE-MANIFEST.json');requireFile(manifestFile);let manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));const rows=verifyStagedPackage(plan,manifest,options),summary=planSummary(plan);if(options.check)return {...summary,checkedOnly:true,stagedFilesVerified:rows.size};const python=checkPython(options);
 // A native run must leave all application/runtime bytes unchanged. Only an
 // explicitly requested refresh can copy the current root Markdown/status
 // snapshots over their already-staged counterparts; no app code is refreshed.
 if(options.refreshDocs){for(const input of plan.files.filter(r=>documentationPath(r.relative))){const destination=path.join(plan.outputs.folder,...input.relative.split('/')),digest=copyVerified(input.source,destination,true);rows.set(input.relative,{path:input.relative,bytes:fs.statSync(destination).size,sha256:digest});}manifest=manifestForPlan(plan,[...rows.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0));fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');verifyStagedPackage(plan,manifest);}
 const zipped=spawnSync(python,['-B','-c',ZIP_SCRIPT,plan.outputs.folder,plan.outputs.zip],{encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024});if(zipped.error||zipped.status!==0)throw Error('Archive creation/verification failed. The staged folder is retained for inspection. '+(zipped.error?.message||zipped.stderr?.trim()||''));
 const archiveSHA256=sha(plan.outputs.zip);fs.writeFileSync(plan.outputs.zip+'.sha256',archiveSHA256+'  '+path.basename(plan.outputs.zip)+'\n',{flag:'wx'});
 return {...summary,packagedFiles:rows.size+1,archiveBytes:fs.statSync(plan.outputs.zip).size,archiveSHA256,...JSON.parse(zipped.stdout.trim())};
}
function buildPackage(options={}){if(options.archiveExisting)return archivePackage(options);const staged=stagePackage(options);return options.check||options.stageOnly?staged:archivePackage(options);}
if(require.main===module){try{const options=readOptions(process.argv.slice(2));if(options.help)console.log('Usage: node scripts/package-windows.cjs [--check] [--stage-only | --archive-existing [--refresh-docs]] [--electron-base PATH] [--python EXECUTABLE]\nBuilds a fresh dist/Document-Compare-Windows-VERSION/Document Compare and verified ZIP.\nUse --electron-base "../Document Compare" to preserve an existing branded EXE of the pinned Electron version.\nStage-only allows native verification before archiving. Archive-existing verifies every unchanged staged/source byte; --refresh-docs allows only the current root Markdown/status snapshots.\nExisting build folders and ZIPs are never removed or replaced. No downloads or Git operations.');else console.log(JSON.stringify(buildPackage(options),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={isAppFileAllowed,isRuntimeFileAllowed,outputPaths,readOptions,validateRuntime,createPlan,stagePackage,archivePackage,verifyStagedPackage,documentationPath,buildPackage,ZIP_SCRIPT};
