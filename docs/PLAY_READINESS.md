# Neon Defense: Play readiness review (play 01, built on web build 96)

How this was checked: the game was loaded in a phone-sized browser (390x760 and 360x640), level 1 was played start to finish by an
idle bot (turret AI only, first card offered each pick), levels 3, 6, 10 and 15 were run at 3x speed, and the new Play bundle is
covered by `tests/play_browser.py` (23 checks). Nothing here was measured on a real phone. The 60 fps reading was a software-rendered
test browser, not a device.

## The loops

| Loop | What happens | Measured |
|---|---|---|
| Core (one level) | 20 waves, a card pick after each wave, boss on every 10th level (30 waves), mega boss on level 50 (40 waves) | Level 1: 5 min 34 s at 1x, 19 card picks. At 3x about 2 min |
| Session | Energy: 50 max, 5 per level, 10 per elite level, +1 per 96 s | A level takes longer than the energy it costs to regain, so a long session is not energy-blocked. A short, many-times-a-day player is |
| Meta | Gems, crystals (forged from shards), fusing 4 into the next rarity, commanders, achievements, stars | Not play-tested beyond level 1 for this review |
| Return | Daily chest (8 gems + 3 crystals), free gems, stars, achievements | Nothing tied to *specific* return days before the Founder's Path |

## Weaknesses found, and what play 01 does about them

| # | Weakness | Severity | Status in play 01 |
|---|---|---|---|
| 1 | Daily chest, Double rewards, Revive, card Reroll and the energy button all waited for an ad. With no ad provider they showed "Loading ad..." then "No ad is ready" and never paid out | High | Fixed: with no ad provider the reward is granted at once. Extra rerolls capped at 2 per run so the card choice still matters. "(watch ad)" wording hidden when there are no ads |
| 2 | The main build has a Google sign-in gate, AdSense ads and an auto-reload updater. None work inside an Android app. The no-login portal build script had also been broken since build 96 (it could not strip the new updater script) | High | Fixed: build.mjs repaired, new `play` target with no sign-in, no ads, no updater, no PWA tags, fonts bundled, saves on the device |
| 3 | Gem bundles said "Coming soon", the Neon Pass text talks about removing ads, and Worlds 2 to 5 (never play-tested) were reachable after 100 stars | Medium | Fixed: hidden / locked as "Coming in an update" in the Play edition |
| 4 | No way for a tester to send feedback, no Android back-button handling | Medium | Fixed: Settings has Send feedback and Privacy policy; back button pauses a run, closes menus, then minimizes |
| 5 | Only a daily chest to come back for. No goal tied to day 3, 7 or 12 | High for the 14-day test | Added: Founder's Path (below) |
| 6 | Game speed (1x/2x/3x) lasted only until the app was closed, and most players never find the button | Low | Fixed: remembered between launches. Still easy to miss, see open items |

## Founder's Path (retention rewards)

**Removed Nov 2026.** The store version now uses the tester welcome package and the Season pass instead. Kept here as a record.

Calendar days since first launch, install day = day 1. Nothing costs money or needs an ad.

| Day | Reward | Why it shortens the game |
|---|---|---|
| 1 to 14 | Founder Boost: energy refills 2x as fast, every win pays +50% gems | Less waiting, faster upgrades |
| 3 | Day 3 Cache: full energy, 15 gems, 6 rare crystals | A full session on demand |
| 7 | Day 7 Vault: full energy, 30 gems, 8 rare crystals | Skips a stretch of grinding |
| 12 | Founder Seal: full energy, 50 gems, 6 epic crystals, energy refills 25% faster permanently | A reason to stay past the test, and a reward that outlives it |
| 14 | Day 14 Finish: full energy, 40 gems, 5 epic crystals | A reason to open the game on the last day of the test |

A claimable reward shows as a dot on the Shop button and a toast on launch. On the phone app, an optional "Remind me" button
schedules a local notification at 6 pm on each reward day (asks Android for permission only when tapped).
For reference: Spark Pack costs 40 gems, Surge Pack 150, Supernova 450. These reward sizes are first guesses, not tuned numbers.
Milestone days are data (`FOUNDER.steps` in index.html), so moving or adding a day (for example day 14) is a one-line change.

## Open items that need a decision or real players

1. **Level length.** Done: levels 1 to 5 are now 15 waves (about 4 minutes). Needs tester feedback on whether the steeper ramp is fair.
2. **Early difficulty.** The idle bot with no upgrades won level 3 (base 99/100) but lost by wave 4 on levels 6, 10 and 15. Real players will have upgrades, so this is a prompt to have 3 to 5 people play levels 4 to 8 and watch where they quit.
3. **Card pick every wave** (19 pauses in level 1). It is the heart of the game, but fatiguing early. Option: pick every second wave in levels 1 to 5.
4. **Speed button is easy to miss.** Done: a one-time tip points at it after level 2.
5. **UI abbreviations.** Done: the commander ability dial shows a bolt icon instead of "RDY".
6. **Saves live on the phone.** Uninstalling loses them. Android auto-backup may restore them on a new phone (not tested). Real cloud saves (Play Games Services) come after production access.
7. **No analytics.** You cannot see which level players quit on. For the test, rely on feedback email and Play Console's own numbers.
8. **Real-device performance** is unmeasured. Play's pre-launch report (runs automatically after the first upload) and Android vitals will show crashes and slow frames.
9. **Loss rules.** Not verified: whether energy is refunded on a loss.

## Not in play 01 on purpose

AdMob ads, Play Billing (real-money gems and Neon Pass), Play Games cloud saves, Worlds 2 to 5. Each comes after production access.
