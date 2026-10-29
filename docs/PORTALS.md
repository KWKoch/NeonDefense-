# Neon Defense on HTML5 portals

Non-exclusive distribution. Keith keeps all rights for his own Google Play / iOS builds.
Always pick the **non-exclusive** option where a portal offers one, and read each portal's agreement before accepting.

## Builds

```
node build.mjs all            # or: node build.mjs crazygames | y8 | gamepix | kongregate | none | site
```
Output: `dist/<target>/` and `dist/neon-defense-<target>.zip` (index.html at zip root, about 106 KB each).

| Target | Ads provider | Login / cloud | Notes |
|---|---|---|---|
| `site` | Google H5 Games Ads (`ads.js`) | Google sign-in gate + Firestore | Same as the GitHub Pages root (neon.squatchsquad.games). Pages keeps serving the repo root. |
| `crazygames` | CrazyGames SDK v3 | none (saves via SDK data module, falls back to localStorage) | midgame only on Next/Retry, not Home (CrazyGames forbids ads on navigation buttons) |
| `y8` | Y8 SDK `showAd` | none | needs `Y8_APP_ID` / `Y8_GAME_ID` in `portal/y8.js`; empty = no SDK, no ads |
| `gamepix` | GamePix SDK v3 (manual lifecycle) | none (localStorage, synced by SDK) | interstitial on Next/Retry/Home |
| `kongregate` | Kongregate API incentivized ads only | none | no in-game interstitials (Kongregate forbids third-party ads; they monetize around the game) |
| `none` | none | none | plain build, timed energy regen only |

All portal builds have no Firebase, no sign-in, no service worker, no manifest, no AdSense, and no external links. Fonts are bundled
(Chakra Petch and Monoton, SIL Open Font License). Saves are localStorage wrapped in try/catch, so private browsing is safe.
Energy: 50 max, +1 every 96 s (about 8 min per 5-energy attempt); rewarded ad = +5 where available.
Ads: interstitials only when leaving a finished level (win/lose screen), never mid-wave, never on first load. Rewarded ads are opt-in
and the reward is granted only on completion. The game loop pauses and audio mutes while an ad shows.

Ad interface (`ads.js` / `portal/ads-core.js`): `interstitial(name, done)`, `prepareReward()`, `rewardAvailable()`,
`showReward(onGranted)`, `gameplayStart()`, `gameplayStop()`, `loadingDone()`, `boot(main)`.

---

## CrazyGames (Basic Launch)
- Developer account: https://developer.crazygames.com/ (Developer Portal → Submit a game)
- Requirements: https://docs.crazygames.com/requirements/intro/. In **Basic Launch** the SDK is optional and **ads/monetization are disabled**.
  Revenue starts only if the game is promoted to Full Launch (decided from Basic Launch KPIs: 7+ days and 500+ plays, or 21 days).
  https://docs.crazygames.com/resources/basic-launch-metrics/
- Upload `neon-defense-crazygames.zip`. Limits: 50 MB initial, 250 MB total, 1500 files (https://docs.crazygames.com/requirements/technical/).
- QA: use the Developer Portal preview / QA tool (https://docs.crazygames.com/requirements/intro/#quality-assurance-tool). The SDK has
  local test behaviour outside crazygames.com; see https://docs.crazygames.com/sdk/intro/.
- Metadata: title, description, controls, category/tags, PEGI-12 content.
- Covers (mandatory, https://docs.crazygames.com/requirements/game-covers/): **1920×1080**, **800×1200**, **800×800**. Title text only,
  no borders, no "Play" text. Preview videos 15–20 s, no sound, 1080p landscape (16:9) and portrait (2:3).
- SDK docs: ads https://docs.crazygames.com/sdk/video-ads/ · game events https://docs.crazygames.com/sdk/game/ ·
  ad rules https://docs.crazygames.com/requirements/ads/

## Y8
- Account and studio: https://www.y8.com (register) → Studio https://www.y8.com/studios → Developer Portal https://developer.y8.com/
- Upload page: https://static.y8.com/upload (HTML5 zip; "use Y8 Storage" is recommended).
- Monetization: create a studio, contact Y8 support to enable revenue share. After the first approved game, Y8 enables
  **AdSense for Platforms (AFP)**; apply from your studio page; ads earn after Google approves.
- SDK is required for monetization: https://docs.y8.com/sdk/intro/ · ads https://docs.y8.com/sdk/advertising/
  Get the **App ID** and **Game ID** from Developer Portal → your game → SDK Initialization
  (https://docs.y8.com/studio/sdk-initialization/), put them in `portal/y8.js`, then rebuild.
  In draft/review Y8 serves house/test ads automatically.
- Rules: no login except the Y8 account, minimal outlinks, no misleading links or popups.
- Metadata: title, description, controls/instructions, mobile-friendly orientation (portrait), dimensions, thumbnail.

## GamePix
- Developer account: https://partners.gamepix.com/developers (non-exclusive, 50% net revenue share). The dashboard is my.gamepix.com.
- Upload `neon-defense-gamepix.zip`. Test with the GamePix testkit in the dashboard.
- Guidelines: https://partners.gamepix.com/guidelines/submission. No external links, ads, analytics or third-party SDKs; must fit a
  640×480 iframe; loading screen; audio paused during ads; no quit button.
  "Allow Distribution" = also distributed to GamePix partners (still non-exclusive to you).
- SDK: https://partners.gamepix.com/sdk/doc/javascript
- Metadata: title, description (theme, mission, how to play), category, icon and cover images (sizes shown in the dashboard form).

## Kongregate
- Become a registered developer: https://blog.kongregate.com/hc/en-us/articles/44205164389005 (Kongregate account; choose your
  username carefully, it is the publisher name). Upload via Developer Portal: HTML5/WebGL, index.html or a zip with index.html at root.
  https://blog.kongregate.com/hc/en-us/articles/44404778564109
- **No third-party ads, no external accounts, no external payments.** Kongregate shows ads around the game and shares revenue.
  Incentivized (rewarded) ads need Kongregate to enable them for the game (email apps@kongregate.com):
  https://www.kongregate.com/en/pages/kongregate-apis. Until then the "Watch ad" button just doesn't appear.
- The Kongregate API only works on kongregate.com (test on the Preview page in the Developer Portal).
- Read the Game License & Upload Agreement before accepting: https://blog.kongregate.com/hc/en-us/articles/44438112016397
- Frame: keep within 1100×700 (hard max 1150×750); portrait min width 620 px. Suggest 640×860 with "scale to fit".
- Metadata: title, description, instructions, category, thumbnail/screenshots.

---

## What Keith must do himself
- Create the accounts (CrazyGames, Y8 + studio, GamePix, Kongregate). Accept the agreements. Enter tax forms (W-9) and payment details.
- Y8: copy the App ID / Game ID into `portal/y8.js`, then run `node build.mjs y8`. Contact Y8 support for revenue share, then apply for AFP.
- Kongregate: optionally email apps@kongregate.com to enable incentivized ads.
- Upload each zip, fill in the metadata, and submit.

## Assets to prepare
- Covers: 1920×1080, 800×1200, 800×800 (CrazyGames; reuse or crop for the others). Icon 512×512 (have `icon-512.png`).
- Screenshots of real gameplay (several, landscape and portrait).
- 15–20 s gameplay videos (CrazyGames: landscape 16:9 and portrait 2:3, no sound).
- Short and long description, controls text, category (Strategy / Tower Defense), tags.
