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
const LEVELS=50; const OZ_Y=439; const rollType=()=>'pow';
${tables}
${shape}
let P={seen:{},prog:{},st:newSt(),gems:0,frag:{pow:0,tmp:0,rch:0,cap:0,frt:0}};
const G={wd:{id:'belt'},run:null};
const ico=()=>'';  const Music={up(){}};  const save=()=>{ globalThis.saves++; };
${mod}
globalThis.api={starBitsFor,starHold,starsOfWorld,ECON,popc,P:()=>P,setP:v=>{P=v},G,MOB,CLS,WORLDS,stSpawn,stHit,stResolve,agg,achList,achCheck,get achQ(){return achQ},stOf,newSt};
`,ctx);
const A=ctx.api;
const reset=()=>{ A.setP({seen:{},prog:{},st:A.newSt(),bf:0,gems:0,frag:{pow:0,tmp:0,rch:0,cap:0,frt:0}}); A.G.run=null; };
const mob=(type)=>({type,res:{k:1,b:1,e:1}});
const fight=(type,won,{weapons=['turret'],src='turret',resKind=null,m=1}={})=>{
  const e=mob(type); A.stSpawn(e);
  for(const w of weapons) A.stHit(e,w,resKind||({turret:'k',saw:'k',mine:'b',mortar:'b',field:'e',chain:'e'})[w],m);
  A.stResolve(e,won,won?src:undefined);
};

// 2. catalogue sanity
{
  reset(); const list=A.achList();
  assert(list.length>=200,'expected a full catalogue, got '+list.length);
  assert.equal(new Set(list.map(d=>d.id)).size,list.length,'duplicate achievement ids');
  for(const d of list){ const r=d.fn(A.agg(d.wid)); assert(r&&typeof r.done==='boolean'&&r.frac>=0&&r.frac<=1&&typeof r.txt==='string',d.id+' bad progress '+JSON.stringify(r)); assert(!r.done,d.id+' unlocked on an empty record'); assert(d.tier>=0&&d.tier<=3,d.id+' bad tier'); }
  assert(list.every(d=>d.wid&&d.id.endsWith('@'+d.wid)||d.id==='world_'+d.wid),'every award belongs to a world');
  for(const wd of A.WORLDS){
    const wl=list.filter(d=>d.wid===wd.id);
    assert.equal(wl.filter(d=>d.cat==='wpn').length,36,wd.id+': six awards per weapon');
    assert(wl.filter(d=>d.cat==='wpn').every(d=>d.grp&&d.icon===d.grp));
    assert.equal(wl.filter(d=>d.id==='world_'+wd.id).length,1,wd.id+': one survey');
    assert.equal(wl.filter(d=>d.grp==='sight').length,4); assert.equal(wl.filter(d=>d.cat==='odds').length,10);
  }
  assert(list.every(d=>d.grp),'every award belongs to a sub-group');
  assert(!list.some(d=>d.cat==='world'||/^cdx\d/.test(d.id)),'global-only awards are gone');
  assert(!list.some(d=>d.id==='all80'||d.id==='all99'||d.id.startsWith('k1_')||d.id.startsWith('cr')||d.id.startsWith('n_')),'removed global achievements are gone');
}

// 3. encounters: counts, per-world, class sets
{
  reset(); const P=A.P();
  for(let i=0;i<100;i++){ P.seen.rock=1; fight('rock',true); }
  const st=A.stOf();
  assert.equal(st.enc.rock,100); assert.equal(st.kill.rock,100); assert(st.world.belt.rock);
  assert.equal(st.pw.belt.enc.rock,100,'per-world record');
  A.achCheck(true);
  assert(A.stOf().ach['sight0@belt'],'50 sightings in Meteor Belt'); assert(!st.ach['sight1@belt']);
  assert(!st.ach['sight0@nebula'],'other worlds count their own sightings');
  const w=A.G.wd; A.G.wd={id:'nebula'}; for(let i=0;i<60;i++) fight('dart',true); A.G.wd=w;
  A.achCheck(true); assert(A.stOf().ach['sight0@nebula']); assert.equal(A.stOf().pw.belt.enc.dart,undefined,'nebula fights stay out of belt');
  assert.equal(A.stOf().enc.dart,60,'global record still counts everything');
  const roster=A.achList().find(d=>d.id==='world_belt'); assert(roster);
  Object.keys(A.MOB).forEach(k=>A.stOf().world.belt[k]=1); A.achCheck(true);
  assert(A.stOf().ach['cls_mineral@belt'],'meeting every mineral mob in the world'); assert(A.stOf().ach.world_belt);
  assert(!A.stOf().ach['cls_mineral@void']);
}

// 4. aggregate counters
{
  reset();
  for(let i=0;i<240;i++) fight('dart',true); for(let i=0;i<60;i++) fight('dart',false);
  const g=A.agg(); assert.equal(g.kill,240); assert.equal(g.leak,60); assert.equal(g.mob.dart.enc,300);
  const b=A.agg('belt'); assert.equal(b.kill,240); assert.equal(A.agg('void').kill,0);
}

// 5. weapon success: a weapon is credited for mobs it hit, a miss that leaks counts against it
{
  reset();
  for(let i=0;i<150;i++) fight('rock',true,{weapons:['mine','turret'],src:'mine'});
  for(let i=0;i<50;i++) fight('rock',false,{weapons:['mine']});
  const g=A.agg('belt'); const mine=g.wt.mine, tur=g.wt.turret;
  assert.deepEqual([mine[0],mine[1],mine[2]],[200,150,150],'mine engaged/defeated/killing blows');
  assert.deepEqual([tur[0],tur[1],tur[2]],[150,150,0],'turret assisted but never landed the killing blow');
  A.achCheck(true);
  assert(!A.stOf().ach['w80_mine@belt'],'75% is not 80%'); assert(!A.stOf().ach['w92_mine@belt']);
  assert(A.stOf().ach['w80_turret@belt'],'turret: 150 of 150 meets the 150 minimum'); assert(!A.stOf().ach['w80_turret@void']);
}

// 6. off-type weapons: only the weapon's own damage type, and only at <=0.65x
{
  reset();
  for(let i=0;i<30;i++) fight('brute',true,{weapons:['turret'],src:'turret',m:0.5});   // resisted kinetic
  for(let i=0;i<5;i++) fight('brute',true,{weapons:['mine'],src:'mine',m:1.5});         // mine is the right tool
  const g=A.agg('belt');
  assert.equal(g.nk,30,'only resisted killing blows count'); assert.equal(g.wt.mine[3],0);
  A.achCheck(true); assert(A.stOf().ach['nk10@belt'],'10 off-type killing blows'); assert(!A.stOf().ach['nk100@belt']);
  // arc card: energy damage dealt by the turret is not "kinetic resisted"
  const e=mob('brute'); A.stSpawn(e); A.stHit(e,'turret','e',0.3); A.stResolve(e,true,'turret');
  assert.equal(A.agg('belt').wt.turret[3],30,'turret arc card must not flag a resisted engagement');
  // variety
  reset(); for(const t of ['brute','chunk','shield']) fight(t,true,{weapons:['turret'],src:'turret',m:0.5});
  A.achCheck(true); assert(A.stOf().ach['nt3@belt'],'3 different mob types'); assert(!A.stOf().ach['nt5@belt']);
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
  reset(); Object.keys(A.MOB).forEach(k=>{ for(const w of A.WORLDS) (A.stOf().world[w.id]||(A.stOf().world[w.id]={}))[k]=1; }); A.achCheck(true);
  assert(A.achQ.length<=1,'burst collapsed, queue='+A.achQ.length);
  assert(Object.keys(A.stOf().ach).length>=4,'burst still records every unlock');
}

// 9b. ozone: held = destroyed above the line; reaching it, or spawning below it, is judged differently
{
  reset(); const OZ=439;
  const oz=(type,{cross=false,spawnY=0,won=true}={})=>{ const e=mob(type); e.y=spawnY; A.stSpawn(e); if(cross&&!e.ozx) e.oz=1; A.stHit(e,'turret','k',1); A.stResolve(e,won,won?'turret':undefined); };
  for(let i=0;i<8;i++) oz('rock');                       // destroyed above the line
  for(let i=0;i<2;i++) oz('rock',{cross:true});          // destroyed after crossing: not held
  oz('rock',{won:false,cross:true});                     // leaked
  const g=A.agg(); assert.equal(g.mob.rock.rz,11); assert.equal(g.mob.rock.hold,8,'only kills above the ozone are held');
  const e=mob('rock'); e.y=OZ+5; A.stSpawn(e); assert(e.ozx,'spawning below the ozone exempts the mob');
}

// 9c. level stars
{
  const run=(rz,hold)=>({rz,hold});
  let b=A.starBitsFor(run({rock:10},{rock:8}),0.8,'rock');
  assert.equal(b,1|2,'80% held clears the hold goal; 80% of the featured mob misses 95%');
  b=A.starBitsFor(run({rock:20},{rock:20}),0.9,'rock'); assert.equal(b,7,'everything held = all three stars');
  b=A.starBitsFor(run({rock:10,dart:10},{rock:10,dart:5}),0.8,'rock'); assert.equal(b,1|4,'featured mob held, overall not');
  b=A.starBitsFor(run({rock:10},{rock:1}),0.8,'rock'); assert.equal(b,1,'clear only');
  assert.equal(A.starBitsFor(run({},{}),0.8,'rock'),7,'nothing to judge counts as held');
  assert(A.starHold(5)<A.starHold(20)&&A.starHold(20)<A.starHold(40),'hold goal tightens with level');
  reset(); const P=A.P(); P.prog={belt:{stars:{1:7,2:1,3:2}}}; assert.equal(A.starsOfWorld('belt'),3+1+1); assert.equal(A.popc(5),2);
}

// 9d. achievement rewards: gems by tier, fragments for tiers 1+
{
  reset(); const P=A.P(); for(let i=0;i<50;i++) fight('rock',true); A.achCheck(true);   // Spotter: Bronze
  assert(A.stOf().ach['sight0@belt']); assert.equal(P.gems,A.ECON.achGems[0]); assert.equal(Object.values(P.frag).reduce((a,b)=>a+b,0),A.ECON.achFrag[0]);
  const before=P.gems; Object.keys(A.MOB).forEach(k=>A.stOf().world.belt[k]=1); A.achCheck(true);
  assert(P.gems>before,'later unlocks pay more gems'); assert(Object.values(P.frag).reduce((a,b)=>a+b,0)>0,'higher tiers pay fragments');
  const g2=P.gems; A.achCheck(true); assert.equal(P.gems,g2,'no double payout');
}

// 9e. old saves: the global record and unlocks become Meteor Belt's, once
{
  reset(); const st=A.stOf(); st.enc={rock:300}; st.kill={rock:290}; st.leak={rock:10}; st.rz={rock:300}; st.hold={rock:280}; st.w={turret:{rock:[300,290,290,0,0,0]}}; st.ach={sight0:123,world_belt:5,w80_turret:77}; st.pwm=0; st.pw={};
  vm.runInContext('stPwMigrate()',ctx); vm.runInContext('stPwMigrate()',ctx);
  assert.equal(st.pw.belt.enc.rock,300); assert.deepEqual(st.pw.belt.w.turret.rock,[300,290,290,0,0,0]);
  assert.equal(st.ach['sight0@belt'],123); assert.equal(st.ach['w80_turret@belt'],77); assert(!st.ach['world_belt@belt']);
  assert(!st.pw.nebula,'only Meteor Belt inherits');
}

// 10. cloud merge: counters take the larger value, unlocks are a union with the earliest time
{
  const block=cut(cloud,"  const maxObj=","  const merge=");
  const m={}; vm.runInNewContext(block+"\nglobalThis.mergeSt=mergeSt;",m);
  const a={rz:{rock:10},hold:{rock:7},enc:{rock:10,dart:2},kill:{rock:9},leak:{rock:1},w:{turret:{rock:[10,9,9,0,0,0]}},world:{belt:{rock:1}},ach:{x:200,y:50},bf:1};
  const b={rz:{rock:12,dart:1},hold:{rock:5},enc:{rock:4,swarm:7},kill:{rock:4},leak:{},w:{turret:{rock:[4,4,4,0,0,0],dart:[1,1,1,0,0,0]},mine:{rock:[2,2,2,0,0,0]}},world:{belt:{dart:1},nebula:{swarm:1}},ach:{x:100,z:300}};
  const r=JSON.parse(JSON.stringify(m.mergeSt(a,b)));   // round-trip: the function ran in another vm realm
  assert.equal(r.enc.rock,10); assert.equal(r.enc.swarm,7); assert.equal(r.enc.dart,2);
  assert.deepEqual(r.w.turret.rock,[10,9,9,0,0,0]); assert.deepEqual(r.w.turret.dart,[1,1,1,0,0,0]); assert.deepEqual(r.w.mine.rock,[2,2,2,0,0,0]);
  assert.deepEqual(Object.keys(r.world.belt).sort(),['dart','rock']); assert(r.world.nebula.swarm);
  assert.deepEqual(r.ach,{x:100,y:50,z:300}); assert.equal(r.bf,1);
  assert.deepEqual(JSON.parse(JSON.stringify(m.mergeSt(undefined,undefined).ach)),{});
  assert.equal(r.rz.rock,12); assert.equal(r.rz.dart,1); assert.equal(r.hold.rock,7);
  const pa={pw:{belt:{enc:{rock:5},kill:{},leak:{},rz:{},hold:{},w:{turret:{rock:[5,5,5,0,0,0]}}}},pwm:1}, pb={pw:{belt:{enc:{rock:9},kill:{},leak:{},rz:{},hold:{},w:{}},void:{enc:{brute:2},kill:{},leak:{},rz:{},hold:{},w:{}}}};
  const pr=JSON.parse(JSON.stringify(m.mergeSt(pa,pb)));
  assert.equal(pr.pw.belt.enc.rock,9); assert.deepEqual(pr.pw.belt.w.turret.rock,[5,5,5,0,0,0]); assert.equal(pr.pw.void.enc.brute,2); assert.equal(pr.pwm,1);
  // whole-save merge: star bitmasks are OR'd, fragments take the larger count
  const full=cut(cloud,"  const maxObj=","  const code=");
  const m2={score:()=>0,JSON,Object,Math,Set,Array}; vm.runInNewContext("const score=j=>JSON.parse(j).sc||0;\n"+full+"\nglobalThis.merge=merge;",m2);
  const L=JSON.stringify({sc:5,prog:{belt:{best:5,stars:{1:1,2:3}}},frag:{pow:5,tmp:1},lv:{},cm:{}}), C=JSON.stringify({sc:9,prog:{belt:{best:9,stars:{1:6,3:7}}},frag:{pow:2,tmp:8},lv:{},cm:{}});
  const o=JSON.parse(m2.merge(L,C));
  assert.deepEqual(JSON.parse(JSON.stringify(o.prog.belt.stars)),{1:7,2:3,3:7},'stars union by bit'); assert.equal(o.prog.belt.best,9);
  assert.equal(o.frag.pow,5); assert.equal(o.frag.tmp,8);
}
console.log('achievements: all checks passed ('+A.achList().length+' achievements)');
