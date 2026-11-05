# Phone check

**iPhone runs are paused** (Nov 5 2026). Only the Pixel 7 runs. To bring the iPhones back, set `IPHONE_TESTS: 'on'` at the top of `.github/workflows/phone-check.yml` (or run locally with `IPHONE_TESTS=on` or `--iphone`).

Plays the opening of Level 1 on three emulated phones and checks the basics before a build goes out.

| Device | Browser engine | Screen |
|---|---|---|
| iPhone 15, installed app | WebKit (Safari's engine) | 393×852, notch and home bar simulated |
| iPhone SE (3rd gen), Safari | WebKit | 375×553, smallest common screen |
| Pixel 7, Chrome | Chromium | 412×839 |

Each run checks: build number, gets past the sign-in wall without an account, Begin and Battle taps work, Level 1 starts, the first tip freezes the field (clock and mobs don't move), tips close with taps and the battle resumes, Pause works, buttons and tip cards stay clear of the notch, home bar and screen edges, no sideways scrolling, no script errors. It also logs load time and an emulated frame rate. Screenshots of each step go to `tests/phone/out/<device>/`.

## Run it

Automatically: every push to `testing` runs it on GitHub (Actions, "Phone check"). Screenshots are under the run's **phone-screenshots** artifact.
By hand on GitHub: Actions → Phone check → Run workflow, pick `local` (this commit) or `live` (the website).

On a computer:

```
cd tests/phone
npm install
npm run setup        # downloads the test browsers once
npm run check        # tests this folder's game files on a local server
npm run check:live   # tests https://neon.squatchsquad.games/
```

From a Claude session that can't download browsers or artifacts: `gh workflow run phone-check.yml -R KWKoch/neondefense- --ref testing -f target=local -f log_shots=true`, then `gh run view <id> --log`. Lines starting `SHOT <device>/<step>` carry a small base64 JPEG of each step.

`node phone-check.mjs --only=pixel-7` runs one device. Exit code 1 means a check failed; the failures are listed at the end.

## How it gets past sign-in

The test browser blocks Firebase, so `cloud.js` takes its existing offline path for returning players and the game runs on a local save. No account is used and nothing reaches Firestore. Ad scripts are blocked too, so test runs never request real ads. Nothing in the game was changed for this.

Tips are normally hidden from automated browsers (`coachOn()` in `index.html`); the test sets the game's own `window.__forceTeach` switch so they show.

## What it can't catch

It copies a phone's screen size, touch input and browser engine, not the phone. Real Safari quirks, real GPU speed, heat and battery, the installed app's own wrapper, sign-in itself and cloud saves still need a real phone.
