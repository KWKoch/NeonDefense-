/* provider: y8 — Y8 SDK (minimal-sdk 2.x). https://docs.y8.com/sdk/intro/  https://docs.y8.com/sdk/advertising/
   Fill in from Developer Portal > your game > SDK Initialization (https://docs.y8.com/studio/sdk-initialization/).
   With empty IDs the SDK is not loaded and the build runs without ads. */
(function(){
  const Y8_APP_ID='';   // required
  const Y8_GAME_ID='';  // required for ads
  const A=Ads; A.name='y8'; A.homeAds=true;
  let sdk=null, ready=false;
  if(!Y8_APP_ID||!Y8_GAME_ID){ console.warn('Y8: set Y8_APP_ID / Y8_GAME_ID in portal/y8.js and rebuild'); return; }
  const init=new Promise(res=>{
    addEventListener('y8sdk.ready',()=>{
      try{ sdk=y8.sdk(); sdk.init({appId:Y8_APP_ID,autoLogin:false},{gameId:Y8_GAME_ID,preloadAdBreaks:'on',sound:'on',onReady:()=>{ ready=true; A.enabled=true; A.onChange(); }}); }
      catch(e){ console.warn('Y8 SDK init failed',e); }
      res();
    });
    A._load('https://cdn.y8.com/minimal-sdk/2-0/y8.min.js',null,()=>{ console.warn('Y8 SDK not loaded'); res(); });
  });
  A.boot=A._bootAfter(init,4000);
  // Y8 pauses/resumes through beforeAd/afterAd; skipped/capped breaks call neither, so done() runs via adBreakDone/catch/timeout
  const brk=(o,done)=>{
    const fin=A._once(done,60000);
    try{ Promise.resolve(sdk.showAd(Object.assign({beforeAd:A._before,afterAd:A._after,adBreakDone:()=>fin()},o))).catch(()=>fin()); }catch(e){ fin(); }
  };
  A.interstitial=(name,done)=>{ if(!ready||A.busy) return done&&done(); brk({type:'next',name},done); };
  A.rewardAvailable=()=>ready&&!A.busy;
  A.showReward=onGranted=>{ if(!ready) return false;
    brk({type:'reward',name:'energy-refill',beforeReward:show=>show(),adViewed:()=>{ try{ onGranted(); }catch(e){} },adDismissed:()=>{}},()=>A.onChange()); return true; };
})();
