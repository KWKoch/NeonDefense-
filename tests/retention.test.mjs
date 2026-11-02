/* Ownership retention: the cloud merge must never lose a purchase, in either direction, and an erase must stick. Run: node tests/retention.test.mjs */
import fs from 'fs'; import assert from 'assert';
const src=fs.readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const a=src.indexOf('const score='), b=src.indexOf('const code=');
const body=src.slice(a,b).replace(/const mine=[^\n]*\n/,'');
const {merge,score}=new Function(body+'; return {merge,score};')();
const base=()=>({lv:{'turret.p':3},cm:{},gems:100,pass:0,starter:0,own:{belt:true},prog:{belt:{best:9,stars:{}}},seen:{},st:{ach:{}},frag:{},cmd:{eq:'warden',own:{warden:0},tl:{}},tut:{},ledger:[],vault:{v:1,items:{}}});
const J=o=>JSON.stringify(o), P=j=>JSON.parse(j);
let n=0; const t=(name,fn)=>{ fn(); n++; console.log('PASS',name); };
t('commander bought on device A survives merge in both directions',()=>{
  const A=base(); A.cmd.own.rook=2; A.gems=10; const B=base(); B.prog.belt.best=12; B.lv['turret.p']=5; /* B is further along but never saw the purchase */
  for(const [x,y] of [[A,B],[B,A]]){ const m=P(merge(J(x),J(y))); assert.strictEqual(m.cmd.own.rook,2); assert.strictEqual(m.lv['turret.p'],5); assert.strictEqual(m.prog.belt.best,12); }
});
t('worlds, vault and unknown fields are unioned',()=>{
  const A=base(); A.own.ice=true; A.vault.items['world:ice']=1; A.extra={x:1}; const B=base(); B.own.lava=true; B.vault.items['cmd:vex']=3;
  const m=P(merge(J(A),J(B))); assert(m.own.ice&&m.own.lava); assert.strictEqual(m.vault.items['cmd:vex'],3); assert.deepStrictEqual(m.extra,{x:1});
});
t('commander rarity upgrade on one device wins',()=>{
  const A=base(); A.cmd.own.rook=1; const B=base(); B.cmd.own.rook=3; assert.strictEqual(P(merge(J(A),J(B))).cmd.own.rook,3);
});
t('a talent refund sticks, but concurrent spends still union',()=>{
  const A=base(); A.cmd.own.rook=1; A.cmd.tl.rook={n1:1,n2:2}; const B=JSON.parse(J(A)); B.cmd.tl.rook={}; B.cmd.rs={rook:1};
  assert.deepStrictEqual(P(merge(J(A),J(B))).cmd.tl.rook,{}); assert.deepStrictEqual(P(merge(J(B),J(A))).cmd.tl.rook,{});
  const C=base(); C.cmd.tl.rook={n1:1}; const D=base(); D.cmd.tl.rook={n2:1}; assert.deepStrictEqual(P(merge(J(C),J(D))).cmd.tl.rook,{n1:1,n2:1});
});
t('an erase (newer epoch) is not resurrected by the old cloud copy',()=>{
  const old=base(); old.cmd.own.rook=2; const fresh=base(); fresh.epoch=Date.now(); const m=P(merge(J(fresh),J(old))); assert.strictEqual(m.cmd.own.rook,undefined); assert(m.epoch>0);
  const m2=P(merge(J(old),J(fresh))); assert.strictEqual(m2.cmd.own.rook,undefined);
});
t('spent shards stay spent: an older copy cannot refill them',()=>{
  const old=base(); old.frag={'turret.pow':10}; old.fe={'turret.pow':10}; old.fs={};   /* cloud copy from before the forge */
  const now=base(); now.frag={'turret.pow':6}; now.fe={'turret.pow':10}; now.fs={'turret.pow':4}; now.lv['turret.p']=4;
  for(const [x,y] of [[now,old],[old,now]]){ const m=P(merge(J(x),J(y))); assert.strictEqual(m.frag['turret.pow'],6); assert.strictEqual(m.fs['turret.pow'],4); }
  const legacy=base(); legacy.frag={'turret.pow':10};   /* build with no ledger at all */
  assert.strictEqual(P(merge(J(now),J(legacy))).frag['turret.pow'],6);
  const other=base(); other.frag={'turret.pow':13}; other.fe={'turret.pow':13}; other.fs={};   /* earned 3 more on another device */
  assert.strictEqual(P(merge(J(now),J(other))).frag['turret.pow'],9);
});
t('commander ownership counts toward the progress score',()=>{ const a=base(), b=base(); b.cmd.own.rook=0; assert(score(J(b))>score(J(a))); });
t('merge is stable: merging a save with itself changes nothing',()=>{ const A=base(); A.cmd.own.rook=2; A.vault.items['cmd:rook']=3; const m=P(merge(J(A),J(A))); assert.strictEqual(m.cmd.own.rook,2); assert.strictEqual(m.gems,100); });
console.log(n+' passed');
