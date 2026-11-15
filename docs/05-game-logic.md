# Game logic and balance

Primary sources: `game/engine.js`, `game/balance.js`, `game/mission-report.js` and `world/World.jsx`.

**All numbers below are simplified game simulation values**, not spacecraft specifications. A minute means 60 simulation seconds, not necessarily 60 wall-clock seconds at accelerated speed. Resource changes are usually clamped to 0–100; habitat/recycler work subtracts energy directly before the tick's failure check.

## Starting reserves

Same on all difficulties:

| Resource | Start | Ordinary use |
|---|---:|---|
| Oxygen | 90 | Time-based consumption |
| Energy | 75 | Time, work, decisions and rover movement |
| Water | 85 | Time and some decisions |
| Food | 90 | Time and rationing |
| Shield | 100 | Active-storm exposure only |

## Difficulty rules

| Rule | Easy | Normal | Hard |
|---|---:|---:|---:|
| General drain multiplier | 0.65 | 1.00 | 1.75 |
| Warning duration, seconds | 65 | 45 | 30 |
| Active storm, seconds | 35 | 35 | 35 |
| Exposed shield loss, points/sec | 0.80 | 1.40 | 3.50 |
| Shelter loss multiplier | 0.02 | 0.02 | 0.07 |
| Simulated shelter protection modifier | 98% | 98% | 93% |
| First event eligible at mission second | 75 | 75 | 75 |
| Next-event delay, integer seconds | 80–129 | 80–129 | 60–100 |

Shelter protection is a **simulated protection modifier, not a real shelter performance figure**.

## Resource rates

These tables isolate time-based changes. Work rewards, decisions, rover costs, limits at zero/100 and mission end can alter observed totals.

### Outside shelter, per minute

| Change | Easy | Normal | Hard |
|---|---:|---:|---:|
| O2 loss before recycler repair | 4.680 | 7.200 | 12.600 |
| O2 loss after recycler repair | 0.702 | 1.080 | 1.890 |
| Energy loss with solar off or storm active | 2.925 | 4.500 | 7.875 |
| Energy gain with solar on and storm not active | +6.600 | +6.600 | +6.600 |
| Water loss | 1.638 | 2.520 | 4.410 |
| Food loss | 1.287 | 1.980 | 3.465 |
| Shield loss outside active storm | 0 | 0 | 0 |

Formulas per second: O2 `0.12 * drain`, or `0.018 * drain` after repair; water `0.042 * drain`; food `0.033 * drain`; unpowered energy `0.075 * drain`. Powered energy is a replacement branch at `+0.11/sec`, **not** that gain minus the ordinary energy drain.

### Shelter effect on ordinary drain

Shelter multiplies **oxygen, water and food drain only** by 0.65:

| Loss per minute in shelter | Easy | Normal | Hard |
|---|---:|---:|---:|
| O2 before recycler repair | 3.042 | 4.680 | 8.190 |
| O2 after recycler repair | 0.4563 | 0.7020 | 1.2285 |
| Water | 1.0647 | 1.6380 | 2.8665 |
| Food | 0.83655 | 1.28700 | 2.25225 |

Energy uses the same branch as outside. Shelter does not replenish shield.

### Shield during an active storm

| Loss | Easy | Normal | Hard |
|---|---:|---:|---:|
| Outside, points/sec | 0.800 | 1.400 | 3.500 |
| Sheltered, points/sec | 0.016 | 0.028 | 0.245 |
| Outside, per-minute equivalent | 48.00 | 84.00 | 210.00 |
| Sheltered, per-minute equivalent | 0.96 | 1.68 | 14.70 |
| Whole 35-second storm, sheltered | 0.560 | 0.980 | 8.575 |

The per-minute figures are rate equivalents: the active storm lasts only 35 seconds. On Hard, continuous exposure from shield 100 reaches zero before the storm ends. Actual death occurs at a tick boundary.

## Objective work and effects

Effects are identical across difficulties; ongoing drain still applies during work.

| # / ID | Duration | Direct effect on completion | XP |
|---|---:|---|---:|
| 1 `habitat` | 5 sec | Habitat on; energy −4 | 100 |
| 2 `oxygen` | 7 sec | Recycler on; O2 +15, energy −5; lower future O2 drain | 150 |
| 3 `solar` | 6 sec | Solar on; energy +12; generation available | 150 |
| 4 `ice` | 7 sec | Ice task done; water +25, food +12 | 200 |
| 5 `survey` | 8 sec | Survey done; warning starts; rover remains occupied | 250 |
| 6 `shelter` | Entry | Enter shelter at this stage; no direct refill | 200 |
| 7 `survive` | Storm condition | Storm passed after shelter condition; no direct refill | 250 |
| 8 `repair` | 8 sec | Relay repaired; solar on; energy +10; mission won | 300 |

