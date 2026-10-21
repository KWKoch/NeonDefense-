// Build per-target bundles: node build.mjs <site|crazygames|y8|gamepix|kongregate|none|all>
// site       = the GitHub Pages build (root files, unchanged: Google sign-in gate, Firestore, PWA, H5 Games Ads)
// portals    = no Firebase, no sign-in, no service worker/manifest, no AdSense, no external links; fonts bundled
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const ROOT=path.dirname(new URL(import.meta.url).pathname);
const PORTALS=['crazygames','y8','gamepix','kongregate','none'];
const SITE_FILES=['index.html','ads.js','cloud.js','firebase-config.js','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function must(s,a,b){ if(typeof a==='string'?!s.includes(a):!a.test(s)) throw new Error('build: pattern not found: '+a); return s.replace(a,b); }

function portalHtml(target){
  let s=rd('index.html');
  s=must(s,'<meta name="google-adsense-account" content="ca-pub-4954431316761739">','');
  s=must(s,/<meta name="mobile-web-app-capable"[^\n]*\n/,'');
  s=must(s,/<meta name="apple-mobile-web-app-status-bar-style"[^\n]*\n/,'');
  s=must(s,'<link rel="manifest" href="manifest.webmanifest">','');
  s=must(s,'<link rel="apple-touch-icon" href="icon-180.png">','');
  s=must(s,/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n<link href="https:\/\/fonts\.googleapis\.com[^\n]*\n/,'<link rel="stylesheet" href="fonts/fonts.css">\n');
  s=must(s,/#gate\{[^\n]*\n#gate\[hidden\][^\n]*\n#gate h1[^\n]*\n#gate \.gmsg[^\n]*\n#gate \.gerr[^\n]*\n/,'');
  s=must(s,/<div id="gate"[^\n]*\n/,'');
  const a=s.indexOf('function accountHtml(){'), b=s.indexOf('\n}\n',a);
  if(a<0||b<0) throw new Error('build: accountHtml not found');
  s=s.slice(0,a)+"function accountHtml(){ return ''; }"+s.slice(b+2);
  const ads=(rd('portal/ads-core.js')+'\n'+rd('portal/'+target+'.js')).replace(/\/\*[\s\S]*?\*\//g,'');
  s=must(s,'<script src="ads.js"></script>\n<script>\n','<script>\n'+ads+'\n</script>\n<script>\nAds.boot(function(){\n');
  s=must(s,/<\/script>\n\s*<script type="module" src="cloud.js"><\/script>\n/,'\n});\n</script>\n');
  s=must(s,/<script>if\('serviceWorker' in navigator\)[^\n]*<\/script>\n?/,'');
  const ext=[...s.matchAll(/https?:\/\/[^\s'"<>)]+/g)].map(m=>m[0]).filter(u=>!/^https:\/\/(sdk\.crazygames\.com|integration\.gamepix\.com|cdn\.y8\.com|cdn1\.kongregate\.com)\//.test(u)&&!/^https?:\/\/www\.w3\.org\//.test(u));
  if(ext.length) throw new Error('build: external URLs left in '+target+': '+ext.join(', '));
  if(/firebase|googlesyndication|adsbygoogle|serviceWorker/i.test(s)) throw new Error('build: site-only code left in '+target);
  return s;
}

// --- minimal zip writer (deflate) ---
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
const crc32=b=>{ let c=0xFFFFFFFF; for(const x of b) c=CRC[(c^x)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function zip(files){ // files: [{name, data:Buffer}]
  const parts=[], cen=[]; let off=0;
  for(const f of files){
    const name=Buffer.from(f.name), comp=zlib.deflateRawSync(f.data,{level:9}), crc=crc32(f.data);
    const h=Buffer.alloc(30); h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(20,4); h.writeUInt16LE(0,6); h.writeUInt16LE(8,8);
    h.writeUInt16LE(0,10); h.writeUInt16LE(0x5421,12); h.writeUInt32LE(crc,14); h.writeUInt32LE(comp.length,18); h.writeUInt32LE(f.data.length,22); h.writeUInt16LE(name.length,26); h.writeUInt16LE(0,28);
    parts.push(h,name,comp);
    const c=Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0,8); c.writeUInt16LE(8,10);
    c.writeUInt16LE(0,12); c.writeUInt16LE(0x5421,14); c.writeUInt32LE(crc,16); c.writeUInt32LE(comp.length,20); c.writeUInt32LE(f.data.length,24); c.writeUInt16LE(name.length,28);
    c.writeUInt32LE(off,42); cen.push(c,name); off+=30+name.length+comp.length;
  }
  const cd=Buffer.concat(cen), e=Buffer.alloc(22); e.writeUInt32LE(0x06054b50,0); e.writeUInt16LE(files.length,8); e.writeUInt16LE(files.length,10); e.writeUInt32LE(cd.length,12); e.writeUInt32LE(off,16);
  return Buffer.concat([...parts,cd,e]);
}

function build(target){
  const out=path.join(ROOT,'dist',target); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  const files=[];
  const add=(name,data)=>{ fs.mkdirSync(path.dirname(path.join(out,name)),{recursive:true}); fs.writeFileSync(path.join(out,name),data); files.push({name,data:Buffer.from(data)}); };
  if(target==='site'){ for(const f of SITE_FILES) add(f,fs.readFileSync(path.join(ROOT,f))); }
  else {
    add('index.html',portalHtml(target));
    add('icon-192.png',fs.readFileSync(path.join(ROOT,'icon-192.png')));
    for(const f of fs.readdirSync(path.join(ROOT,'portal/fonts'))) add('fonts/'+f,fs.readFileSync(path.join(ROOT,'portal/fonts',f)));
  }
  const z=zip(files), zp=path.join(ROOT,'dist','neon-defense-'+target+'.zip'); fs.writeFileSync(zp,z);
  console.log(target.padEnd(11),(z.length/1024).toFixed(1)+' KB',path.relative(ROOT,zp));
}
const t=process.argv[2];
const list=t==='all'?['site',...PORTALS]:[t];
if(!t||!list.every(x=>x==='site'||PORTALS.includes(x))){ console.error('usage: node build.mjs <site|'+PORTALS.join('|')+'|all>'); process.exit(1); }
list.forEach(build);
