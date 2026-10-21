/* provider: crazygames — CrazyGames HTML5 SDK v3. https://docs.crazygames.com/sdk/intro/
   Ads: https://docs.crazygames.com/sdk/video-ads/  Rules: https://docs.crazygames.com/requirements/ads/
   Game events: https://docs.crazygames.com/sdk/game/  Data: https://docs.crazygames.com/sdk/data/ */
(function(){
  const A=Ads; A.name='crazygames'; A.homeAds=false; // CrazyGames: no midgame ads on navigation buttons (Home)
  let SDK=null, ready=false;
  const init=new Promise(res=>{
    A._load('https://sdk.crazygames.com/crazygames-sdk-v3.js',async()=>{
      try{ SDK=window.CrazyGames.SDK; await SDK.init(); ready=true; A.enabled=true;
        // Save via the data module (synced to the CrazyGames account / cleared-storage safe)
        if(SDK.data) window.NDStore={get:k=>{ try{ return SDK.data.getItem(k); }catch(e){ return null; } },set:(k,v)=>{ try{ SDK.data.setItem(k,v); }catch(e){} }};
        try{ SDK.game.loadingStart(); }catch(e){}
      }catch(e){ console.warn('CrazyGames SDK init failed (normal outside crazygames.com)',e); }
      res();
    },()=>{ console.warn('CrazyGames SDK not loaded'); res(); });
  });
  A.boot=A._bootAfter(init,5000);
  const req=(type,done,onOk)=>{
    if(!ready||A.busy) return done&&done();
    const fin=A._once(done);
    try{ SDK.ad.requestAd(type,{ adStarted:()=>A._before(), adFinished:()=>{ if(onOk) try{ onOk(); }catch(e){} fin(); }, adError:()=>fin() }); }catch(e){ fin(); }
  };
  A.interstitial=(name,done)=>req('midgame',done);
  A.rewardAvailable=()=>ready&&!A.busy;
  A.showReward=onGranted=>{ if(!ready) return false; req('rewarded',()=>A.onChange(),onGranted); return true; };
  A.gameplayStart=()=>{ try{ ready&&SDK.game.gameplayStart(); }catch(e){} };
  A.gameplayStop=()=>{ try{ ready&&SDK.game.gameplayStop(); }catch(e){} };
  A.loadingDone=()=>{ try{ ready&&SDK.game.loadingStop(); }catch(e){} };
})();
