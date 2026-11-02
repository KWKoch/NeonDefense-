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
          P.prog={belt:{best:30,sel:1,perf:{},eclr:{},stars:{}}}; R.startLevel(18,'belt',false); const G=R.G; G.teachQ=[]; const o=document.getElementById('teachov'); if(o) o.remove(); G.state='playing';
          const OZ=Math.round(732*0.6), out={}; const prof=G.prof||{}; out.prof=[prof.name,prof.mut,Object.keys(prof.roster||{}).join(',')];
          G.enemies.length=0; G.warps=[]; G.spawnQ=[]; G.ev=[]; G.sh=G.shMax; 
          const c=R.spawn('chunk',200,OZ-0.1,{}); c.vy=60; R.update(1/30); R.update(1/30);
          out.blocked=G.enemies.filter(e=>!e.dead&&e.type==='small').length; out.chunkDead=c.dead;
          G.enemies.length=0; const c2=R.spawn('chunk',200,OZ-120,{}); R.killEnemy(c2,true,'turret');
          const sm=G.enemies.filter(e=>e.type==='small'); out.smalls=sm.length; out.smallsAbove=sm.every(e=>e.y<OZ&&!e.ozx);
          G.enemies.length=0; const c3=R.spawn('chunk',200,OZ-3,{}); c3.y=OZ+30; c3.oz=1; R.killEnemy(c3,true,'turret'); out.leakedKids=G.enemies.filter(e=>e.type==='small').length;
          return out; }""")
        print(r,errs); await b.close()
asyncio.run(main())
