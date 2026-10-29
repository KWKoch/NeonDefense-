# Ads setup (H5 Games Ads via AdSense)

Ads are **off** until `ADS_CLIENT_ID` in `ads.js` is set. With it empty, nothing is loaded and the game is unchanged
(the "Watch ad" button grants energy directly, as before).

## Go-live steps
1. Create an AdSense account: https://adsense.google.com/start/ (must be 18+; payment/tax info; Google may ask for ID verification).
   Before applying, add a privacy policy page (ad cookie disclosure) and, for EEA/UK/CH traffic, a Google-certified consent banner (CMP).
2. Add your site in AdSense: `squatchsquad.games` (the studio site on the apex). The game runs on the subdomain `neon.squatchsquad.games`,
   which `ads.txt` at the root domain covers. Review typically takes days to a few weeks. https://support.google.com/adsense/answer/12131223
3. Apply for H5 Games Ads (by-application): https://support.google.com/adsense/answer/1705831
4. Put your publisher ID in `ads.js`: `ADS_CLIENT_ID='ca-pub-XXXXXXXXXXXXXXXX'`. To preview with fake ads set
   `ADS_TEST_MODE=true` (adds `data-adbreak-test="on"`) or open the game with `?adtest=on`; set it back to `false` before release.
5. ads.txt lives at the root of `squatchsquad.games` (see the studio site repo, `ads.txt`):
   `google.com, pub-4954431316761739, DIRECT, f08c47fec0942fa0` (confirm the exact line in AdSense -> Sites -> ads.txt).
   https://support.google.com/adsense/answer/12171612

## Hosting
- Game: this repo, GitHub Pages custom domain `neon.squatchsquad.games` (DNS: CNAME `neon` -> `kwkoch.github.io`). Add the domain to Firebase Authentication -> Authorized domains.
- Studio site (About, privacy policy, ads.txt): separate repo on the apex `squatchsquad.games`.

## Placements
- `reward` (`energy_refill`): button only appears after the API calls `beforeReward`; +5 energy only on `adViewed`.
- `next` interstitial when leaving a finished level (Next / Retry / Home), at most every 2nd level end, `data-ad-frequency-hint="120s"`.
- Game loop and audio pause in `beforeAd`, resume in `afterAd`. If the ad script fails to load, the game is unaffected.

API docs: https://developers.google.com/ad-placement/apis · tag params: https://support.google.com/adsense/answer/9955214
