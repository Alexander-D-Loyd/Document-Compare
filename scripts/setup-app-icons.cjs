const fs=require('node:fs'),path=require('node:path');
const assets=path.join(__dirname,'..','app','assets');
const encoded=JSON.parse(fs.readFileSync(path.join(assets,'document-compare-icons.json'),'utf8'));
for(const extension of ['png','ico'])fs.writeFileSync(path.join(assets,'document-compare.'+extension),Buffer.from(encoded[extension],'base64'));
console.log('Restored Document Compare application icons.');
