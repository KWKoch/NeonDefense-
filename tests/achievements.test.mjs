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
const loadApi=(shelf)=>{
const ctx={console,Date,Math,Set,Object,Array,JSON,saves:0,toasts:[]};
vm.createContext(ctx);
vm.runInContext(`
const LEVELS=50; const OZ_Y=439; const rollType=()=>'pow'; const CPT=[1,1,2,3];
${tables}
${shape}
let P={seen:{},prog:{},st:newSt(),gems:0,ce:{pow:0,tmp:0,rch:0,cap:0,frt:0}};
const G={wd:{id:'belt'},run:null};
const cryAdd=(k,n)=>{ P.ce[k]=(P.ce[k]||0)+n; return n; };
const ico=()=>'';  const Music={up(){}};  const save=()=>{ globalThis.saves++; };
${mod}
globalThis.api={SHELVED,achRetier,NKT,starBitsFor,starHold,starsOfWorld,ECON,popc,P:()=>P,setP:v=>{P=v},G,MOB,CLS,WORLDS,stSpawn,stHit,stResolve,agg,achList,achCheck,get achQ(){return achQ},stOf,newSt};
`,ctx);
if(shelf===false) ctx.api.SHELVED.length=0;
return ctx; };
/* Shelved weapons (mine, saw) are out of play by default; these tests exercise them with the shelf emptied, which is how they come back. */
const ctx=loadApi(false), A=ctx.api;
{ const D=loadApi(true).api; const ids=D.achList().map(d=>d.id);
  assert.deepEqual([...D.SHELVED],['mine','saw'],'mine and saw are shelved by default');
  assert(!ids.some(i=>/_(mine|saw)@/.test(i)),'no awards for shelved weapons'); assert(ids.some(i=>i==='wm0_turret@belt')&&ids.some(i=>i==='wm0_mortar@belt'),'other weapons keep theirs');
  assert(A.achList().some(i=>i.id==='wm0_mine@belt')&&A.achList().some(i=>i.id==='wl2_saw@belt'),'emptying the shelf restores them'); }
const reset=()=>{ A.setP({seen:{},prog:{},st:A.newSt(),bf:0,gems:0,ce:{pow:0,tmp:0,rch:0,cap:0,frt:0}}); A.G.run=null; };
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
  for(let i=0;i<1004;i++){ P.seen.rock=1; fight('rock',true); }   // a whole Meteor Belt level 1
  const st=A.stOf();
  assert.equal(st.enc.rock,1004); assert.equal(st.kill.rock,1004); assert(st.world.belt.rock);
  assert.equal(st.pw.belt.enc.rock,1004,'per-world record');
  A.achCheck(true);
  assert.deepEqual(Object.keys(st.ach),[],'clearing level 1 with the Turret alone unlocks nothing');
  for(let i=0;i<4000;i++) fight('rock',true);
  A.achCheck(true);
  assert(A.stOf().ach['sight0@belt'],'5,000 sightings in Meteor Belt'); assert(!st.ach['sight1@belt']);
  assert(!st.ach['sight0@nebula'],'other worlds count their own sightings');
  const w=A.G.wd; A.G.wd={id:'nebula'}; for(let i=0;i<5000;i++) fight('dart',true); A.G.wd=w;
  A.achCheck(true); assert(A.stOf().ach['sight0@nebula']); assert.equal(A.stOf().pw.belt.enc.dart,undefined,'nebula fights stay out of belt');
  assert.equal(A.stOf().enc.dart,5000,'global record still counts everything');
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
  reset(); A.G.run={rz:{},hold:{},kw:{}};
  for(let i=0;i<750;i++) fight('rock',true,{weapons:['mine','turret'],src:'mine'});
  for(let i=0;i<50;i++) fight('rock',false,{weapons:['mine']});
  const g=A.agg('belt'); const mine=g.wt.mine, tur=g.wt.turret;
  assert.deepEqual([mine[0],mine[1],mine[2]],[800,750,750],'mine engaged/defeated/killing blows');
  assert.deepEqual([tur[0],tur[1],tur[2]],[750,750,0],'turret assisted but never landed the killing blow');
  A.achCheck(true);
  const ac=A.stOf().ach;
  assert(ac['wl0_mine@belt'],'750 mine kills on rock meets the 500 mark'); assert(!ac['wl1_mine@belt'],'but not 2,500');
  assert(!ac['wl0_turret@belt'],'turret only assisted'); assert(!ac['wl0_mine@void'],'other worlds stay separate');
  assert(ac['wm0_mine@belt']&&ac['wm1_mine@belt'],'750 kills in one match clears Bronze and Silver'); assert(!ac['wm2_mine@belt'],'Gold needs 1,200'); assert(!ac['wm0_turret@belt']);
  const tiers=A.achList().filter(d=>d.id.endsWith('_mine@belt')&&d.cat==='wpn').map(d=>d.tier).sort();
  assert.deepEqual(JSON.parse(JSON.stringify(tiers)),[0,0,1,1,2,2],'weapon awards are Bronze, Silver and Gold');
}

