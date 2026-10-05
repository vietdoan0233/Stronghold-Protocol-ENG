# CHANGES — English localization

This document records the **English localization** of this repository, which was originally written in
Chinese (Simplified/Traditional). It exists so that contributors to the open-source project understand
what was changed from the upstream Chinese version, why certain names were chosen, and — importantly —
why some identifiers still read differently from what players see on screen.

Nothing about the game's rules, numbers or behaviour was changed; this is a translation of
human-readable text only. The English strings were validated for source coverage, markup, numbers and consistency.

Last updated: 2026-10-05.

---

## 1. The game's name

The mode is **Stronghold Protocol: Alliance** (Chinese: 卫戍协议：盟约). An earlier draft of this
localization used "Covenant" for 盟约 — that was wrong and has been corrected everywhere to **Alliance**.

Consequently:

- The npm package was renamed `stronghold-protocol-covenant` → **`stronghold-protocol-alliance`**
  (`package.json` and `package-lock.json`).
- The server boot banner now prints `Stronghold Protocol: Alliance v<version>`.
- All documentation, the page `<title>`, and metadata say "Stronghold Protocol: Alliance".

This English fork lives at `github.com/vietdoan0233/Stronghold-Protocol-ENG`, forked from the upstream Chinese project `github.com/sganggs/Stronghold-Protocol`.

## 2. Terminology

The synergy/bond system 盟约 is localized as **Alliance** (the mode is named after it, and the project's
own glossary renders 核心协同 / 附加协同 as *Core Alliance* / *Add-on Alliance*). Core gameplay terms:

| Chinese | English | Notes |
|---|---|---|
| 盟约 | Alliance | the synergy system; **code keeps `bond`** (see §3) |
| 盟约之币 | Alliance Coin | |
| 联防 | Unite Phase | matches the code's `unite.js` |
| 机变 | Draft (phase) | enum `SP_DRAFT` |
| 调度中心 | Dispatch Center | |
| 资金 | Funds · 生命值 → LP · 部署点数 → DP | |
| 策略 / 分队长 | Strategy / squad leader | **code keeps `band`** |
| 整备区 / 临时整备区 | Reserve / Temporary Reserve | code arrays `hand` / `temp` |
| 休整期 / 作战 / 结算 | Rest phase / Combat / Settlement | |
| 悬赏 / 机密商店 / 战术决策 | Bounty / Secret Shop / Tactical Decision | |
| 同盟模拟 / 独立模拟 | Alliance Simulation / Solo Simulation | the co-op vs single-player mode (同盟, a different word) |
| 标准 / 险境 / 绝境 / 终极 | Standard / Perilous / Dire / Ultimate | difficulties |

Nations use the official Terra spellings: 炎 **Yan**, 萨尔贡 Sargon, 维多利亚 Victoria, 谢拉格 Kjerag,
拉特兰 Laterano, 阿戈尔 **Ægir**, 叙拉古 Siracusa, 卡西米尔 Kazimierz. (An earlier draft wrongly used
"Pyrith" for 炎 — fixed.) 炎佑 → Yan's Protection.

**Operator and enemy names** use the official Arknights Global names. They were resolved by joining on the
globally-stable `charId` / `enemyId` (e.g. `char_4137_udflow` → Underflow) and verified against the
official English game data (`enemy_handbook_table.json`) and the Terra wiki. A few that are easy to get
wrong: 巫恋 = **Shamare** (not Magallan, who is 麦哲伦), 锏 = **Degenbrecher**, 伺夜 = **Vigil**, 洛洛 = **Rockrock**, 野鬃 = **Wild
Mane**, 角峰 = **Cardigan**, 假想敌：胄/铳/管 = **OpFor: Armor/Gun/Pipe**, 掠海漂移体 = **Skimming Sea
Drifter**, 深池逐火 = **Dublinn Flamechaser**, 鸭爵 = **Duck Lord**, 流泪小子 = **Crying Thief**,
圆仔 = **Fatty**.

## 3. Code identifiers were intentionally NOT renamed

To keep the change a pure text translation (and avoid breaking the ~3,000-test suite and the data-build
pipeline), **internal identifiers keep their original names even where the display term differs**. This
is a deliberate display-name-vs-code-name split, common in localized games:

| Code identifier | Player-facing term |
|---|---|
| `bond`, `bondIds`, `bonds.json`, `bandBonds.js` | Alliance |
| `band`, `bands.json`, `band_*` | Strategy |
| `hand`, `temp` (player arrays) | Reserve, Temporary Reserve |
| `'angel2:covenant'` (buff key) | the operator **Exusiai the New Covenant** (新约, 新约能天使) — *not* the game name |

So if you see `bond` in the code, read it as "Alliance". "Covenant" survives **only** inside the New
Covenant operator's name and in the GPL `LICENSE` text ("covenant not to sue") — both are correct.

## 4. What has been localized

The player-facing text and launcher output are in English:

- **UI chrome** — every button, label, heading, tooltip, toast, ticker line, dialog and `aria-label` of the browser client
  (`public/js/**`, `public/css/**`, `shared/constants.js`), roughly a thousand string literals, with one glossary
  ([docs/GLOSSARY.md](docs/GLOSSARY.md)). The tests coupled to those strings moved in the same commits.
