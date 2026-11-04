# Play Console: listing copy, answers and the tester plan (play 01)

## One-time setup (about 15 minutes, needs your computer with Java)
1. Run `play/make-keystore.sh` once. Save `neon-defense-upload.jks` and both passwords in a password manager plus one offline copy.
2. GitHub repo, Settings > Secrets and variables > Actions, add four secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (use `upload`), `ANDROID_KEY_PASSWORD`. The commands to make the base64 value are in the script.
3. Actions tab > "Play build (01)" > Run workflow. When it finishes, download the artifact `neon-defense-play-01-aab`.
4. Play Console > Create app > Free > Game. Package name will be `games.squatchsquad.neondefense` (set by the first upload). Turn on Play App Signing when asked.
5. Testing > Closed testing > create a track, upload the .aab, add testers (email list or a Google Group), send the opt-in link.

## Store listing text
**App name:** Neon Defense
**Short description (80 max):** Neon tower defense: protect the last city with AI turrets and wild upgrades.
**Full description:**
Halcyon was the last light on the Belt. Then the Reavers came for its power. You are RAVE, the Rampart defense mind. Keep the beat going. Keep the city alive.

- Neon-vector tower defense built for one thumb. Your turrets aim themselves. Touch and hold to take a shot yourself.
- 50 levels in the Meteor Belt, with bosses and a mega boss finale. Elite levels for a real challenge.
- Pick a new upgrade card every wave and build a different turret every run.
- Collect crystals, fuse them up, and recruit commanders with their own abilities.
- Early players get the Founder's Path: bonus rewards on days 3, 7 and 12, and faster energy for the first 14 days.
- No account needed. Plays offline.

**Category:** Game > Strategy (or Arcade). **Tags:** tower defense, strategy, neon.
**Contact email:** info.squatch.squad.studio@gmail.com
**Privacy policy URL:** https://kwkoch.github.io/privacy.html (update it first: "The Android game stores progress on your device, collects no personal data, and has no ads in this version." Hosting it on squatchsquad.games is better long term.)

## Images (already made in `store/`)
App icon `play-icon-512.png`, feature graphic `feature-graphic-1024x500.png`, phone screenshots `phone-1` to `phone-6` (1080x1920). Regenerate with `python3 tests/store_assets.py`.

## Form answers for the play 01 build
- **Ads:** No ads in this version. (Change to Yes when AdMob is added.)
- **Data safety:** No data collected, no data shared. Progress is stored on the device only. Notification permission is optional and used for local reminders; nothing leaves the phone.
- **Content rating:** Violence: cartoon/fantasy only (shooting abstract neon ships). No gambling, no user-generated content, no chat, no location, no purchases in this version.
- **Target audience:** 13+ (not a children's app, avoids the Families policy).
- **Government/news/health/financial app:** No.
- **App access:** All functionality available without login.

## Tester plan (12 opted in for 14 days in a row; aim for 20)
Invitation message to send:
> Hi! I'm launching my first game, Neon Defense, on Google Play and I need testers. To count, you must (1) tap this link on your Android phone, (2) accept the test invite, (3) install the game from Google Play, and (4) stay opted in for 14 days. Play a few minutes when you can. There is a free early-player rewards track inside (Shop tab), with prizes on days 3, 7 and 12, so open it on those days. Reply to this email with anything that felt confusing. Please do not leave the test early, it restarts the clock for me. Thank you!

| When | Do this |
|---|---|
| Day 0 | Send the invite to 20 people. Watch Play Console count opted-in testers; the 14 days start when you reach 12 |
| Day 3 | Message: "Your Day 3 Cache is waiting in the Shop tab" |
| Day 7 | Same for the Day 7 Vault. Ask one question: where did you get stuck? |
| Day 12 | Same for the Founder Seal. Ask for a Play Store rating once production is live |
| Day 14+ | Check Production access in Play Console, apply, and answer the questions about what testers said and what you changed |

Keep a short list of who joined, who is active and the feedback received. Google asks about it in the production application.
Updates during the test go through Play review, so batch fixes into one upload instead of many.
