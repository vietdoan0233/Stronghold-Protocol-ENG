# Phase 1 brief — translate the player-visible UI text of your files to English

Repo: `<repo>` (branch `claude/sweet-archimedes-aqioeq`; do NOT commit, do NOT push, do NOT
switch branches — the lead commits). It is an English fork of a Chinese Arknights auto-chess web game
("卫戍协议：盟约" = "Stronghold Protocol: Alliance"). Node 22, ESM, Preact + htm templates, `node --test`.

**Your job:** translate every *player-visible* Chinese string in the source files assigned to you into natural,
in-universe English (it must read like the real Arknights Global UI, not machine output) AND update every test /
CSS rule that asserts or depends on those strings, in the same pass, keeping the whole test suite green.

## Read first (in this order)
1. `docs/GLOSSARY.md` — the fixed glossary and the style rules. Same Chinese term → same English term, everywhere.
2. `CHANGES.md` §2 and §3 — terminology and the display-name vs. code-name split.
3. `docs/PLAYING.md` and `README.md` — already-English player docs: **search them for the Chinese concept's English
   phrase before inventing wording** (e.g. `grep -n -i "rest phase\|confirm purchase\|go watch" docs/PLAYING.md`).

## HARD RULES (violating one breaks the game)
1. **Display text only.** Never rename identifiers, object keys, enum values, ids, CSS class names, `data-*`
   attributes, event names, protocol fields or buff keys (`bond`, `band`, `hand`, `temp`, `'angel2:covenant'` stay).
2. **Never change behaviour.** If a Chinese literal is *logic* (compared with `===`, used as a map key, matched by a
   regexp, looked up in a table, or compared with text the server/data sends) do NOT blindly translate it: find the
   other side, keep both sides consistent, or leave it and report it. Typical traps: `PROF_NAME`-style maps keyed by
   enum are fine to translate (values), but `x === '联防'` / `reason.includes('...')` / `/已满/.test(msg)` are logic.
   Server messages are translated in a LATER phase: a client regexp that matches a server-sent Chinese message must keep
   matching it for now (leave it, report it).
3. **Comments stay as they are** (Chinese comments are fine, leave them). Translate string literals, template-literal
   text, `aria-label` / `title` / `placeholder` / `alt` attribute values, and CSS `content:` / attribute selectors that
   carry display text.
4. **Do not touch** `data/*.json`, `public/locales/**`, `server/**`, `docs/**`, `CHANGES.md` (data text comes from an
   overlay; the server is a later phase). You may edit your assigned source files, `public/css/**` rules that depend on
   the strings you change, and test files.
5. **Keep the HTML structure** of htm templates exactly; change only the words (and the order of words/`${}` parts when
   English needs it). Preserve every `${expression}`, `<${Component}>` and attribute.
6. **Rich-text markup** (`<@ba.vup>…</>`, `{0:0%}`) in strings is out of your scope (that is data); keep it verbatim
   if you meet one.
7. Do not weaken, skip or delete tests. A test that asserts a Chinese UI string must assert the new English string.

## How to translate well
- Restructure for English: `已选择「${name}」` → `Selected “${name}”`; `${n} 名博士` → `${n} Doctor(s)` (branch for 1 vs
  more when the count is a run-time number); `第 ${n} 回合` → `Round ${n}`; `${name}博士` → `Doctor ${name}`.
- Short UI: English is longer than Chinese and many chips/buttons are fixed width. Prefer the concise glossary form
  (`Confirm Purchase`, `Enemy Intel`, `Sell +1`). Title Case for labels/buttons/headings; sentence case for sentences.
- The same string appearing in several places must get the same English (grep before deciding).
- Keep the voice of Arknights: "Doctor", "Operators", "Deploy", "Retreat", "Dispatch Center", "Funds", "Rest Phase".
- Full-width Chinese punctuation → ASCII (`，` → `, `, `：` → `: `, `（）` → ` ()`), `「」` → “ ” (one quote style per file).
- Numbers, units (`${n}s`, `×${n}`), icons, symbols (`‹ ›`, `✕`, `→`, `·`) stay.
- Pluralisation / grammar for run-time counts: write a tiny ternary, do not leave "1 operators".

## Procedure
1. List your literals (comments excluded, with line numbers):
   `node tools/locale-work/extract-literals.mjs <your files>`
   (`tpl` = text inside a template literal, `str` = a quoted string). Read each file around its literals — you need the
   context to know whether a literal is display text or logic.
2. Translate in place with Edit. Work file by file.
3. Re-run the extractor: whatever CJK literal is left must be *logic* or *not player-visible*; list each with the reason.
4. Find the coupled tests and CSS. For every string you changed, grep the repo:
   `export LC_ALL=C.UTF-8; grep -rn '<the old Chinese text>' test public/css` — tests (`test/**`, including
   `*.e2e.test.js`, `*.browser.test.js` and `test/e2e/*.mjs`, which cannot run here: edit them carefully and textually)
   and CSS (`[aria-label="…"]` selectors, `content: '…'`). Tests also read source files with `readFileSync` and match
   regexps on the Chinese text (e.g. `client-static.test.js`, `docs-consistency.test.js`): update those expectations too.
   Test names (`test('…')` titles) and comments may stay Chinese.
