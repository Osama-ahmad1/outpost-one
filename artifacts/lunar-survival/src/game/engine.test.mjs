import assert from 'node:assert/strict';
import { createGame, tickGame, movePlayer, interact, chooseEvent, getNearby, getRating, getAdvisor, LOCATIONS, MISSIONS } from './engine.js';
import { getCriticalResources, getMissionAction, getStormEducation, SHELTER_MODIFIER_NOTE, SIMULATION_NOTE } from './flight-guidance.js';
import { buildMissionReport, getRatingDetails, normalizeReport, restoreMissionState } from './mission-report.js';
import { getSpaceWeather } from './science.js';
import { SCIENCE_TOPICS, NASA_SOURCES } from './science-content.js';
import { ENGINEERING_NOTES } from './engineering-content.js';
import { MISSION_LEARNING, normalizeLearning, respondToQuestion } from './mission-learning.js';
import { STRUCTURE_INFO } from './structure-info.js';

assert.deepEqual(Object.keys(STRUCTURE_INFO).sort(), LOCATIONS.map(location => location.id).sort());
for (const location of LOCATIONS) {
  const entry = STRUCTURE_INFO[location.id];
  for (const key of ['name', 'inGame', 'realLife', 'simplification']) {
    assert.ok(typeof entry[key] === 'string' && entry[key].trim(), `${location.id}: ${key}`);
  }
  assert.ok(SCIENCE_TOPICS.some(topic => topic.source === entry.source), 'Reuse an existing NASA source');
  assert.ok(entry.source.title && /^https:\/\//.test(entry.source.url));
  assert.ok(!/\. [A-Z]/.test(entry.simplification), 'Keep simplifications to one sentence');
}
assert.ok(!STRUCTURE_INFO.habitat.simplification.includes('oxygen meter'), 'Habitat commissioning does not repair the oxygen recycler');

function travel(state, id) {
  const target = LOCATIONS.find(location => location.id === id);
  let next = state;
  for (let i = 0; i < 300 && Math.hypot(next.player.x - target.x, next.player.z - target.z) > 0.1; i++) {
    next = movePlayer(next, target);
    next = tickGame(next, 0.2);
  }
  assert.ok(Math.hypot(next.player.x - target.x, next.player.z - target.z) < 0.1, `Reached ${id}`);
  return next;
}

for (const difficulty of ['easy', 'normal', 'hard']) {
  let state = createGame(difficulty);
  const initial = structuredClone(state);
  let updated = tickGame(state, 10);
  assert.ok(updated.resources.oxygen < state.resources.oxygen);
  assert.ok(updated.resources.water < state.resources.water);
  assert.ok(updated.resources.food < state.resources.food);
  assert.deepEqual(state, initial, 'Updates must not mutate previous state');
  assert.equal(interact(state, 'survey').stage, 0, 'Remote objectives cannot be completed');
  for (const id of ['habitat', 'oxygen', 'solar', 'ice']) {
    state = travel(state, id);
    state = interact(state, id);
    assert.equal(state.progress.id, id);
    state = tickGame(state, 10);
    assert.ok(state.completed.includes(id));
    if (id === 'oxygen' || id === 'solar' || id === 'ice') {
      const before = structuredClone(state);
      const answer = id === 'solar' ? null : id === 'ice' ? 0 : MISSION_LEARNING[id].question.correct;
      state = respondToQuestion(state, id, answer);
      assert.deepEqual({ ...state, learning: before.learning }, before, 'Knowledge checks change education only');
      assert.equal(respondToQuestion(state, id, 0), state, 'No repeat scoring after answering or skipping');
      state = JSON.parse(JSON.stringify(state));
      state.learning = normalizeLearning(state.learning);
    }
  }
  const powered = tickGame(state, 10);
  assert.ok(powered.resources.energy >= state.resources.energy, 'Solar generation replenishes energy');
  state = travel(state, 'rover');
  state = interact(state, 'rover');
  assert.equal(state.rover, true);
  state = travel(state, 'survey');
  state = interact(state, 'survey');
  state = tickGame(state, 10);
  assert.equal(state.storm.phase, 'warning');
  state = travel(state, 'shelter');
  assert.equal(getNearby(state).id, 'shelter', 'Shelter takes priority over boarded rover');
  state = interact(state, 'shelter');
  assert.equal(state.sheltered, true);
  assert.equal(state.rover, false);
  const shelteredPosition = state.player;
  assert.deepEqual(movePlayer(state, { x: 20, z: 20 }).player, shelteredPosition);
  state = tickGame(state, 105);
  assert.equal(state.storm.phase, 'passed');
  assert.ok(state.completed.includes('survive'));
  state = respondToQuestion(state, 'survive', MISSION_LEARNING.survive.question.correct);
  assert.equal(state.learning.answered, 3, 'Skipped question not counted as answered');
  assert.equal(state.learning.correct, 2, 'Wrong answer gets no correct credit');
  assert.ok(state.resources.shield > (difficulty === 'hard' ? 90 : 95), 'Shelter protects from radiation');
  assert.equal(getNearby(state).id, 'shelter', 'Shelter exit wins over the parked rover at Objective 8');
  if (state.event) {
    const previousLogLength = state.log.length;
    state = chooseEvent(state, state.event.choices[0].id);
    assert.equal(state.event, null);
    assert.equal(state.log.length, previousLogLength + 1);
  }
  state = interact(state, getNearby(state).id);
  assert.equal(state.sheltered, false);
  assert.equal(state.rover, false);
  assert.equal(getNearby(state).id, 'rover', 'Parked rover can still be boarded');
  state = interact(state, getNearby(state).id);
  assert.equal(state.rover, true);
  state = interact(state, getNearby(state).id);
  // At the shelter door the established action enters shelter, which also disembarks.
  assert.equal(state.rover, false);
  assert.equal(state.sheltered, true);
  state = interact(state, getNearby(state).id);
  state = interact(state, 'rover');
  state = travel(state, 'repair');
  assert.equal(getNearby(state).id, 'rover', 'At relay, disembarking must be available');
  assert.equal(interact(state, 'repair').progress, null, 'Relay repair requires EVA');
  state = interact(state, getNearby(state).id);
  assert.equal(state.rover, false);
  assert.equal(state.sheltered, false);
  assert.equal(getNearby(state).id, 'repair', 'Parked rover cannot hide the relay');
  const beforeWalk = { ...state.player };
  state = movePlayer(state, { x: state.player.x - 1, z: state.player.z });
  assert.notDeepEqual(state.player, beforeWalk, 'Walking resumes after exiting the rover');
  state = travel(state, 'repair');
  state = interact(state, getNearby(state).id);
  state = tickGame(state, 10);
  assert.equal(state.status, 'won', `${difficulty} campaign is winnable`);
  assert.equal(state.completed.length, MISSIONS.length);
  assert.equal(state.xp, 1600);
  const finalReport = buildMissionReport(state);
  assert.equal(finalReport.score, 1600);
  assert.equal(finalReport.objectives, 8);
  assert.equal(finalReport.concepts.length, 8);
  assert.equal(finalReport.learning.answered, 3);
  assert.equal(finalReport.learning.correct, 2);
  assert.equal(finalReport.sourcesExplored, null, 'Source clicks were never tracked');
  assert.ok(finalReport.shelterResponse.includes('warning'), 'Actual shelter entry phase is recorded');
  assert.deepEqual(buildMissionReport(restoreMissionState(JSON.parse(JSON.stringify(state)))), finalReport);
  assert.equal(tickGame(state, 100), state, 'Finished campaign is frozen');
  console.log(`PASS: ${difficulty} complete campaign, resources, shelter, rover, XP, events`);
}

for (const resource of ['oxygen', 'energy', 'water', 'food', 'shield']) {
  const state = createGame();
  state.resources[resource] = 0;
  assert.equal(tickGame(state, 1).status, 'lost', `${resource} exhaustion loses`);
}
let state = travel(createGame(), 'habitat');
state = interact(state, 'habitat');
state = movePlayer(state, { x: 3, z: 3 });
state = movePlayer(state, { x: 6, z: 6 });
assert.equal(state.progress, null, 'Leaving a work site cancels work');
const outside = createGame('hard');
outside.storm = { phase: 'active', remaining: 35 };
assert.ok(tickGame(outside, 20).resources.shield < 65, 'Exterior radiation has actual consequences');
const unconnected = await getSpaceWeather();
assert.equal(unconnected.mode, 'simulation');
assert.equal(unconnected.observations.length, 0);
console.log('PASS: all five loss conditions, work cancellation, radiation damage, science attribution');

assert.equal(SCIENCE_TOPICS.length, 10);
assert.equal(new Set(SCIENCE_TOPICS.map(topic => topic.id)).size, 10);
for (const topic of SCIENCE_TOPICS) {
  for (const field of ['title', 'explanation', 'missionRelevance', 'simplification']) assert.ok(topic[field], `${topic.id}: ${field}`);
  assert.ok(Object.values(NASA_SOURCES).includes(topic.source));
}
const archivedTopics = SCIENCE_TOPICS.filter(topic => topic.archivedReference);
assert.deepEqual(archivedTopics.map(topic => topic.id), ['radiation'], 'Exactly one archived reference, under radiation only');
assert.deepEqual(archivedTopics[0].archivedReference, {
  title: 'Archived real observation - NASA DONKI',
  eventId: '2024-05-14T02:03:00-FLR-001',
  date: '14 May 2024',
  type: 'Solar flare',
  classification: 'X1.7',
  startTime: '02:03 UTC',
  peakTime: '02:09 UTC',
  articleTitle: 'Sun Releases 2 Strong Solar Flares',
  url: 'https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/sun-releases-2-strong-solar-flares/',
  donkiUrl: 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/30832/3',
  verificationStatus: 'needs_verification',
  verificationNote: 'Flare confirmed in the NASA Science article; the DONKI server can be slow or unavailable.',
  disclaimer: "Historical reference only. Not live data or a forecast. This is a solar flare record, not a solar particle measurement. The game's storm timing, radiation damage and shelter protection are simulated.",
}, 'Archived event details, uncertainty and exact historical/simulation disclaimer preserved');
assert.equal(new URL(archivedTopics[0].archivedReference.url).hostname, 'science.nasa.gov');
assert.equal(new URL(archivedTopics[0].archivedReference.donkiUrl).hostname, 'webtools.ccmc.gsfc.nasa.gov');
assert.ok(SCIENCE_TOPICS.find(topic => topic.id === 'radiation').simplification.includes('No live NASA observations are used.'));
console.log('PASS: single archived flare reference, NASA article title/primary link, secondary DONKI link, exact metadata/disclaimer and DONKI verification caveat');
for (const source of Object.values(NASA_SOURCES)) {
  const url = new URL(source.url);
  assert.equal(url.protocol, 'https:');
  assert.ok(url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'), 'Sources must be official NASA domains');
  assert.ok(source.title && source.organization);
  assert.equal(source.status, 'verified');
}
const expectedEffects = {
  clean: { energy: -6, oxygen: 3 }, ration: { energy: 4, food: -5 },
  seal: { water: -5, energy: -3 }, vent: { oxygen: -8, energy: 4 },
  heat: { energy: -7 }, cycle: { water: -3, oxygen: -3, energy: 3 },
};
const originalRandom = Math.random;
try {
  for (const [index, id] of ['dust', 'leak', 'battery'].entries()) {
    Math.random = () => (index + 0.1) / 3;
    const fixture = createGame();
    fixture.nextEventAt = 0;
    fixture.resources = { oxygen: 50, energy: 50, water: 50, food: 50, shield: 50 };
    const ready = tickGame(fixture, 0.25);
    assert.equal(ready.event.id, id);
    const notes = ENGINEERING_NOTES[id];
    for (const field of ['problem', 'background', 'tradeoff', 'takeaway', 'simplification', 'source']) assert.ok(notes[field]);
    assert.deepEqual(Object.keys(notes.options).sort(), ready.event.choices.map(choice => choice.id).sort());
    for (const choice of ready.event.choices) {
      assert.ok(notes.options[choice.id].effects && notes.options[choice.id].tradeoff);
      // Saved event payloads remain compatible: no education fields are required by chooseEvent.
      const saved = JSON.parse(JSON.stringify(ready));
      const resolved = chooseEvent(saved, choice.id);
      for (const key of Object.keys(saved.resources)) {
        assert.equal(resolved.resources[key], saved.resources[key] + (expectedEffects[choice.id][key] || 0), `${choice.id}: unchanged ${key} effect`);
      }
      assert.equal(resolved.event, null);
      assert.equal(saved.event.id, id, 'Choosing does not mutate the saved state');
    }
  }
} finally {
  Math.random = originalRandom;
}
console.log('PASS: ten sourced science topics, all event learning notes, six unchanged decision costs and saved-event compatibility');

assert.deepEqual(Object.keys(MISSION_LEARNING), MISSIONS.map(mission => mission.id));
for (const lesson of Object.values(MISSION_LEARNING)) {
  assert.ok(lesson.science && lesson.takeaway);
  assert.ok(Object.values(NASA_SOURCES).includes(lesson.source), 'Reuses verified Phase 1 sources');
  if (lesson.question) {
    assert.equal(lesson.question.options.length, 3);
    assert.ok(lesson.question.options[lesson.question.correct] && lesson.question.explanation);
  }
}
const legacy = createGame();
delete legacy.learning;
const legacySnapshot = structuredClone(legacy);
const restored = { ...legacy, learning: normalizeLearning(legacy.learning) };
assert.deepEqual(restored.learning, { responses: {}, answered: 0, correct: 0 });
assert.deepEqual(legacy, legacySnapshot, 'Old save normalization does not mutate source');
assert.equal(respondToQuestion(restored, 'oxygen', 1), restored, 'Cannot answer an incomplete mission');
restored.completed = ['oxygen'];
assert.equal(respondToQuestion(restored, 'oxygen', -1), restored);
assert.equal(respondToQuestion(restored, 'oxygen', 99), restored);
assert.equal(respondToQuestion(restored, 'unknown', 0), restored);
const answered = respondToQuestion(restored, 'oxygen', 1);
assert.deepEqual(normalizeLearning(JSON.parse(JSON.stringify(answered.learning))), answered.learning);
assert.deepEqual(normalizeLearning({ answered: 999, correct: 999, responses: {
  oxygen: { answer: 1, correct: false }, ice: { answer: 0, correct: true },
  solar: { skipped: true }, survive: { answer: 999 }, unknown: { answer: 0 },
} }), { responses: { oxygen: { answer: 1, correct: true }, ice: { answer: 0, correct: false }, solar: { skipped: true } }, answered: 2, correct: 1 });
assert.deepEqual(normalizeLearning(null), normalizeLearning({ responses: 'bad' }));
assert.deepEqual(createGame().learning, { responses: {}, answered: 0, correct: 0 }, 'Restart resets learning');
console.log('PASS: eight mission lessons, optional correct/wrong/skip responses, scoring, invalid input, old saves, reload and restart');

const victory = createGame();
victory.status = 'won';
victory.completed = MISSIONS.map(mission => mission.id);
victory.stage = 8;
victory.xp = 1600;
victory.resources = { oxygen: 90, energy: 85, water: 80, food: 90, shield: 99 };
assert.equal(getRating(victory), 'EXEMPLARY COMMAND');
assert.ok(getRatingDetails(victory).reason);
for (const resource of Object.keys(victory.resources)) {
  const poor = structuredClone(victory);
  poor.resources[resource] = 10;
  assert.equal(getRating(poor), 'AGAINST THE ODDS', 'One poor reserve cannot be hidden by a high average');
}
const recovered = structuredClone(victory);
recovered.report.lowestReserve = 10;
assert.equal(getRating(recovered), 'AGAINST THE ODDS', 'Recovery cannot hide poor past management');
recovered.report.lowestReserve = 24;
assert.equal(getRating(recovered), 'MISSION ACCOMPLISHED');
recovered.report.lowestReserve = 25;
assert.equal(getRating(recovered), 'EXEMPLARY COMMAND');
const boundary = structuredClone(victory);
boundary.resources = { oxygen: 35, energy: 85, water: 85, food: 85, shield: 85 };
assert.equal(getRating(boundary), 'EXEMPLARY COMMAND', 'Inclusive final min35 and average75 boundary');
boundary.resources.oxygen = 34.99;
assert.equal(getRating(boundary), 'MISSION ACCOMPLISHED');
boundary.resources = Object.fromEntries(Object.keys(boundary.resources).map(key => [key, 44.99]));
assert.equal(getRating(boundary), 'AGAINST THE ODDS');
boundary.status = 'lost';
boundary.cause = 'Oxygen reserves exhausted.';
assert.equal(getRating(boundary), 'MISSION ABORTED');
assert.deepEqual(buildMissionReport(boundary).criticalFailures, [boundary.cause]);
assert.equal(buildMissionReport(createGame()).score, 0);
const old = structuredClone(victory);
delete old.report;
delete old.learning;
const oldSnapshot = structuredClone(old);
const migrated = restoreMissionState(JSON.parse(JSON.stringify(old)));
assert.deepEqual(old, oldSnapshot);
assert.deepEqual(migrated.resources, old.resources);
assert.deepEqual(migrated.completed, old.completed);
assert.equal(migrated.xp, old.xp);
assert.equal(migrated.report.historyComplete, false);
assert.equal(migrated.report.lowestReserve, null);
assert.equal(getRating(migrated), 'MISSION ACCOMPLISHED', 'Do not invent complete history for old saves');
assert.deepEqual(migrated.learning, { responses: {}, answered: 0, correct: 0 });
assert.deepEqual(normalizeReport({ decisions: [null, {}], shelterEntries: [null, {}], lowestReserve: NaN }), normalizeReport());

const decisionFixture = createGame();
decisionFixture.resources.oxygen = 99;
decisionFixture.event = { id: 'dust', title: 'Regolith on the array', choices: [{ id: 'clean', label: 'Run electrostatic cleaning', consequence: 'Spend 6 energy; clear the dust and recover 3 oxygen.' }] };
const decisionSnapshot = structuredClone(decisionFixture);
const chosen = chooseEvent(decisionFixture, 'clean');
assert.deepEqual(decisionFixture, decisionSnapshot, 'Report collection never mutates previous state');
const decisionReport = buildMissionReport(chosen);
assert.equal(decisionReport.decisions.length, 1);
assert.equal(decisionReport.measuredDecisions, 1);
assert.equal(decisionReport.totals.oxygen.benefit, 1, 'Report actual capped gain, not nominal +3');
assert.equal(decisionReport.totals.energy.cost, 6);
assert.equal(decisionReport.totals.water.cost, 0);
const oldDecision = structuredClone(chosen);
delete oldDecision.report;
const legacyReport = buildMissionReport(oldDecision);
assert.equal(legacyReport.decisions.length, 1, 'Recover decision labels from old log');
assert.equal(legacyReport.measuredDecisions, 0);
assert.equal(legacyReport.decisions[0].changes, null, 'Never invent actual net effects for old decisions');
assert.equal(legacyReport.totals.oxygen.benefit, 0);
const lowRover = createGame();
lowRover.rover = true;
lowRover.resources.energy = 19;
const drove = movePlayer(lowRover, { x: 1, z: 8 });
assert.ok(drove.report.lowestReserve < 19, 'Rover drain included in passive reserve history');
assert.equal(lowRover.report.lowestReserve, 75);
const failure = createGame();
failure.resources.water = 0;
const failed = tickGame(failure, 0.25);
assert.equal(failed.status, 'lost');
assert.equal(failed.report.lowestReserve, 0);
assert.equal(getRating(failed), 'MISSION ABORTED');
assert.equal(tickGame(failed, 100), failed, 'Failure still freezes simulation');
assert.deepEqual(createGame().report.decisions, [], 'Replay starts with no past decisions');
console.log('PASS: four rating bands and boundaries, poor/recovered reserves, XP scoring, actual clamped effects, passive history and old-save compatibility');

const guidance = createGame();
const guidanceSnapshot = structuredClone(guidance);
assert.match(getStormEducation(guidance), /not a forecast/);
assert.match(SIMULATION_NOTE, /no live NASA data or real storm predictions/);
for (const phase of ['quiet', 'warning', 'active', 'passed']) {
  for (const sheltered of [false, true]) {
    const fixture = { ...guidance, storm: { phase, remaining: 12.2 }, sheltered };
    const text = getStormEducation(fixture);
    assert.ok(text.length < 450, 'Storm explanations stay concise');
    if (phase === 'warning' || phase === 'active') assert.match(text, /13s remaining/);
    if (phase === 'active') {
      assert.ok(text.includes(SHELTER_MODIFIER_NOTE));
      assert.match(text, sheltered ? /Sheltered/ : /Exposed/);
    }
    if (phase === 'passed') assert.match(text, /scripted power-distribution fault/);
  }
}
for (const id of ['oxygen', 'energy', 'water', 'food', 'shield']) {
  const fixture = structuredClone(guidance);
  fixture.resources[id] = 19;
  const critical = getCriticalResources(fixture);
  assert.equal(critical.length, 1);
  assert.equal(critical[0].id, id);
  assert.ok(critical[0].explanation.length > 80);
  assert.match(getAdvisor(fixture), /critical/);
  assert.ok(getAdvisor(fixture).includes('Habitat Alpha'), 'Critical reserves do not recommend a locked objective');
  fixture.resources[id] = 20;
  assert.equal(getCriticalResources(fixture).length, 0, 'Existing less-than-20 threshold is unchanged');
}
const allCritical = { ...guidance, resources: { oxygen: 19, energy: 18, water: 17, food: 16, shield: 15 } };
assert.deepEqual(getCriticalResources(allCritical).map(item => item.id), ['shield', 'food', 'water', 'energy', 'oxygen']);
for (let stage = 0; stage < 8; stage++) {
  const fixture = { ...guidance, stage, systems: { ...guidance.systems, habitat: stage > 0 } };
  const before = structuredClone(fixture);
  assert.ok(getAdvisor(fixture).length < 600);
  assert.ok(getMissionAction(fixture));
  getCriticalResources(fixture);
  getStormEducation(fixture);
  assert.deepEqual(fixture, before, 'Guidance never changes simulation or saved data');
}
assert.match(getMissionAction({ ...guidance, stage: 4, systems: { habitat: true }, rover: true }), /Drive.*survey/);
assert.match(getMissionAction({ ...guidance, stage: 4, systems: { habitat: true, solar: true }, resources: { ...guidance.resources, energy: 5 } }), /Wait.*8 power/);
assert.match(getMissionAction({ ...guidance, stage: 4, systems: { habitat: true, solar: false }, resources: { ...guidance.resources, energy: 5 } }), /no direct recharge task/);
assert.match(getMissionAction({ ...guidance, stage: 7, sheltered: true, storm: { phase: 'passed' } }), /Exit the shelter/);
assert.match(getMissionAction({ ...guidance, stage: 7, rover: true, storm: { phase: 'passed' } }), /Exit the rover/);
const activeLow = { ...allCritical, storm: { phase: 'active', remaining: 5 }, stage: 6 };
assert.match(getAdvisor(activeLow), /Walk to the shelter and enter now/);
assert.match(getAdvisor({ ...activeLow, rover: true }), /Drive to the shelter and enter now/);
assert.match(getAdvisor({ ...activeLow, sheltered: true }), /Stay sheltered/);
assert.doesNotMatch(getAdvisor({ ...activeLow, sheltered: true }), /Enter.*shelter/);
assert.match(getAdvisor({ ...activeLow, event: { id: 'dust' } }), /Choose an engineering option/);
assert.match(getMissionAction({ ...guidance, progress: { id: 'habitat' } }), /Stay within the work area/);
assert.match(getCriticalResources({ ...guidance, systems: { solar: true }, resources: { ...guidance.resources, energy: 5 } })[0].explanation, /replenishing power/);
assert.match(getCriticalResources({ ...guidance, resources: { ...guidance.resources, shield: 5 } })[0].explanation, /not falling.*No shield-repair/);
assert.deepEqual(guidance, guidanceSnapshot);
console.log('PASS: four storm phases, five contextual critical resources, current-objective actions, radiation priority, simulation disclaimers and read-only guidance');
