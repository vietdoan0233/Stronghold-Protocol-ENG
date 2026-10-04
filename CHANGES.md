# CHANGES — English localization

This document records the **English localization** of this repository, which was originally written in
Chinese (Simplified/Traditional). It exists so that contributors to the open-source project understand
what was changed from the upstream Chinese version, why certain names were chosen, and — importantly —
why some identifiers still read differently from what players see on screen.

Nothing about the game's rules, numbers or behaviour was changed; this is a translation of
human-readable text only. The full test suite (`node --test`) stays green at every step.

Last updated: 2026-10-04.

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
| 标准 / 险境 / 绝境 / 终极 | Standard / Hazard / Peril / Ultimate | difficulties |

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

Fully translated to English and **verified test-green**:

- All **user-facing documentation**: `README.md`, `docs/PLAYING.md` (player guide), `docs/DEPLOY.md`,
  `docs/ASSETS.md`, `docs/BALANCE.md`
- `NOTICE.md`, `THIRD-PARTY-NOTICES.md`, `CHANGES.md` (this file)
- `package.json` (incl. the package name), `package-lock.json`, `Dockerfile`, `public/index.html`, and
  the `server/index.js` boot banner
- The test assertions coupled to the above moved in lockstep (a number of tests assert on exact
  user-facing strings, so docs + code + tests were translated together).

Alongside the text, verified Chinese→English **name maps** were built for the 122 operators and 247
enemies/bosses (joined on the stable `charId`/`enemyId` and checked against the official English game
data), plus a hand-built map for the mode-specific strategies / alliances / items / summons. These make
the remaining passes mechanical.

## 5. What is not yet localized

- **Internal engine docs**: `docs/DESIGN.md`, `docs/SIM.md`, `docs/META.md`, and `CHANGELOG.md`. Unlike
  the player docs, these are heavy with quoted Chinese (PRTS / community citations) and skill
  descriptions — genuine prose, not just embedded names — so they need a careful translation pass rather
  than a term swap. The name maps are ready for it.
- **`docs/DATA.md`**: left in step with the data it documents. Its examples are the *actual* Chinese
  values from `data/*.json`; translating them before the data would misrepresent the data. It moves with
  the data phase below.
- **Generated data** (`data/*.json`): built by `tools/build-data.mjs` from the official Chinese game
  data and checked byte-for-byte by `test/data.test.js`. Localizing it means translating the build
  pipeline too, so it is a separate, larger phase.
- **Runtime UI/server strings** in `public/js/**` and `server/**` (shop labels, toasts, tickers, error
  messages). Many are asserted verbatim by tests, so they must be translated together with their tests.
- **`docs/research/*`** is left in Chinese on purpose: it is a raw mirror of the official game data that
  feeds the build, not prose meant to be read.
- Some **test descriptions** (the `test('…')` labels) still contain Chinese operator/skill names; these
  are cosmetic (they don't affect behaviour) and will be swept with the engine-doc pass.

## 6. How the translation keeps tests green

Several hundred tests assert on exact Chinese strings (server messages, data `name` fields, UI reason
strings, rendered text). The rule followed here: translate a producing surface and the tests that assert
it **in the same step**, and for assertions that span translated and untranslated files, accept both
languages temporarily (e.g. `/24 (小时|hours)/`). Each `test(...)` block is independent, so an assertion
only breaks when a file and its matching regex disagree.
