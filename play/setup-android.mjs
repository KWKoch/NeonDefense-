// Run from play/ after `npx cap add android`. Applies the Play edition settings to the generated Android project (no dependencies).
// Env: VERSION_CODE (integer, must rise with every Play upload), VERSION_NAME (default "01").
import fs from 'node:fs'; import path from 'node:path';
const HERE=path.dirname(new URL(import.meta.url).pathname), A=path.join(HERE,'android'), APP=path.join(A,'app');
const rd=f=>fs.readFileSync(f,'utf8'), wr=(f,s)=>fs.writeFileSync(f,s);
const code=process.env.VERSION_CODE||'1', name=process.env.VERSION_NAME||'01';
const must=(s,re,to,label)=>{ if(!(typeof re==='string'?s.includes(re):re.test(s))) throw new Error('setup-android: not found: '+label); return s.replace(re,to); };

// 1. Android version targets: Play requires targetSdk 36 for new apps and updates (from Aug 31, 2026)
let v=rd(path.join(A,'variables.gradle'));
v=must(v,/targetSdkVersion\s*=\s*\d+/,'targetSdkVersion = 36','targetSdkVersion');
v=must(v,/compileSdkVersion\s*=\s*\d+/,'compileSdkVersion = 36','compileSdkVersion');
wr(path.join(A,'variables.gradle'),v);

// 2. app/build.gradle: version + release signing from environment (upload key kept in GitHub secrets, never in the repo)
let g=rd(path.join(APP,'build.gradle'));
g=must(g,/versionCode\s+\d+/,'versionCode '+code,'versionCode');
g=must(g,/versionName\s+"[^"]*"/,'versionName "'+name+'"','versionName');
if(!g.includes('NDSIGN')){
  g=must(g,/android\s*\{/,`android {
    // NDSIGN: release signing comes from env (see .github/workflows/play-build.yml). Without it the bundle is built unsigned.
    signingConfigs {
        release {
            if (System.getenv("KEYSTORE_FILE")) {
                storeFile file(System.getenv("KEYSTORE_FILE"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }`,'android block');
  g=must(g,/buildTypes\s*\{\s*release\s*\{/,`buildTypes {
        release {
            if (System.getenv("KEYSTORE_FILE")) { signingConfig signingConfigs.release }`,'release buildType');
}
wr(path.join(APP,'build.gradle'),g);

// 3. Manifest: portrait only, no cleartext traffic
const mf=path.join(APP,'src/main/AndroidManifest.xml'); let m=rd(mf);
if(!m.includes('screenOrientation')) m=must(m,/<activity\b/,'<activity\n            android:screenOrientation="portrait"','activity');
if(!m.includes('usesCleartextTraffic')) m=must(m,/<application\b/,'<application\n        android:usesCleartextTraffic="false"','application');
wr(mf,m);

// 4. Immersive fullscreen MainActivity (the game is a full-screen canvas)
const pkgPath=path.join(APP,'src/main/java/games/squatchsquad/neondefense');
fs.mkdirSync(pkgPath,{recursive:true});
wr(path.join(pkgPath,'MainActivity.java'),`package games.squatchsquad.neondefense;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
`);
// remove the template MainActivity if Capacitor generated one in a different folder
for(const f of walk(path.join(APP,'src/main/java'))) if(f.endsWith('MainActivity.java')&&!f.startsWith(pkgPath)) fs.rmSync(f);
function* walk(d){ if(!fs.existsSync(d)) return; for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) yield* walk(p); else yield p; } }

// 5. Icons: adaptive launcher (black background), legacy launcher, notification icon
const res=path.join(APP,'src/main/res'); fs.cpSync(path.join(HERE,'res'),res,{recursive:true});
for(const f of walk(res)) if(/ic_launcher(_round|_foreground)?\.webp$/.test(f)) fs.rmSync(f);   // template webp icons would shadow the PNGs
const bg=path.join(res,'values/ic_launcher_background.xml');
wr(bg,'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n');
console.log('setup-android: versionCode',code,'versionName',name,'targetSdk 36, portrait, immersive, icons applied');
