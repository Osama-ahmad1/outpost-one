# UML and flow diagrams

These describe functions and React components, not invented JavaScript classes. `GameApp.jsx` owns several components and the save functions in the same file.

## A. Component/module diagram

```mermaid
flowchart TD
  Main["main.tsx: createRoot and ErrorBoundary"] --> App["App.tsx"]
  App --> GA["GameApp.jsx: state, timer and saves"]
  GA --> UI["Menu, Briefing, Hud, Minimap, TouchPad, Outcome"]
  GA --> World["world/World.jsx: rendering and movement"]
  GA --> Engine["game/engine.js: simulation functions"]
  UI --> Decision["components/engineering-decision.jsx"]
  UI --> LearningUI["components/mission-learning.jsx"]
  UI --> Notes["components/science-notes.jsx"]
  Engine --> Balance["game/balance.js"]
  Engine --> Guidance["game/flight-guidance.js"]
  Engine --> Report["game/mission-report.js"]
  Report --> Lessons["game/mission-learning.js"]
  Guidance --> Balance
  Decision --> Engineering["game/engineering-content.js"]
  Engineering --> Balance
  Engineering --> Science["game/science-content.js"]
  LearningUI --> Lessons
  Lessons --> Science
  Notes --> Science
  UI --> Guidance
  UI --> Report
  UI --> Attribution["game/science.js: facts and simulation label"]
  GA <-->|"JSON: version 2 envelope"| Save[("Browser localStorage")]
```

## B. One game tick

```mermaid
sequenceDiagram
  participant T as Browser timer
  participant G as GameApp
  participant E as tickGame
  participant U as UI and World
  participant L as localStorage
  T->>G: Interval fires every 250 ms
  Note over G: Only in play, playing and not paused
  G->>E: tickGame(previous, 0.25 * speed)
  opt Delta greater than one second
    E->>E: Substep, at most 3600 seconds total
  end
  E->>E: Advance time and update resources
  E->>E: Auto-exit low-power rover if needed
  E->>E: Advance work and apply completion
  E->>E: Advance storm and apply radiation
  E->>E: Schedule event if allowed
  E->>E: Observe reserve history and check failure
  E-->>G: Next state
  G->>U: Render updated state
  alt Still playing
    G->>L: Save version 2 state
  else Won or lost
    G->>L: Remove save
  end
```

The timer is independent of the WebGL frame loop. A commander dialog holds movement, not this timer. At 4x speed the UI still supplies exactly a one-second delta.

## C. Commander decision

```mermaid
sequenceDiagram
  actor P as Player
  participant D as EngineeringDecision
  participant G as GameApp
  participant E as chooseEvent
  participant B as balance.js
  participant R as Report tracking
  P->>D: Click option
  D->>G: onChoose(choiceId)
  G->>E: chooseEvent(previous, choiceId)
  E->>E: Check playing, pending event and valid choice
  E->>B: getDecisionEffects(choiceId, difficulty)
  B-->>E: Resource deltas
  E->>E: Apply deltas and clamp to 0..100
  E->>R: Record actual changes and log index
  E->>B: getDecisionConsequence(choiceId, difficulty)
  B-->>E: Current cost text
  E->>E: Log choice, clear event, check failure
  E-->>G: Next state
  G-->>P: Close dialog or show loss report
```

Invalid calls return the existing state without completing the flow.

## D. Eight-objective state diagram

```mermaid
stateDiagram-v2
  state "1: Habitat" as M1
  state "2: Oxygen recycler" as M2
  state "3: Solar array" as M3
  state "4: Ice and supplies" as M4
  state "5: Rover survey" as M5
  state "6: Enter shelter" as M6
  state "7: Survive storm" as M7
  state "8: Power relay" as M8
  [*] --> M1
  M1 --> M2: Commission for 5 seconds
  M2 --> M3: Repair for 7 seconds
  M3 --> M4: Activate for 6 seconds
  M4 --> M5: Collect for 7 seconds
  M5 --> M6: Survey in rover for 8 seconds
  M6 --> M7: Enter shelter
  M7 --> M8: Storm passed and shelter condition met
  M8 --> [*]: Repair on foot for 8 seconds and win
```

Failure from any playing stage is shown in the full-mission diagram below. For late arrival, enter shelter to complete objective 6; if the storm has passed, a later tick completes objective 7 while sheltered. Continuous shelter occupancy is not required.

## E. Storm state diagram

```mermaid
stateDiagram-v2
  [*] --> quiet
  quiet --> warning: Survey completes
  warning --> active: Warning countdown reaches zero
  active --> passed: Active countdown reaches zero
  passed --> [*]: No further storm in this campaign
```

Warning is 65/45/30 seconds for Easy/Normal/Hard. Active is 35 seconds. `passed` turns solar generation off. Mission end freezes further ticks; replay creates `quiet` again.

## F. Full-mission activity

```mermaid
flowchart TD
  Menu["Menu"] --> Start{"Start or continue?"}
  Start -->|"Start"| Fresh["Create fresh difficulty state"]
  Start -->|"Valid save"| Restore["Normalize saved learning and report"]
  Fresh --> Play["Play current objective"]
  Restore --> Play
  Play --> Paused{"Paused?"}
  Paused -->|"Yes"| Hold["Hold simulation and world"]
  Hold -->|"Resume"| Play
  Paused -->|"No"| Tick["Tick resources, work and storm"]
  Tick --> Decision{"Pending commander event?"}
  Decision -->|"Yes"| Choice["Block world input; choose option"]
  Choice -->|"Time continues"| Tick
  Choice -->|"Apply choice"| Check{"Status?"}
  Decision -->|"No"| Check
  Check -->|"Lost"| Loss["Failure report"]
  Check -->|"Won after relay"| Win["Victory report"]
  Check -->|"Playing"| Action["Move, interact, read or answer quiz"]
  Action --> Play
  Loss --> Replay{"Replay or menu?"}
  Win --> Replay
  Replay -->|"Replay same difficulty"| Fresh
  Replay -->|"Menu"| Menu
```
