/* Portal ad core: same interface as ../ads.js. Providers below override pieces of it.
   Rules enforced here for every portal: interstitials only at level end (the game calls interstitial() only from
   Next/Retry[/Home] on the win/lose screen), never on first load; rewarded is opt-in and granted only on completion;
   game loop paused (Ads.busy) and audio muted (onPause/onResume) while an ad is on screen. */
(function(){
  const A=window.Ads={name:'none',enabled:false,busy:false,homeAds:false,onPause(){},onResume(){},onChange(){},
    interstitial(name,done){ done&&done(); }, prepareReward(){}, rewardAvailable(){ return false; }, showReward(){ return false; },
    gameplayStart(){}, gameplayStop(){}, loadingDone(){}, boot(main){ main(); }};
  A._before=()=>{ if(A.busy) return; A.busy=true; try{ A.onPause(); }catch(e){} };
  A._after=()=>{ if(!A.busy) return; A.busy=false; try{ A.onResume(); }catch(e){} };
  // run done() exactly once, with a safety timeout so the game can never get stuck behind an ad call
  A._once=(done,ms)=>{ let c=false; const t=setTimeout(()=>f(),ms||45000); const f=()=>{ if(c) return; c=true; clearTimeout(t); A._after(); done&&done(); }; return f; };
  A._load=(src,cb,err)=>{ const s=document.createElement('script'); s.src=src; s.async=false; s.onload=cb; s.onerror=err; document.head.appendChild(s); };
  // boot main after the provider is ready, but never wait longer than ms
  A._bootAfter=(p,ms)=>main=>{ let ran=false; const go=()=>{ if(ran) return; ran=true; main(); }; Promise.resolve(p).then(go,go); setTimeout(go,ms); };
})();
