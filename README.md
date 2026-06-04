<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/images/icon.png">
    <img alt="Latīna" src="./assets/images/icon.png" width="96">
  </picture>
</p>

<h1 align="center">Latīna</h1>

<p align="center">
  <b>Offline-first Latin learning app — vocabulary, grammar, reading &amp; AI tutor</b>
</p>

<p align="center">
  <a href="https://github.com/justusck/latein-app/releases/latest"><img alt="Latest Release" src="https://img.shields.io/github/v/release/justusck/latein-app?label=latest&color=208AEF"></a>
  <a href="https://github.com/justusck/latein-app/releases"><img alt="GitHub Downloads" src="https://img.shields.io/github/downloads/justusck/latein-app/total?color=208AEF&label=downloads"></a>
  <a href="https://github.com/justusck/latein-app/commits/main"><img alt="Last Commit" src="https://img.shields.io/github/last-commit/justusck/latein-app?color=208AEF"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-208AEF">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-0BSD-208AEF"></a>
</p>

---

**Latīna** brings the structure and discipline of a university Latin course to your pocket. Master vocabulary through spaced repetition (FSRS), follow a grammar-first skill tree, read Latin texts unlocked by your known vocabulary, and practice with an on-device AI tutor — all while staying completely offline. No server, no account, your API key stays on your device.

