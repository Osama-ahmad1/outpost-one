# Testing

This page describes **tests found in the repository**. No new gameplay test run or performance measurement is claimed for this documentation-only change.

Run commands from the repository root.

## Existing checks

| Command | Actual coverage |
|---|---|
| `pnpm --filter @workspace/lunar-survival test` | Runs `engine.test.mjs`, `balance.test.mjs` and `balance-benchmark.mjs` in sequence. |
| `pnpm --filter @workspace/lunar-survival run test:balance` | Runs the balance assertions and seeded benchmark. |
| `pnpm --filter @workspace/lunar-survival run test:source-links` | Runs Node tests for the source checker with controlled responses; not live NASA verification. |
| `pnpm --filter @workspace/lunar-survival run check:source-links` | Network availability check of the eight `NASA_SOURCES` entries. Does not establish scientific correctness. |
| `pnpm --filter @workspace/lunar-survival run typecheck` | Runs the game package's TypeScript check. Not proof of every runtime behavior. |
| `NODE_ENV=production PORT=25174 BASE_PATH=/ pnpm --filter @workspace/lunar-survival run build` | Builds the game bundle. Does not test browser journeys or publish anything. |

## Simulation assertions

`src/game/engine.test.mjs` checks:

- Easy, Normal and Hard campaigns reaching eight objectives and 1600 XP.
- Resource consumption and solar generation; state updates not mutating the prior state in tested paths.
- Out-of-range interaction, work cancellation and survey prerequisites.
- Rover and shelter behavior, final relay exit priority and resumed walking.
- All five reserve-exhaustion failure paths and exposed radiation effects.
- Science topic/source structure, engineering explanation structure, archived DONKI metadata and pending verification.
- Optional quiz answers, wrong answers, skipping, repeat prevention and normalization.
- Report fields, measured decision effects, rating thresholds and old learning/report defaults.
- Storm/resource explanations, current-objective guidance and simulation disclaimers.

These are direct function tests. They are **not** eight missions driven through the browser UI.

## Difficulty and benchmark checks

`balance.test.mjs` checks configured drain, warning, radiation, shelter percentages, event interval boundaries, unchanged first-event timing, all six decision effects/text and old pending-event saves.

`balance-benchmark.mjs` uses deterministic random seeds:

- 100 seeds × three strategies × three difficulties = 900 campaign runs.
- Strategies are careful, late shelter after full exposure, and never shelter.
- Another 100 Hard careful runs add ten seconds of decision-reading time per event.
- Assertions require careful wins with minimum reserves above 25 and idle losses.
- Hard full-storm-exposure strategies must lose.
- Full-state digests compare Easy and Normal with stored pre-Hard-change baselines.

This is **1,000 scripted campaign runs per ordinary benchmark execution**, plus rule/idle samples. It is not a study of 1,000 players or a guarantee every possible strategy wins. `--record-baseline` skips benchmark assertions; do not use it as the passing-validation command.

## Source-checker tests

`scripts/check-source-links.test.mjs` exercises HTTPS NASA-only URL rules, redirects, HTTP errors, retries, timeouts, response-type checks, PDF signatures, suspicious HTML, capped reads, aggregate results and command-line help/errors.

Mocks test checker behavior. The separate network checker can still encounter temporary blocks or unavailable pages. Read `artifacts/lunar-survival/scripts/README.md` for its output and exit behavior.

## Known coverage limits

- No committed browser end-to-end test suite was identified in the game package scripts. Earlier manual or temporary browser checks are not reproducible tests merely because they were discussed.
- Real-device touch controls and multi-touch behavior are not established by pure simulation tests.
- Real phone/tablet GPU performance, battery use, heat and frame rate need real-device measurement.
- Browser storage-denied behavior, complete arbitrary save corruption, focus behavior and every screen size are not fully established by the pure tests.
- Source-click tracking does not exist, and there is no measured learning-outcome study.
- The archived DONKI reference is not covered by the live registry link checker.
- A successful build does not prove a host is correctly configured or that its public site is available.

## Suggested manual verification

Start a fresh mission, complete all eight objectives, board/exit the rover, enter/exit shelter, answer and skip questions, resolve decisions, inspect the report and replay. Separately allow a resource to reach zero and replay from loss. Reload a playing save and check Continue. Try keyboard, mouse and real touch devices.

These are recommended checks, not claims that they ran for this guide.
