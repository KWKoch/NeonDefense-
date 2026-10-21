import { firebaseConfig } from './firebase-config.js';
const V='10.14.1', B='https://www.gstatic.com/firebasejs/'+V+'/';
const R=window.RRcloud={enabled:false,user:null,status:'',error:'',push(){},action(){}};
const ping=()=>dispatchEvent(new Event('rrcloud'));
if(!firebaseConfig.apiKey||firebaseConfig.apiKey==='PASTE_ME'){ console.info('Cloud save off: add firebase-config.js values'); }
else (async()=>{
  try{
    const [{initializeApp},A,F]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
    const app=initializeApp(firebaseConfig), auth=A.getAuth(app), db=F.getFirestore(app);
    const SKEY='rave-rampart-v5';
    // progress score: more levels + more upgrades wins when local and cloud differ
    const score=j=>{ try{ const o=JSON.parse(j); let n=0; for(const k in (o.prog||{})) n+=(o.prog[k].best||0)*10+Object.keys(o.prog[k].perf||{}).length+Object.keys(o.prog[k].eclr||{}).length*2; for(const k in (o.lv||{})) n+=o.lv[k]; return n; }catch(e){ return -1; } };
    const mine=u=>F.doc(db,'users',u.uid);
    let timer=null;
    R.enabled=true;
    R.push=()=>{ if(!auth.currentUser) return; clearTimeout(timer); timer=setTimeout(async()=>{
      try{ const j=localStorage.getItem(SKEY); await F.setDoc(mine(auth.currentUser),{data:j,score:score(j),updated:Date.now()}); R.status='saved'; }catch(e){ R.status='offline'; } ping(); },1500); };
    async function sync(u){
      try{
        const snap=await F.getDoc(mine(u)), local=localStorage.getItem(SKEY);
        if(snap.exists()&&snap.data().data){
          const cloud=snap.data().data;
          if(score(cloud)>score(local||'{}')){ localStorage.setItem(SKEY,cloud); location.reload(); return; }
        }
        await F.setDoc(mine(u),{data:local,score:score(local||'{}'),updated:Date.now()}); R.status='saved';
      }catch(e){ R.status='offline'; }
      ping();
    }
    A.onAuthStateChanged(auth,u=>{ R.user=u?{email:u.email,name:u.displayName,uid:u.uid}:null; ping(); if(u) sync(u); });
    R.action=async a=>{
      R.error='';
      try{
        if(a==='google') await A.signInWithPopup(auth,new A.GoogleAuthProvider());
        else if(a==='apple'){ const p=new A.OAuthProvider('apple.com'); p.addScope('email'); await A.signInWithPopup(auth,p); }
        else if(a==='out') await A.signOut(auth);
        else if(a==='del'){ const u=auth.currentUser; await F.deleteDoc(mine(u)); await A.deleteUser(u); }
      }catch(e){ R.error=(e.code||'error').replace('auth/','').replace(/-/g,' '); }
      ping();
    };
  }catch(e){ console.warn('cloud init failed',e); }
})();
