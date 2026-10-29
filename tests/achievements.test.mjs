// Run: node tests/achievements.test.mjs
// Loads the real mob/world tables and the achievements module out of index.html and the save merge out of cloud.js,
// then drives them with a fake combat record. No browser needed.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const cloud=fs.readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const cut=(s,a,b)=>{ const i=s.indexOf(a), j=s.indexOf(b,i); assert(i>=0&&j>i,'marker missing: '+a+' / '+b); return s.slice(i,j); };

// 1. game tables (mobs, classes, worlds) + save shape, then the achievements module
const tables=cut(html,"const C={cyan:","const MUTS=");
const shape=cut(html,"const newPW=","const newP=");
const mod=cut(html,"/* ================= combat record + achievements","/* ================= enemies");
const ctx={console,Date,Math,Set,Object,Array,JSON,saves:0,toasts:[]};
vm.createContext(ctx);
vm.runInContext(`
const LEVELS=50;
${tables}
${shape}
let P={seen:{},prog:{},st:newSt()};
const G={wd:{id:'belt'}};
const ico=()=>'';  const Music={up(){}};  const save=()=>{ globalThis.saves++; };
${mod}
globalThis.api={P:()=>P,setP:v=>{P=v},G,MOB,CLS,WORLDS,stSpawn,stHit,stResolve,agg,achList,achCheck,get achQ(){return achQ},stOf,newSt};
`,ctx);
const A=ctx.api;
const reset=()=>{ A.setP({seen:{},prog:{},st:A.newSt(),bf:0}); };
const mob=(type)=>({type,res:{k:1,b:1,e:1}});
const fight=(type,won,{weapons=['turret'],src='turret',resKind=null,m=1}={})=>{
  const e=mob(type); A.stSpawn(e);
  for(const w of weapons) A.stHit(e,w,resKind||({turret:'k',saw:'k',mine:'b',mortar:'b',field:'e',chain:'e'})[w],m);
  A.stResolve(e,won,won?src:undefined);
};

// 2. catalogue sanity
{
  reset(); const list=A.achList();
  assert(list.length>=100,'expected a full catalogue, got '+list.length);
  assert.equal(new Set(list.map(d=>d.id)).size,list.length,'duplicate achievement ids');
  const a=A.agg();
  for(const d of list){ const r=d.fn(a); assert(r&&typeof r.done==='boolean'&&r.frac>=0&&r.frac<=1&&typeof r.txt==='string',d.id+' bad progress '+JSON.stringify(r)); assert(!r.done,d.id+' unlocked on an empty record'); assert(d.tier>=0&&d.tier<=3,d.id+' bad tier'); }
  assert.equal(list.filter(d=>d.cat==='disc').length,4+3+A.WORLDS.length+4);
}

// 3. encounters: counts, per-world, class sets
{
  reset(); const P=A.P();
  for(let i=0;i<100;i++){ P.seen.rock=1; fight('rock',true); }
  const st=A.stOf();
  assert.equal(st.enc.rock,100); assert.equal(st.kill.rock,100); assert(st.world.belt.rock);
  A.achCheck(true);
  assert(A.stOf().ach.sight0,'100 sightings');
  assert(st.ach.k1_rock,'100 meteor kills');
  assert(!st.ach.sight1);
  const mineral=Object.keys(A.MOB).filter(k=>A.MOB[k].cls==='mineral');
  mineral.forEach(k=>P.seen[k]=1); A.achCheck(true);
  assert(A.stOf().ach.cls_mineral,'meeting every mineral mob');
  assert(!A.stOf().ach.cls_bio);
}

// 4. success rates need a sample, then the rate
{
  reset();
  for(let i=0;i<299;i++) fight('dart',true);          // 299 of 299: below the 300-mob minimum
  A.achCheck(true); assert(!A.stOf().ach.all80&&!A.stOf().ach.all99,'no rate award below the sample minimum');
  fight('dart',true); A.achCheck(true);               // 300 of 300 = 100%
  assert(A.stOf().ach.all80&&A.stOf().ach.all99,'rate awards once the sample is met');
  reset();
  for(let i=0;i<240;i++) fight('dart',true); for(let i=0;i<60;i++) fight('dart',false);   // 80.0%
  A.achCheck(true); assert(A.stOf().ach.all80); assert(!A.stOf().ach.all90);
  const g=A.agg(); assert.equal(g.kill,240); assert.equal(g.leak,60); assert.equal(g.mob.dart.enc,300);
}

