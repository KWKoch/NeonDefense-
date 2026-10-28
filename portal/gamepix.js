/* provider: gamepix — GamePix JS SDK v3 (manual lifecycle). https://partners.gamepix.com/sdk/doc/javascript
   localStorage is synchronised by the SDK, so the default guarded localStorage store is used. */
(function(){
  const A=Ads; A.name='gamepix'; A.homeAds=true;
  window.GamePixConfig={lifecycle:'manual'};
  let ready=false, started=false;
  const init=new Promise(res=>{
    A._load('https://integration.gamepix.com/sdk/v3/gamepix.sdk.js',()=>{
      try{ const G=window.GamePix; ready=true; A.enabled=true;
        G.events.on('pause',()=>A._before()); G.events.on('resume',()=>A._after());
        G.lifecycle.loading(10);
      }catch(e){ console.warn('GamePix SDK init failed',e); }
      res();
    },()=>{ console.warn('GamePix SDK not loaded'); res(); });
  });
  A.boot=A._bootAfter(init,5000);
  A.loadingDone=()=>{ try{ ready&&GamePix.lifecycle.loading(100); ready&&GamePix.lifecycle.loaded(); }catch(e){} };
  A.gameplayStart=()=>{ if(started||!ready) return; started=true; try{ GamePix.lifecycle.gameStart(); }catch(e){} };
  A.interstitial=(name,done)=>{
    if(!ready||A.busy) return done&&done();
    const fin=A._once(done);
    try{ Promise.resolve(GamePix.ads.interstitial()).then(fin,fin); }catch(e){ fin(); }
  };
  A.rewardAvailable=()=>ready&&!A.busy;
  A.showReward=onGranted=>{
    if(!ready) return false; const fin=A._once(()=>A.onChange());
    try{ Promise.resolve(GamePix.ads.reward()).then(r=>{ if(r&&r.success) try{ onGranted(); }catch(e){} fin(); },fin); }catch(e){ fin(); }
    return true;
  };
})();
