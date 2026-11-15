import assert from 'node:assert/strict';
import { createGame, tickGame, chooseEvent, interact, MISSIONS } from './engine.js';
import { getDifficulty, getDecisionEffects, getDecisionConsequence, getShelterModifierNote } from './balance.js';
import { getStormEducation, getCriticalResources } from './flight-guidance.js';
import { getEngineeringNotes } from './engineering-content.js';
import { restoreMissionState } from './mission-report.js';
import { SCIENCE_TOPICS } from './science-content.js';

const EXPECTED = {
  easy: { drain: 0.65, warning: 65, radiation: 0.8, shelterLoss: 0.02, eventBase: 80, eventRange: 50 },
  normal: { drain: 1, warning: 45, radiation: 1.4, shelterLoss: 0.02, eventBase: 80, eventRange: 50 },
  hard: { drain: 1.75, warning: 30, radiation: 3.5, shelterLoss: 0.07, eventBase: 60, eventRange: 41 },
};
const BASE = {
  clean: { energy: -6, oxygen: 3 }, ration: { energy: 4, food: -5 },
  seal: { water: -5, energy: -3 }, vent: { oxygen: -8, energy: 4 },
  heat: { energy: -7 }, cycle: { water: -3, oxygen: -3, energy: 3 },
};
const HARD = {
  clean: { energy: -8, oxygen: 3 }, ration: { energy: 4, food: -7 },
  seal: { water: -7, energy: -4 }, vent: { oxygen: -10, energy: 4 },
  heat: { energy: -9 }, cycle: { water: -4, oxygen: -4, energy: 3 },
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`);
const originalRandom = Math.random;
try {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const config = EXPECTED[difficulty];
    assert.deepEqual(getDifficulty(difficulty), config);
    const fresh = createGame(difficulty);
    assert.equal(fresh.nextEventAt, 75, 'First event timing unchanged');
    const minute = tickGame(fresh, 60);
    close(minute.resources.oxygen, 90 - 60 * 0.12 * config.drain);
    close(minute.resources.energy, 75 - 60 * 0.075 * config.drain);
    close(minute.resources.water, 85 - 60 * 0.042 * config.drain);
    close(minute.resources.food, 90 - 60 * 0.033 * config.drain);
    assert.equal(minute.resources.shield, 100);

    for (const sheltered of [false, true]) {
      const storm = createGame(difficulty);
      storm.storm = { phase: 'active', remaining: 35 };
      storm.sheltered = sheltered;
      close(tickGame(storm, 10).resources.shield, 100 - 10 * config.radiation * (sheltered ? config.shelterLoss : 1));
      const note = getShelterModifierNote(difficulty);
      assert.ok(note.startsWith(difficulty === 'hard' ? '93%' : '98%'));
      assert.ok(note.includes('simulated protection modifier, not a real shelter performance figure'));
      assert.ok(getStormEducation(storm).includes(note));
      storm.resources.shield = 19;
      assert.ok(getCriticalResources(storm).find(item => item.id === 'shield').explanation.includes(note));
    }
    const atShelter = { ...fresh, player: { x: -4, z: 5 } };
    assert.ok(interact(atShelter, 'shelter').log.at(-1).effect.startsWith(difficulty === 'hard' ? '93%' : '98%'));

    const survey = createGame(difficulty);
    survey.stage = 4;
    survey.completed = MISSIONS.slice(0, 4).map(item => item.id);
    survey.progress = { id: 'survey', remaining: 0.25, total: 8 };
    const warning = tickGame(survey, 0.25);
    assert.equal(warning.storm.phase, 'warning');
    close(warning.storm.remaining, config.warning - 0.25);

    for (const random of [0, 0.999999]) {
      Math.random = () => random;
      const preEvent = createGame(difficulty);
      preEvent.time = 74.75;
      const event = tickGame(preEvent, 0.25);
      assert.ok(event.event, 'First event at exactly 75s');
      assert.equal(event.nextEventAt - event.time, config.eventBase + (random === 0 ? 0 : config.eventRange - 1));
    }

    for (const [index, eventId] of ['dust', 'leak', 'battery'].entries()) {
      Math.random = () => (index + 0.1) / 3;
      const preEvent = createGame(difficulty);
      preEvent.nextEventAt = 0;
      for (const key of Object.keys(preEvent.resources)) preEvent.resources[key] = 50;
      const ready = tickGame(preEvent, 0.25);
      assert.equal(ready.event.id, eventId);
      const notes = getEngineeringNotes(eventId, difficulty);
      for (const choice of ready.event.choices) {
        const expected = (difficulty === 'hard' ? HARD : BASE)[choice.id];
        assert.deepEqual(getDecisionEffects(choice.id, difficulty), expected);
        assert.equal(choice.consequence, getDecisionConsequence(choice.id, difficulty));
        if (difficulty === 'hard') assert.equal(notes.options[choice.id].effects, choice.consequence);
        const legacy = structuredClone(ready);
        // A pre-upgrade save can contain old costs in the pending event payload.
        legacy.event.choices.find(item => item.id === choice.id).consequence = getDecisionConsequence(choice.id, 'normal');
        const loaded = restoreMissionState(JSON.parse(JSON.stringify(legacy)));
        assert.deepEqual(loaded, legacy, 'Existing save structure/values preserved');
        const resolved = chooseEvent(loaded, choice.id);
        for (const key of Object.keys(ready.resources)) close(resolved.resources[key], ready.resources[key] + (expected[key] || 0));
        assert.equal(resolved.log.at(-1).effect, getDecisionConsequence(choice.id, difficulty), 'Log describes actual current costs, not stale saved text');
      }
    }
  }
} finally {
  Math.random = originalRandom;
}
const shielding = SCIENCE_TOPICS.find(item => item.id === 'shielding').simplification;
assert.match(shielding, /98% on Easy\/Normal and 93% on Hard/);
console.log('PASS: Hard-only drain, radiation, shelter, warning, all six decision costs/text, scheduling endpoints, unchanged first event and legacy pending saves');
