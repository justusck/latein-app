---
name: Latīna
description: Offline-first classical-Latin learning app — antique palette, modern app discipline.
colors:
  terracotta: "#B23A2E"
  terracotta-deep: "#8E2C22"
  terracotta-night: "#D2553F"
  imperial-purple: "#5B2A86"
  imperial-purple-soft: "#8E6FB0"
  gold: "#C9A227"
  gold-soft: "#E4C766"
  scholar-green: "#3F8F5B"
  scholar-green-soft: "#5FB07C"
  danger-red: "#C0392B"
  danger-red-night: "#E05B4C"
  parchment: "#F7F1E1"
  parchment-deep: "#EFE6CE"
  surface-light: "#FFFFFF"
  border-light: "#E2D7BD"
  ink: "#2B2218"
  ink-soft: "#6B6052"
  night-bg: "#15120D"
  night-elev: "#211C15"
  night-elev-2: "#2C261C"
  border-night: "#3A3225"
  night-text: "#F3EAD7"
  night-text-soft: "#B6AB94"
typography:
  wordmark:
    fontFamily: "system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 900
    letterSpacing: "6px"
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1.0
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
  serif:
    fontFamily: "Georgia, Times New Roman, serif"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
  pill: "999px"
spacing:
  half: "2px"
  one: "4px"
  two: "8px"
  three: "16px"
  four: "24px"
  five: "32px"
  six: "64px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.parchment-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-success:
    backgroundColor: "{colors.scholar-green}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.pill}"
  button-danger:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-accent:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  progress-bar:
    backgroundColor: "{colors.terracotta}"
    rounded: "{rounded.pill}"
    height: "10px"
  pill-badge:
    backgroundColor: "{colors.parchment-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "5px 8px"
---

# Design System: Latīna

## 1. Overview

**Creative North Star: "The Modern Classicist"**

Latīna wears an antique palette over a modern app's discipline. The colors are
Roman — terracotta brick, imperial purple, leaf gold, parchment and ink — but the
mechanics underneath are contemporary and unsurprising: pill buttons with haptic
press feedback, hairline-bordered cards, a fixed type scale, light and dark themes
that respect the system setting. The classical surface signals what the app is
about (reading real Latin, by an evidence-based method); the modern bones make it
fast to use on a phone in spare minutes. Old soul, current craft.

This system is built to *serve the task*, not to perform. A learner opens a tab,
sees one obvious next action (start studying, drill this paradigm, ask, read), and
gets into it. Gamification — XP, level, rank, streak, coins — lives in a single
compact header strip and a progress bar, acknowledged plainly and then gotten out
of the way. The Latin wordmark `LATĪNA` (heavy, wide-tracked) is the one ceremonial
flourish; everything else is quiet by comparison.

It explicitly rejects four things. It is **not cartoony Duolingo**: no mascots,
confetti storms, or bouncy juvenile illustration. It is **not a generic SaaS
dashboard**: no cold blue/gray, no hero-metric template, no Inter-everything
corporate sheen. It is **not a dusty academic PDF**: scholarship without gray walls
of unstyled text. And it is **not a flashy crypto/AI app**: no neon gradients,
decorative glassmorphism, or dark-mode-hype theatrics.

**Key Characteristics:**
- Antique Roman palette (terracotta / purple / gold) on parchment or warm-night surfaces.
- A single heavy system sans across the whole UI; Georgia serif reserved for classical/Latin text.
- Pill-shaped buttons, hairline-bordered cards, full-pill progress tracks.
- Restrained gamification: one stats strip, never a scoreboard.
- Light and dark themes of equal weight, both warm-toned (parchment ↔ candle-lit night).

## 2. Colors

A warm, earthen Roman palette: brick and ink on parchment by day, the same hues
banked down to a candle-lit night. No cool blues, no neutral gray.

### Primary
- **Terracotta** (`#B23A2E`; night `#D2553F`): The brand action color. Primary buttons, active tab, accent card borders, the streak flame, current selection. The single voice for "do this / you are here."
- **Terracotta Deep** (`#8E2C22`): Pressed/active depth of the primary action.

### Secondary
- **Imperial Purple** (`#5B2A86`; soft `#8E6FB0` at night): Rank and level identity — the gamification accent. The rank medallion in the stats header and the "new words today" metric. Signals achievement, not action.

### Tertiary
- **Gold** (`#C9A227`; soft `#E4C766` at night): Reward and XP. The XP progress bar and the coins pill. Used sparingly; gold is for earned value.
- **Scholar Green** (`#3F8F5B`; soft `#5FB07C` at night): Mastery and correctness. "Gefestigt" (consolidated) counts, completed portions, success buttons, "correct" feedback.
- **Danger Red** (`#C0392B`; night `#E05B4C`): Errors, destructive actions, "wrong" feedback. Distinct in hue from terracotta so action ≠ error.