// 6. off-type weapons: only the weapon's own damage type, and only at <=0.65x
{
  reset();
  for(let i=0;i<300;i++) fight('brute',true,{weapons:['turret'],src:'turret',m:0.5});   // resisted kinetic
  for(let i=0;i<5;i++) fight('brute',true,{weapons:['mine'],src:'mine',m:1.5});         // mine is the right tool
  const g=A.agg('belt');
  assert.equal(g.nk,300,'only resisted killing blows count'); assert.equal(g.wt.mine[3],0);
  A.achCheck(true); assert(A.stOf().ach['nk10@belt'],'250 off-type killing blows'); assert(!A.stOf().ach['nk100@belt']);
  // arc card: energy damage dealt by the turret is not "kinetic resisted"
  const e=mob('brute'); A.stSpawn(e); A.stHit(e,'turret','e',0.3); A.stResolve(e,true,'turret');
  assert.equal(A.agg('belt').wt.turret[3],300,'turret arc card must not flag a resisted engagement');
  // the rate award needs its sample first
  reset(); for(let i=0;i<400;i++) fight('brute',true,{weapons:['turret'],src:'turret',m:0.5});
  A.achCheck(true); assert(!A.stOf().ach['ni50@belt'],'400 resisted fights is under the 500 sample');
  for(let i=0;i<100;i++) fight('brute',true,{weapons:['turret'],src:'turret',m:0.5});
  A.achCheck(true); assert(A.stOf().ach['ni50@belt'],'500 resisted fights at 100%'); assert(!A.stOf().ach['ni65@belt'],'Silver needs 2,500');
  // variety: a type only counts once it has NKT resisted killing blows
  reset(); for(const t of ['brute','chunk','shield']) fight(t,true,{weapons:['turret'],src:'turret',m:0.5});
  A.achCheck(true); assert(!A.stOf().ach['nt3@belt'],'one blow per type is not enough');
  for(const t of ['brute','chunk','shield']) for(let i=1;i<A.NKT;i++) fight(t,true,{weapons:['turret'],src:'turret',m:0.5});
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

// 9d. achievement rewards: gems and crystals by tier, paid once
{
  reset(); const P=A.P(); const frag=()=>Object.values(P.ce).reduce((a,b)=>a+b,0);
  for(let i=0;i<5000;i++) fight('rock',true,{weapons:['turret'],src:'turret'}); A.achCheck(true);
  const ac=A.stOf().ach; assert(ac['sight0@belt']&&ac['wl0_turret@belt'],'5,000 Turret kills: Spotter and Marksman, both Bronze');
  const n0=Object.keys(ac).length; assert.equal(P.gems,n0*A.ECON.achGems[0]); assert.equal(frag(),n0*A.ECON.achCry[0]);
  const before=P.gems; Object.keys(A.MOB).forEach(k=>A.stOf().world.belt[k]=1); A.achCheck(true);   // world survey: Silver
  assert.equal(P.gems-before,A.ECON.achGems[1]+3*A.ECON.achGems[0],'survey (Silver) + three class surveys (Bronze)');
  const g2=P.gems; A.achCheck(true); assert.equal(P.gems,g2,'no double payout');
  assert(A.ECON.achGems.every((g,i)=>!i||g>A.ECON.achGems[i-1])&&A.ECON.achGems[3]<=60,'rewards climb by tier and stay small next to the 300-gem save cap');
}

// 9f. conquest: clearing levels and earning every star
{
  reset(); const P=A.P(); P.prog={belt:{best:9,stars:{}}}; A.achCheck(true); assert(!A.stOf().ach['lv10@belt']);
  P.prog.belt.best=10; A.achCheck(true); assert(A.stOf().ach['lv10@belt'],'Beachhead at level 10'); assert(!A.stOf().ach['lv25@belt']);
  P.prog.belt.best=50; for(let n=1;n<=49;n++) P.prog.belt.stars[n]=7; A.achCheck(true);
  assert(A.stOf().ach['lv25@belt']&&A.stOf().ach['lv50@belt'],'Holdout and Conqueror'); assert(!A.stOf().ach['stars@belt'],'149 stars is not all of them');
  P.prog.belt.stars[50]=7; A.achCheck(true); assert(A.stOf().ach['stars@belt'],'all 150 stars'); assert(!A.stOf().ach['lv10@nebula']);
  const t=Object.fromEntries(A.achList().filter(d=>d.wid==='belt'&&d.grp==='conquest').map(d=>[d.id,d.tier]));
  assert.deepEqual(t,{'lv10@belt':0,'lv25@belt':1,'lv50@belt':2,'stars@belt':3});
}

// 9g. retune: earned awards stay earned, and Command Points they were worth under the old tiers are kept
{
  reset(); const st=A.stOf(); st.am2=0;
  st.ach={'wm0_turret@belt':1,'wm1_turret@belt':1,'wm2_turret@belt':1,'sight0@belt':1,'sight1@belt':1,'world_belt':1,'cls_mineral@belt':1,'nk100@belt':1};
  // old CP: wm 1+2+3, sight 1+1, survey 2, class 1, nk100 1 = 12. New tiers: wm 1+1+2, sight 1+1, survey 1, class 1, nk100 1 = 9
  A.achRetier(); assert.equal(st.cpb,3,'old tiers were worth 3 more points'); assert.equal(st.am2,1);
  A.achRetier(); assert.equal(st.cpb,3,'runs once');
  assert(st.ach['wm2_turret@belt'],'nothing is taken away');
  const g=A.P().gems; A.achCheck(true); assert.equal(A.P().gems,g,'already-earned awards are not paid again');
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
  assert.equal(JSON.parse(JSON.stringify(m.mergeSt({am2:1,cpb:4},{cpb:2}))).cpb,4,'retune bonus survives a merge'); assert.equal(m.mergeSt({},{am2:1}).am2,1);
  assert.equal(pr.pw.belt.enc.rock,9); assert.deepEqual(pr.pw.belt.w.turret.rock,[5,5,5,0,0,0]); assert.equal(pr.pw.void.enc.brute,2); assert.equal(pr.pwm,1);
  // whole-save merge: star bitmasks are OR'd, crystal ledgers take the larger count
  const full=cut(cloud,"  const maxObj=","  const code=");
  const m2={score:()=>0,JSON,Object,Math,Set,Array}; vm.runInNewContext("const score=j=>JSON.parse(j).sc||0;\n"+full+"\nglobalThis.merge=merge;",m2);
  const L=JSON.stringify({sc:5,prog:{belt:{best:5,stars:{1:1,2:3}}},ce:{pow:5,tmp:1},cs:{pow:1},lv:{},cm:{}}), C=JSON.stringify({sc:9,prog:{belt:{best:9,stars:{1:6,3:7}}},ce:{pow:2,tmp:8},cs:{pow:2},lv:{},cm:{}});
  const o=JSON.parse(m2.merge(L,C));
  assert.deepEqual(JSON.parse(JSON.stringify(o.prog.belt.stars)),{1:7,2:3,3:7},'stars union by bit'); assert.equal(o.prog.belt.best,9);
  assert.equal(o.ce.pow,5); assert.equal(o.ce.tmp,8); assert.equal(o.cs.pow,2); assert.equal(o.frag,undefined);
}
console.log('achievements: all checks passed ('+A.achList().length+' achievements)');
