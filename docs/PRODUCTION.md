# Testing and production branches

| | `testing` | `production` |
|---|---|---|
| Purpose | Every change lands here first | Only changes that passed testing |
| Serves | The website, neon.squatchsquad.games (GitHub Pages) | App store builds only (Google Play .aab) |
| How changes arrive | Direct commits | Pull request from `testing`, nothing pushed straight in |

The Play bundle is built by `.github/workflows/play-build.yml` on every push to `production`
(`node build.mjs play`, then Capacitor). Signing secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.
