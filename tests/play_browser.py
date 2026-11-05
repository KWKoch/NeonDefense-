"""Play edition checks (play 01). Build first: node build.mjs play, then serve dist/play on :8124 (cd dist/play && python3 -m http.server 8124).
Run: python3 tests/play_browser.py   Exits non-zero on the first failed check."""
import asyncio, glob, sys, json
from playwright.async_api import async_playwright
EXE=(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome') or [None])[0]
URL='http://localhost:8124/index.html'
fails=[]
def check(name,ok,info=''):
    print(('PASS ' if ok else 'FAIL ')+name+(' '+str(info) if (info!='' and not ok) else ''))
    if not ok: fails.append(name)

async def fresh(pw,keep=None):
    b=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':EXE} if EXE else {}))
    ctx=await b.new_context(viewport={'width':390,'height':760},has_touch=True,is_mobile=True)
    page=await ctx.new_page(); page.errs=[]
    page.on('pageerror',lambda e:page.errs.append(str(e)))
    return b,ctx,page

async def main():
    async with async_playwright() as pw:
        b,ctx,page=await fresh(pw)
        await page.goto(URL); await page.wait_for_function('window.__rr!==undefined')
        info=await page.evaluate("""()=>({gate:!!document.getElementById('gate'), sw:'serviceWorker' in navigator && !!document.querySelector('link[rel=manifest]'), tag:document.getElementById('buildtag').textContent, body:document.body.innerText})""")
        check('no sign-in gate in the play bundle', not info['gate'])
        check('no manifest/PWA tags', not info['sw'])
        check('build tag says play 01', 'play 01' in info['tag'], info['tag'])
        # dismiss intro, go to Shop
        await page.evaluate("()=>{ const b=[...document.querySelectorAll('button')].find(x=>/^\\s*begin\\s*$/i.test(x.textContent)); if(b) b.click(); }")
        await page.evaluate("()=>{ __rr.UI.nav='shop'; __rr.renderArmory(); }")
        shop=await page.evaluate("()=>document.getElementById('content').innerText")
        check('no Founder card on Shop', 'Founder' not in shop, shop[:80])
        check('Season pass card shows on Shop', 'Season ' in shop and ' pass' in shop, shop[:200])
        check('no ad wording in the Season premium text', 'remove ads' not in shop and 'reward ad' not in shop)
        check('Neon Pass hidden in play', 'Neon Pass' not in shop)
        check('Gem bundles / Coming soon hidden in play', 'Gem bundles' not in shop and 'Coming soon' not in shop)
        check('no "watch ad" wording anywhere on Shop', 'watch ad' not in shop.lower(), shop)
        # rewards need active play: locked until a level is played today
        check('daily reward is locked before playing today', await page.evaluate("()=>document.querySelector('button[data-claim=chest]').disabled"))
        await page.evaluate("()=>{ const d=new Date(); __rr.P.actDay=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); __rr.renderArmory(); }")
        check('daily reward unlocks after playing', await page.evaluate("()=>!document.querySelector('button[data-claim=chest]').disabled"))
        # rewards work with no ads: daily chest
        g0=await page.evaluate("__rr.P.gems")
        await page.evaluate("()=>{ document.querySelector('button[data-claim=chest]').click(); }")
        g1=await page.evaluate("__rr.P.gems")
        check('daily chest grants instantly without an ad', g1>g0, (g0,g1))
        check('daily reward gives 11 gems', g1-g0==11, (g0,g1))
        check('daily reward adds season points', await page.evaluate("()=>(__rr.P.ss&&__rr.P.ss.pts)||0")>=10)
        # tester welcome package after clearing level 5
        check('welcome package hidden before level 5', await page.evaluate("()=>!document.querySelector('[data-welcome]')"))
        await page.evaluate("()=>{ const p=__rr.P.prog=__rr.P.prog||{}; const k=Object.keys(p)[0]||'1'; p[k]=Object.assign(p[k]||{},{best:5}); __rr.save(); __rr.renderArmory(); }")
        check('nav dot appears when the welcome package is ready', await page.evaluate("()=>!!document.querySelector('.nav .ndot')"))
        gw=await page.evaluate("__rr.P.gems")
        await page.evaluate("()=>document.querySelector('[data-welcome]').click()")
        r=await page.evaluate("()=>({gems:__rr.P.gems,tw:!!__rr.P.tw})")
        check('welcome package gives 100 gems once', r['gems']-gw==100 and r['tw'], (gw,r))
        # worlds locked
        await page.evaluate("()=>{ __rr.UI.nav='worlds'; __rr.renderArmory(); }")
        w=await page.evaluate("()=>document.getElementById('content').innerText")
        check('Worlds 2 to 5 show Coming in an update', w.lower().count('coming in an update')==4, w.lower().count('coming in an update'))
        # settings panel has feedback + privacy
        await page.evaluate("()=>document.getElementById('gearBtn').click()")
        orb=await page.evaluate("()=>document.getElementById('orb').innerText+'|'+[...document.querySelectorAll('#orb a')].map(a=>a.getAttribute('href')).join(' ')")
        check('settings has Send feedback and Privacy policy', 'Send feedback' in orb and 'mailto:' in orb and 'privacy' in orb.lower(), orb)
        await page.evaluate("()=>document.querySelector('#orb .odone').click()")
        # speed persists across a reload
        await page.evaluate("()=>{ document.getElementById('spdBtn').click(); document.getElementById('spdBtn').click(); }")
        sp=await page.evaluate("()=>[__rr.G.speed,__rr.P.spd]")
        await page.reload(); await page.wait_for_function('window.__rr!==undefined')
        sp2=await page.evaluate("()=>[__rr.G.speed,__rr.P.spd,document.getElementById('spdBtn').textContent]")
        check('game speed is remembered after a restart', sp2[0]==3, (sp,sp2))
        check('welcome claim survives a restart', await page.evaluate("()=>!!__rr.P.tw"))
        check('no JS errors', not page.errs, page.errs[:3])
        await b.close()
    print('\n%d check(s) failed'%len(fails) if fails else '\nall play checks passed'); sys.exit(1 if fails else 0)
asyncio.run(main())
