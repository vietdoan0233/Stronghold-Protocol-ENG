# tools/locale-work — the tooling the English localization was built with

Work tools for maintaining `public/locales/en/*.json` (see [../../docs/LOCALE.md](../../docs/LOCALE.md) for the design and
[../../HANDOFF.md](../../HANDOFF.md) for the state of the work). They are developer tools: nothing here ships to players and
no test imports them. The checks themselves live in `tools/locale.mjs` (`coverage`, `check`, `sync`, `harvest`) and are run
by `test/locale.test.js`; these scripts add the batch / review / audit workflow around it.

All scripts are run from the repo root. Scratch files (reference dictionaries, batches, reviewer outputs, screenshots) go to
`.cache/locale-work/` (git-ignored); `LOCALE_WORK=/some/dir` overrides it.

## Reference dictionaries (build once; the batch / review tools read them when present)

| Script | Writes | What |
|---|---|---|
| `official-names.mjs` | `official-names.json` | `{ operators, enemies, skills, modules, terms }`: zh → official Global English, from the Chinese client data (`.cache/gamedata`, `tools/build-data.mjs`) paired by id with `en_US` (`.cache/gamedata-en`, `tools/locale.mjs harvest`). Downloads `gamedata_const.json` (status terms) when missing |
| `doc-names.mjs` | `doc-name-pairs.json` | the quoted names of the pre-localization Chinese docs paired line by line with the English docs (git history before `e8fd929`) |

## Translating a batch of missing texts

```sh
node tools/locale.mjs coverage --list                 # what has no English (after a data rebuild)
node tools/locale.mjs harvest --write                 # first: whatever the official English covers now
node tools/locale-work/gen-bounty.mjs                 # the bounty / tactical-training sentences from one template set → <work>/out/descs-GEN.json
node tools/locale-work/build-batches.mjs names <work>/batches 90   # then: descs. Batches of { zh, files, fields, where, refs } (refs = names already settled)
#   translate: each batch → a JSON object { "<zh>": "<en>" } (by hand, or hand the batch to a translator agent with briefs/descs-brief.md)
node tools/locale-work/check-batch.mjs out.json batch.json…       # typos in keys, missing entries, Chinese left, placeholders / numbers / tags / newlines
node tools/locale-work/name-consistency.mjs out.json              # advisory: a name of the source must appear by its settled English name
node tools/locale-work/merge-batch.mjs --write [--note "why"] out.json…   # into every table that has the text; --note accepts "review" differences (numbers written as words …)
node tools/locale.mjs sync --write && node tools/locale.mjs check --terms
```

Rules the checks enforce (`checkEntry` in `tools/locale.mjs`): the English contains no Chinese or full-width characters; every
`{0:0%}` placeholder, `<@…>` / `<$…>` tag, `<condition>` marker, line break and **digit** of the source is kept (write a number the
source spells in Chinese — 三个, 两次 — in words, otherwise the entry needs a `reviewed` note); leading / trailing whitespace is kept
(`\r\n` too).

## Reviewing the translation

```sh
node tools/locale-work/build-review-input.mjs <work>/review/in-bonds.json bonds,items   # (zh, en, refs) pairs of the DESCRIPTION texts of those tables
#   reviewer agents: briefs/descs-review-brief.md → a corrections file { "<zh>": { "en": "…", "why": "…" } }
node tools/locale-work/check-fixes.mjs fixes.json     # every key is a real display text, every correction passes the checks
node tools/locale-work/apply-fixes.mjs fixes.json     # sets strings[zh] in every table that has it (no new keys)
```

`briefs/names-review-brief.md` and `briefs/ui-review-*.md` are the same for names and for the UI chrome (a UI review diffs the
English literals against the Chinese they replaced: `git diff 6bd7b00 HEAD -- <files>`; the assignments are in `ui-review-assign.md`).
`briefs/names-brief.md`, `briefs/descs-brief.md` and `briefs/phase1-brief.md` are the translator briefs that were used.

## Audits

| Script | What |
|---|---|
| `extract-literals.mjs <paths…>` | the Chinese string / template / regex literals of JS files (comments excluded) with line numbers: `public/js` → 0 (the UI is English); `scripts tools/setup.mjs tools/doctor.mjs` → the launcher texts still to translate |
| `wire-audit.mjs [seeds] [mode]` | runs bot matches through the real match engine and lists every path of the messages sent to clients that still carries Chinese (`test/display.test.js` asserts the list is empty) |
| `tour-mock.mjs [w] [h] [filter]` | screenshots of the mock harness (`public/dev/game-mock.html`: every phase / variant of the match UI) into `<work>/tour-mock-<w>/`, and lists every Chinese character still visible |
| `tour.mjs [solo\|coop]` | the same against a real server and a driven match (title → lobby → room → draft → prep) into `<work>/tour/` |
| `offline-chrome.sh` | a Chromium wrapper for sandboxes without web access (set it as `CHROME_PATH`): external hosts fail at once instead of hanging every navigation for 30 s |
| `run-tests.sh <abs prefix>` | the whole suite the way CI runs it (`SP_E2E=0 SP_REAL_E2E=0 RENDER_E2E=0 NO_COLOR=1`), summary in `<prefix>.summary` (≈ 5 minutes: start it in the background) |

The tours need `puppeteer-core` and a Chromium (`CHROME_PATH`, default `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; see
`test/e2e/client.mjs`).