// 5. weapon success: a weapon is credited for mobs it hit, a miss that leaks counts against it
{
  reset();
  for(let i=0;i<150;i++) fight('rock',true,{weapons:['mine','turret'],src:'mine'});
  for(let i=0;i<50;i++) fight('rock',false,{weapons:['mine']});
  const g=A.agg(); const mine=g.wt.mine, tur=g.wt.turret;
  assert.deepEqual([mine[0],mine[1],mine[2]],[200,150,150],'mine engaged/defeated/killing blows');
  assert.deepEqual([tur[0],tur[1],tur[2]],[150,150,0],'turret assisted but never landed the killing blow');
  A.achCheck(true);
  assert(!A.stOf().ach.w80_mine,'75% is not 80%'); assert(!A.stOf().ach.w92_mine);
  assert(!A.stOf().ach.w80_turret,'turret only has 150 engagements, below the 200 minimum');
}

// 6. off-type weapons: only the weapon's own damage type, and only at <=0.65x
{
  reset();
  for(let i=0;i<30;i++) fight('brute',true,{weapons:['turret'],src:'turret',m:0.5});   // resisted kinetic
  for(let i=0;i<5;i++) fight('brute',true,{weapons:['mine'],src:'mine',m:1.5});         // mine is the right tool
  const g=A.agg();
  assert.equal(g.nk,30,'only resisted killing blows count'); assert.equal(g.wt.mine[3],0);
  A.achCheck(true); assert(A.stOf().ach.nk25,'25 off-type killing blows'); assert(!A.stOf().ach.nk250);
  // arc card: energy damage dealt by the turret is not "kinetic resisted"
  const e=mob('brute'); A.stSpawn(e); A.stHit(e,'turret','e',0.3); A.stResolve(e,true,'turret');
  assert.equal(A.agg().wt.turret[3],30,'turret arc card must not flag a resisted engagement');
  // variety
  reset(); for(const t of ['brute','chunk','shield']) fight(t,true,{weapons:['turret'],src:'turret',m:0.5});
  A.achCheck(true); assert(A.stOf().ach.nt3,'3 different mob types'); assert(!A.stOf().ach.nt6);
}

// 7. boss wipe: mobs cleared because the boss died are not counted as kills or leaks
{
  reset(); const e=mob('swarm'); A.stSpawn(e);                // spawned, never resolved
  const g=A.agg(); assert.equal(g.mob.swarm.enc,1); assert.equal(g.kill+g.leak,0);
}

// 8. world survey + old-save backfill
{
  reset(); const P=A.P(); P.prog={belt:{best:20}}; A.stOf().bf=0; ctx.runBackfill=()=>0;
  vm.runInContext('stBackfill()',ctx);
  const w=A.stOf().world.belt; assert(w.rock&&w.dart&&w.swarm&&w.invader&&w.shield&&w.phantom&&w.chunk&&w.small&&w.boss&&w.orb,'cleared levels credit their mobs');
  assert(!w.leech&&!w.egg,'mobs from later levels are not credited');
  vm.runInContext('stBackfill()',ctx); // idempotent
}

// 9. one big unlock burst collapses to a single toast
{
  reset(); const P=A.P(); Object.keys(A.MOB).forEach(k=>P.seen[k]=1); A.achCheck(true);
  assert(A.achQ.length<=1,'burst collapsed, queue='+A.achQ.length);
  assert(Object.keys(A.stOf().ach).length>=4,'burst still records every unlock');
}

// 10. cloud merge: counters take the larger value, unlocks are a union with the earliest time
{
  const block=cut(cloud,"  const maxObj=","  const merge=");
  const m={}; vm.runInNewContext(block+"\nglobalThis.mergeSt=mergeSt;",m);
  const a={enc:{rock:10,dart:2},kill:{rock:9},leak:{rock:1},w:{turret:{rock:[10,9,9,0,0,0]}},world:{belt:{rock:1}},ach:{x:200,y:50},bf:1};
  const b={enc:{rock:4,swarm:7},kill:{rock:4},leak:{},w:{turret:{rock:[4,4,4,0,0,0],dart:[1,1,1,0,0,0]},mine:{rock:[2,2,2,0,0,0]}},world:{belt:{dart:1},nebula:{swarm:1}},ach:{x:100,z:300}};
  const r=JSON.parse(JSON.stringify(m.mergeSt(a,b)));   // round-trip: the function ran in another vm realm
  assert.equal(r.enc.rock,10); assert.equal(r.enc.swarm,7); assert.equal(r.enc.dart,2);
  assert.deepEqual(r.w.turret.rock,[10,9,9,0,0,0]); assert.deepEqual(r.w.turret.dart,[1,1,1,0,0,0]); assert.deepEqual(r.w.mine.rock,[2,2,2,0,0,0]);
  assert.deepEqual(Object.keys(r.world.belt).sort(),['dart','rock']); assert(r.world.nebula.swarm);
  assert.deepEqual(r.ach,{x:100,y:50,z:300}); assert.equal(r.bf,1);
  assert.deepEqual(JSON.parse(JSON.stringify(m.mergeSt(undefined,undefined).ach)),{});
}
console.log('achievements: all checks passed ('+A.achList().length+' achievements)');
