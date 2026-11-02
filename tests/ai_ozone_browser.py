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
          P.prog={belt:{best:30,sel:1,perf:{},eclr:{},stars:{}}};
          R.startLevel(25,'belt',false); const G=R.G; G.teachQ=[]; const o=document.getElementById('teachov'); if(o) o.remove(); G.state='playing';
          G.tools={mine:true,field:true,mortar:true}; const OZ=Math.round(732*0.6);
          let bad=0, placed=0, belowLeak=0, belowFull=0, seen=new Set();
          for(let i=0;i<2400;i++){ G.stock=Math.max(G.stock,3); G.fieldCd=0; G.hp=G.maxHp; G.sh=(i<1200?G.shMax:G.shMax*0.05);
            const before=G.mines.length, hadLk=G.enemies.some(e=>!e.dead&&e.type!=='orb'&&e.y>=OZ-60&&e.y<732-20);
            R.update(1/30);
            for(const m of G.mines){ if(seen.has(m)) continue; seen.add(m); placed++; if(m.y>OZ-34+1){ if(i<1200) belowFull++; else if(hadLk) belowLeak++; else bad++; } } }
          return {placed,bad,belowLeak,belowFull}; }""")
        print(r,errs); await b.close()
asyncio.run(main())
