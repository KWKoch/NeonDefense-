/* H5 Games Ads (AdSense Ad Placement API) wrapper.
   Docs: https://developers.google.com/ad-placement/apis
         https://support.google.com/adsense/answer/9955214
   ADS_CLIENT_ID empty  => ads fully off, nothing is loaded, game behaves exactly as before.
   ADS_TEST_MODE true   => adds data-adbreak-test="on" (fake test ads). Turn OFF for production. */
(function(){
  const ADS_CLIENT_ID='';        // e.g. 'ca-pub-1234567890123456' once AdSense + H5 Games Ads are approved
  const ADS_TEST_MODE=false;     // set true to see test ads while developing
  const FREQ_HINT='120s';        // minimum average time between interstitials (data-ad-frequency-hint)
  const INTERSTITIAL_EVERY=2;    // only offer an interstitial every Nth level end (on top of Google's own frequency capping)
  const qs=new URLSearchParams(location.search);
  const client=ADS_CLIENT_ID, test=ADS_TEST_MODE||qs.get('adtest')==='on';
  const A=window.Ads={enabled:false,test,busy:false,rewardReady:false,onPause(){},onResume(){},onChange(){},
    interstitial(type,name,done){ done&&done(); }, requestReward(){}, showReward(){ return false; }};
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
  s.onerror=()=>{ A.failed=true; A.rewardReady=false; A.onChange(); };
  document.head.appendChild(s);
  adConfig({preloadAdBreaks:'on',sound:'on'});
  const before=()=>{ A.busy=true; try{ A.onPause(); }catch(e){} };
  const after=()=>{ A.busy=false; try{ A.onResume(); }catch(e){} };
  let ends=0;
  // Interstitial at a natural break (after a level ends, before the next screen). done() always runs.
  A.interstitial=(type,name,done)=>{
    let called=false; const fin=()=>{ if(called) return; called=true; done&&done(); };
    if(A.failed||A.busy||(++ends%INTERSTITIAL_EVERY)!==0) return fin();
    const t=setTimeout(fin,4000); // never block the game if the API never answers
    try{ adBreak({type,name,beforeAd:before,afterAd:after,adBreakDone:()=>{ clearTimeout(t); fin(); }}); }catch(e){ clearTimeout(t); fin(); }
  };
  // Rewarded: ask the API; the button is shown only once beforeReward hands us showAdFn.
  let show=null, grant=null;
  A.requestReward=(name,onGranted)=>{
    if(A.failed||A.busy) return; grant=onGranted;
    try{ adBreak({type:'reward',name,beforeAd:before,afterAd:after,
      beforeReward:fn=>{ show=fn; A.rewardReady=true; A.onChange(); },
      adViewed:()=>{ try{ grant&&grant(); }catch(e){} },
      adDismissed:()=>{},
      adBreakDone:()=>{ show=null; A.rewardReady=false; A.onChange(); }}); }catch(e){}
  };
  A.showReward=()=>{ if(!show) return false; const f=show; show=null; A.rewardReady=false; f(); return true; };
})();
