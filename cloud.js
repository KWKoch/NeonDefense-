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
  const score=j=>{ try{ const o=JSON.parse(j); let n=0; for(const k in (o.prog||{})) n+=(o.prog[k].best||0)*10+Object.keys(o.prog[k].perf||{}).length+Object.keys(o.prog[k].eclr||{}).length*2; for(const k in (o.lv||{})) n+=o.lv[k]; return Math.round(n)||0; }catch(e){ return -1; } };
  const mine=u=>F.doc(db,'users',u.uid);
  const rec=j=>({data:j||'{}',score:Math.max(0,score(j||'{}')),updated:Date.now()});
  const code=e=>(e&&e.code)||'error';
  const nice=e=>code(e).replace('auth/','').replace(/-/g,' ');
  let timer=null;
  R.enabled=true;
  R.push=()=>{ if(!auth.currentUser) return; clearTimeout(timer); timer=setTimeout(async()=>{
    try{ await F.setDoc(mine(auth.currentUser),rec(localStorage.getItem(SKEY))); R.status='saved'; }catch(e){ R.status='offline'; } ping(); },1500); };
  // merge: keep whichever save (cloud vs this device) has the higher progress score.
  // This also migrates an existing pre-sign-in local save into the first account that signs in.
  async function sync(u){
    try{
      const snap=await F.getDoc(mine(u)), local=localStorage.getItem(SKEY);
      if(snap.exists()&&snap.data().data){
        const cloud=snap.data().data;
        if(score(cloud)>score(local||'{}')){ localStorage.setItem(SKEY,cloud); location.reload(); return; }
      }
      await F.setDoc(mine(u),rec(local)); R.status='saved';
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
        try{ await F.setDoc(mine(auth.currentUser),rec(localStorage.getItem(SKEY))); }catch(e){ if(!confirm('Could not save to the cloud (offline?). Sign out anyway and lose unsynced progress on this device?')) return; }
        await A.signOut(auth); localStorage.removeItem(SKEY); location.reload(); return;
      }
      else if(a==='del') await del();
    }catch(e){
      R.error=code(e)==='auth/requires-recent-login'?'please sign out and sign in again, then retry delete':nice(e);
      if(!auth.currentUser) signInScreen(R.error);
    }
    ping();
  };
})();