### Neutral
- **Parchment** (`#F7F1E1`): The light-theme page background. Warm paper, never white.
- **Parchment Deep** (`#EFE6CE`): Muted fills — secondary buttons, pill badges, selected rows, progress-track ground.
- **Surface (White)** (`#FFFFFF`): Card and elevated-element background in light theme. The only true white, used only as a lifted surface against parchment.
- **Border (Light)** (`#E2D7BD`): Hairline card and divider borders on parchment.
- **Ink** (`#2B2218`): Primary text in light theme. Warm near-black, never `#000`.
- **Ink Soft** (`#6B6052`): Secondary text, labels, captions in light theme.
- **Night Background** (`#15120D`): Dark-theme page — warm near-black, candle-lit, not slate.
- **Night Elevated** (`#211C15`) / **Night Elevated 2** (`#2C261C`): Card surface and selected-row fill in dark theme.
- **Border (Night)** (`#3A3225`): Hairline borders in dark theme.
- **Night Text** (`#F3EAD7`) / **Night Text Soft** (`#B6AB94`): Primary and secondary text in dark theme.

### Named Rules
**The One Voice Rule.** Terracotta is the only color that means "act here / you are here." It carries primary buttons, the active tab, and selection — nowhere else. Purple, gold, and green each own exactly one meaning (rank, reward, mastery); never swap them for decoration.

**The No-Gray Rule.** There is no neutral gray anywhere. Every "gray" is a warm tint — parchment, ink-soft, or a banked-down brand hue. A cool `#808080` on any surface is a bug.

**The Hue-Separated State Rule.** Action (terracotta) and error (danger-red) are deliberately different hues. Never signal a destructive action with the primary action color, and never tint an error toward terracotta.

## 3. Typography

**Primary Font:** System sans (`system-ui` → SF Pro on iOS, Roboto on Android, system stack on web).
**Classical Font:** Georgia (serif), reserved for Latin/classical reading text.
**Mono Font:** `ui-monospace` / Menlo, for code-like or fixed-form content.

**Character:** One system sans does all the structural work — headings, labels,
buttons, data — leaning on heavy weights (800–900) for presence rather than a
display face. This keeps the UI native-fast and unsurprising; the "classical" note
comes from the palette and the serif used for actual Latin, not from decorative
headline type.

### Hierarchy
- **Wordmark** (900, 40px, letter-spacing 6px): `LATĪNA` on the boot/splash screen only. The single ceremonial type moment.
- **Display / H1** (900, 30px, line-height ~1.0): Screen titles ("Vokabeln", "Grammatik"). One per screen, top-left.
- **Title / H2** (800, 20px): Section headers within a screen ("Frequenzgruppen").
- **Metric** (900, 28px): Large standalone numbers (due count, new-today) paired with a small label below.
- **Body** (500, 16px, line-height 1.5): Default reading text and instructions. Cap prose at 65–75ch; the app already centers content at a 720px max width.
- **Subtitle** (600, 13px): Explanatory copy under section headers.
- **Label** (600, 12px): Metric captions, pill values, tab labels (700, 11px).

### Named Rules
**The Weight-Not-Face Rule.** Hierarchy comes from weight (500 body → 800 titles → 900 display/metrics) and size, never from a second display typeface. Adding a decorative heading font is forbidden; it reads as costume.

**The Serif-for-Latin Rule.** Georgia serif appears only on classical/Latin reading content, where it earns its place. Never use serif for UI chrome, labels, or buttons.

## 4. Elevation

Near-flat, the way a printed page is flat. Depth comes from **tonal layering and
hairline borders**, not drop shadows. In light theme a white card sits on parchment,
ringed by a warm hairline border (`#E2D7BD`); in dark theme an elevated surface
(`#211C15`) lifts off the night background (`#15120D`) by tone alone. There is no
shadow vocabulary in the system.

State, not rest, is what moves: a pressed card scales to `0.98` with a slight
opacity drop, and primary buttons dim to `0.85` opacity on press alongside a light
haptic tap. Disabled surfaces drop to `~0.5` opacity.

### Named Rules
**The Flat-Paper Rule.** Surfaces are flat at rest; separation is a hairline border or a tonal step, never a shadow. If a card needs a drop shadow to read, the border or background tint is wrong.

**The Accent-Border Rule.** A card can promote itself to "hero / primary action" by switching its hairline to a 1.5px terracotta border (`card-accent`). This is the only sanctioned border-as-emphasis; never use a colored side-stripe.

