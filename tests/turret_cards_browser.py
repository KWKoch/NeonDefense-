import asyncio, glob
from playwright.async_api import async_playwright
EXE=(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome') or [None])[0]
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':EXE} if EXE else {}))
        page=await (await b.new_context(viewport={'width':390,'height':760})).new_page()
        errs=[]; page.on('pageerror',lambda e:errs.append(str(e)))
        await page.route('**/*gstatic.com/**',lambda r:r.abort())
        await page.goto('http://localhost:8123/index.html'); await page.wait_for_function('window.__rr!==undefined')
        r=await page.evaluate("""()=>{ const R=__rr, P=R.P; P.intro=true; P.tut={tour:1,run:1,grab:1,cmdrun:1,command:1}; const io=document.getElementById('introov'); if(io) io.remove(); const g=document.getElementById('gate'); if(g) g.hidden=true;
          P.prog={belt:{best:30,sel:1,perf:{},eclr:{},stars:{}}}; R.startLevel(1,'belt',false); const G=R.G, T=R.T; G.teachQ=[]; const o=document.getElementById('teachov'); if(o) o.remove(); G.state='playing';
          const out={}, C=Object.fromEntries(R.CARDS.map(c=>[c.id,c]));
          out.max=['rate','dmg','barrel','slide','arc','frag'].map(k=>k+':'+C[k].max).join(' '); out.crit=!!C.crit;
          out.txt=[C.rate.txt(1),C.dmg.txt(1),C.slide.txt(1),C.slide.txt(2),C.arc.txt(1)].join(' | ');
          G.cm=null; G.boost={}; G.bullets.length=0; T.cool=0; R.fire(null); const d0=G.bullets[0].dmg, c0=T.cool;
          G.boost={rate:1,dmg:1}; G.bullets.length=0; R.fire(null); const d1=G.bullets[0].dmg, c1=T.cool;
          out.dmgRatio=+(d1/d0).toFixed(3); out.coolRatio=+(c0/c1).toFixed(3); R.P.cm={rate:0,dmg:0};
          G.boost={}; G.enemies.length=0; G.spawnQ=[]; G.warps=[]; G.ev=[];
          const mk=(x,y)=>{ const e=R.spawn('small',x,y,{}); e.hp=e.maxHp=1000; e.vy=0; e.vx=0; return e; };
          const a=mk(300,300), n1=mk(330,300), n2=mk(270,300), n3=mk(300,340), far=mk(300,600);
          const hp0=[n1,n2,n3,far].map(e=>e.hp); G.boost={arc:1};
          G.bullets.length=0; G.bullets.push({x:300,y:303,vx:0,vy:-1,dmg:100,pierce:0,hits:[],target:null});
          R.update(1/120); out.hpLoss=[n1,n2,n3,far].map((e,i)=>+(hp0[i]-e.hp).toFixed(1)); out.mainLoss=1000-a.hp; out.bolts=G.bolts.length;
          return out; }""")
        print(r,errs); await b.close()
asyncio.run(main())
