const fs=require('node:fs'),path=require('node:path');
const source=path.dirname(require.resolve('pdfjs-dist/package.json'));
const version=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8')).version;
if(version!=='6.4.299')throw new Error('Expected PDF.js 6.4.299 assets to match the bundled PDF.js runtime.');
for(const name of ['cmaps','standard_fonts','wasm'])fs.cpSync(path.join(source,name),path.join(__dirname,'..','app','vendor',name),{recursive:true});
console.log('Restored PDF.js character maps, fonts and WASM assets.');
