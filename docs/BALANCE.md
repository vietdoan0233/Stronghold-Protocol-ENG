# BALANCE.md — difficulty model and measurement (official numbers, no custom tuning)

Owner: match / balance. Tools: `tools/balance.mjs` (competent-board model — now a **measuring** tool only),
`tools/matchrun.mjs` (bot matches). Tests: `test/match/balance.test.js`, `test/match/waves-official.test.js`,
`test/match/waves.test.js`, `test/sim/pathing.test.js`.

**Every enemy number is the official one; the custom balance layer was removed** (user request: rules, numbers, enemy
kinds / counts and routes must follow the official game; research 08 §6–§7, DESIGN §14 corrections):

* waves = the client's `RandomEnemyGenerater` (research 08 §2): a 15-slot type schedule per match (3 types × 3 slots +
  6 SPECIAL, shuffled), one weighted special entry per round, each placeholder ACTION replaced by
  `clamp(roundHalfEven(n·P(t)/P(new)), 1, 5)` units over the same window, the other movement class not spawned — no
  `k` copies, no kept fly placeholders; verified against all 429 official entry × round compositions and the official
  count distribution (Alliance Hazard R3 ≤ 10 enemies, R13 ≈ 37 — the old generator averaged 28 / 81);
* stats = the PRTS per-round `enemyScale` table only (`data/config.json`, Ultimate ×1.15 speed from R3);
* leader pool = `bloodPoint[difficulty]` in co-op — one pool for every boss field, whatever the number of alive players
  (config `bossHpScale.aliveScaling` would make it × alive / 4; off — the user chose the fixed pool, DESIGN §20.10); solo keeps ×0.25,
  flagged [ASSUMED] in data;
* leader parts and drones (DESIGN §20.10): a blade / hammer / Gunshatter passes every damage it takes to its leader 1:1 (PRTS "an equal amount of
  sourceless HP loss"; until 2026-10-01 half, and a blade / hammer only while grounded — the dive hits [ASSUMED], the handbook says
  "when shot down"); a Armor drone that dies (whoever kills it, DESIGN §20.13) costs 2 % of the leader's shown max HP = the pool (unchanged from v2.5; which "max HP" the
  official client reads is [ASSUMED] — the review round tried the unit's data 600 000, which made drones 19–78 % of a solo
  Standard fight, and went back, `bosses.js DRONE_LINK_BASE`);
* same-named effects on an enemy: one instance, the strongest — Arcane (the two players of a pair field compete for it;
  until 2026-10-01 one per player, multiplied: ×30 arts damage taken on a leader at ~250 layers each), Gnosis permafrost,
  Leonhardt / Texas the Omertosa RES cuts (until 2026-10-01 one per copy of the operator);
* Steadfast thorns: sourceless but credited to the member hit (until 2026-10-01 nobody's: up to 19 % of a co-op leader pool and
  88 % of a solo one missing from the per-player boss damage; kill times unchanged);
* bond layers stop at 999 per bond (`BOND_LAYER_CAP`, official: the client's `MAX_GARRISON_STACK`, §7 / research 11; until
  2026-10-01 no cap, so per-layer bonuses kept growing past anything the official game reaches);
* player-side "+X%" ATK / DEF / max HP of bonds, strategies, equipment, draft cards and per-layer trait = direct multiplication, summed
  with each other and with skills (PRTS Alliance Records / game data basics; DESIGN §20.10) — until 2026-10-01 each compounded, which
  made every measurement below the 2026-10-01 note (§3) too strong for the player side (most in late rounds and leader fights);
* bounties: no extra ×0.7 in solo (the 70 % base is already in `enemyScale`), spawned with the template's first normal
  action (research 08 §5);
* routes = the official 4-direction flow field with crates at cost 1000 (research 08 §3), act1 m02 without crates.

**Removed:** every `enemyHpMul` / `enemyAtkMul` / `enemySpeedMul` / `bossHpMul` of `data/tuning.json` (it now holds only
the `titles.comment_3` rule) and the `flyPlaceholders` knob. `gamedata.js` ignores those keys if an old file carries them.

**Measured with the official numbers** (`node tools/balance.mjs --mode all --difficulty ALL --tuning off`, 2026-09-28):
average capped leaks per board and round R1–R13 (solo Standard R1–R8) of the competent board of §1.1 —

| mode | old generator, research numbers | old generator, tuned (shipped before) | **official (now)** | LP/rd after Unite |
|---|---|---|---|---|
| Solo Standard | 1.3 | 0.6 | **0.17** | (= leaks) |
| Solo Hazard | 1.4 | 0.9 | **0.19** | (= leaks) |
| Solo Peril | 1.8 | 1.8 | **0.22** | (= leaks) |
| Solo Ultimate | 4.1 | 3.1 | **0.65** | (= leaks) |
| Alliance Standard | 1.4 | 0.5 | **0.31** | 0.13 |
| Alliance Hazard | 2.3 | 1.3 | **0.49** | 0.01 |
| Alliance Peril | 5.0 | 2.7 | **0.80** | 0.10 |
| Alliance Ultimate | 6.3 | 4.3 | **1.96** | 0.93 |

The old generator spawned 2–4× the official enemy count (every template enemy × k, plus the other class's
placeholders); the tuning of the previous pass only compensated for that. With the official counts the difficulty
comes out below the old targets — which is the official game's difficulty as far as this model can tell (the model is a
competent, layer-rich board; see §1.2 for what it does not capture). Nothing is tuned from these numbers.

---

## 1. Method — `tools/balance.mjs`

