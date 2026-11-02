import asyncio, glob, json
from playwright.async_api import async_playwright
EXE=(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome') or [None])[0]
URL='http://localhost:8123/index.html'
ok=True
def chk(name,cond,info=''):
    global ok; print(('PASS ' if cond else 'FAIL ')+name,info); ok=ok and cond
NOSAVE="window.addEventListener('pagehide',e=>e.stopImmediatePropagation(),true); document.addEventListener('visibilitychange',e=>e.stopImmediatePropagation(),true);"
async def boot(page):
    await page.goto(URL); await page.wait_for_function('window.__rr!==undefined')
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':EXE} if EXE else {}))
        ctx=await b.new_context(viewport={'width':390,'height':760}); page=await ctx.new_page()
        errs=[]; page.on('pageerror',lambda e:errs.append(str(e)))
        await page.route('**/*gstatic.com/**',lambda r:r.abort())
        await boot(page)
        await page.evaluate("()=>{ const R=__rr; R.P.gems=5000; R.P.prog={belt:{best:9,sel:1,perf:{},eclr:{},stars:{}}}; R.P.own.ice=true; const p=R.cmdP(); p.own.rook=2; p.tl.rook={a:1}; p.eq='rook'; R.P.tut={tour:1}; R.P.lv['turret.p']=4; R.save(); }")
        await page.reload(); await page.wait_for_function('window.__rr!==undefined')
        r=await page.evaluate("()=>({cmd:__rr.P.cmd,tut:__rr.P.tut,own:__rr.P.own,lv:__rr.P.lv,v:Object.keys((__rr.P.vault||{}).items||{}).length})")
        chk('commander, talents, equip survive reload',r['cmd']['own'].get('rook')==2 and r['cmd']['eq']=='rook' and r['cmd']['tl']['rook']=={'a':1},json.dumps(r['cmd']))
        chk('tutorial flags survive reload',r['tut'].get('tour')==1)
        chk('world + upgrade survive',r['own'].get('ice') and r['lv'].get('turret.p')==4)
        chk('vault populated',r['v']>=5,str(r['v']))
        # a field dropped from the main save is healed from the vault
        await page.evaluate("()=>{ const o=JSON.parse(localStorage.getItem('rave-rampart-v5')); delete o.cmd; delete o.own.ice; o.lv={}; localStorage.setItem('rave-rampart-v5',JSON.stringify(o)); "+NOSAVE+" }")
        page=await ctx.new_page(); await page.route('**/*gstatic.com/**',lambda r:r.abort()); await boot(page)
        r=await page.evaluate("()=>({cmd:__rr.P.cmd.own,own:__rr.P.own,lv:__rr.P.lv})")
        chk('vault heals dropped commander/world/upgrade',r['cmd'].get('rook')==2 and r['own'].get('ice') and r['lv'].get('turret.p')==4,json.dumps(r))
        # corrupted main save falls back to the rolling backup
        await page.evaluate("()=>{ __rr.save(); localStorage.setItem('rave-rampart-v5','{garbage'); "+NOSAVE+" }")
        page=await ctx.new_page(); await page.route('**/*gstatic.com/**',lambda r:r.abort()); await boot(page)
        r=await page.evaluate("()=>__rr.P.cmd.own.rook")
        chk('corrupt save restored from backup',r==2,str(r))
        # unknown future fields are carried through
        await page.evaluate("()=>{ const o=JSON.parse(localStorage.getItem('rave-rampart-v5')); o.futureThing={a:1}; localStorage.setItem('rave-rampart-v5',JSON.stringify(o)); "+NOSAVE+" }")
        page=await ctx.new_page(); await page.route('**/*gstatic.com/**',lambda r:r.abort()); await boot(page)
        await page.evaluate("()=>__rr.save()")
        r=await page.evaluate("()=>JSON.parse(localStorage.getItem('rave-rampart-v5')).futureThing")
        chk('unknown fields preserved across load+save',r=={'a':1},str(r))
        # cloud adoption hook swaps live state on the home screen
        await page.evaluate("()=>{ const o=JSON.parse(localStorage.getItem('rave-rampart-v5')); o.cmd.own.vex=3; o.gems=777; __rr.G.state='armory'; window.NDAdopt(JSON.stringify(o)); }")
        r=await page.evaluate("()=>({v:__rr.P.cmd.own.vex,g:__rr.P.gems})")
        chk('cloud-merged save adopted live',r['v']==3 and r['g']==777,json.dumps(r))
        print('errors',errs); chk('no page errors',not errs)
        await b.close()
    print('ALL OK' if ok else 'SOME FAILED')
asyncio.run(main())
