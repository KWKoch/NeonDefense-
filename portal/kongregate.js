/* provider: kongregate — Kongregate does not allow third-party ads; it shows ads around the game and shares revenue.
   No in-game interstitials. Optional incentivized (rewarded) ads via the Kongregate JS API, only works once Kongregate
   enables it for the game (email apps@kongregate.com). https://www.kongregate.com/en/pages/kongregate-apis
   https://blog.kongregate.com/hc/en-us/articles/44205164389005 */
(function(){
  const A=Ads; A.name='kongregate'; A.homeAds=false;
  let k=null, avail=false, grant=null, fin=null;
  const init=new Promise(res=>{
    A._load('https://cdn1.kongregate.com/javascripts/kongregate_api.js',()=>{
      try{ kongregateAPI.loadAPI(()=>{ try{
        k=kongregateAPI.getAPI(); const m=k.mtx;
        m.addEventListener('adsAvailable',()=>{ avail=true; A.enabled=true; A.onChange(); });
        m.addEventListener('adsUnavailable',()=>{ avail=false; A.onChange(); });
        m.addEventListener('adOpened',()=>A._before());
        m.addEventListener('adCompleted',()=>{ try{ grant&&grant(); }catch(e){} grant=null; fin&&fin(); });
        m.addEventListener('adAbandoned',()=>{ grant=null; fin&&fin(); });
        m.initializeIncentivizedAds();
      }catch(e){ console.warn('Kongregate ads init failed',e); } res(); }); }catch(e){ console.warn('Kongregate API unavailable',e); res(); }
    },()=>{ console.warn('Kongregate API not loaded (normal outside kongregate.com)'); res(); });
  });
  A.boot=A._bootAfter(init,4000);
  A.rewardAvailable=()=>avail&&!A.busy;
  A.showReward=onGranted=>{ if(!avail) return false; grant=onGranted; fin=A._once(()=>A.onChange(),120000);
    try{ k.mtx.showIncentivizedAd(); }catch(e){ fin(); } return true; };
})();
