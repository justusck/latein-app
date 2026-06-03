# Latīna — Latein-Lern-App (Expo)

Eine lokale (offline-first) Latein-Lern-App für das Handy. Vier Bereiche:
**Vokabeln**, **Grammatik**, **Anwendung (AI)** und **Lesen**. Durchgehende
Gamification, wissenschaftlich fundierte Lernmethoden (FSRS-Spaced-Repetition,
frequenzbasierte Vokabel-Portionierung, systematischer Grammatikaufbau).

## Starten (Entwicklung)

```bash
npm install
npx expo start        # dann QR-Code in Expo Go (iOS/Android) scannen
```

## App herunterladen (Android-APK)

Eine installierbare APK wird automatisch per **GitHub Actions** gebaut
([.github/workflows/android.yml](.github/workflows/android.yml)) — bei jedem
Push und manuell.

**So lädst du die App herunter:**
1. GitHub → Tab **Actions** → letzten Lauf von „Android APK" öffnen.
2. Unten unter **Artifacts** `latina-android-apk` herunterladen (ZIP) und entpacken.
3. Die `.apk` aufs Android-Handy kopieren und installieren
   (in den Einstellungen „Installieren unbekannter Apps" für den Datei-Manager
   erlauben).

Alternativ ein Release erzeugen: einen Tag `v1.0.0` pushen — dann hängt der
Workflow die APK direkt an ein **GitHub Release**.

> Die APK wird mit einem im CI erzeugten Schlüssel signiert. Für ein App-Update
> muss die alte Version ggf. zuerst deinstalliert werden (anderer Signatur-Key).
> iOS lässt sich ohne Apple-Developer-Account nicht frei als Datei verteilen —
> dafür Expo Go nutzen.

Für den **AI-Bereich**: in der App unter ⚙️ Einstellungen einen Anthropic
API-Key hinterlegen (wird sicher im Geräte-Schlüsselbund gespeichert, nicht in
der Datenbank).

## Architektur

- **Expo SDK 54 + Expo Router** (file-based, 4 Tabs unter `src/app/(tabs)/`).
- **SQLite (`expo-sqlite`) + Drizzle ORM** als Source of Truth — `src/db/`.
  Schema in `schema.ts`, Tabellen werden per Laufzeit-DDL in `client.ts`
  angelegt, Inhalte einmalig aus `src/data/` geseedet (`seed.ts`).
- **FSRS** (`ts-fsrs`) für Vokabel- und Grammatik-Wiederholung — `src/lib/fsrs/`.
- **Wissensstand-Service** (`src/lib/knowledge/`) leitet aus dem FSRS-Zustand ab,
  welche Wörter/Grammatik „beherrscht" sind. Diese Schnittstelle speist
  - die **AI** (Kontext-Injektion + Prompt-Caching, `src/lib/ai/`) und
  - den **Buch-Abgleich** (Token-Coverage, `src/lib/reading/` + `knowledge`).
- **Zustand** (`src/store/app.ts`) hält XP/Level/Streak/Coins/Einstellungen,
  hydratisiert aus der `kv`-Tabelle.

## Lernmethodik

- **Vokabeln**: neue Wörter in Frequenz-Portionen (DCC-Reihenfolge), Default
  10 neue/Tag, FSRS mit Ziel-Retention 90 %. Neue Karten via Multiple-Choice,
  Wiederholungen via Recall mit Selbstbewertung (Again/Hard/Good/Easy).
- **Grammatik**: Skill-Tree (18 Knoten, Grammar-First-Sequenz). Jede Lektion
  schaltet die nächste frei (≥ 1 Stern).
- **Lesen**: Texte werden ab 90 % bekanntem Wortschatz freigeschaltet;
  Tap-to-Gloss, eigene `.txt`-Uploads werden automatisch abgeglichen.

## Vokabular

- **Gebündelt: ~5300 Wörter** — 50 kuratierte Hochfrequenz-Kernwörter (Portionen
  1–6, mit Stammformen & Grammatik-Bezug) + ~5283 Einträge aus dem
  **FreeDict Latein–Deutsch** Wörterbuch (GPL), erzeugt von
  `scripts/build-seed.mjs` → `src/data/vocab.generated.ts`.
- **Eigene Vokabeln importieren**: im Vokabeln-Tab „Vokabeln importieren
  (Anki/CSV)". Erwartet pro Zeile `Latein <Tab/Komma/Semikolon> Deutsch` —
  genau das, was Anki als „Notes in Plain Text" exportiert (HTML wird entfernt,
  `#`-Kommentarzeilen ignoriert). Importe landen in der Portion „Eigene
  Vokabeln" und bleiben bei Inhalts-Updates erhalten (ids ≥ 2 000 000).
- Weiterer Ausbau (DCC-Frequenzordnung, Whitaker's-Vollformen) — siehe
  [scripts/README.md](scripts/README.md).

## Bekannte Grenzen / Nächste Schritte

- **Sprach-Ausgabe (TTS)** nutzt die italienische Systemstimme als
  Latein-Näherung (klassisch/kirchlich umschaltbar). Eine echte Latein-Stimme
  gibt es systemseitig nicht.
- **Sprach-Eingabe** (Diktat auf Latein) ist noch nicht aktiv — geplant über
  Whisper-API (separater Key). Aktuell: Texteingabe + TTS-Wiedergabe der
  AI-Antworten.
- Datensatz ist bewusst klein gehalten; siehe Pipeline für den Vollausbau.