- **Game data** — operator, enemy, boss, alliance, strategy, gear, summon, stage, Draft-card and emote **names**, and the
  **descriptions** (skills, talents, traits, modules, alliance and strategy effects, gear, garrison rules, enemy abilities,
  Draft cards, tips, mode and title texts). `data/*.json` is generated from the official Chinese client data and is *not*
  edited: the English lives in read-time overlay tables (`public/locales/en/*.json`, keyed by the exact Chinese text; see
  [docs/LOCALE.md](docs/LOCALE.md)). Every table is translated in full, and a coverage ratchet in `test/locale.test.js`
  keeps it that way. Official Arknights Global English is used verbatim wherever it exists (operator kits, enemy abilities,
  skills, modules and status terms are harvested from the `en_US` game data); the rest was written in the voice of the game
  and checked against the official terminology. A focused wording review clarified Akkord's sonic-boom targets, fixed
  Warfarin's Intensive Care sentence, normalized Operator capitalization, and standardized Operator-owned Alliance stack
  gains; unverified mode-specific names remain listed in [docs/GLOSSARY.md](docs/GLOSSARY.md).
- **Server texts** — errors, toasts, tickers, the HTTP error pages, the AI teammates' names, and every text the server
  composes from the data (draft cards, the effects list, result titles, ticker templates) reach the client in English
  (`server/display.js`; the simulation keeps reading the pristine Chinese data).
- **Docs for players and operators** — `README.md`, `docs/PLAYING.md`, `docs/DEPLOY.md`, `docs/ASSETS.md`, `docs/BALANCE.md`,
  `NOTICE.md`, `THIRD-PARTY-NOTICES.md`, `docs/GLOSSARY.md`, `docs/LOCALE.md`, this file; the dev pages under `public/dev/`.

## 5. What remains Chinese, and why

- **`data/*.json`** — generated data, pinned byte-for-byte by `test/data.test.js` (and parsed by the simulation, which derives
  mechanics from the Chinese rule text). The overlay is applied only in the browser's display store and at the server's
  wire boundary.
- **Art with text in it** — the official tutorial pages (the "How to Play" viewer), UI sprites and other pictures extracted
  from the Arknights client contain Chinese; they are images and cannot be translated by text.
- **Internal engine docs** — `docs/DESIGN.md`, `docs/SIM.md`, `docs/META.md`, `docs/DATA.md`, `CHANGELOG.md` and
  `docs/research/*` (a raw mirror of the official data that feeds the build) are heavy with quoted Chinese sources; they are
  developer references, not player-facing.
- **Code comments and internal developer references** — `tools/build-data.mjs` and the other generators keep their Chinese
  parsing patterns and some comments; internal engine docs and tests are not player-facing.
- **Identifiers** — ids, enum values, buff keys, CSS classes and `data-*` attributes are never translated
  (see section 3).
- **The launcher and setup tools now print English** — `scripts/launch.mjs`, all start scripts, the Windows service installer,
  `tools/setup.mjs`, and `tools/doctor.mjs` were translated in place. Address-classification tests use English descriptions
  and pin the English labels (`test/doctor.test.js`).

## 6. How the translation keeps tests green

Several hundred tests asserted exact Chinese strings (server messages, data `name` fields, UI reason strings, rendered
text). A producing surface and the tests that assert it moved **in the same step**; where a test mixes a server-composed
text with the browser's data store, both read the English overlay, as in production. New tests pin the localization itself:
`test/locale.test.js` (overlay mechanism, shipped tables, the coverage ratchet, official operator names) and
`test/display.test.js` (the server's `L()` and the "no Chinese on the wire" check).

The opt-in browser suites (`SP_E2E=1`, `SP_REAL_E2E=1`, `RENDER_E2E=1`: `test/ui/*.e2e.test.js`, `test/e2e/coop.e2e.mjs`) are not part
of CI. Their Chinese UI-label expectations were moved to the English interface by reading the UI source. They need Chrome and
the downloaded art (`npm run assets`); neither was available for the original localization pass or this audit. Run them when
those local requirements are available (`tools/locale-work/offline-chrome.sh` makes a sandboxed Chromium fail fast on unreachable web-font hosts).

During the 2026-10-05 audit, setup and locale checks passed on Windows with Node 24.20.0, and the focused doctor / display /
locale tests passed. The full suite reported one performance-threshold failure under parallel load (0.71 ms/tick against
the 0.5 ms limit); the isolated rerun passed at 0.098 ms/tick. The latest checked GitHub Actions run on `main` (2026-10-04)
passed all four Ubuntu / Windows × Node 22 / 24 jobs ([run #37231357069](https://github.com/vietdoan0233/Stronghold-Protocol-ENG/actions/runs/37231357069)).

A local server smoke passed for `/healthz` and the home page. The in-app browser displayed the title, protocol selection,
briefing, strategy selection, and first Rest Phase at 1280×720 with placeholder art. One transient "Unexpected error: An
unknown error occurred" toast appeared when entering the match and cleared; the server logged no corresponding error. The
phone layout and downloaded-art rendering remain unverified, and the client-side toast needs a browser-console trace to
identify its source.

Upstream merge instructions and display-boundary rules are in [docs/UPSTREAM.md](docs/UPSTREAM.md).

## 7. Maintaining the localization

- A data rebuild that adds or rewords Chinese display text fails `test/locale.test.js` until the overlay tables have the English:
  `node tools/locale.mjs coverage --list` shows the gaps, `harvest --write` fills what the official Global English covers,
  `check` validates the rest ([docs/LOCALE.md](docs/LOCALE.md)).
- The terms are in [docs/GLOSSARY.md](docs/GLOSSARY.md) (official Arknights Global wording wins; its last section lists the
  judgement calls that have no official source and should be checked against the game when one appears).
- `tools/locale-work/` holds the scripts and briefs the translation was built with: batches of missing texts, merging and checking
  them, reviewer input and fixes, the "no Chinese on the wire" audit and the screenshot tours (see its README).
