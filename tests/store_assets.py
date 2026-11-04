"""Makes the Play Store listing images into store/: phone screenshots (1080x1920) and the 1024x500 feature graphic.
Needs the play bundle served on :8124 (see tests/play_browser.py). Run: python3 tests/store_assets.py"""
import asyncio, glob, os
from playwright.async_api import async_playwright
EXE=(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome') or [None])[0]
OUT=os.path.join(os.path.dirname(__file__),'..','store'); os.makedirs(OUT,exist_ok=True)
URL='http://localhost:8124/index.html'
PREP="""()=>{ const R=__rr,P=R.P; P.intro=true; P.tut={tour:1,run:1,grab:1,cmdrun:1,command:1}; for(const k of ['rock','swarm','dart','shield','invader','brute','phantom','chunk','leech','regen','tender','egg','small','boss','orb','hatch']) P.seen[k]=1;
  const b=[...document.querySelectorAll('button')].find(x=>/^\\s*begin\\s*$/i.test(x.textContent)); if(b) b.click();
  const t=document.getElementById('buildtag'); if(t) t.style.display='none'; }"""
async def shot(page,name):
    await page.evaluate("()=>{ const t=document.querySelector('.toast'); if(t) t.remove(); }")
    await page.screenshot(path=os.path.join(OUT,name)); print('wrote',name)
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':EXE} if EXE else {}))
        ctx=await b.new_context(viewport={'width':360,'height':640},device_scale_factor=3,has_touch=True,is_mobile=True)
        page=await ctx.new_page(); await page.goto(URL); await page.wait_for_function('window.__rr!==undefined')
        await page.evaluate(PREP); await page.wait_for_timeout(600)
        await page.evaluate("()=>{ __rr.P.prog.belt={best:11,sel:12,perf:{},eclr:{},stars:{}}; __rr.P.gems=64; __rr.UI.nav='battle'; __rr.renderArmory(); }")
        await page.wait_for_timeout(1500); await shot(page,'phone-1-battle.png')
        await page.evaluate("()=>{ __rr.P.fp.t=new Date().getFullYear()+'-'+(new Date().getMonth()+1)+'-'+new Date().getDate(); const d=new Date(); d.setDate(d.getDate()-2); __rr.P.fp.d0=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); __rr.UI.nav='shop'; __rr.renderArmory(); }")
        await page.wait_for_timeout(800); await shot(page,'phone-2-founders-path.png')
        await page.evaluate("()=>{ __rr.UI.nav='arsenal'; __rr.renderArmory(); }"); await page.wait_for_timeout(800); await shot(page,'phone-3-arsenal.png')
        await page.evaluate("()=>{ __rr.UI.nav='worlds'; __rr.renderArmory(); }"); await page.wait_for_timeout(1200); await shot(page,'phone-4-worlds.png')
        # in-battle: level 12 at 3x for a while, grab the battle and the level-up screen
        await page.evaluate("()=>{ __rr.UI.nav='battle'; __rr.renderArmory(); __rr.startLevel(12,'belt',false); __rr.G.teachQ=[]; __rr.G.speed=3; }")
        got_cards=got_play=False
        for i in range(160):
            await page.wait_for_timeout(500)
            st=await page.evaluate("()=>({s:__rr.G.state,w:__rr.G.wave,n:__rr.G.enemies.length})")
            if st['s']=='cards':
                if not got_cards:
                    await page.evaluate("()=>{ __rr.G.speed=1; }"); await page.wait_for_timeout(500); await shot(page,'phone-6-level-up.png'); got_cards=True; await page.evaluate("()=>{ __rr.G.speed=3; }")
                await page.evaluate("()=>{ const b=document.querySelector('button.pk[data-pick]'); if(b) b.click(); }")
            elif st['s']=='playing' and got_cards and st['n']>=5 and st['w']>=4 and not got_play:
                await page.evaluate("()=>{ __rr.G.speed=1; }"); await page.wait_for_timeout(600); await shot(page,'phone-5-battle-action.png'); got_play=True; break
        # feature graphic 1024x500
        pg=await (await b.new_context(viewport={'width':1024,'height':500},device_scale_factor=1)).new_page()
        await pg.goto('http://localhost:8124/fonts/fonts.css')
        html="""<html><head><link rel="stylesheet" href="http://localhost:8124/fonts/fonts.css"><style>
        html,body{margin:0;width:1024px;height:500px;background:#000;overflow:hidden}
        .bg{position:absolute;inset:0;background:radial-gradient(60% 90% at 78% 55%,rgba(255,43,214,.28),transparent 70%),radial-gradient(50% 80% at 18% 30%,rgba(0,240,255,.22),transparent 70%)}
        .ground{position:absolute;left:0;right:0;bottom:70px;height:3px;background:#00f0ff;box-shadow:0 0 18px #00f0ff,0 0 40px #00f0ff}
        h1{position:absolute;left:64px;top:118px;margin:0;font:400 92px/1 Monoton,sans-serif;color:#00f0ff;text-shadow:0 0 14px #00f0ff,0 0 40px #00a8ff;letter-spacing:2px}
        h1 span{display:block;color:#ff2bd6;text-shadow:0 0 14px #ff2bd6,0 0 40px #d400ab}
        p{position:absolute;left:68px;top:340px;margin:0;font:600 28px 'Chakra Petch',sans-serif;color:#e8fbff;letter-spacing:.14em;text-transform:uppercase}
        img{position:absolute;right:56px;top:60px;width:380px;height:380px;border-radius:44px;box-shadow:0 0 50px rgba(0,240,255,.5)}
        </style></head><body><div class="bg"></div><div class="ground"></div><h1>NEON<span>DEFENSE</span></h1><p>Keep the last light alive</p>
        <img src="http://localhost:8124/icon-192.png"></body></html>"""
        await pg.set_content(html); await pg.wait_for_timeout(1200); await pg.screenshot(path=os.path.join(OUT,'feature-graphic-1024x500.png')); print('wrote feature graphic')
        await b.close()
        print('battle shot',got_play,'level-up shot',got_cards)
asyncio.run(main())
