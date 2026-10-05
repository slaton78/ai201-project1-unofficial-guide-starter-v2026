# Manual QA checklist

Run on at least one small phone (≈ iPhone SE / 360×640 Android) and one large phone (≈ 6.7").
Record device, OS, build and ✅/❌ for each item. Sections marked _(later phase)_ cannot be tested
until that phase ships.

## 1. First launch and onboarding

- [ ] Fresh install: native splash shows the Campus Rally mark, then onboarding appears within ~1 s.
- [ ] Three slides in order: "Match tokens. Build momentum." → "Clear objectives. Earn stars." → "Choose your fan identity."
- [ ] Continue advances; the step indicator is announced ("Step 2 of 3"). Last button reads "Choose my campus".
- [ ] Skip jumps straight to campus selection.
- [ ] Force-quit after onboarding → relaunch does not show onboarding again.

## 2. Campus selection persistence

- [ ] Five fictional campuses; the "Cosmetic only … change it anytime in Settings" note is visible.
- [ ] Tapping a card marks it "Selected"; screen reader announces it as a radio button, checked.
- [ ] Confirm ("Join the …") opens the trail; header shows the emblem, campus name and star total.
- [ ] Settings → Change → choose another → returns to Settings; trail header updates.
- [ ] Force-quit and relaunch → the chosen campus is kept and the app opens on the trail.

## 3. Championship Trail and level locking

- [ ] Ten stops; only Level 1 is enabled and marked "Up next".
- [ ] Locked stops show a padlock, cannot be pressed, and are announced as "locked" with an unlock hint.
- [ ] Daily Challenge card shows "Coming Soon" and is not interactive.
- [ ] Level 1 opens the placeholder screen; Back returns to the trail.
- [ ] Trail fits narrow screens: no horizontal scrolling, labels not clipped.
- [ ] _(later phase)_ Winning a level unlocks the next and shows stars.

## 4. Layout on small and large phones

- [ ] No content under the notch, Dynamic Island, status bar, or home indicator on every screen.
- [ ] Android: gesture navigation and 3-button navigation do not overlap buttons.
- [ ] Primary buttons stay reachable with one thumb.

## 5. Settings

- [ ] Five toggles (Music, Sound effects, Haptic feedback, Reduce motion, High contrast) each flip and persist across relaunch.
- [ ] High contrast switches every screen to black/white/yellow immediately.
- [ ] Reduce motion removes screen transition animations immediately.
- [ ] Privacy note and "Campus Rally v0.1.0 · prototype build · <platform>" are shown.
- [ ] _(later phase)_ Music/SFX/haptics actually affect sound and vibration.

## 6. Reset data confirmation

- [ ] Reset prototype data opens a dialog explaining what is erased; Cancel keeps everything.
- [ ] Confirm returns to onboarding with defaults; Back cannot return to the old trail.
- [ ] Relaunch after reset still shows onboarding.

## 7. App background / foreground and persistence

- [ ] Background and foreground on each screen: state unchanged, no crash.
- [ ] Toggle a setting, immediately force-quit, relaunch: the change is kept.
- [ ] _(later phase)_ Gameplay pauses on background.

## 8. Accessibility labels and contrast

- [ ] VoiceOver / TalkBack: every control has a meaningful label; decorative art is skipped.
- [ ] Largest system text size: text grows, nothing overlaps or hides a primary action.
- [ ] High contrast mode readable everywhere; no meaning conveyed by color alone (padlocks, "Selected", "Up next", star counts in text).
- [ ] No flashing content.

## 9. Platform smoke tests

### iOS (Expo Go or simulator, iOS 15.1+)

1. `npm install && npx expo start`, press `i` or scan the QR code with the Camera app.
2. Complete sections 1–3 and 5–6.
3. Repeat on a notched device and an SE-size device.

### Android (Expo Go or emulator)

1. `npx expo start`, press `a` or scan the QR code in Expo Go.
2. Complete sections 1–3 and 5–6.
3. Press the hardware/gesture back on every screen: onboarding and trail exit the app as expected; other screens go back one step.

## Later-phase checks (not testable yet)

Gameplay on varied layouts, invalid swap revert, pause/resume of the board, sound/haptics/reduce-motion during play, win/loss screens, and level unlock after a win are added to this checklist with Phases B–D.
