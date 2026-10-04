# UI wording review assignments (fresh reviewers; read ui-review-brief.md first)

Common: the base commit before the UI translation is `6bd7b00`; the diff command shows the Chinese removed (red) and the English added
(green). The English is current (HEAD of the working tree). Output file: review/ui-<R>.json (array of { file, old, new, why } as the brief says).

## R1 — screens
git diff 6bd7b00 HEAD -- public/js/screens public/css/screens

## R2 — panels and logic
git diff 6bd7b00 HEAD -- public/js/ui/detailPanel.js public/js/ui/gameLogic.js public/js/ui/hud.js public/js/ui/guide.js public/js/ui/bondStrip.js public/js/ui/enemyDrawer.js public/js/ui/loadoutModel.js public/js/ui/matchChrome.js public/js/ui/combatHud.js public/js/ui/underframe.js public/js/ui/teamPanel.js public/js/ui/equipReplace.js public/js/ui/settings.js public/js/ui/connBanner.js public/js/battle/observe.js

## R3 — shop, draft, shell, shared and server texts
git diff 6bd7b00 HEAD -- public/js/ui/shopBar.js public/js/ui/choiceOverlay.js public/js/ui/components.js public/js/ui/matchInfo.js public/js/ui/emotes.js public/js/ui/effectsList.js public/js/ui/toasts.js public/js/ui/gameComponents.js public/js/ui/fallbackField.js public/js/ui/facingWheel.js public/js/ui/facing.js public/js/main.js public/js/net.js public/js/store.js shared/constants.js server/match/Match.js server/match/PlayerState.js server/index.js server/lobby.js server/sim/content/bonds
(for the server files, review only the English strings a player can see: toasts, tickers, error pages, bot names — not code)
