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
          const out={}; const clear=()=>{ G.enemies.length=0; G.bullets.length=0; G.spawnQ=[]; G.warps=[]; G.ev=[]; T.target=null; T.x=300; };
          const mk=(t,x,y,hp)=>{ const e=R.spawn(t,x,y,{}); e.hp=hp; e.maxhp=Math.max(e.maxhp||0,hp); e.vx=0; e.vy=0; return e; };
          const name=(e,m)=>Object.entries(m).find(([k,v])=>v===e)?.[0];
          // 1: tank slightly nearer vs one-shot kill a bit farther
          clear(); let tank=mk('small',300,500,5000), easy=mk('small',300,330,1); out.tankVsEasy=name(R.pickTarget(),{tank,easy});
          // 2: easy kill far across the field vs a medium target in line
          clear(); let a=mk('small',300,400,40), c=mk('small',60,380,1); out.farEasyVsNearLine=name(R.pickTarget(),{a,c});
          // 3: a mob about to land must still beat a distant easy kill
          clear(); let low=mk('small',300,700,4), hi=mk('small',300,200,1); out.landingFirst=name(R.pickTarget(),{low,hi});
          return out; }""")
        print(r,errs); await b.close()
asyncio.run(main())
