// Phone smoke test for Neon Defense: plays the opening of Level 1 on emulated iPhones and an Android phone.
// Usage (from this folder):  npm run check            -> tests the repo's own files on a local server
//                            npm run check:live       -> tests https://neon.squatchsquad.games/
//                            node phone-check.mjs --only=pixel-7   (one device)
// Screenshots and report.json land in tests/phone/out/. Exit code 1 if any check fails.
//
// Test-only behaviour (nothing here changes the game or the site):
//  - Firebase is blocked in the test browser, so cloud.js takes its existing offline path and the game runs on a
//    local save. No account is signed in, nothing is written to Firestore.
//  - Ad scripts are blocked so automated runs never request or show real ads.
//  - The notch and home-bar insets of an installed iPhone app are simulated by swapping the CSS env() fallbacks
//    for the real inset sizes (desktop browsers report 0 for env(safe-area-inset-*)).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { chromium, webkit, devices } from 'playwright';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'out');
const LIVE = 'https://neon.squatchsquad.games/';
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] ?? true) : undefined; };

// insets: top/bottom/left/right in CSS px, as the phone reports them in portrait
const DEVICES = [
  { id: 'iphone-15-app', label: 'iPhone 15 (installed app)', browser: webkit,
    ctx: { ...devices['iPhone 15'], viewport: { width: 393, height: 852 } }, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  { id: 'iphone-se', label: 'iPhone SE (Safari, smallest screen)', browser: webkit,
    ctx: devices['iPhone SE (3rd gen)'], insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  { id: 'pixel-7', label: 'Pixel 7 (Chrome)', browser: chromium,
    ctx: devices['Pixel 7'], insets: { top: 0, bottom: 0, left: 0, right: 0 } },
];

const BLOCK = [/gstatic\.com\/firebasejs\//, /googlesyndication\.com/, /doubleclick\.net/, /googletagservices\.com/, /adservice\.google/, /google-analytics\.com/];

function repoBuild() { try { return +fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/const BUILD=(\d+)/)[1]; } catch { return null; } }

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css', '.txt': 'text/plain' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, path.normalize(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}/` })));
}

async function runDevice(d, url, expectBuild) {
  const checks = []; const shots = []; const errors = [];
  const chk = (name, pass, info = '') => { checks.push({ name, pass: !!pass, info: String(info) }); console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name}${info ? ' (' + info + ')' : ''}`); };
  const note = (name, info) => { checks.push({ name, pass: null, info: String(info) }); console.log(`  INFO ${name}: ${info}`); };
  const dir = path.join(OUT, d.id); fs.mkdirSync(dir, { recursive: true });
  const shot = async (page, name) => { const f = path.join(dir, name + '.png'); await page.screenshot({ path: f }); shots.push(path.relative(OUT, f));
    // PHONE_LOG_SHOTS=1 also prints a small JPEG of each step into the log, for reviewers who can't download artifacts
    if (process.env.PHONE_LOG_SHOTS) { const j = await page.screenshot({ type: 'jpeg', quality: 40, scale: 'css' }); console.log(`SHOT ${d.id}/${name} ${j.toString('base64')}`); } };

  let browser;
  try { browser = await d.browser.launch(); }
  catch (e) { chk('browser starts', false, e.message.split('\n')[0]); return { id: d.id, label: d.label, checks, shots, errors }; }
  const ctx = await browser.newContext({ ...d.ctx, serviceWorkers: 'block', locale: 'en-US', timezoneId: 'America/Los_Angeles' });
  // returning-player hint: with Firebase blocked, cloud.js lets the game run on a local save (its offline path)
  // __forceTeach: the game hides its tips from automated browsers unless this is set (see coachOn in index.html)
  await ctx.addInitScript(() => { window.__forceTeach = true; try { localStorage.setItem('nd-signed-in', '1'); } catch (e) {} });
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (BLOCK.some(rx => rx.test(u))) return route.abort();
    if (route.request().resourceType() === 'document' && (d.insets.top || d.insets.bottom || d.insets.left || d.insets.right)) {
      const r = await route.fetch(); let body = await r.text();
      for (const s of ['top', 'bottom', 'left', 'right']) body = body.replaceAll(`env(safe-area-inset-${s},0px)`, `${d.insets[s]}px`).replaceAll(`env(safe-area-inset-${s})`, `${d.insets[s]}px`);
      return route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html' } });
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/firebasejs|ERR_FAILED|Failed to load resource|cloud init failed/i.test(m.text())) errors.push('console: ' + m.text()); });
  const W = d.ctx.viewport.width, H = d.ctx.viewport.height, I = d.insets;

  // --- load ---
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(() => window.__rr && window.__rr.G, null, { timeout: 30000 });
  note('load time', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  const build = await page.evaluate(() => { const m = (document.getElementById('buildtag') || {}).textContent || ''; return +(m.match(/\d+/) || [0])[0]; });
  chk('build number', expectBuild ? build === expectBuild : build > 0, `site shows build ${build}${expectBuild ? ', expected ' + expectBuild : ''}`);
  await page.waitForFunction(() => document.getElementById('gate').hidden, null, { timeout: 15000 }).catch(() => {});
  chk('reaches the game without a sign-in wall (offline path)', await page.evaluate(() => document.getElementById('gate').hidden));
  chk('no sideways scrolling', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await page.evaluate(() => document.documentElement.scrollWidth + ' vs ' + innerWidth));

  // --- intro ---
  const intro = page.locator('#introov button');
  if (await intro.isVisible().catch(() => false)) {
    await shot(page, '01-intro');
    await intro.tap();
    chk('tap on Begin registers', await page.waitForFunction(() => !document.getElementById('introov'), null, { timeout: 5000 }).then(() => true, () => false));
  } else chk('intro screen shows for a new player', false, 'no Begin button');

  // --- home screen: a new player gets the tour card pointing at Battle ---
  const tour = await page.waitForFunction(() => document.querySelector('#coach .ccard'), null, { timeout: 5000 }).then(() => true, () => false);
  await page.waitForTimeout(500);
  await shot(page, '02-home');
  chk('home tour points a new player at Battle', tour, tour ? await page.evaluate(() => document.querySelector('#coach h3').textContent) : 'no tour card');
  const clip = await page.evaluate(({ W, H, I }) => {
    const bad = [];
    for (const el of document.querySelectorAll('#armory button, #armory [data-act], #coach .ccard, #coach button')) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest('[hidden]')) continue;
      // only judge things a player sees without scrolling
      if (r.bottom < 0 || r.top > H) continue;
      const scroller = el.closest('[style*="overflow"], .scroll, #content');
      const off = r.left < I.left - 1 || r.right > W - I.right + 1 || (!scroller && (r.top < I.top - 1 || r.bottom > H - I.bottom + 1));
      if (off) bad.push(`${(el.textContent || el.dataset.act || el.className).trim().slice(0, 24)} @ ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  }, { W, H, I });
  chk('home screen buttons clear of notch, home bar and screen edges', clip.length === 0, clip.slice(0, 6).join('; '));

  // --- deploy level 1 (the tour points at the Battle button) ---
  const deploy = page.locator('.pvwrap [data-act="deploy"]').first();
  let started = false;
  if (await deploy.isVisible().catch(() => false)) {
    await deploy.tap();
    started = await page.waitForFunction(() => ['playing', 'teach', 'cards'].includes(__rr.G.state), null, { timeout: 6000 }).then(() => true, () => false);
  }
  chk('tap on Battle starts Level 1', started, started ? '' : 'state ' + await page.evaluate(() => __rr.G.state));
  if (!started) { await shot(page, '03-not-started'); await browser.close(); return { id: d.id, label: d.label, build, checks, shots, errors }; }
  chk('it is Level 1', await page.evaluate(() => __rr.G.n === 1), 'level ' + await page.evaluate(() => __rr.G.n));

  // --- first in-battle tip must freeze the field ---
  const tipUp = await page.waitForFunction(() => __rr.G.state === 'teach' && (document.querySelector('#coach .ccard') || document.getElementById('teachov')), null, { timeout: 8000 }).then(() => true, () => false);
  chk('first battle tip appears', tipUp);
  if (tipUp) {
    // G.time is the animation clock and always runs; G.waveT is the battle clock that drives spawns and waves
    const snap = () => page.evaluate(() => { const G = __rr.G; return { state: G.state, time: G.waveT, wave: G.wave, n: G.enemies.length, pos: G.enemies.filter(e => !e.dead).map(e => [Math.round(e.x), Math.round(e.y)]).join('|') }; });
    const a = await snap();
    // watch the 2 s window in the page so a brief unfreeze between two cards is caught too
    const trace = await page.evaluate(() => new Promise(res => { const G = __rr.G, seen = []; let lastKey = ''; const t0 = performance.now(); const iv = setInterval(() => {
      const ov = document.querySelector('#coach h3') ? 'tip "' + document.querySelector('#coach h3').textContent + '"' : document.querySelector('#teachov h2') ? 'card "' + document.querySelector('#teachov h2').textContent + '"' : 'no tip';
      const k = G.state + ' / ' + ov; if (k !== lastKey) { seen.push(`${Math.round(performance.now() - t0)}ms ${k} clock ${G.waveT.toFixed(2)}`); lastKey = k; }
      if (performance.now() - t0 > 2000) { clearInterval(iv); res(seen); } }, 25); }));
    const b = await snap();
    await shot(page, '03-tip');
    chk('field is frozen while the tip is up', a.state === 'teach' && b.state === 'teach' && a.time === b.time && a.wave === b.wave && a.pos === b.pos && a.n === b.n,
      `over 2 s: battle clock ${a.time?.toFixed?.(2)}->${b.time?.toFixed?.(2)}, wave ${a.wave}->${b.wave}, mobs ${a.n}->${b.n}${a.pos === b.pos ? '' : ', mobs moved'}; ${trace.join(' > ')}`);
    const card = await page.evaluate(({ W, H, I }) => { const c = document.querySelector('#coach .ccard') || document.querySelector('#teachov .tcard'); if (!c) return null; const r = c.getBoundingClientRect(); return { ok: r.left >= I.left - 1 && r.right <= W - I.right + 1 && r.top >= I.top - 1 && r.bottom <= H - I.bottom + 1, r: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}` }; }, { W, H, I });
    if (card) chk('tip card fits on screen, clear of notch and home bar', card.ok, card.r);
  }

  // --- dismiss every tip with taps, then the battle must run ---
  // more tips can follow a moment later (Fire a weapon, new enemy cards), so wait for 3 s of clear play
  const taps = await clearTips(page, 1500);
  const running = await page.waitForFunction(() => __rr.G.state === 'playing', null, { timeout: 8000 }).then(() => true, () => false);
  const whatsUp = () => page.evaluate(() => { const t = document.querySelector('#coach h3, #teachov h2'); const bs = [...document.querySelectorAll('#coach button, #teachov button')].map(b => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()}${b.disabled ? ' (disabled)' : ''} @ ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; }); return (t ? '"' + t.textContent + '"' : 'no tip') + (bs.length ? ', buttons: ' + bs.join(', ') : '') + ', screen ' + innerWidth + 'x' + innerHeight; });
  chk('tips close with taps and the battle resumes', running, `${taps} taps, state ${await page.evaluate(() => __rr.G.state)}${running ? '' : ', showing ' + await whatsUp()}`);
  if (!running) await shot(page, '04-stuck');
  if (running) {
    const c0 = await page.evaluate(() => __rr.G.waveT);
    // FPS / stutter over 4 s of live play
    const perf = await page.evaluate(() => new Promise(res => { const ts = []; const t0 = performance.now(); const f = t => { ts.push(t); if (t - t0 < 4000) requestAnimationFrame(f); else { const d = ts.slice(1).map((t, i) => t - ts[i]); res({ fps: Math.round(d.length / ((ts.at(-1) - ts[0]) / 1000)), long: d.filter(x => x > 50).length, worst: Math.round(Math.max(...d)) }); } }; requestAnimationFrame(f); }));
    const c1 = await page.evaluate(() => ({ time: __rr.G.waveT, mobs: __rr.G.enemies.filter(e => !e.dead).length, state: __rr.G.state }));
    chk('battle clock runs after the tips', c1.time > c0 + 0.05, `clock ${c0.toFixed(2)}->${c1.time.toFixed(2)}, ${c1.mobs} mobs on field`);
    note('frame rate (emulated on a server with no graphics chip, not a real phone)', `${perf.fps} fps, ${perf.long} frames over 50 ms, worst ${perf.worst} ms`);
    await clearTips(page, 1000);
    await shot(page, '04-battle');
    const hud = await page.evaluate(({ W, H, I }) => { const bad = []; for (const el of document.querySelectorAll('#hud button, #hud > *, #dock button, #dock .tool:not([hidden]), #cmdDock button, #pauseBtn, #spdBtn')) { const r = el.getBoundingClientRect(); if (!r.width || !r.height || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') continue; if (r.left < I.left - 1 || r.right > W - I.right + 1 || r.top < I.top - 1 || r.bottom > H - I.bottom + 1) bad.push(`${(el.id || el.className || el.tagName).toString().slice(0, 20)} @ ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`); } return bad; }, { W, H, I });
    chk('battle controls clear of notch, home bar and screen edges', hud.length === 0, hud.slice(0, 6).join('; '));
    const pause = page.locator('#pauseBtn');
    if (await pause.isVisible().catch(() => false)) {
      const err = await pause.tap({ timeout: 5000 }).then(() => '', e => e.message.split('\n').find(l => /intercepts|not visible|outside/.test(l)) || 'tap timed out');
      await page.waitForTimeout(400);
      const ps = await page.evaluate(() => __rr.G.state);
      chk('tap on Pause registers', !err && ps === 'paused', (err || 'state ' + ps).trim());
      await shot(page, '05-paused');
    }
  }
  chk('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  return { id: d.id, label: d.label, build, checks, shots, errors };
}

// taps through tip cards until the first mob is on the field (its "new enemy" card comes with it) and the battle
// has then run with nothing on top for holdMs; returns the number of taps. Slow emulated phones run game time slowly,
// so this waits on the game's state, not a fixed time.
async function clearTips(page, holdMs) {
  let taps = 0, clear = 0; const end = Date.now() + 60000;
  while (Date.now() < end && clear < holdMs) {
    const st = await page.evaluate(() => ({ s: __rr.G.state, mob: __rr.G.enemies.length > 0 || __rr.G.wave > 1 }));
    const btn = page.locator('#coach button[data-c="next"], #teachov .tcard button, #coach button[data-c="skip"]').first();
    const vis = await btn.isVisible().catch(() => false);
    if (st.s === 'playing' && !vis && !(await page.locator('#coach, #teachov').count())) { if (st.mob) clear += 500; await page.waitForTimeout(500); continue; }
    clear = 0;
    if (vis && await btn.isEnabled().catch(() => false)) { await btn.tap({ timeout: 4000 }).catch(() => {}); taps++; await page.waitForTimeout(450); }
    else await page.waitForTimeout(600);
  }
  return taps;
}

const live = !!arg('live'); const only = arg('only');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
let server = null, url = arg('url');
if (!url) { if (live) url = LIVE; else { server = await serve(); url = server.url; } }
const expectBuild = arg('build') ? +arg('build') : repoBuild();
console.log(`Neon Defense phone check: ${url}${expectBuild ? ' (expecting build ' + expectBuild + ')' : ''}`);
const results = [];
for (const d of DEVICES.filter(x => !only || x.id === only)) {
  console.log(`\n${d.label}`);
  try { results.push(await runDevice(d, url, expectBuild)); }
  catch (e) { console.log('  FAIL crashed: ' + e.message.split('\n')[0]); results.push({ id: d.id, label: d.label, checks: [{ name: 'run finished', pass: false, info: e.message.split('\n')[0] }], shots: [], errors: [] }); }
}
if (server) server.srv.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ url, expectBuild, at: new Date().toISOString(), results }, null, 2));
const failed = results.flatMap(r => r.checks.filter(c => c.pass === false).map(c => `${r.label}: ${c.name}${c.info ? ' (' + c.info + ')' : ''}`));
console.log(`\n${failed.length ? failed.length + ' check(s) failed:\n- ' + failed.join('\n- ') : 'All phone checks passed.'}\nScreenshots: ${OUT}`);
process.exit(failed.length ? 1 : 0);
