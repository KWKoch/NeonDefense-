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
          P.prog={belt:{best:30,sel:1,perf:{},eclr:{},stars:{}}}; R.startLevel(1,'belt',false); const G=R.G; G.teachQ=[]; const o=document.getElementById('teachov'); if(o) o.remove(); G.state='playing';
          const out={}, C=Object.fromEntries(R.CARDS.map(c=>[c.id,c]));
          out.base=R.CARDS.filter(c=>c.w==='base').length;
          out.max=['marea','mcount','mrech','mcluster','mfreeze','mchain','mortpow','mortarea','mortcap','mortspd','mortclu','mortbust','mortnap'].map(k=>k+':'+C[k].max).join(' ');
          out.txt=[C.marea.txt(1),C.mrech.txt(1),C.mfreeze.txt(2),C.mcluster.txt(2),C.mchain.txt(2),C.mortspd.txt(1),C.mortclu.txt(4),C.mortbust.txt(2),C.mortnap.txt(3)].join(' | ');
          out.total=R.CARDS.length;
          // saw: slice through, no bounce off mobs, pool drains
          G.enemies.length=0; G.spawnQ=[]; G.warps=[]; G.ev=[]; G.boost={}; G.tools.saw=true; G.saws.length=0;
          const e1=R.spawn('small',300,300,{}); e1.hp=e1.maxHp=1e6; e1.vx=0; e1.vy=0;
          G.saws.push({x:300,y:360,vx:0,vy:-430,r:45,life:9,max:9,rot:0});
          const sw=G.saws[0]; let minY=999; const hp0=e1.hp, pool=[];
          for(let i=0;i<40;i++){ e1.x=300; e1.y=300; e1.vx=0; e1.vy=0; R.update(1/60); pool.push(Math.round(sw.pool)); minY=Math.min(minY,sw.y); }
          out.sawR=R.G.saws.length&&R.G.saws[0].r; out.passed=minY<290; out.dealt=Math.round(hp0-e1.hp); out.poolEnd=pool[pool.length-1]; out.vxKept=Math.abs(sw.vx)<5;
          return out; }""")
        print(r,errs); await b.close()
asyncio.run(main())