For every mode (Solo solo / Alliance multi) × difficulty × round the tool samples whole matches (stage, the 3 factions, bans,
boss, band and lineups all vary with the seed), builds a **competent board for that round**, generates the round's
real wave (`waves.js`: template, the official per-action replacement of the round's pick, enemy scaling, bounties off)
and runs the real
`Battle` with full content (kits, talents, bonds with layers, IN_BATTLE trait, equipment, bands, summons). Co-op rounds
field **4 boards** against the same wave and then run **Unite** exactly like the match (`unite.js`: ≤ 2 perfect helpers,
only the survivors cost their source LP). Boss rounds build the Final Assault fields exactly like `Match.startFinalAssault`
(pairs / `_s` for a lone player, shared pool `GameData.bossPoolHp` = `bloodPoint` (solo ×0.25), merged team LP of 15 per player, leaks' `lpr`,
−1 LP/s after 150 s) and record the pool damage by 150 s, the kill time and the win rate.

Metrics: **capped leaks** = min(leaks, 10) per board and round (what that board alone would lose; the targets below
use it — raw means are dominated by swarm rounds that cap at 10 anyway), **LP/rd after Unite** (co-op), perfect-round
share, the enemies that leak most, clear time; bosses: share of the pool dealt by 150 s, win rate, kill time.

### 1.1 The competent board of round r

| R | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| shop level | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 4 | 5 | 5 | 6 | 6 | 6 | 6 |
| units | 2 | 4 | 5 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| elites (Elite) | 0 | 0 | 0 | 0.5 | 1 | 1.5 | 2 | 3 | 3.5 | 4 | 4.5 | 5 | 6 | 6.5 | 7 |
| equipment | 0 | 0.5 | 1 | 1.5 | 2 | 3 | 3.5 | 4 | 5 | 5.5 | 6 | 7 | 8 | 9 | 9 |
| core bond members | – | – | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 5 | 6 | 6 | 6 | 6 | 6 |
| core bond layers | 0 | 2 | 6 | 12 | 20 | 28 | 38 | 50 | 65 | 80 | 95 | 110 | 130 | 150 | 170 |
| add-on layers (each) | 0 | 1 | 4 | 8 | 12 | 17 | 23 | 30 | 38 | 46 | 55 | 65 | 75 | 90 | 100 |

(fractional values: that many on average.) Sources: income 4, 5, 6 … min(3 + r, 12) and upgrade prices 5 / 8 / 11 /
12 / 13 with −1 per round (research 00-INDEX §3) → L2 at R3, L3 at R5, L4 at R7, L5 at R10, L6 at R12; the board is
full from R5; elites ≈ 0 at R3 → 3 at R8 → 6+ at R13; 1–2 add-on bonds; the layer pace reaches Σ active layers ≈ 330
at R14 — the solo Hidden Core threshold is > 350 (research 02 §2.3), i.e. these are boards of players who *regularly*
reach the Hidden Core. Units are drawn from the match's pool (bans respected) with a tier mix per shop level, around a
core bond with enough members, plus the roles a player reads from the wave preview: 2 blockers, anti-air by the share of
flyers, arts dealers by the armour of the enemies (arts anti-air when the flyers are armoured, e.g. Frost DEF 600), a
medic from R5. Equipment: passive combat items of tier ≤ shop level (golden from R7) on the damage dealers. Layers: the
core curve on the core bond, the add-on curve on every other bond the lineup activates. Placement: the bot's layout
planner with rehearsal of its 5 variants (a player adapts the layout to the previewed wave). Not modeled: bounties, draft
cards, prep-only effects (their value is folded into the curves). `--profile weak|strong` scales elites, items and
layers ×0.6 / ×1.4.

### 1.2 Reference levels (informative — nothing is tuned against them any more)

The previous pass tuned the waves toward: Standard ≤ 1 capped leak per board and round, Hazard ≤ 2, Peril ≈ 2–3.5, Ultimate ≈ 3–5.
They are kept only to read the measurement. What the model does NOT capture (so real matches are harder than the
table): imperfect economy and placement, bans hitting the planned bonds, draft / bounty choices (bounties add enemies),
the preview being read by a human in 90 s, and losing LP early (fewer rounds to build layers).

---

## 2. What the numbers were checked against (research first)

| Suspect | Research | Verdict |
|---|---|---|
| Enemy multipliers (`config.modes[m].enemyScale`, `k` exponents) | A3 table (PRTS second half, user-sourced) — 01-core-rules.md A3 / `_criticAddendum.enemyStatMultipliers` | **match exactly** (every mode, every round incl. ABYSS HP k and ×1.08); kept as the base |
| Wave templates / counts | level data (`maxPlayTime`, spawns, routes) — DATA | match the official levels; kept |
| Faction replacement | was: each template enemy × `k` [ASSUMED] | **replaced by the official per-action rule** (research 08 §2.3, client code) |
| Fly placeholders without a FLY faction | was: kept (Frost / Bombtail / Monster, the #1 leak source) [ASSUMED] | **official: the other movement class is not spawned** (research 08 §2.3 + the PRTS screenshots) |
| Faction mixing | was: every round a ground entry + a FLY entry | **official: one entry per round from a 15-slot type schedule** |
| `MOVE_SCALE` 0.5 | every level's `moveMultiplier` 0.5 (05 §2.2) | kept |
| **Combat time limit unit** | `maxPlayTime` read as game seconds [ASSUMED] | **wrong — real seconds; fixed** (§2.1) |
| Boss pool | bloodPoint DATA = the current game data (activity_table act2autochess bossInfoDict; the local cache equals upstream ArknightsGameData master, checked 2026-10-01). PRTS Alliance Records's leader table is the older Nov 18 revision: it matches regular and most of Hazard, but differs for Gun Hazard (450 000 vs 400 000) and Armor / Gun / Sami Peril (1 600 000 / 870 000 / 1 800 000 vs 1 800 000 / 800 000 / 2 000 000), and has no Ultimate column or Lucian row; one pool for every field ("everyone deals damage to the enemy leader together"); "the enemy leader's total LP is unchanged" = the mirrored copies of a pair field share it (notice 5114) | **co-op = bloodPoint whatever the alive count**; × alive / 4 is a config switch (`aliveScaling`, off: Bahamut 12294 "when online teammates … decrease, the final boss's health bar also decreases" is one community note without a proportion, awaiting the user's recall); solo ×0.25 kept [ASSUMED]; the solo Standard ×0.6 removed |
| Leader parts / Armor drones / same-named debuffs / Steadfast thorns | PRTS Gunshatter, “Armor Cleaver”, “Armor Crusher” "when hit, makes … take an equal amount of sourceless HP loss"; PRTS OpFor: Armor "when that Monster dies it makes OpFor: Armor take true damage equal to 2% of max HP" (which max HP: [ASSUMED]); PRTS combat mechanics: same-name buffs show only one by default, Bahamut 12316 "shared buffs compete with the opposing side"; Steadfast "the damage source takes (850+10×L) arts damage" | **parts 1:1 (was ½, blade/hammer only grounded); drone 2 % of the pool (unchanged; the unit-HP reading was tried and reverted); Arcane / Gnosis permafrost / Leonhardt & Texas the Omertosa RES cut: one instance per target (was one per player / copy); thorns credited to the member (was to nobody)** — 2026-10-01, DESIGN §20.10 |
| Bonus stacking | was: each bond / strategy / item / draft / trait "+X%" its own ×(1 + x) (research 02 §2.1) | **official direct multiplication: summed with each other and with skill "+X%"** (PRTS Alliance Records "…stat bonuses are all direct multiplication", game data basics D_t = Σtᵢ); 2026-10-01, DESIGN §20.10 |
| Solo bounties ×0.7 | first half 11/18 note = the global solo base | **removed** (already in enemyScale) |
| Bounty spawn timing | was: the bounty units appended after the host action's own units | **official: inserted among them at floor((i+1)·len/(n+1)), then the list spread over the window** (client `_InsertSpActionToNormal` + `_CalculateActionPredelay`, decoded; `waves.js withBounties`) |
| Unite spawn timing | was: owner k at +min(0.5·k, 5) s, each owner's units over the whole window [ASSUMED] | **official (decoded `_CalculateActionPredelayConsiderUid`): owner k at +0.5·k s, unit step min(max(W/M, 0.05·W), 5 s), M = largest owner group** — a lone leaker's units now come 5 s apart instead of up to 40 s |
| Leader / leader-part multipliers | was: leaders and their parts never scaled | **official: the round multipliers are the ENEMY effects Siege Equipment / II / III / supply line / forced march (`enemy_attribute_mul`; `enemy_exclude` = Yan's Protection — plus the TIMES tokens for supply line — never a leader) ⇒ parts take HP/ATK/speed, the leader ATK/speed; only the leader's HP (the server pool) is exempt** ("the leader unit's LP bonus on the server is not affected by the above bonuses"). Co-op Ultimate R14: leader ATK ×2.14; solo Standard: ×0.7 |
| Ground routes | was: 8-dir A*, m02 crates active | **official 4-dir SPFA + smoothing, crates cost 1000, m02 without crates** (research 08 §3) |
| Income / upgrade curve | R1–R3 VERIFIED, +1/round cap 12 ASSUMED | kept (the model's level curve follows it) |
| Operator stats per tier | chess status T1 E1 L55 … T6 E2 L1, elites E2 + skill 7 (03) — DATA | faithful: power comes from layers, elites and skills, which is why the model carries them |
| Player power in the bots | bots fielded T1-heavy boards with 0–3 elites and 20–70 layers per bond at R13 | bot fixes (§5) |

### 2.1 Combat time limits are real seconds (fidelity fix)

`maxPlayTime` counts **real** seconds of the forced 2× battle. Read as game seconds (the old assumption) the rounds' own
spawn schedules do not fit: R2 spawns its last flyer at 43 s of a 45 s limit, R3 its last enemies at 60–62 s of a 55 s
limit (they could never be killed, or never even spawned). As real seconds (× 2 in game seconds) every limit is ≈ the
last spawn + one flyer crossing of the board (≈ 44 s serpentine at 0.45 tiles/s): R2 43 + 44 ≈ 90, R3 62 + 44 ≈ 110,
R5 38 + 67 ≈ 110 (Bombtail at 0.3 tiles/s).

| R | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `maxPlayTime` (real s) | 45 | 45 | 55 | 55 | 55 | 70 | 85 | 85 | 95 | 95 | 115 | 115 | 115 |
| last spawn (game s) | 15 | 43 | 62 | 39 | 38 | 42 | 56 | 67 | 75 | 59 | 68 | 60 | 73 |
| slack, old reading | 30 | **2** | **−7** | 16 | 17 | 28 | 29 | 18 | 20 | 36 | 47 | 55 | 42 |
| slack, fixed (× 2) | 75 | 47 | 48 | 71 | 72 | 98 | 114 | 103 | 115 | 131 | 162 | 170 | 157 |

Before the fix 90–100 % of the early "leaks" were enemies still alive (often just spawned) at the limit, not enemies that
reached the objective. `gd.combatTimeLimit(r)` now returns game seconds (`config.combatTimeScale`, default 2); the
player-facing combat countdown is unchanged (= `maxPlayTime` real seconds). Research 00-INDEX §8 #10 should be updated
by its owner.

### 2.2 The fly placeholders (resolved)

The previous pass measured that the kept fly placeholders (Frost DEF 600, Bombtail) were the most frequent leakers and left a
`flyPlaceholders` knob for experiments. The official client settles it: a placeholder whose class differs from the
round's pick is `isValid = false` — not spawned, not sent, not previewed (research 08 §2.3). The knob is gone.

---

## 3. Measurement per round (official numbers)

Capped leaks per board (16 solo samples / 6 co-op matches × 4 boards per round), `--tuning off` (identical: the
tuning file holds only titles), seed 1, rehearsal 5. Leader columns: win rate, share of the pool dealt by 150 s, mean
kill time (8 samples). Re-measured after the review fixes (decoded Unite timing; leaders take the round ATK / speed
multipliers, their parts all of them): normal rounds unchanged, leader rounds and LP/rd as below.

| mode | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | avg | LP/rd |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Solo Standard | 0.13 | 0.06 | 0.00 | 0.13 | 0.63 | 0.00 | 0.25 | 0.19 | – | – | – | – | – | 0.17 | 0.17 |
| Solo Hazard | 0.00 | 0.00 | 0.00 | 0.31 | 0.00 | 0.00 | 0.63 | 0.19 | 0.06 | 0.00 | 0.00 | 0.63 | 0.63 | 0.19 | 0.19 |
| Solo Peril | 0.00 | 0.00 | 0.00 | 0.00 | 0.38 | 0.00 | 0.00 | 0.25 | 0.63 | 0.50 | 0.44 | 0.63 | 0.00 | 0.22 | 0.22 |
| Solo Ultimate | 0.13 | 0.00 | 0.19 | 0.25 | 1.00 | 0.88 | 0.44 | 0.81 | 1.50 | 0.94 | 1.13 | 0.06 | 1.19 | 0.65 | 0.65 |
| Alliance Standard | 0.00 | 0.54 | 0.00 | 0.00 | 1.13 | 0.00 | 1.25 | 0.13 | 0.88 | 0.04 | 0.00 | 0.04 | 0.00 | 0.31 | 0.13 |
| Alliance Hazard | 0.00 | 0.00 | 0.83 | 0.17 | 0.00 | 0.00 | 0.17 | 0.25 | 1.58 | 0.04 | 0.46 | 2.21 | 0.71 | 0.49 | 0.01 |
| Alliance Peril | 0.00 | 0.00 | 0.38 | 1.00 | 0.71 | 1.17 | 0.50 | 0.92 | 1.88 | 2.50 | 0.63 | 0.71 | 0.00 | 0.80 | 0.10 |
| Alliance Ultimate | 0.00 | 0.04 | 0.21 | 0.92 | 0.83 | 2.79 | 4.00 | 6.00 | 3.83 | 1.29 | 3.71 | 0.83 | 0.96 | 1.96 | 0.93 |

| mode | Final Assault (R14; solo Standard R9) | Hidden Core (R15) |
|---|---|---|
| Solo Standard | pool 64k · win 50 % · 80 % by 150 s · 89.8 s | – |
| Solo Hazard | pool 169k · win 88 % · 97 % · 19.5 s | pool 237k · win 100 % · 100 % · 22.2 s |
| Solo Peril | pool 456k · win 63 % · 86 % · 57.0 s | pool 869k · win 50 % · 70 % · 71.1 s |
| Solo Ultimate | pool 899k · win 38 % · 79 % · 42.0 s | pool 1.63M · win 25 % · 48 % · 44.9 s |
| Alliance Standard | pool 224k · win 100 % · 100 % · 18.0 s | – |
| Alliance Hazard | pool 550k · win 100 % · 100 % · 22.0 s | pool 919k · win 100 % · 100 % · 37.8 s |
| Alliance Peril | pool 1.68M · win 88 % · 99 % · 32.6 s | pool 3.42M · win 88 % · 94 % · 100.9 s |
| Alliance Ultimate | pool 3.70M · win 88 % · 95 % · 41.9 s | pool 6.08M · win 75 % · 87 % · 92.6 s |

**2026-10-01 — OpFor: Armor audit** (content/bosses.js `kitHelm` / `kitBlade`, PRTS): one Armor Piercer below 20 % as well
(ability modifier), shells only at operators in range (boss_1 too), any drone death costs 2 %, blade / hammer sorties per PRTS (【Paralyzed】
10 s instead of 20 s, 100 % of their damage passed to Armor also during the dive instead of 50 % while grounded, a fresh copy
after every sortie, so throw comes back after its initial 25 / 55 s instead of the 80 s cooldown; hammer hits 150 % ATK).
Same-seed `--boss-only` before → after: boss_1 unchanged (≤ 0.5 s); boss_8 Solo Peril 44.7 → 45.2 s, Solo Ultimate win
2/3 → 3/3, Alliance Peril 23.3 → 23.7 s, Alliance Ultimate 72.0 → 64.2 s (n = 3–5 per cell). The leader columns above are from an
earlier commit (a current run differs for every leader) and were not refreshed here.

Reading: the early game is easy everywhere (official R1–R3 bring 3–10 enemies); leaks concentrate on the second-half
specials (Dublinn Flamechaser TIMES embers, stealth Invisible Crossbowman Leader / Heavy Crossbowman Ambusher, Rampaging Rotchaser, Skimming Sea Drifter) and Ultimate R6–R11, where co-op
boards still leak 3–6 and Unite halves the LP cost. Solo leaders (bloodPoint × 0.25 [ASSUMED]) are the hard part of the
solo modes; the solo pool factor is the one open number here (research 08 §8 #2).

Reproduce: `node tools/balance.mjs --mode all --difficulty ALL --tuning off [--bots 5] [--json]`.

**2026-10-01 — direct multiplication stacking and the leader pool (DESIGN §20.10).** The tables above were measured while every bond /
strategy / item "+X%" compounded. With the official summing, leader rounds of the same model (`--boss-only --boss-samples 8
--rehearsal 0`, mean kill time in **game** seconds; 2× = real): Alliance Ultimate 35.6 → 59.7 (Hidden Core 104.9 → 143.9, win 100 → 88 %),
Alliance Peril 25.1 → 37.0 (38.5 → 80.8), Alliance Hazard 14.0 → 17.8, Solo Ultimate 91.1 → 128.5, Solo Peril 42.0 → 73.7. Replaying the
same R14 lineups of 4-AI Ultimate matches (seeds 1–3, every leader; the fights dumped with the old code and replayed with
both): median kill 175 → 247 real s at the bots' own layers (Σ 36–361 per player), 65 → 109 s at +100 layers per active
bond, 37 → 61 s at +200, 25 → 40 s at +400; Peril 97 → 106, 25 → 43, 16 → 28, 10.5 → 19.7 s. Bot matches (`matchrun`, 8
seeds) pass fewer rounds: Alliance Hazard 14.0 → 13.6, Peril 12.0 → 11.4, Ultimate 10.1 → 9.9; Solo Hazard 13.5 → 12.6 (wins 6 → 3 of 8),
Peril 12.9 → 12.6, Ultimate 9.5 → 9.1.

**2026-10-01 (review rounds) — Arcane and the other same-named debuffs one instance, leader parts 1:1, fixed pool, Steadfast
thorns credited.** Replays of the R14 boards of 4-AI co-op matches (seeds 7–9 × boss_1…7 × Ultimate / Peril = 21 fights per
row, both pair fields on one pool, +L layers on every active bond; real seconds, ∞ = not killed in 200 s), v2.5 →
direct multiplication → now — measured on the boss-HP workstream's boards, **before** the elite-to-board merge (DESIGN §20.11) changed
what the bots build; the integrated build's numbers are in the 2026-10-02 table below:

| mode | +L | Σ active layers / player | median kill | fastest | kills < 10 s | kills < 20 s |
|---|---|---|---|---|---|---|
| Ultimate | 0 | 251 (210–404) | ∞ → ∞ → ∞ (8 → 6 → 6 kills) | 90.7 → 126.5 → 126.5 | 0 | 0 |
| Ultimate | 100 | 892 (793–1204) | 61.4 → 85.8 → 102.6 | 20.0 → 22.5 → 54.7 | 0 | 0 |
| Ultimate | 200 | 1532 (1343–2004) | 30.9 → 43.4 → 56.0 | 9.2 → 9.7 → 20.1 | 1 → 1 → 0 | 9 → 4 → 0 |
| Ultimate | 400 | 2813 (2443–3604) | 16.4 → 23.9 → 23.9 | 2.6 → 2.7 → 9.0 | 7 → 4 → 1 | 13 → 10 → 8 |
| Peril | 0 | 257 (224–423) | 66.5 → 81.3 → 81.3 | 21.7 → 41.0 → 41.0 | 0 | 0 |
| Peril | 100 | 900 (824–1277) | 16.0 → 23.5 → 23.5 | 10.8 → 11.7 → 11.7 | 0 | 13 → 8 → 8 |
| Peril | 200 | 1543 (1424–2177) | 11.7 → 14.2 → 14.2 | 7.4 → 7.8 → 8.8 | 5 → 5 → 5 | 19 → 16 → 16 |
| Peril | 400 | 2829 (2624–3977) | 8.4 → 9.2 → 9.2 | 2.1 → 2.0 → 2.7 | 16 → 12 → 12 | 21 |

The Arcane fix moves the fields where both players run Arcane (Ultimate seed 7: leader arts damage taken ×40 → ×7.6 at +400, kills
2.7 → 9.0 s; 9.7 → 20.1 s at +200). Armor's drones stay at 2 % of the pool (v2.5; 12–44 % of the pool damage at the bots'
layers, 2–16 % at +200): the second review round's unit-HP reading (12 000 per drone) is reverted — it made a drone 19 %
of a solo Standard bar (solo Armor replays, seeds 13 / 21 / 31: drones 10 → 78 % of the pool, kill 144 → 78 s); with the pool
reading the solo fights are back at v2.5 (drones 4–30 %) and only direct multiplication slows them (Standard none / +100 / +200: kill
times = v2.5 or up to +4 s; Ultimate / Peril +100: 16 → 25 s, 69 → 101 s, 90 → 135 s). Steadfast thorns now count for the member's
player: on the second reviewer's 28 co-op boards the unattributed share of the leader damage drops from up to 27 % (58 %
with each player's main bond at 999) to 0, a solo Standard Armor fight's from 88 % to 0; kill times are unchanged. What still kills a Peril leader in
3 s at Σ ≈ 3000 layers per player is official per-layer scaling without caps (Yan +0.9 %/layer ATK, Victoria ×(1.25 +
0.008 L), Precision +1.2 %/layer, Steadfast thorns 850 + 10 L every 0.2 s) — the community reports the same in the official game
(Bahamut 12522: 999 Kjerag + 301 Dexterity + 122 Yan at R14 "boss dies in one second"). Since 2026-10-01 a bond stops at 999 layers
(`BOND_LAYER_CAP`, official: the client's `MAX_GARRISON_STACK`, research 11 §1 and §7 below — the game data has no such
constant, and the community never names a count above 999: Bahamut 12534 "every one can reach 999 layers", "in the case of an Alliance without 999 layers"; v2.5 kept
growing). On the 42 boards of the table above it changes nothing up to
+400 (no bond passes 568); with each player's top bond at 1500 it holds that bond at 999: Ultimate median 82.1 → 101 s
(16–17 of 21 killed), fastest 19.9 → 31.4 s; Peril median 12.2 → 19.6 s, fastest 6.7 → 8.6 s (uncapped at 2500: Ultimate
median 54.9 s, fastest 12.0 s; Peril 8.2 s / 3.4 s). "damage cap" (Bahamut 12316 "with 999 Kjerag, never light Arcane … big-skill Pramanix gets damage-capped and deals nothing") is the official boss-hit limit, not an overflow: the client cancels a single leader hit of ≥ 300000 in boss
battles (`MAX_BATTLE_DAMAGE`, research 11 §2, `BOSS_HIT_LIMIT` — §7). An earlier reading of this note (an engine
fixed-point overflow at 2³¹, not modelled) is superseded by that binary evidence. The largest damage instance on a
leader in all the measurements here is 144 000 (a hidden Armor drone at Ultimate; from an operator 141 323 at +400 layers;
245 493 with an uncapped 2500-layer bond), below the line, so the limit leaves these numbers unchanged — for these
profiles (up to +400 per bond, a top bond at 999); with two bonds or every bond at 999 it cancels hits and changes the
kill times (the 2026-10-02 table below). Hidden Core (36 fights, boss_8–10, +30 / +100 at R14): hidden Gun kills 5 → 3 → 5 of 12
(pool dealt by 200 s 82 → 61 → 80 %; the springs' 1:1 transfer is 55–85 % of its damage); hidden Armor 10 → 6 → 9 of 12
(drones median 16–33 % of the pool damage, v2.5 12–32 %; blade / hammer transfer 10–11 → 22–25 %); hidden Pipe 12 → 11 → 11 of 12.

**2026-10-02 — the integrated build (QA 6b, `cca11e6`: boss HP + elite to the board + official limits + the Armor audit).**
The R14 boards of real 4-AI co-op matches, seeds 7 / 8 / 9 / 12 × boss_1…7 (28 Final Assaults per row; Hidden Core
boss_8–10, 12 per row), both pair fields on one pool, the same boards replayed on v2.5 → now. Real seconds (the QA tables
are in game seconds: ÷ 2); "cancelled" = hits stopped by damage cap on the integrated build. Profiles: own = the bots' layers
(Σ ≈ 230 active per player), +L on every active bond (Σ ≈ 1500 / 2650–2960), top-2 = each player's two highest bonds at
999 (Σ ≈ 2050), all = every active bond at 999 (Σ ≈ 6000–7000).

| fight | profile | median kill | fastest | kills < 5 s | cancelled | biggest landed hit |
|---|---|---|---|---|---|---|
| Ultimate Final Assault | own | 206 → 258 | 88 → 114 | 0 → 0 | 0 | 72k → 72k |
| Ultimate Final Assault | +200 | 24.5 → 42.1 | 8.2 → 18.9 | 0 → 0 | 0 | 180k → 72k |
| Ultimate Final Assault | +400 | 11.3 → 16.8 | 3.7 → 9.2 | 2 → 0 | 0 | 402k → 114k |
| Ultimate Final Assault | top-2 | 28.5 → 47.8 | 4.2 → 7.5 | 2 → 0 | 6 | 828k → 274k |
| Ultimate Final Assault | all | 5.0 → 8.3 | 1.2 → 3.4 | 14 → 9 | 18 | 2.38M → 300k |
| Peril Final Assault | own | 79 → 99 | 19 → 32 | 0 → 0 | 0 | 44k → 36k |
| Peril Final Assault | +200 | 11.6 → 14.8 | 1.9 → 7.3 | 3 → 0 | 0 | 148k → 51k |
| Peril Final Assault | +400 | 6.1 → 8.6 | 0.8 → 3.6 | 7 → 1 | 0 | 347k → 108k |
| Peril Final Assault | top-2 | 9.7 → 10.0 | 1.1 → 2.6 | 9 → 7 | 7 | 398k → 267k |
| Peril Final Assault | all | 2.4 → 3.7 | 0.2 → 1.7 | 26 → 20 | 10 | 1.76M → 266k |
| Ultimate Hidden Core | own | 345 → 352 | 138 → 167 | – | 0 | 144k drone |
| Ultimate Hidden Core | +200 | 49 → 80 | 25 → 42 | – | 0 | 144k drone |
| Ultimate Hidden Core | +400 | 18.6 → 27.3 | 10 → 20 | – | 0 | 144k drone |
| Ultimate Hidden Core | all | 7.2 → 14.7 | 3.7 → 8.0 | – | 77 | – |
| Peril Hidden Core | +200 | 20 → 34 | – | – | 0 | – |
| Peril Hidden Core | +400 | 10 → 15 | – | – | 0 | – |
| Peril Hidden Core | all | 4.3 → 7.8 | 0.3 → 2.1 | – | 14 | – |

Each player's top bond requested at 1500 (held at 999 now): Ultimate median 53 → 95 s, Peril 17.5 → 33 s. Same boards: now is
1.2–2.1× slower in every row. On each version's own bot boards the medians moved only ×1.0–1.2 (Ultimate own 256 → 258 s,
+200 47 → 54 s; Peril own 81 → 99 s, +200 13 → 15 s; defeats at Ultimate own 4 → 3 of 28, all boss_4 Quintus), because the
elite-to-board rule gives the bots slightly stronger R14 boards (Ultimate 2.12 → 2.26 elites per player, Peril 2.14 → 2.51;
Peril 6.0 → 6.9 active bonds). Pool composition now: Final Assault drone link 3.7 % at own / 0.8 % at +400, the rest
direct, 0 % unattributed; Hidden Core drones 20.7 % / 1.8 %, blade / hammer and spring transfers 16.3 % / 21.1 %. What still
kills in seconds at ≈ 2000+ layers per player is official uncapped per-layer scaling (Kjerag vs cold ×11.34, Arcane ×15.7,
Precision +1208.8 % ATK at 999), which damage cap bounds per hit only. Matchrun (co-op 4 AI, rounds passed v2.5 → now): Standard 14.00 →
14.00, Hazard 13.81 → 13.88, Peril 12.41 → 12.06 (Final Assault wins 8 → 5 of 32), Ultimate 9.47 → 9.47.

---

## 4. The tuning — removed

The previous pass layered per-round enemy HP × s / ATK × √s (all 8 modes, e.g. Alliance Hazard R13 HP × 0.55) and the solo
Standard leader pool × 0.6 on top of the research numbers, to compensate for the old generator's 2–4× enemy counts. Research
08 decoded the official generator, so the compensation is gone together with its cause: `data/tuning.json` keeps only
`titles.comment_3` (Rock Solid = least LP lost), `gamedata.js` has no multiplier layer (`enemyScale(r)` = the config table,
`bossHpMul()` = 1, `bossPoolHp()` = the official pool). Difficulty questions are now answered by measuring (§3), not by
tuning. `tools/balance.mjs --tuning` remains accepted and has no effect on the numbers.

---

## 5. Bots (server/match/bot.js)

As found the bots lost every merge reward made while buying (the free pick-one offer queued by a merge expires at prep
end; they only looked at offers when the prep opened), levelled late (L2 at R4 … L6 at R13), valued a T6 barely above a
T1 and ignored the trait that produce layers — at R13 they fielded T1-heavy boards with 0–3 elites and 20–70 layers per
bond (model: 6 elites, 130 / 75). Changes: offers are taken after every buy loop, the level curve is the competent one
(early levels only with a full board), tier power 10 → 25 (was 19.5 for T6), recurring layer trait (every prep /
refresh) and on gain layer / economy trait add value, and boss rounds are planned against the boss field (the leader
counts as 10 tough enemies with a 30 s dwell on its first tiles, so stationary leaders such as Alistair get hit).

| mode | as found (before the fixes*) | research + time fix | **tuned** | **official waves (now, seeds 1–5)** |
|---|---|---|---|---|
| Solo Standard (1 AI) | 6.7 rounds · 3/10 wins · [5 5 9 9 5 7 6 8 4 9] | 8.1 rounds · 5/10 wins · [7 7 9 9 6 8 9 9 8 9] | **8.9 rounds · 9/10 wins · [9 9 9 9 8 9 9 9 9 9]** | **8.8 · 4/5 · [9 9 9 9 8]** |
| Solo Hazard (1 AI) | 6.5 rounds · 1/10 wins · [5 4 11 4 5 9 3 7 3 14] | 8.4 rounds · 1/10 wins · [7 6 13 6 8 11 6 8 5 14] | **10.1 rounds · 3/10 wins · [9 14 14 7 9 11 9 9 5 14]** | **13.2 · 3/5 · [14 14 13 14 11]** |
| Solo Peril (1 AI) | 6.9 rounds · 1/10 wins · [5 5 11 5 5 7 3 14 3 11] | 8.6 rounds · 1/10 wins · [7 5 12 8 13 8 6 9 4 14] | **8.6 rounds · 1/10 wins · [7 5 12 8 13 8 6 9 4 14]** | **13.2 · 1/5 · [13 14 13 13 13]** |
| Solo Ultimate (1 AI) | 5.0 rounds · 0/10 wins · [4 4 7 3 3 7 3 7 3 9] | 5.9 rounds · 0/10 wins · [5 4 8 5 5 7 4 7 4 10] | **6.1 rounds · 0/10 wins · [5 4 10 5 4 7 4 7 4 11]** | **11.4 · 0/5 · [13 8 13 11 12]** |
| Alliance Standard (4 AI) | 9.1 rounds · 2/10 wins · [9 4 14 11 9 11 6 8 5 14] | 11.6 rounds · 3/10 wins · [11 8 14 12 13 14 8 11 11 14] | **14.0 rounds · 10/10 wins · [14 14 14 14 14 14 14 14 14 14]** | **14.0 · 5/5 · [14 14 14 14 14]** |
| Alliance Hazard (4 AI) | 6.6 rounds · 0/10 wins · [9 4 8 7 8 6 5 6 4 9] | 9.3 rounds · 0/10 wins · [10 6 12 11 10 7 7 9 9 12] | **11.1 rounds · 2/10 wins · [11 8 14 11 12 7 13 10 11 14]** | **14.0 · 5/5 · [14 14 14 14 14]** |
| Alliance Peril (4 AI) | 4.9 rounds · 0/10 wins · [6 4 6 4 6 6 5 4 3 5] | 7.0 rounds · 0/10 wins · [7 5 8 7 7 7 6 8 5 10] | **8.9 rounds · 0/10 wins · [9 6 10 9 9 8 8 11 7 12]** | **11.2 · 0/5 · [12 9 13 10 12]** |
| Alliance Ultimate (4 AI) | 5.2 rounds · 0/10 wins · [6 4 6 5 5 6 5 5 4 6] | 6.3 rounds · 0/10 wins · [6 5 7 6 6 7 6 6 5 9] | **7.2 rounds · 0/10 wins · [6 5 9 6 8 7 7 8 6 10]** | **9.8 · 0/5 · [10 7 13 8 11]** |

Official-waves column: `node tools/balance.mjs --mode all --difficulty ALL --bots 5` (rounds passed avg · wins · per
seed), measured before the review's leader-multiplier / Unite-timing fixes (§2; not re-run); the other columns are the
previous pass (old generator), kept for history. \* the bot code of this pass (§5) with the old time reading and no tuning; the originally reported bots (old bot code) survived ≈ 6.5 rounds on Hazard and won 1/20 on Standard.

**Player feedback after 0.1.0 (#10 "the bots are a bit too dumb").** Measured first (`tools/botbench.mjs`): the 0.1.0 bots refreshed
0–2 times a prep and bought side-grade singles they sold again at a loss (every sale returns 1), so they merged ≈ 2
times a match and fielded ≈ 2 elites at R13; in co-op Peril ≈ 1 in 2 of their bounty picks leaked (solo 10 of 80; the
old score ignored the enemy); Beacon went on the best operator (it destroys its carrier) and a level-up could spend the
funds a third copy in the shop needed. Changes (server/match/bot.js header, META §1.5): refresh-vs-buy by the shop odds
of completing held pairs, the freeze for an unaffordable third copy, merges before level-ups, a committed focus /
second bond (a teammate's main bond read from its bond strip), armour-aware DPS, bounty picks by expected value from
the exposure model, item carriers by effect, Cannot banking its interest capital, a tactician's reinforcements inside its range.
Same seeds (1–40) old → new, the match's default rehearsal (3):

| config | wins | rounds passed | LP left | leaks / match | bounty enemies leaked | merges / bot | elites at R13 |
|---|---|---|---|---|---|---|---|
| Solo Standard (1 AI) | 35 → 35 / 40 | 8.80 → 8.80 | 29.9 → 28.6 | 2.5 → 3.3 | 1 → 1 | 1.40 → 2.25 | – (R7: 0.7 → 1.0) |
| Solo Peril (1 AI) | 19 → 26 / 40 | 13.05 → 13.35 | 14.3 → 16.6 | 26.5 → 19.7 | 10 → 8 of 80 picks | 2.33 → 4.10 | 1.8 → 2.2 |
| Alliance Standard (4 AI) | 40 → 40 / 40 | 14.00 → 14.00 | 110.0 → 112.2 | 39.4 → 33.1 | 6 → 6 | 2.59 → 4.10 | 1.9 → 2.3 |
| Alliance Peril (4 AI) | 5 → 12 / 40 | 11.85 → 12.32 | 5.1 → 12.7 | 224.6 → 212.6 | 155 → 148 of ≈ 310 picks | 2.00 → 2.97 | 2.3 → 2.8 |

Peril leaks per alive bot in R12 / R13: solo 8.0 / 9.2 → 5.7 / 4.8, co-op 20.5 / 20.7 → 18.5 / 15.8. Co-op bounty leaks
are bound by the drafts, not the pick: in 223 of the 312 co-op Peril bounty picks no card still on offer had a kill
chance ≥ 0.5 (solo 22 of 80), and only 5 picks (solo 0) took a card below 0.5 while one ≥ 0.5 was on offer — re-measure
after the bounty-half fix (player report #2). Strategies played alone (solo Peril, seeds 201–220, forced with `--band`):
Cannot 9 → 14 wins of 20, Quintus 9 → 11, Dobermann 8 → 9 (keeping an unused Teacher's Pointer vs dropping it: 11 vs 11 wins over 24 Dobermann
matches — kept, as it costs nothing but a hand slot). Decision time per bot prep is unchanged (one thread, back to back
on a quiet host, seeds 1–6, solo Peril / co-op Peril; the rehearsal included): wall clock p50 / p95 94 / 191 → 89 / 205 ms
and 86 / 175 → 83 / 162 ms, CPU 131 / 314 → 124 / 329 ms and 97 / 209 → 91 / 188 ms; the heuristics alone (CPU) 31 / 74
→ 28 / 70 ms and 17 / 39 → 17 / 38 ms (the lineup search tries identical pieces once and reuses the lineup across
refreshes); a draft pick 0.07 → 0.15 ms (p50). Over the 40-seed A/B the summed prep CPU per match moved −6 % … +2 %. The
tuning sweeps used seeds 101–148 with the rehearsal off; the tables above are separate seed ranges.

**0.1.1 integration (DESIGN §21.6).** With all 18 workstreams merged (the official bounty draft structures, the AoE,
displacement and enemy fixes) the same bot on the same seeds wins 27 / 40 solo Peril and 9 / 40 co-op Peril (co-op bounty
enemies leaked 120 of 380 picks: 232 drafts offered no card at a kill chance ≥ 0.5 — the R9 boss groups). The bot was
then reconciled with the merged rules: it plans each unit with the range it is deployed with (`rangeRec`:
`attackRangeGrid`, the server's `summonRange` grid — no outcome changed on these seeds) and values an attack on every
enemy in range ×2 (Phalanx Caster / Blast Caster, now `rangeAoe`), a splash ×1.3 and a chain ×1.4 [ASSUMED] (`CROWD`). Seeds 1–40,
rehearsal 3, before → after: solo Peril 27 → 27 wins, LP left 17.9 → 18.4, bounty enemies leaked 8 → 5 of 104; co-op Peril
9 → 11 wins, LP left 14.8 → 14.1, leaks per match 215 → 220 — within the noise of 40 seeds (the ×2-only variant: 25 /
11 wins). Decision time stays at the WF numbers (one thread, back to back, seeds 1–6): heuristics CPU p50 / p95 25 / 59
→ 24 / 57 ms solo and 16 / 36 → 16 / 36 ms co-op; the whole prep with its rehearsal wall clock 80 / 148 → 78 / 153 ms and
74 / 152 → 73 / 151 ms.

**0.1.1 after the QA (DESIGN §21.6, §21.19).** Seeds 1–40, rehearsal 3 (wins solo Peril / co-op Peril, 4 AI): the merged
build `dbd45c8` 27 / 11; with WB's 22-match bounty lists (a rule change: R11 is a bountydecision in 14 of 22 and every R11 bounty
list holds a Special III giant) the same bot 22 / 9 (LP left 16.3 / 10.9); the residual sim fixes change no outcome (22 / 9);
the bench-shed fix (the buy loop's shed never sells a piece that came this prep) 24 / 10 (LP left 17.4 / 13.1, co-op
leaks per match 217 → 210). 0.1.0 on the same seeds: 19 / 5; 0.1.0's bot on the final 0.1.1 rules: 23 / 7 (LP left
14.6 / 5.2, merges per bot 2.2 / 2.0 — the solo gain over 0.1.0 is mostly the rules, the co-op one the bot). The 29 same-prep buy → sell of co-op Peril (2 AI AI takeover + 2
bots, seeds 21–26) drop to 3 (a reward pick's room, `arrange`, `sellJunk`). Decision time unchanged (one thread, seeds
1–3, both builds side by side): the whole prep p50 / p95 81 / 187 → 81 / 184 ms solo and 71 / 153 → 71 / 129 ms co-op,
heuristics CPU 36 / 88 → 35 / 86 ms and 16 / 40 → 16 / 40 ms.

---

## 6. Match follow-ups shipped with this pass

* Bounties with battles left (multi-round cards — "every battle thereafter" — last two battles since playtest #6, META §1.2)
  also spawn in the Final Assault / Hidden Core, on the owner's half (route to its goal), are shown in the boss-round
  preview, and the boss battle uses up one of their battles (kill coins → pending funds for the Hidden Core prep).
* A Reinforcement card is never offered when its bond has no chess left in the match's pool (every member banned).
* docs/META.md §2.6 example guards `ctx.source.kind === 'choice'` (its EffectRef reuses the handler's key).
* Rock Solid = least LP lost (`titles.comment_3 { stat: 'lpLost', rule: 'min' }` in tuning.json; results.js supports
  `rule: 'min'` among the players still alive).
* Teacher's Pointer / “"Mystery Customer"” stay a random bounty, documented in docs/META.md §2.5.

---

## 7. Official limits: 999 layers per bond, damage cap 300000 (research 11, DESIGN §20.12)

Two official caps, now in the sim and the match (`shared/constants.js BOND_LAYER_CAP` / `BOSS_HIT_LIMIT`, 0 / Infinity =
off): a bond's layers stop at 999 (`MAX_GARRISON_STACK`); in the Final Assault / Hidden Core a single hit of ≥ 300000
on a leader is cancelled (`MAX_BATTLE_DAMAGE`: 0 damage, nothing to the pool — not a clamp).

- **Effect on the measurements above: none.** The competent board of §1.1 carries ≈ 150 core layers at R14, far below
  999, and its biggest leader hits stay far under the line — probe of 2026-10-01 (`runBoss` with every leader hit
  recorded, 2 seeds each): Alliance Ultimate R14 competent max 37k (2481 hits), Alliance Ultimate R15 strong (×1.4) max 72k (4669),
  Solo Ultimate R14 strong max 28k (1201); no hit reached 200k, none was cancelled. §3 stays valid. The co-op replay
  profiles of §3 with two bonds or every bond at 999 per player do reach the line (6–77 cancelled hits per row, the
  2026-10-02 table).
- **Where they bind**: the late boards the community describes — 999-layer Kjerag (×11.34 vs cold / frozen), Arcane
  (×11.19 arts taken, a debuff a teammate's board also applies), Yan (ATK ×10.22) — whose single hits run from 160k to
  past 300k. There the limit makes the official co-op leaders as hard to kill as the user asked: a hit past the line
  deals nothing, so extra multipliers can lower the damage, the reason players avoid lighting more damage bonds at 999
  layers. Pools: 200k (Lucian FUNNY) … 7.6M (OpFor: Pipe hidden ABYSS) — in the easy modes one cancelled hit would have
  been the whole pool.
- Bots read the capped `ps.layers`; their boards never come near either line (§5), so their play is unchanged.
- The tools stop at the cap too: `balance.mjs applyBoard` clamps the profile-scaled layer curves (a numeric
  `--profile` above ≈ 4.9 would have pushed the 170-layer R15 core curve, +20 % jitter, past 999) and
  `matchrun.mjs --layers N` adds at most the room left under 999, so `--check` stays clean on a boosted run.
- **Pool size and the line**: a drone that dies (whoever kills it, DESIGN §20.13) costs OpFor: Armor 0.02 × the pool
  max (【Death Swarm】, boss_1 / boss_8; `bosses.js DRONE_LINK_BASE 'pool'`). Today that is at most 144000 (boss_8 ABYSS 7.2M) and lands; a pool above 14999950 would make every
  drone kill a cancelled hit. Re-check this whenever the pool size changes (research 11 §6).

