// Run: node tests/music.test.mjs
// Checks the track library and level->track mapping straight out of index.html (no audio device needed).
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const cut=(a,b)=>{ const i=html.indexOf(a), j=html.indexOf(b,i); assert(i>=0&&j>i,'marker missing: '+a); return html.slice(i,j); };
const ctx={Math,Object,Array,String,JSON}; vm.createContext(ctx);
vm.runInContext(cut('function mulberry','/* ================= audio')+cut('const SCALES=','const Music=(function')+
  'globalThis.api={TRACKS,TRACK_POOL,SCALES,DRUMS,BASSL,ARPS,trackFor,buildTrack,scNote};',ctx);
const A=ctx.api, T=A.TRACKS;

assert(T.length>=20,'at least twenty tracks, got '+T.length);
assert.equal(new Set(T.map(t=>t.id)).size,T.length,'unique ids'); assert.equal(new Set(T.map(t=>t.name)).size,T.length,'unique names');
for(const t of T){
  assert(A.SCALES[t.mode],t.id+' mode'); assert(A.DRUMS[t.drums],t.id+' drums'); assert(A.BASSL[t.bass],t.id+' bass'); assert(!t.arp||A.ARPS[t.arp],t.id+' arp');
  assert.equal(t.prog.length,8,t.id+' needs an 8-bar progression'); assert(t.prog.every(d=>d>=0&&d<7),t.id+' degrees');
  assert(t.bpm>=90&&t.bpm<=160,t.id+' bpm'); assert(t.root>=29&&t.root<=40,t.id+' root keeps the bass audible');
  assert(['clap','sn'].includes(t.bk),t.id+' backbeat'); assert(t.stab.every(s=>s>=0&&s<16),t.id+' stab steps');
  assert.equal(A.BASSL[t.bass].length,16); assert.equal(A.DRUMS[t.drums].h.length,16);
  const B=A.buildTrack(t); assert.equal(B.lead.length,8); assert(B.lead.every(b=>b.length===8)); assert(B.lead.flat().filter(Boolean).length>=16,t.id+' has a real melody');
  assert.equal(JSON.stringify(A.buildTrack(t).lead),JSON.stringify(B.lead),t.id+' deterministic');
}
// pools: 1 menu, 4 per world, 3 boss
assert.equal(A.TRACK_POOL.menu.length,1); assert.equal(A.TRACK_POOL.boss.length,3);
for(const w of ['belt','nebula','armada','rift','void']) assert.equal(A.TRACK_POOL[w].length,4,w);
// every level of every world resolves to a track from the right pool; consecutive levels differ
for(const w of ['belt','nebula','armada','rift','void']) for(const elite of [false,true]) for(let n=1;n<=50;n++){
  const boss=n%10===0, t=A.trackFor(w,n,boss,elite); assert(t,w+n); assert.equal(t.w,boss?'boss':w);
  if(n>1&&!boss&&(n-1)%10!==0){ assert.notEqual(t.id,A.trackFor(w,n-1,false,elite).id,'back-to-back levels share a track '+w+n); }
}
assert.equal(A.trackFor('nowhere',3,false,false).w,'belt','unknown world falls back');
assert.equal(new Set([10,20,30].map(n=>A.trackFor('belt',n,true,false).id)).size,3,'boss levels rotate through all three boss tracks');
console.log('music: all checks passed ('+T.length+' tracks)');