5. Run the *relevant* tests only (other agents are editing other files at the same time; a failure in a file you do not
   own is not yours — mention it only if it is caused by your change):
   `cd <repo> && NO_COLOR=1 SP_E2E=0 SP_REAL_E2E=0 RENDER_E2E=0 node --test test/ui/<x>.test.js test/client-static.test.js …`
   Always include `test/client-static.test.js` and every test file you edited. Do NOT run the whole suite.
6. Final report (≤ 350 words, plain text): files changed; number of literals translated; leftover CJK literals and why;
   tests/CSS updated; **new or changed glossary terms** (Chinese → English) so the lead can add them to
   `docs/GLOSSARY.md`; any logic coupling you found and how you handled it; anything risky (long strings in fixed-width
   chips, regexps that still match Chinese server text).

## Quality bar
Imagine the reviewer is a native English speaker who plays Arknights Global. No literal calques ("Please select one
strategy to see detail"), no inconsistent terms, no leftover Chinese in anything a player can see.

## SHARED STRINGS — mandated English (several files, several agents: these MUST be identical everywhere)
Some of these are *logic*: one file produces the text and another compares it (`reason === '资金不足'`). Use exactly this English
(adapt only the case/punctuation a template needs, e.g. a sentence-initial capital), in the source AND in the tests.

| 中文 | English | note |
|---|---|---|
| 队友 | Teammate | |
| 你自己 / 你 | You | |
| 无效的目标 | Invalid target | observe.js ↔ gameLogic.js |
| 无法查看另一组队友的战场 | Can't view the other pair's battlefield | observe.js ↔ gameLogic.js |
| 全景 | Panorama | |
| 连接已关闭 | Connection closed | net.js / title.js / connBanner.js |
| 该身份已在其他页面登录 | This identity is already signed in on another page | net.js / connBanner.js |
| 正在连接服务器 | Connecting to the server | title.js / connBanner.js |
| 联合模拟在选择策略时可以进行一次跳过 | In Alliance Simulation you can skip once while choosing a strategy | |
| 决策中 | Deciding | |
| 独立模拟 / 同盟模拟 | Solo Simulation / Alliance Simulation | short form without 模拟: Solo / Alliance |
| 博士 | Doctor | `${name}博士` → `Doctor ${name}` |
| 已选择 / 确认选择 | Selected / Confirm Selection | |
| 战场随机（共N张）/ 战场固定为 战场#01 | Random battlefield (N maps) / Fixed battlefield: Battlefield #01 | briefing.js ↔ lobby.js |
| 已就绪 / 准备就绪 | Ready / Ready | the state / the button; 取消准备 = Cancel Ready |
| 放弃模拟 | Abandon Simulation | |
| 销毁 / 销毁道具 / 道具 | Destroy / Destroy Item / Item | |
| 道具无法出售。确定要销毁「X」吗？ | Items cannot be sold. Destroy “X”? | game.js ↔ detailPanel.js |
| 整备区已满 | Reserve is full | game.js ↔ gameLogic.js |
| 资金不足 | Not enough Funds | gameLogic.js ↔ shopBar.js (LOGIC) |
| 已售出 | Sold | gameLogic.js ↔ shopBar.js (LOGIC) |
| 调度中心已达最高等级 | Dispatch Center is at max level | gameLogic.js ↔ shopBar.js (LOGIC) |
| 阶 | Tier | `${n}阶` → `Tier ${roman}`; 等阶 = tier |
| （含调和 +N） | (incl. Harmony +N) | |
| 本局禁用 / （本局禁用） | Disabled / (disabled this match) | the short form on chips/badges (they are narrow), the long form in tooltips and sentences |
| 机变 / 机变阶段 | Draft / Draft Phase | |
| 先锋 近卫 重装 狙击 术师 医疗 辅助 特种 召唤物 | Vanguard Guard Defender Sniper Caster Medic Supporter Specialist Summon | |
| 自动回复 / 攻击回复 / 受击回复 / 被动 | Auto Recovery / Offensive Recovery / Defensive Recovery / Passive | |
| 领袖 / 普通 / 精英(敌人阶级) | Leader / Normal / Elite | enemy ranks |
| 技能 / 技力 / 装备 / 冻结 / 干员 | Skill / SP / Gear / Freeze / Operator | |
| 本局信息 / 敌方情报 | Match Info / Enemy Intel | |
| 目标生命值 / 结算时扣除 | Target LP / Deducted at settlement | |
| 联防中 | Uniting | |
| 返回战场 | Back to Battlefield | |
| …资金） | …Funds) | |
| `ENEMY LEADER // 敌方领袖`-style micro labels (`EN // 中文`) | keep only the English half (`ENEMY LEADER`); if the Chinese half adds meaning, merge it into one English label (`STRATEGY // 我的策略` → `MY STRATEGY`) | |
| 特训敌人·X (faction type names, data) | the data tables will say `Special Training · X`; code that strips the prefix must split on `·` and take the last part (`String(name).split('·').pop().trim()`) instead of `.replace('特训敌人·', '')` | enemyDrawer.js |
| DIFFICULTY_NAMES `.replace('模拟', '')` | rewrite so it works with the English names (`Standard Simulation` → `Standard`): strip a trailing ` Simulation` | room.js |
