# Glossary — Chinese → English

The English edition's term list: the same Chinese term always maps to the same English term, in the UI (`t()` in
`public/js/**`, the values in `public/i18n/en.json`), in the game-data tables (`tools/i18n/fork/en/*.json`, the source of
the fork's game-text fallback) and in the server's
runtime messages. When a term is missing, add it here **in the same commit** that first uses it.

## Sources, in order of authority

1. **Official Arknights Global (en_US) game data** — `Kengxxiao/ArknightsGameData_YoStar`, `en_US/gamedata/excel/*`:
   operators (`appellation` in `data/chess.json` is already the official English name), enemies
   (`enemy_handbook_table`), skills / talents / traits / modules (`skill_table`, `character_table`, `uniequip_table`),
   status terms (`gamedata_const.termDescriptionDict`), and the earlier season `act1vautochess` of this very mode
   ("Entry Protocol", "Funds", "Supply Level", "Strategy", "Starting Strategy", "Operators", "Unite" wording …).
   Use these verbatim. The official English wording is applied by `tools/build-i18n.mjs` (docs/I18N.md §2).
2. **Established project terms** — the glossary table of docs/I18N.md and the translated docs (`docs/PLAYING.md`, `README.md`).
3. **New wording**, only for mode-specific text with no official English: short, in the voice of the game
   (*Doctor*, *Operators*, *Deploy*, *Retreat*, *Dispatch*), never a word-for-word calque.

## Style

- Buttons, labels, headings, tabs: **Title Case** and short (`Confirm Purchase`, `Enemy Intel`). Sentences, tooltips and
  toasts: sentence case; a full sentence ends with a period, a fragment does not.
- Keep the structural punctuation of the source (`·` separators, `/`, `※`, `→`, `×N`); turn full-width Chinese
  punctuation into ASCII (`，` → `, `, `：` → `: `, `（…）` → ` (…)`, `…` stays `…`).
- `【X】` → `[X]`. `「X」` and `“X”` around a name → straight or curly double quotes, but one style per file.
- Units: 秒 → `s` (`8 s`), 格 → tile(s), 回合 → round(s), 层 / 层数 → stack(s); 积雪层 → layer(s) of snow, 点 → point(s), 级 → `Lv.`, 阶 → *Tier* with
  Roman numerals I–VI (`Tier IV`), 名 (count of people) → no word (`3 operators`).
- Word order follows English: a template such as `已选择「${name}」` becomes `Selected “${name}”`, not a fragment-wise
  translation. Plurals: use `(s)` only where the count is unknown at run time, otherwise branch.
- Numbers, `{0:0%}` placeholders and every rich-text tag (`<@ba.vup>…</>`, `<$ba.stun>…</>`, `\n`) survive translation
  verbatim; only the words inside the tags are translated. Literal `<In Battle>`-style condition markers keep their `<` `>`.
- Identifiers (`bond`, `band`, `hand`, `temp`, ids, enum values, CSS classes, `data-*`, buff keys) are never translated.
- Chinese comments are left as they are; only text a player can see is translated.

## The game and its modes

| 中文 | English | Note |
|---|---|---|
| 卫戍协议：盟约 | Stronghold Protocol: Alliance | the mode / the game |
| 卫戍协议 | Stronghold Protocol | the first season |
| 同盟模拟 / 联合模拟 | Alliance Simulation | the 1–4 player co-op mode |
| 独立模拟 | Solo Simulation | |
| 入门协议 | Entry Protocol | official (act1v) |
| 标准模拟 / 险境模拟 / 绝境模拟 / 终极模拟 | Standard / Perilous / Dire / Ultimate Simulation | difficulties; short form Standard / Perilous / Dire / Ultimate |
| 同盟 (the team of doctors / room) | Alliance | `alliance key` = 同盟密钥, `Create / Join / Leave Alliance`; code says `room` |
| 盟约 (the synergy system) | Alliance | code says `bond`; lower-case *alliance* in running text |
| 核心协同 / 附加协同 | Core Alliance / Add-on Alliance | |
| 博士 | Doctor | `{name} the Doctor` is written `Doctor {name}` |
| 博士代号 | Callsign | |
| 队友 | teammate | |
| AI 队友 / AI 托管 | AI teammate / AI takeover | |
| 创建者 | Host | the player who created the alliance |
| 干员 | Operator | |
| 敌方领袖 | Enemy Leader | |
| 隐秘核心 | Hidden Core | |
| 同盟 vs 独立 | Alliance vs Solo | |

## Phases and the flow of a match

| 中文 | English |
|---|---|
| 确认本局信息 / 本局信息 | Confirm Match Info / Match Info |
| 选择策略 | Choose Strategy (the phase: Strategy draft) |
| 协议启动 | Protocol Start |
| 休整期 | Rest Phase |
| 作战 | Combat |
| 联防 / 联防阶段 | Unite Phase (marked *Uniting* in the top bar) |
| 机变 / 机变阶段 | Draft |
| 结算 | Settlement |
| 最终攻势 | Final Assault |
| 回合 / 第 N 回合 | Round / Round N |
| 决策中 / 决策顺序 | Deciding / Decision Order |
| 暂离 | Step Out |
| 暂停 / 继续作战 | Pause / Resume Combat |
| 离开模拟 / 放弃模拟 | Leave Simulation / Abandon Simulation |
| 模拟完成 / 模拟失败 | Simulation Complete / Simulation Failed |
| 成功卫戍 | Garrison Held |
| 防线已被突破 | The defense line has been breached |
| 完美作战 | Perfect Combat |
| 前往查看 / 返回战场 | Go Watch / Back to Battlefield |
| 观战 | Spectate |
| 玩法说明 | How to Play |
| 调度手册 | Dispatch Manual |
| 交流 | Chat (the emote panel) |

## Economy, board and shop

| 中文 | English |
|---|---|
| 资金 | Funds |
| 生命值 (the team's) / 目标生命值 | LP (Life Points) / Target LP |
| 部署点数 | DP (Deployment Points) |
| 调度中心 | Dispatch Center |
| 整备区 | Reserve |
| 临时整备区 | Temporary Reserve |
| 战场 | Battlefield |
| 战场#N | Battlefield #N |
| 刷新 / 冻结 | Refresh / Freeze |
| 出售 / 撤退 / 销毁 | Sell / Retreat / Destroy |
| 准备就绪 / 取消准备 | Ready / Cancel Ready |
| 确认购买 / 确认选择 / 再次点击确认 | Confirm Purchase / Confirm Selection / click again to confirm |
| 收起 | Fold |
| 升级 / 晋升 / 可晋升 | Upgrade / Promote / Promotable |
| 精锐 / 精英 | Elite (an operator promoted from three copies) / Elite (an enemy rank) |
| 阶 | Tier (I–VI) |
| 装备 | Gear |
| 道具 | Item |
| 盟约之币 | Alliance Coin |
| 悬赏 / 悬赏决策 | Bounty / Bounty Draft |
| 机密商店 | Secret Shop |
| 战术决策 | Tactical Decision |
| 策略 / 分队长 | Strategy (squad leader) |
| 特训敌人 | Special Training enemies |
| 盟约层数 / 效果层数 | stack(s) |
| 积雪层 | layer(s) of snow |
| 休整期结束 | end of the Rest Phase |
| 变形同构体 | Polymorphic Isomorph |
| 突变细胞 | Mutant Cells |
| 维式重锤 | Vice Hammer |
| 已满 | full |

## Alliances (盟约)

Core (nations; the official Terra spellings): 炎 **Yan**, 萨尔贡 **Sargon**, 维多利亚 **Victoria**, 谢拉格 **Kjerag**,
拉特兰 **Laterano**, 阿戈尔 **Ægir**, 叙拉古 **Siracusa**, 卡西米尔 **Kazimierz**. 炎佑 → **Yan's Protection**.

Add-on: 精准 **Precision** · 迅捷 **Swift** · 灵巧 **Dexterity** · 奥术 **Arcane** · 坚守 **Steadfast** · 助力 **Boost** ·
远见 **Foresight** · 奇迹 **Miracle** · 投资人 **Investor** · 突袭 **Raid** · 不屈 **Unyielding** · 调和 **Harmony** ·
协防干员 **Garrison Operator** · 独行 **Lone** · 绝技 **Mastery**.

Titles: 卫戍之星 **Star of the Garrison** · 不朽盟约 **Immortal Alliance** · 坚若磐石 **Rock Solid** · 精英云集
**Elite Gathering** · 万事俱备 **Fully Equipped** · 挥金如土 **Spendthrift**.

Always use **stacks** for Alliance counts and counters, never *layers*. Use **layers** for physical layers and status effects that are explicitly described as layers, such as snow. For an Operator's own Alliances, write “each active alliance this Operator belongs to gains +N stacks”; when activation is not required, write “each alliance this Operator belongs to gains +N stacks (even if inactive).” Name the receiver for fixed or selected Alliances, such as “the active [X] alliance gains +N stacks” or “the currently active alliance with the most stacks gains +N stacks.”

## Operators in the card and the detail panel

| 中文 | English |
|---|---|
| 先锋 / 近卫 / 重装 / 狙击 / 术师 / 医疗 / 辅助 / 特种 | Vanguard / Guard / Defender / Sniper / Caster / Medic / Supporter / Specialist |
| 召唤物 | Summon |
| 特性 / 天赋 / 技能 / 模组 | Trait / Talent / Skill / Module |
| 生命上限 / 攻击 / 防御 / 法术抗性 | Max HP / ATK / DEF / RES |
| 攻击间隔 / 攻击速度 / 阻挡数 / 再部署时间 | Attack Interval / ATK Speed / Block / Redeploy Time |
| 技力 / 初始技力 / 技能消耗 | SP / Initial SP / SP Cost |
| 自动回复 / 攻击回复 / 受击回复 / 被动 | Auto Recovery / Offensive Recovery / Defensive Recovery / Passive |
| 自动触发 | Auto Trigger |
| 攻击范围 / 全场 | Attack Range / Entire Field |
| 物理 / 法术 / 治疗 / 真实 | Physical / Arts / Healing / True |
| 普通 / 精英 / 领袖 (enemy ranks) | Normal / Elite / Leader |
| 实时 / 开战时 | Live / At Battle Start |
| 干员调配 | Operator Loadout |
| 恢复默认 | Reset to Default |
| 默认 | Default |

Status terms (`<$ba.…>`) use the official English of `gamedata_const.termDescriptionDict`: 晕眩 Stun · 沉睡 Sleep ·
冻结 Frozen · 寒冷 Cold · 束缚 Bind · 隐匿 Invisible · 迷彩 Camouflage · 脆弱 Fragile · 护盾 Shield · 庇护 Sanctuary ·
恐惧 Fear · 浮空 Levitate · 近地悬浮 Low-Altitude Hovering · 折射 Refraction · 灼燃损伤 Burn Damage · 神经损伤
Nervous Impairment · 凋亡损伤 Necrosis Damage · 侵蚀损伤 Corrosion Damage · 元素损伤 Elemental Injury · 麻痹 Paralysis.

## Names that are easy to get wrong

Operators / enemies (official): 巫恋 **Shamare**, 锏 **Degenbrecher**, 伺夜 **Vigil**, 洛洛 **Rockrock**, 野鬃 **Wild Mane**,
角峰 **Cardigan**, 假想敌：胄/铳/管 **OpFor: Armor / Gun / Pipe**, 掠海漂移体 **Skimming Sea Drifter**, 深池逐火
**Dublinn Flamechaser**, 鸭爵 **Duck Lord**, 流泪小子 **Crying Thief**, 圆仔 **Fatty**.

Mode-specific names settled in the review (the official wording wins where there is one):

| 中文 | English | Note |
|---|---|---|
| 阻隔工事 / 障碍物 | Roadblock | the crates enemies break through; official en_US. *Barricade* is the official name of a different device (封阻物) |
| 射击台 | Firing Platform | |
| 战栗 / 战栗维式重锤 | Frighten / Frighten Vice Hammer | the official status term |
| 变形同构体 / 变形同构 | Polymorphic Isomorph / Polymorphic Isomorphism | 同构 is *Isomorphic* officially ("Isomorphic Fragment") |
| 画卷 | Picture Scroll | the item; the enemy 诗画卷轴 is the official *Painting Scroll* |
| 通关奖励 | Pro Gamer | the official name of the same strategy effect (act1v) |
| “鼠王” | 'Rat King' | the official enemy name keeps its quotes |
| 盟约·辅助干员 | Alliance · Supporter Operator | the class is a *Supporter* |
| 折桠 / 古米 | Branch / Gummy | the official Global names (the data's appellation is Cyrillic / stylised) |
| AI 队友 names | AI·Warfarin, AI·Amiya, AI·Leizi, AI·Dobermann, AI·Kal'tsit, AI·Closure | `BOT_NAMES` in `server/lobby.js` |

## Terms settled while translating the descriptions

Gear and strategy texts, enemy abilities and the last operator skills (the official English wins where there is one).

| 中文 | English | Note |
|---|---|---|
| 携带者 | carrier | the operator a piece of gear is equipped to (never *bearer* / *wearer*; *Flagbearer* is the official class name) |
| 非精英 / 非精英领袖 | non-Elite / non-Elite, non-Leader | operators that are not promoted; enemies that are neither Elite nor Leader |
| 友方 / 我方单位 | allied unit(s) | the player's side, from the enemy's text; an operator is an *allied operator* |
| 失衡 / 失衡移动 | Shift / shifted | the official *shifted* of "Loses HP proportional to distance moved when shifted"; the forced-movement status |
| 无敌 | Invulnerable | |
| 不可阻挡 / 无法被阻挡 | Unblockable / cannot be blocked | |
| 击落 | shot down | a flying unit brought to the ground |
| 蓄力攻击 | charged attack | |
| 二连击 / 三连击 / 十连击 | two-hit / three-hit / ten-hit combo | |
| 可充能N次 | Can store 1 charge / Can store N charges | Inflect to match the fixed number; do not write “charge(s).” |
| 屏障 / 护盾 | Barrier / Shield | the official *Barrier* (absorbs a set amount) and *Shield* (blocks N hits) |
| 抵抗 | Status Resistance | `<$ba.buffres>`; the official term name |
| 战栗 / 沉睡 / 诱导 / 法术脆弱 | Frighten / Sleep / Lure / Arts Fragility | official status terms |
| 伤害减免 | Damage Reduction | `<$ba.dmgresistance>` |
| 灼痕 | Cinder | official |
| 生息演算 / 集成战略 | Reclamation Algorithm / Integrated Strategies | the other game modes (`<@ba.kw>`) |
| 海嗣 / 深海猎人 | Seaborn / Abyssal Hunter | |
| 替身 | Substitute | Specter the Unchained's stand-in |
| 凛御银灰 / “风雪之眼” / “变革已至” | SilverAsh the Reignfrost / 'Eye of the Blizzard' / 'Change Has Come' | |
| 假想敌：蚀裂 / 淤困 / 骨刺 / 黑云 / 再生 / 镜膜 | OpFor: Erosion / Mire / Bone Spur / Black Cloud / Rebirth / Mirror Film | the bounty enemies |
| “斩胄之剑” / “破胄之锤” / 刺胄之弹 | 'Armor Cleaver' / 'Armor Crusher' / Armor Piercer | OpFor: Armor and its summons |
| “碎铳之簧” / 【盲信之誓】 / 【末日布道】 | 'Gunshatter Spring' / [Vow of Blind Faith] / [Doomsday Sermon] | OpFor: Gun |
| “余音” / 【金黄的悲号】 / 【暗色的喟叹】 | 'Lingering Tone' / [Golden Lament] / [Dusky Sigh] | OpFor: String and OpFor: Pipe (“断弦之音” 'Broken String Tone', “裂管之音” 'Cracked Pipe Tone') |
| 【灭顶之灾】 / 【旧日的剑与锤】 / 【最终之罚】 | [Woe of Extinction] / [Sword and Hammer of Olden Days] / [Final Punishment] | OpFor: Armor |
| 【未尽的告解】 / 【未竟的祷祝】 | [Incomplete Confession] / [Unfinished Prayer] | |
| 【莫非王土】 / 【王权号令】 / 【斥退】 | [Sovereign Domain] / [Royal Command] / [Rebuke] | Alistair |
| 矿工游击队 / 指挥官 / 指令 | Miner Guerrillas / Commander / Order | the Army enemies |
| 某种天命 | 'A Certain Destiny' | the "a certain …" pattern |
| 频次护盾 | Hit-Count Shield | the Shield that breaks after N hits |
| 教鞭 | Teacher's Pointer | |

## Review decisions and remaining questions

Checked during the English-edition audit:

- **失衡 → "Shift / shifted"** is retained from the harvested official Global enemy text.
- **Akkord, 震爆调谐:** the simulator centers each sonic boom on another allied Operator in range and damages enemies in its radius. The description now says so explicitly.
- **Warfarin, Intensive Care:** the simulator adds stacks to all Alliances of one random Operator per distinct tier; the description now states this in natural English.
- **【斥退】 / 【物种爆发】:** the simulator confirms these each deduct 100 from the shared team Life Point pool; Rebuke also deals Arts splash damage to allied units, while Species Outbreak only deducts team Life Points after a delay. The descriptions now distinguish that from Operator HP damage.
- **待部署区 → "the Reserve"** and **部署费用 → "DP cost"** remain the game's consistent UI terms; the usual Global word "undeployed" is less clear for this named area.
- Hand-written descriptions now capitalize **Operator(s)** consistently with official Global text.

Still provisional because the mode has no official English names or descriptions for these:

- **Names invented for the Hidden Core bosses**: see the table above; also 角力对决 *Test of Strength*, 入戏 *in character*,
  频次护盾 *Hit-Count Shield*, 奏 *Recital*.
- **可充能N次:** charge-storage text now uses the singular for 1 and plural for larger counts (for example, “Can store 1 charge” / “Can store 2 charges”).

The `check --terms` alliance warnings for `【X】盟约干员` are intentional: the displayed text is `[X] Operator`, without repeating *Alliance*.
