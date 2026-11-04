/* Google Play edition bridge (play 01). Inlined into the play build only; every call is a no-op outside the Capacitor app.
   - Android back button: pauses a run, closes menus, goes back to Battle, and only then minimizes the app.
   - window.NDPlay.remind(list): optional local reminders for the Founder's Path (no server, no account, asked only when the player opts in). */
(function(){
  const C=window.Capacitor, plug=n=>C&&C.Plugins&&C.Plugins[n];
  const native=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  const NDPlay=window.NDPlay={native:native};
  NDPlay.remind=async function(list){
    const LN=plug('LocalNotifications'); if(!native||!LN) return 'unavailable';
    try{
      const p=await LN.requestPermissions(); if(!p||p.display!=='granted') return 'denied';
      await LN.cancel({notifications:list.map(x=>({id:x.id}))}).catch(()=>{});
      const todo=list.filter(x=>x.at>Date.now()+60000);
      if(todo.length) await LN.schedule({notifications:todo.map(x=>({id:x.id,title:x.title,body:x.body,schedule:{at:new Date(x.at)}}))});
      return 'ok';
    }catch(e){ return 'error'; }
  };
  NDPlay.unremind=async function(ids){
    const LN=plug('LocalNotifications'); if(!native||!LN) return;
    try{ await LN.cancel({notifications:ids.map(id=>({id:id}))}); }catch(e){}
  };
  const App=plug('App');
  if(native&&App&&App.addListener){
    App.addListener('backButton',function(){
      const rr=window.__rr; if(!rr) return;
      const st=rr.G.state, click=sel=>{ const b=document.querySelector(sel); if(b) b.click(); return !!b; };
      if(st==='playing') return void click('#pauseBtn');
      if(st==='paused') return void click('[data-o="resume"]');
      if(st==='cards'||st==='teach'||st==='shop'||st==='ctl') return;      /* mid-run prompts: never exit by accident */
      if(st==='won'||st==='over') return void click('[data-o="armory"]');
      const sc=document.getElementById('orbScrim'); if(sc) return void sc.dispatchEvent(new Event('pointerdown'));   /* settings panel open: close it */
      if(rr.UI.nav!=='battle'){ rr.UI.nav='battle'; rr.renderArmory(); return; }
      if(App.minimizeApp) App.minimizeApp();
    });
  }
})();
