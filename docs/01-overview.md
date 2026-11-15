# Overview

## Problem and audience

Space lessons can show mission outcomes without showing why engineers chose one solution over another. OUTPOST ONE lets learners make choices and see changes in limited supplies.

The current text-heavy, timed experience **suits ages 12+**. This is the intended fit, not a validated age-rating or a measured educational result. A younger children's mode is not implemented.

## Idea

Command a fictional lunar outpost. Bring systems online, explore by rover, take shelter during a scripted solar event and restore power. Resources connect through shared costs and benefits, not a full physical model.

The game runs in a browser. The current play path uses React state and localStorage, not an account or a running API service. The Rule-based Advisor uses programmed rules, **not AI**.

## Eight missions

These are the ordered entries in `game/engine.js`:

| # | Title | What the player does |
|---|---|---|
| 1 | A place to call home | Commission Habitat Alpha. |
| 2 | Every breath matters | Repair the oxygen recycler at Life Support. |
| 3 | Power the outpost | Connect and align the Solar Array. |
| 4 | Written in the regolith | Collect polar ice and cached supplies. |
| 5 | Beyond the horizon | Board the rover and survey Shackleton Ridge. |
| 6 | Incoming solar particles | Enter the Storm Shelter; late entry is allowed. |
| 7 | Weather the storm | Survive until the storm passes after entering shelter at least once. |
| 8 | One small outpost | Leave shelter, exit the rover if needed and repair the Power Relay on foot. |

Objective 7 does **not** require staying sheltered for the entire storm. Leaving exposes the shield meter to greater damage.

## Five resources

| Display | State field | Meaning in the game |
|---|---|---|
| Oxygen / O2 | `oxygen` | Breathable-air reserve; recycler repair reduces drain. |
| Energy / PWR | `energy` | Shared power reserve for the outpost, tasks and rover. |
| Water / H2O | `water` | Supply reduced by ongoing use and some decisions. |
| Food | `food` | Supply reduced over time and by power rationing. |
| Shield / SHLD | `shield` | Abstract protection reserve damaged during the active storm. |

Any one reaching zero can end the mission. Resources are meter points, not kilograms, watts, radiation dose or real engineering specifications.

## Real science versus simulation

Real concepts include a near-vacuum lunar environment, solar power, polar ice, life support, dust, thermal control and radiation shielding. NASA links explain those concepts.

Fictional or simplified elements include the outpost, map, task durations, resource values, event effects, storm timing and shielding percentages. There is no live NASA data or real storm forecast. An archived DONKI **solar flare** reference is not a particle-radiation measurement; its metadata still needs direct verification in the source content.

Each objective has science text and a completion takeaway. Four objectives offer optional questions. The final report summarizes recorded play; it does not prove learning.
