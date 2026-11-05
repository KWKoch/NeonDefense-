import { firebaseConfig } from './firebase-config.js';
const V='10.14.1', B='https://www.gstatic.com/firebasejs/'+V+'/';
// Apple provider is not configured in the Firebase project yet; flip when it is.
const APPLE_ENABLED=false;
const HINT='nd-signed-in'; // set while a user is signed in; lets a returning player in if the SDK can't load offline
const R=window.RRcloud={enabled:false,user:null,status:'',error:'',apple:APPLE_ENABLED,push(){},action(){}};
const ping=()=>dispatchEvent(new Event('rrcloud'));
const $=id=>document.getElementById(id);
const standalone=()=>{ try{ return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches; }catch(e){ return false; } };

/* ---- sign-in gate: covers the whole app until a signed-in user exists ---- */
const gate={
  open(msg,showBtns,err){
    $('gate').hidden=false; $('gateMsg').textContent=msg||''; $('gateErr').textContent=err||'';
    const b=$('gateBtns'); b.innerHTML='';
    if(showBtns){
      const mk=(a,label)=>{ const x=document.createElement('button'); x.className='btn big'; x.type='button'; x.textContent=label; x.onclick=()=>R.action(a); b.appendChild(x); };
      mk('google','Sign in with Google'); if(APPLE_ENABLED) mk('apple','Sign in with Apple');
    }
  },
  close(){ $('gate').hidden=true; }
};
const signInScreen=err=>navigator.onLine
  ? gate.open('Sign in to play. Your progress is saved to your account.',true,err)
  : gate.open('Connect to the internet to sign in.',false,err);
addEventListener('online',()=>{ if(!R.user&&!$('gate').hidden&&R.enabled) signInScreen(); });
addEventListener('offline',()=>{ if(!R.user&&!$('gate').hidden&&R.enabled) signInScreen(); });

