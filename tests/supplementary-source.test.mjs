import test from 'node:test';import assert from 'node:assert/strict';import helper from '../supplementary-source.cjs';
test('external source opening accepts only the reviewed manual and actual PDF page range',()=>{
 const prefix='https://sdap.org/wp-content/uploads/downloads/Style-Manual.pdf#page=';
 for(const page of [1,7,75,299])assert.equal(helper.isSupplementaryCitationSource(prefix+page),true);
 for(const value of [null,{},prefix+'0',prefix+'300',prefix+'7&url=https://example.test',prefix+'07','http://sdap.org/wp-content/uploads/downloads/Style-Manual.pdf#page=7','https://example.test/wp-content/uploads/downloads/Style-Manual.pdf#page=7','file:///C:/Windows/notepad.exe','javascript:alert(1)','https://sdap.org@evil.test/wp-content/uploads/downloads/Style-Manual.pdf#page=7',prefix+'7\n'])assert.equal(helper.isSupplementaryCitationSource(value),false,String(value));
});
