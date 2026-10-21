import { firebaseConfig } from './firebase-config.js';
const V='10.14.1', B='https://www.gstatic.com/firebasejs/'+V+'/';
// Apple provider is not configured in the Firebase project yet; flip when it is.
const APPLE_ENABLED=false;
const R=window.RRcloud={enabled:false,user:null,status:'',error:'',apple:APPLE_ENABLED,push(){},action(){}};
const ping=()=>dispatchEvent(new Event('rrcloud'));
const standalone=()=>{ try{ return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches; }catch(e){ return false; } };
if(!firebaseConfig.apiKey||firebaseConfig.apiKey==='PASTE_ME'){ console.info('Cloud save off: add firebase-config.js values'); }
else (async()=>{
  try{
    const [{initializeApp},A,F]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
    const app=initializeApp(firebaseConfig), auth=A.getAuth(app), db=F.getFirestore(app);
    const SKEY='rave-rampart-v5';
    // progress score: more levels + more upgrades wins when local and cloud differ (integer, rules require int)
    const score=j=>{ try{ const o=JSON.parse(j); let n=0; for(const k in (o.prog||{})) n+=(o.prog[k].best||0)*10+Object.keys(o.prog[k].perf||{}).length+Object.keys(o.prog[k].eclr||{}).length*2; for(const k in (o.lv||{})) n+=o.lv[k]; return Math.round(n)||0; }catch(e){ return -1; } };
    const mine=u=>F.doc(db,'users',u.uid);
    const rec=j=>({data:j||'{}',score:Math.max(0,score(j||'{}')),updated:Date.now()});
    const code=e=>(e&&e.code)||'error';
    const nice=e=>code(e).replace('auth/','').replace(/-/g,' ');
    let timer=null, anonTried=false;
    R.enabled=true;
    R.push=()=>{ if(!auth.currentUser) return; clearTimeout(timer); timer=setTimeout(async()=>{
      try{ await F.setDoc(mine(auth.currentUser),rec(localStorage.getItem(SKEY))); R.status='saved'; }catch(e){ R.status='offline'; } ping(); },1500); };
    // merge: keep whichever save (cloud vs this device) has the higher progress score
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
    async function guest(){
      if(anonTried||auth.currentUser||!navigator.onLine) return; anonTried=true;
      try{ await A.signInAnonymously(auth); }
      catch(e){ if(code(e)==='auth/operation-not-allowed') console.info('Anonymous auth disabled; local-only until sign-in'); else console.info('Guest sign-in skipped:',code(e)); }
    }
    const provider=a=>{ if(a==='apple'){ const p=new A.OAuthProvider('apple.com'); p.addScope('email'); return p; } return new A.GoogleAuthProvider(); };
    // existing account already owns this Google/Apple identity: switch to it; sync() merges by higher score
    async function adopt(e,a){
      const cred=a==='apple'?A.OAuthProvider.credentialFromError(e):A.GoogleAuthProvider.credentialFromError(e);
      if(!cred) throw e;
      await A.signInWithCredential(auth,cred);
    }
    async function signIn(a){
      const p=provider(a), u=auth.currentUser, link=u&&u.isAnonymous;
      if(standalone()){ return link? A.linkWithRedirect(u,p) : A.signInWithRedirect(auth,p); }
      try{
        if(link){ const r=await A.linkWithPopup(u,p); await r.user.reload(); R.user=view(auth.currentUser); }
        else await A.signInWithPopup(auth,p);
      }catch(e){
        const c=code(e);
        if(c==='auth/credential-already-in-use'||c==='auth/email-already-in-use') return adopt(e,a);
        if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-this-environment') return link? A.linkWithRedirect(u,p) : A.signInWithRedirect(auth,p);
        throw e;
      }
    }
    async function del(){
      const u=auth.currentUser; if(!u) return;
      const go=async()=>{ await F.deleteDoc(mine(u)); await A.deleteUser(u); };
      try{ await go(); }
      catch(e){
        if(code(e)!=='auth/requires-recent-login') throw e;
        const pid=(u.providerData[0]||{}).providerId, p=provider(pid==='apple.com'?'apple':'google');
        if(standalone()) throw e; // redirect would lose the pending delete; ask user to sign in again
        await A.reauthenticateWithPopup(u,p); await go();
      }
      anonTried=true; // don't immediately recreate a guest after deleting
    }
    const view=u=>u?{email:u.email,name:u.displayName,uid:u.uid,anon:u.isAnonymous}:null;
    A.onAuthStateChanged(auth,u=>{ R.user=view(u); ping(); if(u) sync(u); else guest(); });
    A.getRedirectResult(auth).catch(async e=>{
      const c=code(e);
      try{ if(c==='auth/credential-already-in-use'||c==='auth/email-already-in-use') await adopt(e,'google'); else R.error=nice(e); }catch(e2){ R.error=nice(e2); }
      ping();
    });
    addEventListener('online',()=>{ anonTried=false; guest(); });
    R.action=async a=>{
      R.error='';
      try{
        if(a==='google'||(a==='apple'&&APPLE_ENABLED)) await signIn(a);
        else if(a==='out'){ anonTried=true; await A.signOut(auth); }
        else if(a==='del') await del();
      }catch(e){ R.error=code(e)==='auth/requires-recent-login'?'please sign out and sign in again, then retry delete':nice(e); }
      ping();
    };
  }catch(e){ console.warn('cloud init failed',e); }
})();