if(!firebaseConfig.apiKey||firebaseConfig.apiKey==='PASTE_ME'){ console.info('Cloud off: no firebase-config.js values'); gate.close(); }
else (async()=>{
  let F,A,auth,db;
  try{
    let app; [{initializeApp:app},A,F]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
    auth=A.getAuth(app(firebaseConfig)); db=F.getFirestore(auth.app);
  }catch(e){
    console.warn('cloud init failed',e);
    // SDK unavailable (offline, never cached). Returning players may keep playing locally; new players must connect.
    if(localStorage.getItem(HINT)) gate.close(); else gate.open('Connect to the internet to sign in.',false);
    return;
  }
  const SKEY='rave-rampart-v5';
  // progress score: more levels + more upgrades wins when local and cloud differ (integer, rules require int)
  const score=j=>{ try{ const o=JSON.parse(j); let n=0; for(const k in (o.prog||{})) n+=(o.prog[k].best||0)*10+Object.keys(o.prog[k].perf||{}).length+Object.keys(o.prog[k].eclr||{}).length*2; for(const k in (o.lv||{})) n+=o.lv[k]; for(const k in ((o.cmd||{}).own||{})) n+=((+o.cmd.own[k]||0)+1)*25; n+=Object.keys((o.vault||{}).items||{}).length; return Math.round(n)||0; }catch(e){ return -1; } };
  const mine=u=>F.doc(db,'users',u.uid);
  /* Structured, queryable summary of the account (levels, accomplishments, wallet, entitlements) stored next to the full save blob. Client-reported: the blob stays the source of truth until purchases are verified server-side. */
  const summary=j=>{ try{ const o=JSON.parse(j||'{}'), best={}; let perfect=0, elite=0, cards=0;
      for(const k in (o.prog||{})){ const q=o.prog[k]||{}; best[k]=Math.max(0,Math.floor(+q.best||0)); perfect+=Object.keys(q.perf||{}).length; elite+=Object.keys(q.eclr||{}).length; }
      for(const t in (o.inv||{})) for(const n of (o.inv[t]||[])) cards+=Math.max(0,Math.floor(+n||0));
      return {best,perfect,elite,cards,gems:Math.max(0,Math.floor(+o.gems||0)),pass:Math.max(0,Math.floor(+o.pass||0)),starter:o.starter?1:0,
        upgrades:Object.values(o.lv||{}).reduce((a,b)=>a+(+b||0),0),mastery:Object.values(o.cm||{}).reduce((a,b)=>a+(+b||0),0),worlds:Object.keys(o.own||{}).length,build:+o.build||0,ach:Object.keys((o.st||{}).ach||{}).length,stars:Object.values(o.prog||{}).reduce((t,q)=>t+Object.values((q||{}).stars||{}).reduce((u,m)=>u+[1,2,4].filter(b=>(+m||0)&b).length,0),0),frags:Object.values(o.frag||{}).reduce((a,b)=>a+(+b||0),0)}; }catch(e){ return {}; } };
  const ledger=j=>{ try{ const l=JSON.parse(j||'{}').ledger; return Array.isArray(l)?l.slice(-100).map(x=>({t:Math.floor(+x.t||0),k:String(x.k||'').slice(0,24),d:String(x.d||'').slice(0,60)})):[]; }catch(e){ return []; } };
  const rec=j=>({data:j||'{}',score:Math.max(0,score(j||'{}')),updated:Date.now(),stats:summary(j),ledger:ledger(j)});
  /* Field-level merge for first sign-in on a device: take the save with more progress as the base, then keep anything the other one has that must never be lost. */
  /* Combat record: counters keep the larger value, mob sightings per world are a union, achievements are a union (earliest unlock time wins). */
  const maxObj=(x,y)=>{ const r=Object.assign({},x||{}); for(const k in (y||{})) r[k]=Math.max(+r[k]||0,+y[k]||0); return r; };
  const mergeSt=(x,y)=>{ x=x||{}; y=y||{}; const r={v:1,bf:(x.bf||y.bf)?1:0,enc:maxObj(x.enc,y.enc),kill:maxObj(x.kill,y.kill),leak:maxObj(x.leak,y.leak),rz:maxObj(x.rz,y.rz),hold:maxObj(x.hold,y.hold),w:{},world:{},ach:{}};
    for(const w of new Set([...Object.keys(x.w||{}),...Object.keys(y.w||{})])){ r.w[w]={}; const p=(x.w||{})[w]||{}, q=(y.w||{})[w]||{};
      for(const m of new Set([...Object.keys(p),...Object.keys(q)])){ const a=p[m]||[], b=q[m]||[]; r.w[w][m]=[0,1,2,3,4,5].map(i=>Math.max(+a[i]||0,+b[i]||0)); } }
    for(const w of new Set([...Object.keys(x.world||{}),...Object.keys(y.world||{})])) r.world[w]=Object.assign({},(x.world||{})[w],(y.world||{})[w]);
    r.pwm=(x.pwm||y.pwm)?1:0; r.am2=(x.am2||y.am2)?1:0; r.cpb=Math.max(+x.cpb||0,+y.cpb||0); r.pw={};
    for(const wd of new Set([...Object.keys(x.pw||{}),...Object.keys(y.pw||{})])){ const p=(x.pw||{})[wd]||{}, q=(y.pw||{})[wd]||{}, o={enc:maxObj(p.enc,q.enc),kill:maxObj(p.kill,q.kill),leak:maxObj(p.leak,q.leak),rz:maxObj(p.rz,q.rz),hold:maxObj(p.hold,q.hold),mk:maxObj(p.mk,q.mk),w:{}};
      for(const w of new Set([...Object.keys(p.w||{}),...Object.keys(q.w||{})])){ o.w[w]={}; const pa=(p.w||{})[w]||{}, qa=(q.w||{})[w]||{};
        for(const m of new Set([...Object.keys(pa),...Object.keys(qa)])){ const a=pa[m]||[], b=qa[m]||[]; o.w[w][m]=[0,1,2,3,4,5].map(i=>Math.max(+a[i]||0,+b[i]||0)); } }
      r.pw[wd]=o; }
    for(const k of new Set([...Object.keys(x.ach||{}),...Object.keys(y.ach||{})])){ const a=+(x.ach||{})[k]||0, b=+(y.ach||{})[k]||0; r.ach[k]=a&&b?Math.min(a,b):(a||b); }
    return r; };
  /* Level stars are per-level bitmasks (1 clear, 2 held at the ozone, 4 featured mob held): OR them so neither device loses a star. */
  const mergeStars=(o,a,b)=>{ const pa=(a&&a.prog)||{}, pb=(b&&b.prog)||{}; o.prog=o.prog||{};
    for(const w of new Set([...Object.keys(pa),...Object.keys(pb)])){ const sa=(pa[w]||{}).stars||{}, sb=(pb[w]||{}).stars||{}, r={};
      for(const n of new Set([...Object.keys(sa),...Object.keys(sb)])) r[n]=((+sa[n]||0)|(+sb[n]||0))&7;
      const qa=pa[w]||{}, qb=pb[w]||{}; o.prog[w]=o.prog[w]||{}; o.prog[w].stars=r;
      o.prog[w].best=Math.max(+qa.best||0,+qb.best||0); o.prog[w].perf=Object.assign({},qb.perf||{},qa.perf||{}); o.prog[w].eclr=Object.assign({},qb.eclr||{},qa.eclr||{}); if(!o.prog[w].sel) o.prog[w].sel=qa.sel||qb.sel||1; } };
  const merge=(lj,cj)=>{ try{
      const l=JSON.parse(lj||'{}'), c=JSON.parse(cj||'{}'); { const ea=+l.epoch||0, eb=+c.epoch||0; if(ea!==eb) return ea>eb?lj:cj; } const cloudWins=score(cj)>score(lj||'{}'), a=cloudWins?c:l, b=cloudWins?l:c, o=JSON.parse(JSON.stringify(a));
      const maxMap=(k)=>{ o[k]=Object.assign({},b[k]||{},a[k]||{}); for(const i in (b[k]||{})) o[k][i]=Math.max(+(a[k]||{})[i]||0,+(b[k]||{})[i]||0); };
      maxMap('lv'); maxMap('cm'); o.seen=Object.assign({},b.seen||{},a.seen||{}); o.seenW=Object.assign({},b.seenW||{},a.seenW||{}); o.own=Object.assign({},b.own||{},a.own||{});
      o.st=mergeSt(a.st,b.st); mergeStars(o,a,b); { const side=x=>{ const f=x.frag||{}; return x.fe?{e:x.fe,s:x.fs||{}}:{e:f,s:{}}; }, sa=side(a), sb=side(b); o.fe=maxObj(sa.e,sb.e); o.fs=maxObj(sa.s,sb.s); o.frag={}; for(const k of new Set([...Object.keys(o.fe),...Object.keys(o.fs)])) o.frag[k]=Math.max(0,(+o.fe[k]||0)-(+o.fs[k]||0)); }
      { const ca=a.cmd||{}, cb=b.cmd||{}, tl={}; const rs=maxObj(ca.rs,cb.rs); for(const id of new Set([...Object.keys(ca.tl||{}),...Object.keys(cb.tl||{})])){ const ra=+(ca.rs||{})[id]||0, rb=+(cb.rs||{})[id]||0; tl[id]=ra>rb?Object.assign({},(ca.tl||{})[id]):rb>ra?Object.assign({},(cb.tl||{})[id]):maxObj((ca.tl||{})[id],(cb.tl||{})[id]); } const own=Object.assign({},cb.own||{},ca.own||{}); for(const id in (cb.own||{})) own[id]=Math.max(+(ca.own||{})[id]||0,+cb.own[id]||0); o.tut=Object.assign({},b.tut||{},a.tut||{}); o.cmd={eq:ca.eq||cb.eq||'warden',own:own,tl:tl,rs:rs}; }
      o.vault={v:1,items:maxObj((a.vault||{}).items,(b.vault||{}).items)}; o.epoch=+a.epoch||0; for(const k in b) if(!(k in o)) o[k]=b[k];
      o.pass=Math.max(+a.pass||0,+b.pass||0); o.starter=(a.starter||b.starter)?1:0; o.tester=(a.tester||b.tester)?1:0; o.tw=(a.tw||b.tw)?1:0; o.prem=Object.assign({},b.prem||{},a.prem||{}); { const sa=a.ss||null, sb=b.ss||null; o.ss=sa&&sb&&sa.n===sb.n?{n:sa.n,pts:Math.max(+sa.pts||0,+sb.pts||0),cf:(+sa.cf||0)|(+sb.cf||0),cp:(+sa.cp||0)|(+sb.cp||0)}:((sa&&sb)?((+sa.n||0)>(+sb.n||0)?sa:sb):(sa||sb)); } o.chestDay=[a.chestDay||'',b.chestDay||''].sort().pop(); { const da=a.adDay||'', db=b.adDay||''; o.adDay=da===db?da:(+da.split('-').join('')>+db.split('-').join('')?da:db)||''; o.adN=da===db?Math.max(+a.adN||0,+b.adN||0):(o.adDay===da?(+a.adN||0):(+b.adN||0)); } o.passDay=[a.passDay||'',b.passDay||''].sort().pop();
      o.ledger=[].concat(a.ledger||[],(b.ledger||[]).filter(x=>!(a.ledger||[]).some(y=>y.t===x.t&&y.k===x.k))).sort((x,y)=>x.t-y.t).slice(-100);
      return JSON.stringify(o); }catch(e){ return score(cj)>score(lj||'{}')?cj:lj; } };
  const code=e=>(e&&e.code)||'error';
  const nice=e=>code(e).replace('auth/','').replace(/-/g,' ');
  /* Until the new rules (stats + ledger fields) are published, fall back to the plain save so cloud sync never breaks. */
  let slim=false;
  /* gems + gt sit next to the blob so the security rules can cap how fast the balance grows (see firestore.rules).
     gt is the server time of the last gem increase: kept as-is when gems did not rise, set to server time when they did. */
  const gemsOf=j=>{ try{ return Math.max(0,Math.floor(+JSON.parse(j||'{}').gems||0)); }catch(e){ return 0; } };
  const withGems=(r,prev)=>Object.assign({},r,{gems:gemsOf(r.data),gt:(prev&&typeof prev.gems==='number'&&prev.gt&&gemsOf(r.data)<=prev.gems)?prev.gt:F.serverTimestamp()});
  /* the cloud's gem balance is the gems field, not the copy inside the blob */
  const cloudData=d=>{ try{ if(typeof d.gems!=='number') return d.data; const o=JSON.parse(d.data); o.gems=d.gems; return JSON.stringify(o); }catch(e){ return d.data; } };
  const put=async(u,r,prev)=>{ r=withGems(r,prev); const lean=()=>{ const {stats,ledger,...rest}=r; return rest; }; if(slim) return F.setDoc(mine(u),lean()); try{ return await F.setDoc(mine(u),r); }catch(e){ if(code(e)!=='permission-denied') throw e; await F.setDoc(mine(u),lean()); slim=true; } };
  let timer=null;
  R.enabled=true;
  /* Every write first reads the cloud copy and merges it in, so a stale device can never overwrite what another device earned. Anything new from the cloud is handed to the live game; failures retry until they land. */
  const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.keys(v).sort().reduce((r,k)=>(r[k]=canon(v[k]),r),{}):v;
  const same=(x,y)=>{ try{ return JSON.stringify(canon(JSON.parse(x)))===JSON.stringify(canon(JSON.parse(y))); }catch(e){ return x===y; } };
  let busy=false, again=false, retry=null, synced=false;
  const flushNow=async()=>{ const u=auth.currentUser; if(!u) return true; if(!synced) return false; if(busy){ again=true; return false; } busy=true; let ok=false;
    try{
      let local=localStorage.getItem(SKEY); const snap=await F.getDoc(mine(u));
      /* the cloud save was deleted on the server while this tab was open: drop this device's copy instead of re-uploading it */
      if(!snap.exists()){ wipeLocal(); try{ sessionStorage.removeItem('nd-synced'); }catch(e){} location.reload(); return false; }
      if(snap.exists()&&snap.data().data&&local){ const m=merge(local,cloudData(snap.data())); if(!same(m,local)){ localStorage.setItem(SKEY,m); local=m; if(window.NDAdopt) window.NDAdopt(m); } }
      await put(u,rec(local),snap.data()); R.status='saved'; ok=true; clearTimeout(retry);
    }catch(e){ R.status='offline'; clearTimeout(retry); retry=setTimeout(flushNow,15000); }
    busy=false; ping(); if(again){ again=false; setTimeout(flushNow,200); } return ok; };
  R.flush=()=>{ clearTimeout(timer); return flushNow(); };
  R.push=()=>{ if(!auth.currentUser) return; clearTimeout(timer); timer=setTimeout(flushNow,1500); };
  addEventListener('online',()=>{ if(auth.currentUser) flushNow(); });
  /* The server copy is the account's source of truth. This device only keeps a cache of it so the game can boot instantly and play offline.
     On every sign-in/load the cloud save replaces the device copy outright. If the account has no cloud save (new account, or the save was
     wiped on the server), the device copy is cleared too, so an old local save can never be uploaded into the account. */
  const LOCAL_KEYS=[SKEY,'nd-backup-v1','nd-seen-v1','rave-rampart-v4'];
  const wipeLocal=()=>{ for(const k of LOCAL_KEYS){ try{ localStorage.removeItem(k); }catch(e){} } };
  async function sync(u){
    try{
      const snap=await F.getDoc(mine(u)), local=localStorage.getItem(SKEY);
      /* Reload loop guard: the save can re-serialize differently on every load, which used to reload forever. Reload at most once per tab session per account. */
      let did=false; try{ did=sessionStorage.getItem('nd-synced')===u.uid; }catch(e){}
      const mark=()=>{ try{ sessionStorage.setItem('nd-synced',u.uid); }catch(e){} };
      if(snap.exists()&&snap.data().data){
        const cloud=cloudData(snap.data());
        if(!local||!same(cloud,local)){ localStorage.setItem(SKEY,cloud); localStorage.setItem('nd-backup-v1',cloud); if(!did){ mark(); location.reload(); return; } if(window.NDAdopt) window.NDAdopt(cloud); }
        mark(); synced=true; R.status='saved';
      } else {
        if(!did&&LOCAL_KEYS.some(k=>localStorage.getItem(k)!==null)){ wipeLocal(); mark(); location.reload(); return; }
        mark();
        await put(u,rec(localStorage.getItem(SKEY)),null); synced=true; R.status='saved';
      }
    }catch(e){ R.status='offline'; }
    ping();
  }
  const provider=a=>{ if(a==='apple'){ const p=new A.OAuthProvider('apple.com'); p.addScope('email'); return p; } return new A.GoogleAuthProvider(); };
  async function signIn(a){
    const p=provider(a);
    if(standalone()) return A.signInWithRedirect(auth,p);
    try{ await A.signInWithPopup(auth,p); }
    catch(e){
      const c=code(e);
      if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(auth,p);
      throw e;
    }
  }
  async function del(){
    const u=auth.currentUser; if(!u) return;
    const go=async()=>{ await F.deleteDoc(mine(u)); await A.deleteUser(u); clearTimeout(timer); localStorage.removeItem(SKEY); location.reload(); };
    try{ await go(); }
    catch(e){
      if(code(e)!=='auth/requires-recent-login'||standalone()) throw e; // redirect would lose the pending delete
      const pid=(u.providerData[0]||{}).providerId;
      await A.reauthenticateWithPopup(u,provider(pid==='apple.com'?'apple':'google')); await go();
    }
  }
  gate.open('Checking sign-in\u2026',false);
  A.onAuthStateChanged(auth,u=>{
    R.user=u?{email:u.email,name:u.displayName,uid:u.uid}:null;
    if(u){ localStorage.setItem(HINT,'1'); gate.close(); sync(u); }
    else { localStorage.removeItem(HINT); signInScreen(R.error); }
    ping();
  });
  A.getRedirectResult(auth).catch(e=>{ R.error=nice(e); if(!R.user) signInScreen(R.error); ping(); });
  R.action=async a=>{
    R.error='';
    try{
      if(a==='google'||(a==='apple'&&APPLE_ENABLED)){ gate.open('Signing in\u2026',false); await signIn(a); }
      else if(a==='out'){
        // flush the save, then clear this device's copy so the next account on this device doesn't inherit it
        clearTimeout(timer);
        try{ let ok=await flushNow(); if(!ok){ await new Promise(r=>setTimeout(r,900)); ok=await flushNow(); } if(!ok) throw new Error('unsynced'); }catch(e){ if(!confirm('Could not save to the cloud (offline?). Sign out anyway and lose unsynced progress on this device?')) return; }
        await A.signOut(auth); localStorage.removeItem(SKEY); try{ sessionStorage.removeItem('nd-synced'); }catch(e){} location.reload(); return;
      }
      else if(a==='del') await del();
    }catch(e){
      R.error=code(e)==='auth/requires-recent-login'?'please sign out and sign in again, then retry delete':nice(e);
      if(!auth.currentUser) signInScreen(R.error);
    }
    ping();
  };
})();
