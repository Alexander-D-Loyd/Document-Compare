const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
if(!['lcb','gpo'].every(id=>fs.existsSync(path.join(root,'app/data',id+'-reference.json')))){console.error('Restore the two reference JSON files from the Windows release before running the complete test suite. See README. No tests were run.');process.exit(2);}
const files=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>path.join('tests',n));
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});if(result.error){console.error(result.error.message);process.exit(1);}process.exit(result.status??1);
