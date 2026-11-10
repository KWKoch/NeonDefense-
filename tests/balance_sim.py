"""Balance simulator: plays headless auto runs of the real game code and reports how each level goes.
Usage: python3 tests/balance_sim.py [--levels 1,5,10] [--runs 3] [--profile fresh|invested] [--load mortar,field] [--tune '{"speed":0.7,"hp":1.3}']
Needs a local server on :8123 (python3 -m http.server 8123 from the repo folder).
Each run uses the game's own AI for every weapon and picks level-up cards at random, then reports win/loss, the wave reached,
base health left and the simulated minutes it took. 'fresh' has no Arsenal upgrades; 'invested' has upgrades that grow with level; 'f0.4' puts every upgrade at 40% of its maximum.
Add --need 1 to instead search, per level, for the smallest upgrade fraction (steps of 0.1) that wins most runs: the power a player needs at that level."""
import asyncio, glob, sys, json
from playwright.async_api import async_playwright
EXE=(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome') or [None])[0]
def arg(k,d):
    return sys.argv[sys.argv.index('--'+k)+1] if '--'+k in sys.argv else d
LEVELS=[int(x) for x in arg('levels','1,3,6,9,12,16,20,25,30,40,50').split(',')]
RUNS=int(arg('runs','3')); TUNE=json.loads(arg('tune','{}')); PROFILE=arg('profile','fresh'); LOAD=arg('load','mortar,field').split(',')
JS="""([n,profile,load,seed,tune])=>{
  const R=__rr; Object.assign(R.TUNE,tune); const io=document.getElementById('introov'); if(io) io.remove();
  let s=seed*9301+n*49297+7; Math.random=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  R.P=R.newP(); const P=R.P; P.intro=true; P.tut={tour:1,run:1,grab:1,cmdrun:1,command:1};
  P.prog={belt:{best:60,sel:n,perf:{},eclr:{},stars:{}}}; P.world='belt'; P.lv={};
  if(profile.startsWith('f')){ const f=parseFloat(profile.slice(1)); for(const u of R.UPS){ if(u.tab==='base') continue; P.lv[u.id]=Math.min(u.max,Math.floor(f*u.max)); } }
  if(profile==='invested'){ for(const u of R.UPS){ if(u.tab==='base') continue; P.lv[u.id]=Math.min(u.max,Math.floor(n/5)); } }
  try{ localStorage.setItem('nd_loadout_v1',JSON.stringify(load)); }catch(e){}
  for(const w of R.loadout().slice()) R.toggleEquip(w); for(const w of load) R.toggleEquip(w);
  R.startLevel(n,'belt',false); const G=R.G; G.teachQ=[]; const o=document.getElementById('teachov'); if(o) o.remove(); G.state='playing';
  let steps=0, picks=0; const MAX=30*60*40;
  while(steps<MAX && G.state!=='won' && G.state!=='over'){
    if(G.state==='cards'){ const k=Math.floor(Math.random()*G.offer.length); R.pickCard(k); picks++; if(++steps>MAX) break; continue; }
    if(G.state==='teach'||G.state==='shop'){ G.state='playing'; }
    R.update(1/30); steps++;
  }
  return {n:n,tools:R.wcount(),res:G.state,wave:G.wave,NW:G.NW,hp:Math.round(100*G.hp/G.maxHp),min:+(steps/30/60).toFixed(1),picks:picks};
}"""
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':EXE} if EXE else {}))
        page=await (await b.new_context(viewport={'width':412,'height':892})).new_page()
        errs=[]; page.on('pageerror',lambda e:errs.append(str(e)))
        await page.route('**/*gstatic.com/**',lambda r:r.abort())
        await page.goto('http://localhost:8123/index.html'); await page.wait_for_function('window.__rr!==undefined')
        await page.evaluate("()=>{const g=document.getElementById('gate'); if(g) g.hidden=true;}")
        if arg('need','')=='1':
            print('level  power needed (fraction of max on every upgrade)  tune=%s'%json.dumps(TUNE))
            for n in LEVELS:
                got=None
                for f in [i/10 for i in range(0,11)]:
                    rs=[await page.evaluate(JS,[n,'f%.1f'%f,LOAD,i+1,TUNE]) for i in range(RUNS)]
                    if sum(r['res']=='won' for r in rs)*2>=RUNS: got=f; break
                print('%5d  %s'%(n,'%.1f'%got if got is not None else '>1.0 (not winnable)'),flush=True)
            await b.close(); return
        print('level  win  avg_wave   avg_hp  avg_min   (profile=%s, %d runs, loadout=%s)'%(PROFILE,RUNS,','.join(LOAD)))
        for n in LEVELS:
            rs=[await page.evaluate(JS,[n,PROFILE,LOAD,i+1,TUNE]) for i in range(RUNS)]
            w=sum(r['res']=='won' for r in rs)
            print('%5d  %d/%d  %5.1f/%d  %6.0f%%  %6.1f'%(n,w,RUNS,sum(r['wave'] for r in rs)/RUNS,rs[0]['NW'],sum(r['hp'] for r in rs)/RUNS,sum(r['min'] for r in rs)/RUNS),flush=True)
        if errs: print('page errors:',errs[:3])
        await b.close()
asyncio.run(main())
