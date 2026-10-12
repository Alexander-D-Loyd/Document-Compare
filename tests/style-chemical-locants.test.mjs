import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const changes=text=>numeralIssues(makeDocument([text],'Current'),refs).filter(i=>!i.matchesPrimary).map(i=>[i.text,i.suggestion]);

test('AB 8 chemical position identifiers remain numeric inside recognized names',()=>{
 for(const name of ['3-(1-adamantoyl)indole','N-(1-adamantyl)-1H-indole-3-carboxamide','1-(N-methyl-2-piperidinyl)methyl','2-(4-morpholinyl)ethyl','Delta-8-tetrahydrocannabinol','delta-9 tetrahydrocannabinol']){
  assert.deepEqual(changes(`The substance is ${name}. The office takes 3 samples.`),[['3','three']],name);
 }
});

test('selected tracked and wrapped chemical identifiers retain source positions',()=>{
 const text='line 1 The substance is 3 - ( 2 - a d a m a n t o y l ) i n d o l e.\nline 2 It includes 2-(4-morp\nline 3 holinyl)ethyl. The office takes 4 samples.';
 assert.deepEqual(changes(text),[['4','four']]);
});

test('ordinary duration modifiers and counted chemical groups are not chemical identifiers',()=>{
 assert.deepEqual(changes('The term is 3-year and uses 4 methyl groups.'),[['3','three'],['4','four']]);
 assert.deepEqual(changes('The substance is 3-(1-adamantoyl)indole with 4 samples and 3 containers.'),[['4','four'],['3','three']]);
 assert.deepEqual(changes('The unknown label is 3-widget.'),[['3','three']]);
});

test('selected chemical serial codes protect their complete numeric form only',()=>{
 for(const code of ['AB-001','JWH-004','JWH-007','JWH-009','RCS-4','RCS-8','CP 50,556-1','WIN 55,212-2'])assert.deepEqual(changes(`The substance is ${code}. The office takes 4 samples.`),[['4','four']],code);
 assert.deepEqual(changes('The unknown label is XYZ-4.'),[['4','four']]);
});

test('explicit chemical ring positions are identifiers without exempting position counts',()=>{
 assert.deepEqual(changes('Substitution occurs at the 5-position of the phenolic ring. The office takes 3 samples.'),[['3','three']]);
 assert.deepEqual(changes('Substitution occurs at the 3-position of the indene ring.'),[]);
 assert.deepEqual(changes('The office has 3 positions.'),[['3','three']]);
});

test('primed locants and chemical-name tails preserve figures while adjacent prose stays checked',()=>{
 for(const name of ["arachidonyl-1'-hydroxy-2'-propylamide",'[1,1′-biphenyl]-3-ylcarbamate','tetrahydrobenzo[c]chromen-1-ol','phenanthridin-1-yl'])assert.deepEqual(changes(`The substance is ${name} with 4 samples.`),[['4','four']],name);
 assert.deepEqual(changes('The office uses report-3-year periods.'),[['3','three']]);
});

test('source-divided chemical stems and bracketed bridge locants do not become prose counts',()=>{
 const names=[
  '(6aR,10aR)-3-(2-methyl-6-bromohex-2-yl)-6,6,9-\nline 24 t rimethyl-6a,7,10,10a-tetrahydrobenzo[c]chromen-1-ol',
  '[(6S,6aR,9R,10aR)-9-hydroxy-6-methyl-3-[5-phenylpentan-2-yl]oxy-5,6,6a,7,8,9,10,10a-octahydrophenant\nline 5 hridin-1-yl]acetate',
  '4-bicyclo[3.1.1]hept-3-enyl',
  '6-methyl-2-[(4-methylphenyl)amino]-4H-3,1-b\nline 4 enzoxazin-4-one',
 ];
 for(const name of names)assert.deepEqual(changes(`The substance is ${name}.\nline 25 The office takes 3 samples and 4 containers.`),[['3','three'],['4','four']],name);
 assert.deepEqual(changes('The substance is 3-(1-adamantoyl)indole.\nline 2 The office takes 3 samples.'),[['3','three']]);
 assert.deepEqual(changes('The office uses 3-year periods and takes 4 samples.'),[['3','three'],['4','four']]);
});
