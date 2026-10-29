/* Ad provider: h5 (Google AdSense H5 Games Ads / Ad Placement API). Used by the site build (neon.squatchsquad.games).
   Docs: https://developers.google.com/ad-placement/apis  https://support.google.com/adsense/answer/9955214
   All providers expose the same interface (see portal/ads-core.js):
     Ads.interstitial(name, done)  Ads.prepareReward()  Ads.rewardAvailable()  Ads.showReward(onGranted)
     Ads.gameplayStart()  Ads.gameplayStop()  Ads.loadingDone()  Ads.boot(main)
     hooks set by the game: Ads.onPause, Ads.onResume, Ads.onChange;  state: Ads.busy, Ads.enabled, Ads.homeAds
   ADS_CLIENT_ID empty => ads off.  ADS_TEST_MODE true => data-adbreak-test="on". */
(function(){
  const ADS_CLIENT_ID='ca-pub-4954431316761739';
  const ADS_TEST_MODE=false;     // set true to see test ads while developing
  const FREQ_HINT='120s';        // minimum average time between interstitials (data-ad-frequency-hint)
  const INTERSTITIAL_EVERY=2;    // only offer an interstitial every Nth level end (on top of Google's own frequency capping)
  const qs=new URLSearchParams(location.search);
  const client=ADS_CLIENT_ID, test=ADS_TEST_MODE||qs.get('adtest')==='on';
  const A=window.Ads={name:'h5',enabled:false,test,busy:false,homeAds:true,onPause(){},onResume(){},onChange(){},
    interstitial(name,done){ done&&done(); }, prepareReward(){}, rewardAvailable(){ return false; }, showReward(){ return false; },
    gameplayStart(){}, gameplayStop(){}, loadingDone(){}, boot(main){ main(); }};
  if(!client) return;
  A.enabled=true;
  window.adsbygoogle=window.adsbygoogle||[];
  window.adBreak=window.adConfig=function(o){ window.adsbygoogle.push(o); };
  const s=document.createElement('script');
  s.async=true; s.crossOrigin='anonymous';
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(client);
  s.setAttribute('data-ad-client',client);
  s.setAttribute('data-ad-frequency-hint',FREQ_HINT);
  if(test) s.setAttribute('data-adbreak-test','on');
  // If the script is blocked/offline, adsbygoogle stays a plain array: calls queue harmlessly and no callbacks fire.
  s.onerror=()=>{ A.failed=true; ready=false; A.onChange(); };
  document.head.appendChild(s);
  adConfig({preloadAdBreaks:'on',sound:'on'});
  const before=()=>{ A.busy=true; try{ A.onPause(); }catch(e){} };
  const after=()=>{ A.busy=false; try{ A.onResume(); }catch(e){} };
  let ends=0;
  // Interstitial at a natural break (after a level ends, before the next screen). done() always runs.
  A.interstitial=(name,done)=>{
    let called=false; const fin=()=>{ if(called) return; called=true; done&&done(); };
    if(A.failed||A.busy||(++ends%INTERSTITIAL_EVERY)!==0) return fin();
    const t=setTimeout(fin,4000); // never block the game if the API never answers
    try{ adBreak({type:'next',name,beforeAd:before,afterAd:after,adBreakDone:()=>{ clearTimeout(t); fin(); }}); }catch(e){ clearTimeout(t); fin(); }
  };
  // Rewarded: ask the API; the button is shown only once beforeReward hands us showAdFn.
  let show=null, grant=null, ready=false;
  A.prepareReward=nm=>{
    if(A.failed||A.busy||ready) return;
    try{ adBreak({type:'reward',name:nm||'energy_refill',beforeAd:before,afterAd:after,
      beforeReward:fn=>{ show=fn; ready=true; A.onChange(); },
      adViewed:()=>{ try{ grant&&grant(); }catch(e){} },
      adDismissed:()=>{},
      adBreakDone:()=>{ show=null; ready=false; A.onChange(); }}); }catch(e){}
  };
  A.rewardAvailable=()=>ready;
  A.showReward=onGranted=>{ if(!show) return false; grant=onGranted; const f=show; show=null; ready=false; f(); return true; };
})();
