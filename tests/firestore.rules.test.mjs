import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
import fs from 'fs';
const env=await initializeTestEnvironment({projectId:'demo-nd',firestore:{rules:fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8080}});
const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore(), anon=env.unauthenticatedContext().firestore();
const ok={data:'{"prog":{}}',score:12,updated:Date.now()};
const T=[
['owner write save',assertSucceeds(setDoc(doc(a,'users/alice'),ok))],
['owner read',assertSucceeds(getDoc(doc(a,'users/alice')))],
['other read denied',assertFails(getDoc(doc(b,'users/alice')))],
['other write denied',assertFails(setDoc(doc(b,'users/alice'),ok))],
['unauth denied',assertFails(getDoc(doc(anon,'users/alice')))],
['extra field denied',assertFails(setDoc(doc(a,'users/alice'),{...ok,coins:999}))],
['float score denied',assertFails(setDoc(doc(a,'users/alice'),{...ok,score:1.5}))],
['wallet write denied',assertFails(setDoc(doc(a,'users/alice/private/wallet'),{coins:1}))],
['wallet read ok',assertSucceeds(getDoc(doc(a,'users/alice/private/wallet')))],
['purchase write denied',assertFails(setDoc(doc(a,'purchases/p1'),{uid:'alice'}))],
['random coll denied',assertFails(setDoc(doc(a,'x/y'),{a:1}))],
];
for(const [n,p] of T){ try{await p;console.log('PASS',n)}catch(e){console.log('FAIL',n,e.message)} }
const lb=doc(a,'leaderboards/w1/scores/alice');
const L=[['lb create',()=>assertSucceeds(setDoc(lb,{name:'A',score:100,wave:3,ts:1}))],
['lb increase',()=>assertSucceeds(setDoc(lb,{name:'A',score:200,wave:4,ts:2}))],
['lb decrease denied',()=>assertFails(setDoc(lb,{name:'A',score:150,wave:4,ts:3}))],
['lb over cap denied',()=>assertFails(setDoc(lb,{name:'A',score:10000000,wave:4,ts:3}))],
['lb other uid denied',()=>assertFails(setDoc(doc(b,'leaderboards/w1/scores/alice'),{name:'B',score:999,wave:1,ts:1}))],
['lb public read',()=>assertSucceeds(getDoc(doc(anon,'leaderboards/w1/scores/alice')))]];
for(const [n,f] of L){ try{await f();console.log('PASS',n)}catch(e){console.log('FAIL',n,e.message)} }
await env.cleanup(); process.exit(0);
