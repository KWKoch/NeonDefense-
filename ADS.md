# Ads setup (H5 Games Ads via AdSense)

Ads are **off** until `ADS_CLIENT_ID` in `ads.js` is set. With it empty, nothing is loaded and the game is unchanged
(the "Watch ad" button grants energy directly, as before).

## Go-live steps
1. Create an AdSense account: https://adsense.google.com/start/ (must be 18+; payment/tax info; Google may ask for ID verification).
   Before applying, add a privacy policy page (ad cookie disclosure) and, for EEA/UK/CH traffic, a Google-certified consent banner (CMP).
2. Add your site in AdSense. AdSense sites must be a top-level domain or subdomain; `kwkoch.github.io` is the site,
   so `ads.txt` must be served from `https://kwkoch.github.io/ads.txt` (see below). `github.io` is a public-suffix domain, so a `kwkoch.github.io` site is allowed. Ownership is verified by ad code,
   ads.txt or meta tag; review typically takes days to a few weeks. https://support.google.com/adsense/answer/12131223
3. Apply for H5 Games Ads (by-application): https://support.google.com/adsense/answer/1705831
4. Put your publisher ID in `ads.js`: `ADS_CLIENT_ID='ca-pub-XXXXXXXXXXXXXXXX'`. To preview with fake ads set
   `ADS_TEST_MODE=true` (adds `data-adbreak-test="on"`); set it back to `false` before release.
5. ads.txt: GitHub Pages serves this project at `kwkoch.github.io/NeonDefense-/`, but crawlers only read
   `https://kwkoch.github.io/ads.txt`. Create a repo named **KWKoch.github.io** (user site) containing a file `ads.txt`:
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` (exact line shown in AdSense → Sites → ads.txt).
   Creating the user-site repo does not affect `/NeonDefense-/`. With a custom domain, put `ads.txt` at that domain root instead.
   https://support.google.com/adsense/answer/12171612

## Placements
- `reward` (`energy_refill`): button only appears after the API calls `beforeReward`; +5 energy only on `adViewed`.
- `next` interstitial when leaving a finished level (Next / Retry / Home), at most every 2nd level end, `data-ad-frequency-hint="120s"`.
- Game loop and audio pause in `beforeAd`, resume in `afterAd`. If the ad script fails to load, the game is unaffected.

API docs: https://developers.google.com/ad-placement/apis · tag params: https://support.google.com/adsense/answer/9955214
