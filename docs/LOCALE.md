# Localization: how the English text gets on screen

The game's rules, numbers and behaviour are the upstream project's. Only what a player reads was translated, and the
translation is built so that it can never change how the game plays.

| Where the text lives | How it is translated |
|---|---|
| UI chrome — buttons, labels, toasts, tickers, dialogs (`public/js/**`, `public/css/**`) | in place: the string literals are English |
| Game data — operator / enemy / item / alliance / strategy names and descriptions (`data/*.json`) | a **read-time overlay**: one table per data file in `public/locales/en/`, applied by the browser when the file is loaded; `data/*.json` itself is never edited |
| Server messages — errors, toasts, tickers (`server/**`, `shared/constants.js`) | in place: the strings are English |

Terms are fixed in [GLOSSARY.md](GLOSSARY.md); what was changed and why is in [../CHANGES.md](../CHANGES.md).

## Why the data is an overlay, not an edit

- `data/*.json` is generated from the official Chinese client data by `tools/build-data.mjs` and `test/data.test.js`
  rebuilds it byte for byte. An edit would be reverted by the next rebuild.
- **The simulation reads the Chinese text.** `server/sim/content/**` derives mechanics from the descriptions (regexes such
  as `/持续(\d+)秒/`, `/凋亡损伤/`), on the server and in the browser's own simulation (`/sim/`, which fetches the pristine
  `/data/*.json` itself). Only the display store (`public/js/data.js`) applies the overlay.

## The tables

`public/locales/en/<data file>.json` (served at `/locales/en/<file>.json`):

```json
{
  "locale": "en",
  "strings": {
    "炎": "Yan",
    "【炎】干员<@ba.vup>攻击力</>提升": "<@ba.vup>ATK</> of [Yan] operators increases"
  },
  "reviewed": { "<zh>": "why this entry may differ from its source in tags / numbers" }
}
```

- A table is keyed by the **exact Chinese source text** of a display field (`TEXT_KEYS` in `public/js/locale.js`), not by
  record id. The same text (a skill both stars of an operator share, a description repeated over 249 garrisons) is
  translated once. When a data rebuild changes the Chinese — a balance number, a rewording — the key stops matching and the
  original Chinese shows until the entry is updated: **a translation cannot go stale silently** (`node tools/locale.mjs
  coverage` lists what is new).
- Only whole values are replaced, only in display fields; ids, enums, numbers and substrings are never touched.
- A plain `desc` next to a markup `descRaw` is never translated by itself: it is derived from the translated `descRaw`
  (`richTextPlain`), as the data build derives it, so a table holds only the markup text.
- Anything without an entry — a missing table, a missing key, a table that failed to load — stays Chinese, so the game is
  playable at every step.
- `?lang=zh` in the URL turns the overlay off (debugging aid; the UI chrome stays English).

## Rich-text markup survives translation

`<@ba.vup>…</>`, `<$ba.stun>…</>`, `{0:0%}` placeholders, literal `<In Battle>` condition markers, `\n` and every number of
the source are kept verbatim; only the words are translated. `node tools/locale.mjs check` (also run by
`test/locale.test.js`) rejects an entry whose tags, placeholders, numbers, line breaks or conditions differ from the
source, whose English still contains Chinese, that no display field of its data file has any more, or that is translated
differently in two tables. An entry that must differ (the official English writes "three" for `三个`, or leaves out a
highlight tag) is listed under `reviewed` with the reason. A number of the source that is *missing* from the English is
never accepted automatically — the official English snapshot can be older than the Chinese data ("-25%" vs the current
"-15%").

## Maintenance

```sh
node tools/locale.mjs coverage [--list] [--files chess,items] [--strict bonds]   # what has no English yet
node tools/locale.mjs check [--terms]                                           # validate every table (the test does too)
node tools/locale.mjs sync [--write]                                            # copy a translation to the tables that lack it
node tools/locale.mjs harvest [--write] [--refresh]                             # official Arknights Global English
```

`harvest` re-runs the data build with the official English operator / enemy / skill tables
(`Kengxxiao/ArknightsGameData_YoStar`, `en_US`; the mode's own tables exist only in Chinese), aligns the result with
`data/*.json` by path and adds the official wording for every text it covers: operator kits, enemy abilities, status terms.
It only adds missing keys. The mode-specific text (alliances, strategies, gear, Draft cards, garrisons, tips …) was
translated by hand and reviewed against the glossary and the official terms.

After a data rebuild: `node tools/locale.mjs coverage --list`, `harvest --write` for whatever the official English now covers,
translate the rest, `check`.
