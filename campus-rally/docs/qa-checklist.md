# Manual QA checklist

Run on at least one small phone (≈ iPhone SE / 360×640 Android) and one large phone (≈ 6.7"). Mark each ✅/❌ with device + OS + build.

## 1. First launch and onboarding

- [ ] Fresh install: native splash shows the Campus Rally mark, then onboarding appears within ~1 s (no artificial wait).
- [ ] Three slides: "Match tokens. Build momentum." → "Clear objectives. Earn stars." → "Choose your fan identity."
- [ ] Continue advances; the step indicator is announced ("Step 2 of 3").
- [ ] Skip jumps straight to campus selection.
- [ ] Force-quit after finishing onboarding → relaunch does not show onboarding again.

## 2. Campus selection persistence

- [ ] Five fictional campuses listed; the "cosmetic only, change anytime" note is visible.
- [ ] Selecting a card marks it "Selected" (screen reader: radio, checked).
- [ ] Confirm opens the trail; header shows the chosen emblem, name and rally cry.
- [ ] Settings → Change → pick another → back; trail reflects it. Survives relaunch.

## 3. Level locking / unlocking

- [ ] New player: only Level 1 is enabled; locked nodes show a padlock and are announced "locked" with an unlock hint.
- [ ] Winning Level N unlocks Level N+1 and shows its stars on the trail.
- [ ] Losing never removes stars or unlocks.
- [ ] Replaying keeps the best stars/score.

## 4. Gameplay on small and large phones

- [ ] Board is square, fully visible, not clipped by notch/home indicator; HUD and booster tray fit without overlap.
- [ ] Swipe and tap-tap swaps both work; drag threshold feels natural.
- [ ] Matches clear, tokens fall, refills arrive, cascades show a callout ("Rally On!", "Momentum!", …).
- [ ] Match-4 creates a striped Line Rally (Level 5+); T/L creates a Campus Burst (Level 9+); match-5 creates a Color Rally (Level 8+).
- [ ] Penalty Blocks break from adjacent matches; double blocks show 2 pips then 1.
- [ ] Locked Tokens can't be swapped (nudge + warning sound) and unlock when matched.
- [ ] Tray booster: tap → banner "Tap a token to aim" → tap token → effect; tap booster again cancels; boosters don't use a move.
- [ ] Moves turn red-outlined at ≤ 3.
- [ ] Win: star reveal, score incl. Rally Bonus, objectives, unlock/badges; Next Level / Replay / Championship Trail work.
- [ ] Loss: supportive copy, progress per objective, Try Again / Championship Trail. No purchase or ad prompts anywhere.

## 5. Invalid swap behavior

- [ ] Adjacent swap with no match animates out and back; moves unchanged.
- [ ] Non-adjacent/diagonal drag does nothing harmful (only the first neighbor in the drag direction is considered).
- [ ] Swapping into a Penalty Block or a Locked Token is rejected.

## 6. Pause / resume

- [ ] Pause button opens the menu; board animations and hint timers freeze.
- [ ] Resume continues mid-cascade correctly.
- [ ] Restart gives a fresh board, full moves, and counts a new attempt.
- [ ] Settings from the pause menu → change Reduce Motion/High Contrast → back: game is still paused and reflects the change.
- [ ] Android hardware back opens the pause menu instead of leaving.

## 7. Sound, haptics, reduce motion

- [ ] SFX on: swap/match/cascade/special/booster/win/lose sounds play; off: silent.
- [ ] Music on: soft loop plays in foreground, pauses in background; off: silent. iOS silent switch mutes audio.
- [ ] Haptics on: light taps on matches, success on win (supported devices only); off: none.
- [ ] Reduce Motion: shorter animations, no bounces, sparks, block shakes, or pulsing hint; stars appear without animation; screen transitions are instant.

## 8. App background / foreground

- [ ] Background the app mid-level → returns to an open pause menu; no moves lost.
- [ ] Background during a cascade → resume completes it.
- [ ] Lock/unlock the device → same.
- [ ] (Android) If the WebView process is killed by the OS, the board reloads and the level restarts without crashing the app.

## 9. Local save persistence after restart

- [ ] Win a level → force-quit immediately on the win screen → relaunch: stars, unlock and best score are retained.
- [ ] Settings toggles persist across relaunch.
- [ ] Daily Practice: completing it shows streak 1; next calendar day continues the streak; skipping a day resets the visible streak.

## 10. Reset data confirmation

- [ ] Settings → Reset prototype data → dialog explains consequences; Cancel keeps data.
- [ ] Confirm erases everything and returns to onboarding; relaunch still shows onboarding.

## 11. Accessibility labels and contrast

- [ ] VoiceOver/TalkBack: every button has a label; toggles report on/off; trail nodes announce level, title, status and stars; HUD announces moves/score; objective completion is announced.
- [ ] Largest system text size: text grows (capped), nothing overlaps or truncates critical info.
- [ ] High Contrast mode: black background, white text, yellow accents; tokens get white outlines.
- [ ] No information is conveyed by color alone (shapes, pips, padlocks, checkmarks, text).
- [ ] No flashing content (> 3 flashes/s).

## 12. Platform smoke tests

### iOS (Expo Go or dev build, iOS 15.1+)

1. `npm install && npx expo start`, press `i` (simulator) or scan the QR code.
2. Complete onboarding → pick a campus → play Level 1 to a win.
3. Background/foreground mid-level; verify pause.
4. Toggle every setting; relaunch; verify persistence.
5. Check notch/home-indicator safe areas on a Face ID device and on an SE-size device.

### Android (Expo Go or dev build, Android 8+ with up-to-date System WebView)

1. `npx expo start`, press `a` or scan the QR code.
2. Same flow as iOS, plus hardware back button on every screen (game → pause menu).
3. Test gesture navigation and 3-button navigation bars for safe-area overlap.
4. Test a low-end device for animation smoothness (target 60 fps, acceptable ≥ 45).