## 5. Components

### Buttons
- **Shape:** Full pill (`border-radius: 999px`), min-height 50px, padding 14px / 24px. Label is 16px / 700, centered.
- **Primary:** Terracotta fill, white label. The default call to action ("Lernen starten").
- **Secondary:** Parchment-deep fill, ink label. Quieter alternative action.
- **Ghost:** Transparent with a hairline border, terracotta label. Tertiary actions ("Vokabeln importieren").
- **Success / Danger:** Scholar-green / danger-red fill, white label, for confirm and destructive moments.
- **States:** Press dims to `0.85` opacity + light haptic (`Haptics.impactAsync` Light) on native. Loading swaps the label for an `ActivityIndicator` in the label color. Disabled drops to `0.5` opacity and blocks press.

### Cards / Containers
- **Corner Style:** `Radius.lg` (18px).
- **Background:** White (`#FFFFFF`) on parchment in light; night-elevated (`#211C15`) in dark.
- **Border:** Hairline in the theme border color by default; 1.5px terracotta when `accent` (hero/primary container).
- **Elevation:** None — flat per the Flat-Paper Rule.
- **Internal Padding:** `Spacing.three` (16px).
- **Pressable variant:** scales to `0.98` + `0.9` opacity while pressed.

### Progress Bar
- **Track:** Full-pill, muted parchment-deep ground, default height 10px.
- **Fill:** Colored by meaning — terracotta for due/action, purple for the daily-new goal, gold for XP, green for mastery. Clamped 0–1, overflow hidden.

### Pills / Badges
- **Style:** Full-pill, parchment-deep (muted) background, icon + bold value. Used for streak (flame, terracotta icon) and coins (gold icon) in the stats header, and small count badges.
- **Group badge:** 28px circle, success-green when complete else muted, holding a portion number or `★`.

### Navigation
- **Bottom tab bar** (4 tabs: Vokabeln / Grammatik / Anwendung / Lesen): background = theme background, hairline top border, active tint terracotta, inactive tint ink-soft. Labels 11px / 700. Ionicons, filled style.
- **Stack headers:** native, shown for pushed/modal routes (Settings as modal, sessions and lessons as pushed screens), hidden on the tab screens themselves.

### Stats Header (signature component)
A compact gamification strip at the top of every tab: a purple rank medallion with
`Lvl N` and the Latin rank name on the left; streak and coin pills on the right; a
gold XP progress bar with `x/y XP` underneath. It is the *entire* gamification
surface — deliberately one strip, never a scoreboard or a wall of stat cards.

### Screen Frame
Every screen uses `Screen`: safe-area inset, themed background, content centered at
`maxWidth: 720px`, 16px padding, optional scroll. New screens should adopt it rather
than re-implementing safe-area + width.

## 6. Do's and Don'ts

### Do:
- **Do** keep terracotta as the single action/selection color (the One Voice Rule); give purple, gold, and green their one meaning each (rank, reward, mastery).
- **Do** build every "gray" from a warm tint (parchment / ink-soft / banked brand hue). Warm near-black `#2B2218` for text, never `#000`.
- **Do** convey depth with hairline borders and tonal steps; promote a hero container with the 1.5px terracotta `card-accent` border.
- **Do** drive hierarchy with weight (500 → 800 → 900) and the fixed rem-like scale, using one system sans.
- **Do** keep gamification to the single stats strip + a progress bar; acknowledge progress plainly and move on.
- **Do** give every screen one obvious primary action via the `Button` primary variant, and wrap it in `Screen`.
- **Do** keep both light and dark themes warm; dark is candle-lit night (`#15120D`), not slate.
- **Do** reserve Georgia serif for actual Latin/classical text only.

### Don't:
- **Don't** make it **cartoony Duolingo**: no mascots, confetti storms, bouncy blobs, or juvenile illustration.
- **Don't** make it a **generic SaaS dashboard**: no cold blue/gray, no hero-metric template, no Inter-everything corporate look.
- **Don't** make it a **dusty academic PDF**: no dense gray walls of unstyled text.
- **Don't** make it a **flashy crypto/AI app**: no neon gradients, decorative glassmorphism, or dark-mode-hype theatrics.
- **Don't** add a second display/heading typeface; weight contrast carries hierarchy.
- **Don't** use drop shadows for separation (the Flat-Paper Rule), and never a colored `border-left`/side-stripe for emphasis — use the full terracotta accent border.
- **Don't** signal destructive actions with terracotta, or tint errors toward it; danger is its own hue.
- **Don't** use any cool/neutral gray, anywhere.
- **Don't** grow gamification into a scoreboard or a grid of identical stat cards.
