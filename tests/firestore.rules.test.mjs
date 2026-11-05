import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,serverTimestamp,Timestamp} from 'firebase/firestore';
import fs from 'fs';
const env=await initializeTestEnvironment({projectId:'demo-nd',firestore:{rules:fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8080}});
const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore(), anon=env.unauthenticatedContext().firestore();
const ok={data:'{"prog":{}}',score:12,updated:Date.now(),gems:0,gt:serverTimestamp()};
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
/* gem cap: rises at most 1 gem per second since the last increase (max 300 per write); falls freely */
const seed=async(gems,agoSec)=>env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'users/carol'),{data:'{}',score:0,updated:1,gems,gt:Timestamp.fromMillis(Date.now()-agoSec*1000)}));
const c=env.authenticatedContext('carol').firestore(), cd=doc(c,'users/carol');
const save=(gems,gt)=>setDoc(cd,{data:'{}',score:0,updated:2,gems,gt});
const getGt=async()=>{ let gt; await env.withSecurityRulesDisabled(async x=>{ gt=(await getDoc(doc(x.firestore(),'users/carol'))).data().gt; }); return Timestamp.fromMillis(gt.toMillis()); };
const G=[
['new account starting at 50 gems ok',async()=>{ await env.withSecurityRulesDisabled(async x=>{ const {deleteDoc}=await import('firebase/firestore'); await deleteDoc(doc(x.firestore(),'users/carol')); }); await assertSucceeds(save(50,serverTimestamp())); }],
['new account starting at 51 gems denied',async()=>{ await env.withSecurityRulesDisabled(async x=>{ const {deleteDoc}=await import('firebase/firestore'); await deleteDoc(doc(x.firestore(),'users/carol')); }); await assertFails(save(51,serverTimestamp())); }],
['+50 gems after 60s ok',async()=>{ await seed(100,60); await assertSucceeds(save(150,serverTimestamp())); }],
['+100 gems after 60s denied',async()=>{ await seed(100,60); await assertFails(save(200,serverTimestamp())); }],
['+300 gems after an hour ok',async()=>{ await seed(100,3600); await assertSucceeds(save(400,serverTimestamp())); }],
['+301 gems after an hour denied',async()=>{ await seed(100,3600); await assertFails(save(401,serverTimestamp())); }],
['increase without fresh server time denied',async()=>{ await seed(100,3600); const gt=await getGt(); await assertFails(save(110,gt)); }],
['spending gems keeps gt, ok',async()=>{ await seed(500,5); const gt=await getGt(); await assertSucceeds(save(10,gt)); }],
['spending gems but resetting gt denied',async()=>{ await seed(500,5); await assertFails(save(10,serverTimestamp())); }],
['missing gems field denied',async()=>{ await seed(100,60); await assertFails(setDoc(cd,{data:'{}',score:0,updated:3})); }],
['negative gems denied',async()=>{ await seed(100,60); const gt=await getGt(); await assertFails(save(-5,gt)); }],
['other player cannot write my gems',async()=>{ await seed(100,3600); await assertFails(setDoc(doc(b,'users/carol'),{data:'{}',score:0,updated:2,gems:150,gt:serverTimestamp()})); }],
];
for(const [n,f] of G){ try{await f();console.log('PASS',n)}catch(e){console.log('FAIL',n,e.message)} }
/* crystal cap: per-type balances in cb; the total of all rises is at most 2 per second since ct (max 5000 per write); falls freely */
const Z={pow:0,tmp:0,rch:0,cap:0,frt:0}, cbm=o=>Object.assign({},Z,o);
const seedC=async(cb,agoSec)=>env.withSecurityRulesDisabled(async x=>setDoc(doc(x.firestore(),'users/carol'),{data:'{}',score:0,updated:1,gems:0,gt:Timestamp.fromMillis(Date.now()-3600000),cb,ct:Timestamp.fromMillis(Date.now()-agoSec*1000)}));
const gtNow=async()=>{ let d; await env.withSecurityRulesDisabled(async x=>{ d=(await getDoc(doc(x.firestore(),'users/carol'))).data(); }); return {gt:Timestamp.fromMillis(d.gt.toMillis()),ct:d.ct?Timestamp.fromMillis(d.ct.toMillis()):null}; };
const saveC=async(cb,ct)=>{ const t=await gtNow(); return setDoc(cd,{data:'{}',score:0,updated:2,gems:0,gt:t.gt,cb,ct:ct==='keep'?t.ct:ct}); };
const C=[
['+100 crystals after 60s ok',async()=>{ await seedC(cbm({pow:50}),60); await assertSucceeds(saveC(cbm({pow:150}),serverTimestamp())); }],
['+130 crystals after 60s denied',async()=>{ await seedC(cbm({pow:50}),60); await assertFails(saveC(cbm({pow:180}),serverTimestamp())); }],
['rises add up across types',async()=>{ await seedC(cbm({pow:50,frt:50}),60); await assertFails(saveC(cbm({pow:120,frt:120}),serverTimestamp())); }],
['moving crystals between types counts as a rise',async()=>{ await seedC(cbm({frt:1000}),10); await assertFails(saveC(cbm({pow:1000}),serverTimestamp())); }],
['+5000 after a day ok',async()=>{ await seedC(cbm({}),86400); await assertSucceeds(saveC(cbm({pow:5000}),serverTimestamp())); }],
['+5001 after a day denied',async()=>{ await seedC(cbm({}),86400); await assertFails(saveC(cbm({pow:5001}),serverTimestamp())); }],
['spending crystals keeps ct, ok',async()=>{ await seedC(cbm({pow:900}),5); await assertSucceeds(saveC(cbm({pow:10}),'keep')); }],
['rise without fresh server time denied',async()=>{ await seedC(cbm({pow:10}),3600); await assertFails(saveC(cbm({pow:20}),'keep')); }],
['dropping cb from a save that has it denied',async()=>{ await seedC(cbm({pow:10}),60); const t=await gtNow(); await assertFails(setDoc(cd,{data:'{}',score:0,updated:2,gems:0,gt:t.gt})); }],
['negative or unknown crystal type denied',async()=>{ await seedC(cbm({pow:10}),60); await assertFails(saveC(cbm({pow:-1}),'keep')); await assertFails(saveC(Object.assign(cbm({}),{gold:5}),serverTimestamp())); }],
['an older save may set cb once',async()=>{ await seed(100,60); await assertSucceeds(setDoc(cd,{data:'{}',score:0,updated:2,gems:100,gt:(await gtNow()).gt,cb:cbm({pow:4000}),ct:serverTimestamp()})); }],
['new account with 300 crystals ok, 301 denied',async()=>{ const del=async()=>env.withSecurityRulesDisabled(async x=>{ const {deleteDoc}=await import('firebase/firestore'); await deleteDoc(doc(x.firestore(),'users/carol')); });
  await del(); await assertFails(setDoc(cd,{data:'{}',score:0,updated:1,gems:0,gt:serverTimestamp(),cb:cbm({pow:301}),ct:serverTimestamp()}));
  await del(); await assertSucceeds(setDoc(cd,{data:'{}',score:0,updated:1,gems:0,gt:serverTimestamp(),cb:cbm({pow:300}),ct:serverTimestamp()})); }],
];
for(const [n,f] of C){ try{await f();console.log('PASS',n)}catch(e){console.log('FAIL',n,e.message)} }
const lb=doc(a,'leaderboards/w1/scores/alice');
const L=[['lb create',()=>assertSucceeds(setDoc(lb,{name:'A',score:100,wave:3,ts:1}))],
['lb increase',()=>assertSucceeds(setDoc(lb,{name:'A',score:200,wave:4,ts:2}))],
['lb decrease denied',()=>assertFails(setDoc(lb,{name:'A',score:150,wave:4,ts:3}))],
['lb over cap denied',()=>assertFails(setDoc(lb,{name:'A',score:10000000,wave:4,ts:3}))],
['lb other uid denied',()=>assertFails(setDoc(doc(b,'leaderboards/w1/scores/alice'),{name:'B',score:999,wave:1,ts:1}))],
['lb public read',()=>assertSucceeds(getDoc(doc(anon,'leaderboards/w1/scores/alice')))]];
for(const [n,f] of L){ try{await f();console.log('PASS',n)}catch(e){console.log('FAIL',n,e.message)} }
await env.cleanup(); process.exit(0);
