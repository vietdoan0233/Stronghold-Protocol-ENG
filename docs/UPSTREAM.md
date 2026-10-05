# Keeping the English edition in sync

The source repository is [sganggs/Stronghold-Protocol](https://github.com/sganggs/Stronghold-Protocol), whose default
branch is `master`. This repository's `origin` is the English edition; add the source as a second remote once:

```sh
git remote add upstream https://github.com/sganggs/Stronghold-Protocol.git
git fetch upstream
```

Then merge source updates on a dedicated branch:

```sh
git switch main
git status --short
git switch -c sync/upstream-YYYY-MM-DD
git fetch upstream
git merge upstream/master
```

Start with a clean working tree; commit or stash the localization work before creating the sync branch.

Before a large update, review the incoming commits and shared files:

```sh
git log --oneline --left-right main...upstream/master
```

Do not expect every sync to be conflict-free. The game-data translations are separate overlays, but UI and fixed server
messages are English literals in files that upstream also edits. Resolve conflicts by keeping the upstream behavior and
then restoring the English wording at the player-facing boundary. Avoid blanket `ours` / `theirs` resolutions; rerun the
checks below after conflicts are resolved.

The project history began with commits authored by sganggs. Confirm that Git finds a merge base before resolving a sync:

```sh
git merge-base main upstream/master
```

If this prints no commit, stop and compare the histories before merging; do not force an unrelated-history merge.

## Preserve the localization boundary

- Keep upstream `data/*.json` in Chinese. The combat simulator reads Chinese rule descriptions directly, and
  `test/data.test.js` pins the generated files. This project does not translate characters or rewrite backend data.
- The browser replaces display fields through `public/locales/en/*.json`. Each entry maps a complete Chinese source string
  to English. When upstream changes or adds source text, run `node tools/locale.mjs coverage --list`, update the affected
  tables, then run `node tools/locale.mjs check`.
- Server-composed text from game data must cross the display boundary through `L()` in `server/display.js`. Fixed server
  messages and UI strings are English literals in this edition; when their upstream code changes, retain the functional
  change and review the user-facing wording.
- Never translate identifiers, enum values, buff keys, or text consumed by the simulation. See [LOCALE.md](LOCALE.md) for
  the full boundary and [GLOSSARY.md](GLOSSARY.md) for terms.

## Checks after each sync

Run the setup check and the full unit / integration suite, then review the game at desktop and phone widths when a local
browser, art, and fonts are available:

```sh
node tools/setup.mjs --check --no-local
node tools/locale.mjs coverage --list
node tools/locale.mjs check
node --test
```

Pay particular attention to `test/data.test.js`, `test/locale.test.js`, and `test/display.test.js`. If a new server path
sends data-derived text, add it to the `L()` boundary and extend the wire-audit coverage. The browser suites are opt-in;
see [README.md](../README.md#development-and-testing) for the Chrome and asset requirements.
