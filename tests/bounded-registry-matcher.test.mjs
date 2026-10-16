import test from 'node:test';import assert from 'node:assert/strict';
import {createBoundedRegistryMatcher,REGISTRY_PATTERN_SOURCE_BUDGET}from '../app/bounded-registry-matcher.mjs';
import {CALIFORNIA_ENTITIES}from '../app/data/california-entities.mjs';
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&'),branch=text=>text.split(/\s+/u).map(escape).join('\\s+'),snapshot=rows=>[...rows].map(match=>({text:match[0],index:match.index,input:match.input,groups:match.groups})),oracle=(source,alternatives,options={})=>snapshot(source.matchAll(new RegExp((options.prefix||'')+'(?:'+alternatives.join('|')+')'+(options.suffix||''),options.flags||'giu'))),compare=(source,alternatives,options={})=>{const bounded=createBoundedRegistryMatcher(alternatives,options);assert.deepEqual(snapshot(bounded.matchAll(source)),oracle(source,alternatives,options));return bounded;};

test('contiguous chunks retain union ordering and recover hidden matches by reexecuting at cursor',()=>{
 const alternatives=['(?:ab)','bcde','de'],matcher=compare('abcde',alternatives,{maxSourceCharacters:13});assert.equal(matcher.patternCount,2);assert.deepEqual(snapshot(matcher.matchAll('abcde')).map(m=>[m.text,m.index]),[['ab',0],['de',3]]);
 const names=['Beta Gamma Delta','Gamma Delta','Alpha Beta'].map(branch),bounded=compare('Alpha Beta Gamma Delta',names,{maxSourceCharacters:40});assert.equal(bounded.patternCount,2);assert.deepEqual(snapshot(bounded.matchAll('Alpha Beta Gamma Delta')).map(m=>m.text),['Alpha Beta','Gamma Delta']);
});

test('prefix alternative order and globally nonoverlapping progress match the single union',()=>{
 for(const alternatives of [['a','ab','b'],['ab','a','b'],['bc','abc','c'],['foo','foobar','bar'],['foobar','foo','bar']])for(const source of ['abc ab abcd','foobar foo bar foobar','aaaa bbb ababab'])compare(source,alternatives,{maxSourceCharacters:10});
 const alternatives=['(?:)','😀','x'],matcher=compare('😀x',alternatives,{flags:'gu',maxSourceCharacters:10});assert.ok(matcher.patternCount>1);
});

test('Unicode boundaries apostrophes punctuation and arbitrary source whitespace retain the exact regex language',()=>{
 const alternatives=["Public Employees[’']\\s+Retirement\\s+System",'Department\\s+of\\s+Review','A\\.B\\.\\s+Services'],prefix='(?<![\\p{L}\\p{N}\\p{M}_])',suffix='(?![\\p{L}\\p{N}\\p{M}_])';
 for(const source of ["Public Employees’ Retirement System", "Public Employees'\nRetirement\tSystem Department of Review",'Department\n of Review A.B. Services','αDepartment of Review','Department of Reviewα','Department of Review\u0301','x_Department of Review','A.B. Services!'])compare(source,alternatives,{prefix,suffix,maxSourceCharacters:prefix.length+suffix.length+75});
});

test('interleaved iterators own independent cursors and default small registries retain one union',()=>{
 const matcher=createBoundedRegistryMatcher(['(?:ab)','bcde','de'],{maxSourceCharacters:13}),first=matcher.matchAll('abcde abcde'),second=matcher.matchAll('abcde');assert.equal(first.next().value[0],'ab');assert.equal(second.next().value[0],'ab');assert.equal(first.next().value[0],'de');assert.equal(second.next().value[0],'de');assert.equal(second.next().done,true);assert.equal(first.next().value.index,6);
 const branches=CALIFORNIA_ENTITIES.entries.filter(row=>row.checkEligible).sort((a,b)=>b.name.length-a.name.length).map(row=>branch(row.name));const defaultMatcher=createBoundedRegistryMatcher(branches,{prefix:'(?<![\\p{L}\\p{N}_])',suffix:'(?![\\p{L}\\p{N}_])'});assert.equal(defaultMatcher.patternCount,1);assert.ok(defaultMatcher.sourceLengths[0]<=REGISTRY_PATTERN_SOURCE_BUDGET);assert.deepEqual([...createBoundedRegistryMatcher([]).matchAll('abc')],[]);
 assert.throws(()=>createBoundedRegistryMatcher(['a'.repeat(100)],{maxSourceCharacters:20}),/exceeds/);assert.throws(()=>createBoundedRegistryMatcher(['a'],{flags:'y'}),/configuration/);
});

test('mutating a returned match array cannot change native union iteration progress',()=>{
 const alternatives=['(?:ab)','bcde','de'],bounded=createBoundedRegistryMatcher(alternatives,{maxSourceCharacters:13}).matchAll('abcde abcde'),native='abcde abcde'.matchAll(/(?:(?:ab)|bcde|de)/giu);
 for(let n=0;n<4;n++){const actual=bounded.next(),expected=native.next();assert.equal(actual.done,expected.done);assert.equal(actual.value[0],expected.value[0]);assert.equal(actual.value.index,expected.value.index);actual.value.index=99999;actual.value[0]='';expected.value.index=99999;expected.value[0]='';}assert.equal(bounded.next().done,true);assert.equal(native.next().done,true);
});

test('deterministic randomized overlapping alternatives match a single-union oracle',()=>{
 let state=912781;const random=limit=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%limit;};const symbols=['a','b','c','d',' ','😀'];
 for(let n=0;n<1500;n++){const words=Array.from({length:3+random(8)},()=>Array.from({length:1+random(5)},()=>symbols[random(symbols.length)]).join('')),alternatives=words.map(escape),source=Array.from({length:15+random(30)},()=>symbols[random(symbols.length)]).join('');compare(source,alternatives,{flags:n%2?'gu':'giu',maxSourceCharacters:14+random(12)});}
});