[Features](#features) • [Screenshots](#screenshots) • [Downloads](#downloads) • [Getting Started](#getting-started) • [Architecture](#architecture) • [License](#license)

---

## Features

| Feature | Description |
|---|---|
| 📚 **Vocabulary** | ~5 300 Latin–German entries from DCC frequency lists &amp; FreeDict. Learn in frequency-ordered portions (10 new/day default). Multiple-choice for new cards, self-graded recall for reviews. |
| 🏛️ **Grammar** | 18-node skill tree in a grammar-first sequence. Each lesson unlocks the next (≥ 1 star required). Covers cases, tenses, moods, and syntax with interactive exercises. |
| 🤖 **AI Tutor** | Practice through Latin conversation. On-device LLM via **llama.rn** or cloud via **Anthropic API key** (your key, stored in the device keychain). Context-aware: the AI knows which words and grammar you've mastered. |
| 📖 **Reading** | Texts unlock when you know ≥ 90 % of their vocabulary. Tap any word for an instant gloss. Upload your own `.txt` files — they're automatically tokenized and checked against your knowledge. EPUB support included. |
| 🎯 **FSRS Spaced Repetition** | Scientifically-backed scheduling (90 % target retention). `ts-fsrs` drives both vocabulary and grammar reviews — efficient, not guesswork. |
| 🏆 **Gamification** | XP, levels, streaks, and coins. Progress is persisted locally and feeds into stats on your profile page. |
| 🔒 **Offline-First** | Everything runs on-device. SQLite is the source of truth. No cloud sync, no telemetry, no account required. |
| 🌗 **Light &amp; Dark Mode** | Respects your system theme automatically. |
| 🗣️ **Text-to-Speech** | Latin pronunciation via the system TTS engine (Italian voice as approximation; classical/ecclesiastical toggle). |
| 📱 **Android Widget** | Home-screen widget showing your daily streak and cards due. |
| 📥 **Import** | Bring your own vocabulary from Anki (TSV export). `Latein <TAB> Deutsch` — comments and HTML are stripped automatically. |

## Screenshots

<p align="center">
  <em>Screenshots coming soon — the app is under active design refinement.</em>
</p>

## Downloads

### Android

Download the latest APK from [GitHub Releases](https://github.com/justusck/latein-app/releases/latest).

The APK is signed with a fixed key, so updates install over the previous version without data loss. [Obtainium](https://obtainium.imranr.dev/) users can point directly at this repo for automatic updates.

### iOS

No standalone IPA yet (requires an Apple Developer account). iOS users can run the app via **Expo Go**:

1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from the App Store.
2. Clone the repo and run `npx expo start`, then scan the QR code.

### Web

A static web build is available. Run locally with `npx expo start --web` or deploy the `dist/` output to any static host.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** (comes with Node)
- **Expo Go** on your phone (iOS/Android) for development

### 1. Clone

```bash
git clone https://github.com/justusck/latein-app.git
cd latein-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run the app on your phone. Or press `a` for Android emulator, `i` for iOS simulator, `w` for web.

### 4. (Optional) Seed the database

The app seeds its database automatically on first launch from `src/data/`. To regenerate the seed data:

```bash
npm run seed
```

### Running on device (Android)

```bash
npx expo start --android
```

### Running on device (iOS)

```bash
npx expo start --ios
```

### Build a production APK locally

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

---

## Architecture

| Layer | Technology |
|---|---|
| **Framework** | [Expo SDK 54](https://docs.expo.dev/) + [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, 4 tabs) |
| **UI** | React Native 0.81, Reanimated 4, Gesture Handler |
| **Database** | SQLite via `expo-sqlite` + [Drizzle ORM](https://orm.drizzle.team/) — runtime DDL, no migrations |
| **State** | [Zustand](https://zustand.docs.pmnd.rs/) (XP, levels, streaks, preferences), hydrated from SQLite `kv` table |
| **Spaced Repetition** | [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) — FSRS v5 scheduler, 90 % target retention |
| **On-Device AI** | [`llama.rn`](https://github.com/mybigday/llama.rn) for local inference |
| **Cloud AI** | Anthropic API key (user-provided, stored in `expo-secure-store` keychain) |
| **TTS** | `expo-speech` with Italian voice as Latin approximation |
| **EPUB** | Custom parser via `fflate` |
| **CI/CD** | GitHub Actions — builds &amp; signs APK on every version tag; attaches to GitHub Release |

### Project structure

```
src/
  app/              Expo Router (file-based routing)
    (tabs)/         index (vocab), grammar, ai, library (reading)
    grammar/[id]    Grammar lesson detail
    reader/[id]     Reading view
    trainer/[id]    Vocab/grammar trainer session
    vocab-group/[id] Vocab portion detail
    settings        Settings screen
    profile         Profile & stats screen
  components/       Reusable UI components
  constants/        App strings (German & Latin UI), colors, config
  data/             Seed data (vocab, grammar, texts)
  db/               Drizzle schema, client, seed logic
  hooks/            Custom hooks (useReducedMotion, …)
  lib/
    ai/             AI prompt construction & knowledge injection
    fsrs/           FSRS scheduling wrappers
    knowledge/      Knowledge inference from FSRS state
    latin/          Latin inflection & analysis
    reading/        Text tokenizer, coverage calculator, EPUB parser
    vocab/          Vocab import & management
  store/            Zustand stores
```

---

## Learning Methodology

**Vocabulary** — New words are introduced in frequency-ordered portions (DCC sequence, ~10/day by default). New cards use multiple-choice; review cards use self-graded recall (Again / Hard / Good / Easy). FSRS schedules every card individually with a 90 % target retention rate.

**Grammar** — An 18-node skill tree in grammar-first order: you can't skip fundamentals. Each node is a lesson with interactive exercises. A lesson unlocks the next when you score ≥ 1 star.

**Reading** — Texts become available once your known vocabulary covers ≥ 90 % of their tokens. Tap any word for a gloss showing dictionary form, meaning, and grammar info. Upload your own `.txt` files and the app auto-matches them against your knowledge.

**AI** — The on-device LLM (or Anthropic API) acts as a Latin conversation partner. Your current knowledge state (which words and grammar you've mastered) is injected into the prompt so the AI stays at your level. Prompt caching keeps costs low when using the API.

---

## License

This project is licensed under the **0BSD** license. See [LICENSE](./LICENSE) for the full text.

The bundled vocabulary data includes entries derived from the **FreeDict Latin–German** dictionary (GPL licensed).

### Third-Party Libraries

- [Expo](https://expo.dev/) (MIT)
- [React Native](https://reactnative.dev/) (MIT)
- [Drizzle ORM](https://orm.drizzle.team/) (Apache 2.0)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT)
- [Zustand](https://zustand.docs.pmnd.rs/) (MIT)
- [fflate](https://github.com/101arrowz/fflate) (MIT)
- [llama.rn](https://github.com/mybigday/llama.rn) (MIT)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) (MIT)

---

<p align="center">
  <sub>Built with ❤️ for the Latin language — <i>Gutta cavat lapidem.</i></sub>
</p>