Total: 1600 XP. Survey requires riding. Repair requires EVA, not riding or sheltered. Work must start within the location's radius and is cancelled when movement leaves it. Ice rewards include cached food; ice does not produce food.

## Locations and interaction radius

Coordinates are world units, not lunar distances:

| Target | x | z | Radius |
|---|---:|---:|---:|
| Habitat | 0 | 0 | 4 |
| Life Support | −8 | −3 | 3.5 |
| Solar Array | 9 | −7 | 4 |
| Ice Deposit | −17 | −15 | 4 |
| Rover, initial parked position | 6 | 7 | 3.5 |
| Survey ridge | 25 | −22 | 4.5 |
| Shelter | −4 | 5 | 3 |
| Power Relay | 11 | 1 | 3.5 |

The rover target follows the player while riding, otherwise its saved parked position. Starting player position is `(0, 8)`. Movement is bounded to x −39…39 and z −36…30, with at most 2.5 units accepted in one engine movement call.

## Commander decisions

Numbers are nominal meter-point changes; caps can reduce actual gains. No choice directly changes shield.

| Event / option | Easy and Normal | Hard |
|---|---|---|
| Dust: electrostatic cleaning (`clean`) | Energy −6; O2 +3 | Energy −8; O2 +3 |
| Dust: ration power (`ration`) | Energy +4; food −5 | Energy +4; food −7 |
| Leak: isolate/patch (`seal`) | Water −5; energy −3 | Water −7; energy −4 |
| Leak: vent (`vent`) | O2 −8; energy +4 | O2 −10; energy +4 |
| Battery: keep heating (`heat`) | Energy −7 | Energy −9 |
| Battery: cycle thermal system (`cycle`) | Water −3; O2 −3; energy +3 | Water −4; O2 −4; energy +3 |

Hard multiplies each negative base cost by 1.3 and rounds its magnitude to the nearest whole number. Gains do not change. Choice text is generated from the same difficulty helper as effects.

These decisions apply **immediate meter changes only**. There is no persistent dust accumulation, leak rate, battery temperature or future failure probability behind their narrative text. The engine does not stop a player choosing an option that exhausts a reserve.

Events are selected with `Math.random()` among three event types. Only one is pending at once. New events do not spawn during `active`; an already pending event can remain. Delays are scheduled from the event's creation time, not from when it is answered. After a long delay answering, another event may be due on the next eligible tick. Dialogs block world control but time keeps running.

## Rover

- Habitat must be commissioned; boarding needs at least 8 energy.
- Travel costs `0.035` energy per accepted world unit, on all difficulties.
- A tick with energy below 4 automatically exits and parks it.
- Shelter entry exits the rover. Rover exit itself has no direct resource fee.
- Walking/driving nominal speeds are 4.6/9 world units per frame-second.

## Storm and completion details

The survey triggers `quiet → warning → active → passed`; there is one scripted storm. Warning starts during work completion, then the same tick also decrements its countdown. Do not assume the first displayed warning is the full configured duration.

On the warning-to-active transition tick, no active-radiation subtraction occurs because radiation is checked before the transition. Active ticks apply radiation and count down. On passing, solar switches off and objective 7 completes if shelter was already recorded.

Late shelter entry can still finish objectives 6 and 7 after the storm. Objective 6 completes on entry at that stage; the passed-and-sheltered fallback finishes objective 7 on a later tick.

## Win, loss, scoring and ratings

- Completing the final relay at stage 8 sets `status = 'won'`.
- While still playing, any resource `<= 0` sets `lost`, records the cause and cancels work.
- Tick order matters: work completion comes before the final failure check. `checkFailure()` leaves a state already marked `won` unchanged. Do not describe it as a separate pre-work survival check.
- Finished games do not tick or move. Replay creates fresh state.
- XP comes from objectives only. Quiz answers and decision count do not add XP.

Ratings are evaluated in this order:

| Condition | Rating |
|---|---|
| Status is not `won` | MISSION ABORTED |
| Won; all 8 objective IDs present; every final reserve ≥35; final average ≥75; complete reserve history; historical lowest ≥25 | EXEMPLARY COMMAND |
| Otherwise won, but final minimum <20, final average <45, or recorded historical lowest <20 | AGAINST THE ODDS |
| Other wins | MISSION ACCOMPLISHED |

The historical lowest used is also bounded by the current final minimum. Missing history prevents the top rating. Scoring does not pretend quiz accuracy proves educational mastery.

Report decision totals use actual measured deltas after caps. They **exclude** ordinary drain, objective effects and rover movement. Concepts encountered are derived from completed objectives, not proof of reading. Source clicks are not tracked.
