# Phone check

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

`node phone-check.mjs --only=pixel-7` runs one device. Exit code 1 means a check failed; the failures are listed at the end.

## How it gets past sign-in

The test browser blocks Firebase, so `cloud.js` takes its existing offline path for returning players and the game runs on a local save. No account is used and nothing reaches Firestore. Ad scripts are blocked too, so test runs never request real ads. Nothing in the game was changed for this.

## What it can't catch

It copies a phone's screen size, touch input and browser engine, not the phone. Real Safari quirks, real GPU speed, heat and battery, the installed app's own wrapper, sign-in itself and cloud saves still need a real phone.
