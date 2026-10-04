# Copyright and usage notice (NOTICE)

**Stronghold Protocol: Alliance** is an **unofficial fan remake** of the *Arknights* limited-time mode "Stronghold Protocol: Alliance". It has **no affiliation** with Shanghai Hypergryph Network Technology Co., Ltd. (Hypergryph), Yostar or their affiliates, and is not authorized or endorsed by them.

## 1. Code license: GPL-3.0-or-later

Copyright (C) 2026 Stronghold-Protocol contributors

The source code and documentation text written by this project itself (the JS / CSS / HTML under `server/`, `shared/`, `public/`, plus `tools/`, `scripts/`, `test/`, `docs/`, etc.) is released under the **GNU General Public License, version 3 or (at your option) any later version** (GPL-3.0-or-later); the full text is in [LICENSE](LICENSE). You may use, modify and redistribute this code under the terms of that license.

Exceptions:

- `tools/local-extract/aklz4.py` comes from [isHarryh/Ark-Unpacker](https://github.com/isHarryh/Ark-Unpacker) and keeps its BSD-3-Clause license (see `tools/local-extract/LICENSE-Ark-Unpacker.txt`).
- The third-party libraries installed via npm (PixiJS, pixi-spine, Preact, htm, three.js, ws, etc.) and the fonts each keep their own license; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

**Additional permission under GNU GPL version 3 section 7:**

> If you modify this Program, or any covered work, by linking or combining it with the Spine Runtimes (as shipped in
> pixi-spine, or a modified version of them), containing parts covered by the terms of the Spine Runtimes License
> Agreement, the licensors of this Program grant you additional permission to convey the resulting work.
> Corresponding Source for a non-source form of such a combination shall include the source code for the parts of
> the Spine Runtimes used as well as that of the covered work.

(In short: you are allowed to redistribute this project combined with the Spine Runtimes in pixi-spine; the Spine Runtimes themselves remain subject to their own license.)

## 2. Content that is not part of this project and is not covered by the GPL

All **names, characters, art, Spine models, UI images, music and sound effects, text and game data** related to *Arknights* and "Stronghold Protocol" are copyright of Shanghai Hypergryph Network Technology Co., Ltd. and its licensees (Yostar and others). Specifically this includes:

- `public/assets/**` in the release bundle (including the 3D board models and textures extracted locally from the official client, `public/assets/local/**`) and `public/fonts/**` (fonts belong to their respective authors);
- `data/*.json` generated from the official data tables, and the `docs/research/*.json`, `test/fixtures/official-waves.json` and `public/dev/recordings/*.json` that contain or are derived from game data;
- the game screenshots in `docs/img/`;
- the official parts of `public/locales/en/*.json` (the English overlay tables): their keys, which are the official Chinese text, and the values that are official Arknights Global (Yostar) English — operator, enemy, skill, module and status texts harvested from the `en_US` client data by `tools/locale.mjs harvest`; the English written for this project in the same files is covered by the GPL;
- the text quoted in `docs/` from community pages such as PRTS, BWIKI, NGA and Bahamut (still under their source's license; wiki text is CC BY-NC-SA).

This content is **not within the scope of the GPL-3.0 license**, and this project has no right to grant anyone any rights to it.

## 3. Non-commercial use only

- This project is for **study, research and personal non-commercial entertainment** only.
- The rights holders of the game assets and data have not authorized this project or its users to make any commercial use of them, so anything that contains or depends on those assets — the release bundle, a server you host, screenshots, recordings, streams and so on — **may not be used for profit of any kind**. This includes but is not limited to:
  - selling or paid distribution;
  - paid hosting, paid rooms or memberships;
  - embedding ads;
  - donations, sponsorships or crowdfunding tied to this project;
  - bundling into any paid product or service.
- When redistributing the bundle, please keep this notice, [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md), and likewise state that it is unofficial and non-commercial.
- The GPL itself permits commercial use of the **code**; the restrictions above apply to the game assets and data, which are not part of this project.

## 4. Rights-holder notice and removal

If you are a relevant rights holder and believe anything in this project is inappropriate, please open an Issue in this repository (or contact the repository owner via GitHub), and we will remove the relevant content — or take down the bundle, or even the whole repository — as soon as possible.

## 5. Disclaimer

- This project is provided "as is", **without any warranty, express or implied** (see LICENSE sections 15 and 16).
- The risks of using, hosting or publishing this project — including network security, third-party networking tools and services, and local laws and regulations — are borne by the user.
- This project does not need and will never ask for any game account; the optional local extraction only reads the client files already installed on your own machine.
