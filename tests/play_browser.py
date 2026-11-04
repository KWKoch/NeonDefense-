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
        info=await page.evaluate("""()=>({gate:!!document.getElementById('gate'), sw:'serviceWorker' in navigator && !!document.querySelector('link[rel=manifest]'), tag:document.getElementById('buildtag').textContent,
          fp:!!__rr.P.fp, d0:__rr.P.fp&&__rr.P.fp.d0, body:document.body.innerText})""")
        check('no sign-in gate in the play bundle', not info['gate'])
        check('no manifest/PWA tags', not info['sw'])
        check('build tag says play 01', 'play 01' in info['tag'], info['tag'])
        check('first launch starts the Founder clock', info['fp'] and bool(info['d0']))
        # dismiss intro, go to Shop
        await page.evaluate("()=>{ const b=[...document.querySelectorAll('button')].find(x=>/^\\s*begin\\s*$/i.test(x.textContent)); if(b) b.click(); }")
        await page.evaluate("()=>{ __rr.UI.nav='shop'; __rr.renderArmory(); }")
        shop=await page.evaluate("()=>document.getElementById('content').innerText")
        check('Founder card shows on Shop', 'Founder' in shop and 'Day 1' in shop, shop[:80])
        check('Neon Pass hidden in play', 'Neon Pass' not in shop)
        check('Gem bundles / Coming soon hidden in play', 'Gem bundles' not in shop and 'Coming soon' not in shop)
        check('no "watch ad" wording anywhere on Shop', 'watch ad' not in shop.lower(), shop)
        # rewards work with no ads: daily chest
        g0=await page.evaluate("__rr.P.gems")
        await page.evaluate("()=>{ document.querySelector('button[data-claim=chest]').click(); }")
        g1=await page.evaluate("__rr.P.gems")
        check('daily chest grants instantly without an ad', g1>g0, (g0,g1))
        # milestones locked on day 1
        locked=await page.evaluate("()=>!document.querySelector('button[data-claim^=\"fp:\"]')")
        check('milestones are locked on day 1', locked)
        # fast forward to day 3
        def back(n): return "()=>{ const d=new Date(); d.setDate(d.getDate()-%d); __rr.P.fp.d0=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); __rr.renderArmory(); }"%n
        await page.evaluate(back(2))
        dot=await page.evaluate("()=>!!document.querySelector('.nav .ndot')")
        check('nav dot appears when a reward is ready (day 3)', dot)
        await page.evaluate("()=>{ __rr.P.en=3; __rr.P.enT=Date.now(); }")
        gems0=await page.evaluate("__rr.P.gems"); crys0=await page.evaluate("__rr.P.inv && Object.values(__rr.P.inv).flat().reduce((a,b)=>a+b,0)")
        await page.evaluate("()=>document.querySelector('button[data-claim=\"fp:3\"]').click()")
        r=await page.evaluate("()=>({gems:__rr.P.gems,en:__rr.P.en,c:Object.values(__rr.P.inv).flat().reduce((a,b)=>a+b,0),claimed:!!__rr.P.fp.c[3]})")
        check('day 3 reward: +15 gems', r['gems']-gems0==15, r)
        check('day 3 reward: 6 crystals', r['c']-crys0==6, r)
        check('day 3 reward: energy refilled', r['en']==50, r)
        await page.evaluate("()=>document.querySelector('button[data-claim=\"fp:3\"]')&&document.querySelector('button[data-claim=\"fp:3\"]').click()")
        again=await page.evaluate("__rr.P.gems")
        check('a reward cannot be claimed twice', again==r['gems'])
        # day 7 and 12
        await page.evaluate(back(6)); await page.evaluate("()=>document.querySelector('button[data-claim=\"fp:7\"]').click()")
        ok7=await page.evaluate("()=>!!__rr.P.fp.c[7]")
        await page.evaluate(back(11)); await page.evaluate("()=>document.querySelector('button[data-claim=\"fp:12\"]').click()")
        ok12=await page.evaluate("()=>({c:!!__rr.P.fp.c[12],perm:!!__rr.P.fp.c.perm})")
        check('day 7 reward claims', ok7); check('day 12 reward claims and sets the permanent perk', ok12['c'] and ok12['perm'], ok12)
        # energy interval: boost + perk (day 12) = 38.4s, perk only (after day 14) = 76.8s
        secs="()=>{ const q=document.querySelector('#enBox small'); const m=q&&q.textContent.match(/(\\d+):(\\d+)/); return m?(+m[1])*60+(+m[2]):0 }"
        await page.evaluate(back(11)); await page.evaluate("()=>{ __rr.P.en=10; __rr.P.enT=Date.now(); __rr.renderArmory(); }")
        t_boost=await page.evaluate(secs)
        check('day 12: boost and perk give a 38 second energy timer', 30<=t_boost<=39, t_boost)
        await page.evaluate(back(20)); await page.evaluate("()=>{ __rr.P.en=10; __rr.P.enT=Date.now(); __rr.renderArmory(); }")
        nx=await page.evaluate(secs)
        check('after day 14 the permanent perk still speeds energy (about 77s)', 70<=nx<=77, nx)
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
        check('Founder progress survives a restart', await page.evaluate("()=>!!__rr.P.fp.c[3]&&!!__rr.P.fp.c[12]"))
        # start level 1 and win: gems bonus only while boost active
        await page.evaluate(back(0))
        check('no JS errors', not page.errs, page.errs[:3])
        await b.close()
    print('\n%d check(s) failed'%len(fails) if fails else '\nall play checks passed'); sys.exit(1 if fails else 0)
asyncio.run(main())
