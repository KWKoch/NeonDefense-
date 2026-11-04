# Test repo vs production repo

| | KWKoch/NeonDefense- (this repo) | KWKoch/NeonDefense-Production |
|---|---|---|
| Purpose | Build, change and test | Only releases that passed testing |
| Branches | `play/01`, `main` (live website) | one branch, plus a tag per release |
| Builds | every push to `play/**` makes a test .aab | only a pushed tag `v*` makes a release .aab |
| versionCode | run number (1, 2, 3...) | 10000 + run number, so it always beats test uploads |

## One-time setup (the session cannot create repos, so you do this)
1. GitHub > New repository > name `NeonDefense-Production`, Private, no README. Tell me when it exists and I will attach it.
2. In that repo add the same 4 secrets as the test repo (ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD).

## Releasing a tested build
1. Test in the test repo (Play closed test, testers, tests green).
2. `git clone https://github.com/KWKoch/NeonDefense-Production ../prod` (once).
3. `tools/promote.sh play/01 ../prod v1.0.0` copies that exact commit over, commits and tags it.
4. Look at it, then `git -C ../prod push origin HEAD v1.0.0`. The tag starts "Production release (Play)", which makes the signed .aab.
5. Upload the .aab to the Play production track.

Play itself keeps one app: the closed test and production are tracks of the same app, so a bundle that passed the closed test can also be promoted inside Play Console without rebuilding. The production repo is the source-code record of exactly what shipped.
