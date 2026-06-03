# Daten-Pipeline (Build-Zeit)

Diese Skripte laufen **auf dem Entwickler-Rechner**, nicht auf dem Gerät. Sie
erzeugen die gebündelten Lerninhalte. Die App funktioniert bereits ohne sie mit
dem kuratierten Starter-Datensatz in `src/data/`.

## 1. Vokabeln — DCC Core Vocabulary (1000 häufigste Wörter)

Quelle: <https://dcc.dickinson.edu/vocab/core-vocabulary> · Lizenz **CC BY-SA 3.0**

1. CSV herunterladen und als `scripts/sources/dcc-core.csv` speichern.
2. Spalten (Header, Reihenfolge egal): `rank, headword, part_of_speech, definition, semantic_group`.
   Für deutsche Bedeutungen eine Spalte `gloss_de` ergänzen (siehe Schritt 3).
3. `npm run seed` → erzeugt `src/data/vocab.generated.ts`.
4. In `src/data/vocab.ts` importieren/zusammenführen und `SEED_VERSION`
   in `src/db/seed.ts` erhöhen.

### Deutsche Glossen ergänzen (optional, mit Claude API)
Wenn die DCC-Definitionen englisch sind: ein kleines Node-Skript schreiben, das
die Headwords in Batches an die Claude API schickt
(`claude-haiku-4-5` genügt) und `gloss_de` zurückbekommt. Ergebnis als Spalte in
die CSV schreiben, dann Schritt 3.

## 2. Form → Lemma (für Lese-Coverage & Tap-to-Gloss)

Quelle: **Whitaker's Words** (Open Source) · <https://github.com/mk270/whitakers-words>
oder **LEMLAT 3.0** · <http://www.lemlat3.eu/>

Geplanter Schritt: alle Flexionsformen der DCC-Lemmas erzeugen und als
`word_forms`-Tabelle bündeln (analog zum `forms`-Feld in `src/data/vocab.ts`).
Empfohlen: ein Python-Vorverarbeitungsskript mit **CLTK/LatinCy**
(<https://github.com/cltk/cltk>), das jeden Lemma-Stamm dekliniert/konjugiert,
Ausgabe als JSON → in `vocab.generated.ts` mergen.

## 3. Texte / Bibliothek

Gemeinfreie Texte aus Perseus / The Latin Library / graded readers
(Ritchie's *Fabulae Faciles*, Phaedrus, Eutropius, Vulgata) als `.txt` ablegen
und in `src/data/texts.ts` eintragen. Coverage wird beim Seeding automatisch
vorberechnet (siehe `src/db/seed.ts`). **LLPSI (Ørberg) ist urheberrechtlich
geschützt** und darf nicht gebündelt werden.
