const V='rr-v23',A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','cloud.js','firebase-config.js','ads.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
/* network-first, bypassing the HTTP cache, so updates always land; cache is only an offline fallback */
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request)));});
