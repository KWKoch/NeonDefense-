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
          P.cm={rate:0,barrel:0}; const out={};
          try{ R.renderArmory(); out.html=document.body.innerHTML; }catch(e){ out.err=String(e); }
          out.hasMastery=/In-run card mastery|data-cm=/.test(out.html||''); out.html=undefined;
          P.prog={belt:{best:30,sel:1,perf:{},eclr:{},stars:{}}}; R.startLevel(1,'belt',false); const G=R.G; G.teachQ=[]; G.state='playing';
          const C=Object.fromEntries(R.CARDS.map(c=>[c.id,c])); G.boost={barrel:4,mcount:4,mine:3};
          out.barrelLeft=C.barrel.max-(G.boost.barrel||0);
          G.tools.mine=true; out.eligBarrel=R.eligible?R.eligible(C.barrel):'n/a';
          G.boost={}; G.bullets.length=0; R.T.cool=0; R.fire(null); const d0=G.bullets[0].dmg;
          G.boost={mine:1}; out.minePower1=C.mine.txt(1);
          return out; }""")
        print(r,errs); await b.close()
asyncio.run(main())
