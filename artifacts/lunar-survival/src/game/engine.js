import { getRatingDetails, normalizeReport, observeResources } from './mission-report.js';
import { getFlightAdvisor } from './flight-guidance.js';
import { getDifficulty, getDecisionEffects, getDecisionConsequence, getShelterProtection } from './balance.js';
// Pure, browser-independent simulation. Time is compressed for educational play.
export const LOCATIONS = [
  { id: 'habitat', name: 'Habitat Alpha', x: 0, z: 0, radius: 4, description: 'Pressurize the living quarters for your crew.', action: 'Commission habitat' },
  { id: 'oxygen', name: 'Life Support', x: -8, z: -3, radius: 3.5, description: 'Replace the damaged oxygen recycling cartridge.', action: 'Repair oxygen recycler' },
  { id: 'solar', name: 'Solar Array', x: 9, z: -7, radius: 4, description: 'Align the solar panels and connect the power bus.', action: 'Activate solar array' },
  { id: 'ice', name: 'Ice Deposit', x: -17, z: -15, radius: 4, description: 'Recover simulated polar ice and emergency supplies.', action: 'Collect ice & supplies' },
  { id: 'rover', name: 'Lunar Rover', x: 6, z: 7, radius: 3.5, description: 'Board the rover to reach the remote survey site.', action: 'Board / exit rover' },
  { id: 'survey', name: 'Shackleton Ridge', x: 25, z: -22, radius: 4.5, description: 'Survey the ridge using the rover instruments.', action: 'Survey the ridge' },
  { id: 'shelter', name: 'Storm Shelter', x: -4, z: 5, radius: 3, description: 'Regolith shielding protects the crew from solar particles.', action: 'Enter / leave shelter' },
  { id: 'repair', name: 'Power Relay', x: 11, z: 1, radius: 3.5, description: 'Restore the relay after the simulated solar storm.', action: 'Repair power relay' },
];

export const MISSIONS = [
  { id: 'habitat', title: 'A place to call home', description: 'Reach Habitat Alpha and pressurize the crew quarters.', target: 'habitat', xp: 100 },
  { id: 'oxygen', title: 'Every breath matters', description: 'Repair the oxygen recycler at Life Support.', target: 'oxygen', xp: 150 },
  { id: 'solar', title: 'Power the outpost', description: 'Connect and align the solar array.', target: 'solar', xp: 150 },
  { id: 'ice', title: 'Written in the regolith', description: 'Collect ice and supplies at the polar deposit.', target: 'ice', xp: 200 },
  { id: 'survey', title: 'Beyond the horizon', description: 'Board the rover, drive to Shackleton Ridge and complete a survey.', target: 'survey', xp: 250 },
  { id: 'shelter', title: 'Incoming solar particles', description: 'Enter the storm shelter; late entry is allowed but risks radiation.', target: 'shelter', xp: 200 },
  { id: 'survive', title: 'Weather the storm', description: 'Survive until the storm passes after entering shelter at least once.', target: 'shelter', xp: 250 },
  { id: 'repair', title: 'One small outpost', description: 'Exit the shelter and repair the damaged power relay.', target: 'repair', xp: 300 },
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const durations = { habitat: 5, oxygen: 7, solar: 6, ice: 7, survey: 8, repair: 8 };

export function createGame(difficulty = 'normal') {
  return {
    version: 1, status: 'playing', difficulty: ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal',
    time: 0, resources: { oxygen: 90, energy: 75, water: 85, food: 90, shield: 100 },
    player: { x: 0, z: 8 }, rover: false, roverPosition: { x: 6, z: 7 }, sheltered: false, stage: 0, completed: [],
    learning: { responses: {}, answered: 0, correct: 0 },
    report: { historyComplete: true, lowestReserve: 75, decisions: [], shelterEntries: [] },
    xp: 0, log: [{ time: 0, text: 'Commander on the surface. Crew standing by in the lander.', effect: 'Mission started' }],
    notice: 'Welcome to the lunar south pole. Reach Habitat Alpha to begin.',
    event: null, eventCount: 0, nextEventAt: 75,
    systems: { habitat: false, oxygen: false, solar: false, ice: false, survey: false, repaired: false },
    storm: { phase: 'quiet', remaining: 0 }, progress: null, cause: null,
  };
}

function copy(state) {
  return { ...state, resources: { ...state.resources }, player: { ...state.player }, systems: { ...state.systems },
    storm: { ...state.storm }, completed: [...state.completed], log: [...state.log],
    progress: state.progress ? { ...state.progress } : null };
}
function record(state, text, effect = '') {
  state.log.push({ time: Math.round(state.time), text, effect });
  state.notice = text;
}
function complete(state, id) {
  if (state.completed.includes(id)) return;
  const mission = MISSIONS[state.stage];
  if (!mission || mission.id !== id) return;
  state.completed.push(id);
  state.xp += mission.xp;
  state.stage += 1;
  record(state, `Objective complete: ${mission.title}.`, `+${mission.xp} XP`);
}
function finishWork(state, id) {
  if (id === 'habitat') {
    state.systems.habitat = true;
    state.resources.energy -= 4;
  } else if (id === 'oxygen') {
    state.systems.oxygen = true;
    state.resources.oxygen = clamp(state.resources.oxygen + 15);
    state.resources.energy -= 5;
  } else if (id === 'solar') {
    state.systems.solar = true;
    state.resources.energy = clamp(state.resources.energy + 12);
  } else if (id === 'ice') {
    state.systems.ice = true;
    state.resources.water = clamp(state.resources.water + 25);
    state.resources.food = clamp(state.resources.food + 12);
  } else if (id === 'survey') {
    state.systems.survey = true;
    state.storm = { phase: 'warning', remaining: getDifficulty(state.difficulty).warning };
    state.rover = true;
  } else if (id === 'repair') {
    state.systems.repaired = true;
    state.systems.solar = true;
    state.resources.energy = clamp(state.resources.energy + 10);
  }
  complete(state, id);
  if (id === 'survey') record(state, 'SIMULATED SOLAR EVENT: return to the storm shelter.', 'Radiation warning');
  if (id === 'repair' && state.stage === MISSIONS.length) {
    state.status = 'won';
    record(state, 'Outpost secured. All crew accounted for. Mission accomplished.', 'Campaign complete');
  }
}

export function getNearby(state) {
  // An occupied shelter must always expose its exit, not the rover parked at its door.
  if (state.sheltered) return LOCATIONS.find(location => location.id === 'shelter');
  const matches = LOCATIONS.map(location => location.id === 'rover' ? { ...location, ...(state.rover ? state.player : state.roverPosition || { x: 6, z: 7 }) } : location)
    .map(location => ({ location, distance: Math.hypot(state.player.x - location.x, state.player.z - location.z) }))
    .filter(({ location, distance }) => distance <= location.radius).sort((a, b) => a.distance - b.distance);
  // Relay work is an EVA: expose disembark first, then repair even beside the parked rover.
  const relay = matches.find(({ location }) => location.id === 'repair');
  if (relay && MISSIONS[state.stage]?.id === 'repair') {
    return state.rover ? matches.find(({ location }) => location.id === 'rover').location : relay.location;
  }
  // Other nearby structures retain priority over the vehicle currently being driven.
  return matches.find(({ location }) => !state.rover || location.id !== 'rover')?.location || matches[0]?.location || null;
}

export function movePlayer(state, position) {
  if (state.status !== 'playing' || state.sheltered) return state;
  const x = clamp(Number(position.x) || 0, -39, 39);
  const z = clamp(Number(position.z) || 0, -36, 30);
  const distance = Math.hypot(x - state.player.x, z - state.player.z);
  if (distance < 0.00001) return state;
  const next = { ...state, player: { x, z } };
  // Motion cannot teleport a commander through the world, including click-to-move.
  if (distance > 2.5) {
    next.player = { x: state.player.x + (x - state.player.x) / distance * 2.5, z: state.player.z + (z - state.player.z) / distance * 2.5 };
  }
  if (state.rover) next.resources = { ...state.resources, energy: clamp(state.resources.energy - Math.min(distance, 2.5) * 0.035) };
  if (state.progress) {
    const target = LOCATIONS.find(location => location.id === state.progress.id);
    if (target && Math.hypot(next.player.x - target.x, next.player.z - target.z) > target.radius) {
      next.progress = null;
      next.notice = 'Work cancelled: stay near the system until the repair finishes.';
    }
  }
  next.report = observeResources(next);
  return next;
}

export function interact(state, id) {
  if (state.status !== 'playing' || state.progress) return state;
  const original = LOCATIONS.find(item => item.id === id);
  const location = original?.id === 'rover'
    ? { ...original, ...(state.rover ? state.player : state.roverPosition || { x: 6, z: 7 }) }
    : original;
  if (!location) return state;
  const next = copy(state);
  if (Math.hypot(state.player.x - location.x, state.player.z - location.z) > location.radius) {
    next.notice = `Move closer to ${location.name} to interact.`;
    return next;
  }
  if (id === 'shelter') {
    next.sheltered = !state.sheltered;
    if (next.sheltered) {
      const report = normalizeReport(next.report);
      next.report = { ...report, shelterEntries: [...report.shelterEntries, { time: next.time, phase: next.storm.phase }] };
    }
    if (state.rover) next.roverPosition = { ...state.player };
    next.rover = false;
    record(next, next.sheltered ? 'Crew secured inside the regolith storm shelter.' : 'Commander left the storm shelter.',
      next.sheltered ? `${getShelterProtection(state.difficulty)}% simulated protection modifier, not a real shelter performance figure` : 'EVA resumed');
    if (next.sheltered && MISSIONS[next.stage]?.id === 'shelter') complete(next, 'shelter');
    return next;
  }
  if (state.sheltered) { next.notice = 'Leave the storm shelter before working outside.'; return next; }
  if (id === 'rover') {
    if (!state.systems.habitat) { next.notice = 'Commission the habitat before taking the rover.'; return next; }
    if (!state.rover && state.resources.energy < 8) { next.notice = 'Rover requires at least 8% energy.'; return next; }
    next.rover = !state.rover;
    next.roverPosition = { ...state.player };
    record(next, next.rover ? 'Rover boarded. Drive to the marked objective.' : 'Rover parked. EVA resumed.', next.rover ? 'Faster travel · consumes energy' : '');
    return next;
  }
  if (MISSIONS[state.stage]?.id !== id) {
    next.notice = state.completed.includes(id) ? `${location.name} is already operational.` : `Current priority: ${MISSIONS[state.stage]?.title || 'Mission complete'}.`;
    return next;
  }
  if (id === 'survey' && !state.rover) {
    next.notice = 'Rover instruments required. Board the rover at the outpost first.';
    return next;
  }
  if (id === 'repair' && state.rover) {
    next.notice = 'Exit the rover before repairing the power relay.';
    return next;
  }
  next.progress = { id, label: location.action, remaining: durations[id], total: durations[id] };
  next.notice = `${location.action} — stay within range.`;
  return next;
}

const events = [
  { id: 'dust', title: 'Regolith on the array', description: 'An EVA plume has coated the solar cells. This simulated engineering fault reduces available power.',
    choices: [
      { id: 'clean', label: 'Run electrostatic cleaning', consequence: 'Spend 6 energy; clear the dust and recover 3 oxygen.' },
      { id: 'ration', label: 'Ration non-essential power', consequence: 'Save 4 energy; crew uses 5 extra food.' },
    ] },
  { id: 'leak', title: 'Cooling loop pressure drop', description: 'A seal is leaking in a secondary cooling line. Decide how to stabilize it.',
    choices: [
      { id: 'seal', label: 'Isolate and patch the loop', consequence: 'Spend 5 water and 3 energy; protect oxygen reserves.' },
      { id: 'vent', label: 'Vent the damaged section', consequence: 'Spend 8 oxygen; recover 4 energy.' },
    ] },
  { id: 'battery', title: 'Battery temperature warning', description: 'The battery heater is drawing more energy than expected. This is a simulated thermal-control scenario.',
    choices: [
      { id: 'heat', label: 'Maintain battery heating', consequence: 'Spend 7 energy; preserve all supplies.' },
      { id: 'cycle', label: 'Cycle the thermal system', consequence: 'Spend 3 water and 3 oxygen; gain 3 energy.' },
    ] },
];

export function chooseEvent(state, choiceId) {
  if (!state.event || state.status !== 'playing') return state;
  const choice = state.event.choices.find(item => item.id === choiceId);
  if (!choice) return state;
  const next = copy(state);
  for (const [key, value] of Object.entries(getDecisionEffects(choiceId, state.difficulty))) next.resources[key] = clamp(next.resources[key] + value);
  const report = normalizeReport(next.report);
  next.report = { ...report, decisions: [...report.decisions, {
    logIndex: next.log.length,
    changes: Object.fromEntries(Object.keys(next.resources).map(key => [key, next.resources[key] - state.resources[key]])),
  }] };
  record(next, `${state.event.title}: ${choice.label}.`, getDecisionConsequence(choiceId, state.difficulty) || choice.consequence);
  next.event = null;
  return checkFailure(next);
}

function checkFailure(state) {
  state.report = observeResources(state);
  if (state.status !== 'playing') return state;
  const failed = ['oxygen', 'energy', 'water', 'food', 'shield'].find(key => state.resources[key] <= 0);
  if (failed) {
    state.status = 'lost';
    state.cause = failed === 'shield' ? 'Radiation exposure exceeded safe limits.' : `${failed[0].toUpperCase() + failed.slice(1)} reserves exhausted. Life support could not be sustained.`;
    state.progress = null;
    record(state, 'Mission aborted. ' + state.cause, 'Life-support failure');
  }
  return state;
}

export function tickGame(state, deltaSeconds) {
  if (state.status !== 'playing' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  // Substeps keep large updates fair at storm/work/event boundaries.
  if (deltaSeconds > 1) {
    let next = state;
    let remaining = Math.min(deltaSeconds, 3600);
    while (remaining > 0 && next.status === 'playing') {
      const step = Math.min(1, remaining);
      next = tickGame(next, step);
      remaining -= step;
    }
    return next;
  }
  const next = copy(state);
  const dt = deltaSeconds;
  const difficulty = getDifficulty(state.difficulty);
  next.time += dt;
  const drain = dt * difficulty.drain * (next.sheltered ? 0.65 : 1);
  next.resources.oxygen = clamp(next.resources.oxygen - drain * (next.systems.oxygen ? 0.018 : 0.12));
  next.resources.water = clamp(next.resources.water - drain * 0.042);
  next.resources.food = clamp(next.resources.food - drain * 0.033);
  next.resources.energy = clamp(next.resources.energy + dt * (next.systems.solar && next.storm.phase !== 'active' ? 0.11 : -0.075 * difficulty.drain));
  if (next.rover && next.resources.energy < 4) {
    next.rover = false;
    next.roverPosition = { ...next.player };
    next.notice = 'Rover battery critical. Continue on foot.';
  }
  if (next.progress) {
    next.progress.remaining -= dt;
    if (next.progress.remaining <= 0) {
      const id = next.progress.id;
      next.progress = null;
      finishWork(next, id);
    }
  }
  if (next.storm.phase === 'warning' || next.storm.phase === 'active') {
    next.storm.remaining = Math.max(0, next.storm.remaining - dt);
    if (next.storm.phase === 'active') next.resources.shield = clamp(next.resources.shield - dt * difficulty.radiation * (next.sheltered ? difficulty.shelterLoss : 1));
    if (next.storm.remaining <= 0 && next.storm.phase === 'warning') {
      next.storm = { phase: 'active', remaining: 35 };
      record(next, 'Simulated solar particle event in progress. Stay inside the shelter.', 'Exterior radiation elevated');
    } else if (next.storm.remaining <= 0 && next.storm.phase === 'active') {
      next.storm = { phase: 'passed', remaining: 0 };
      next.systems.solar = false;
      if (next.completed.includes('shelter')) complete(next, 'survive');
      record(next, 'All clear. Solar event passed; the power relay needs repair.', 'Safe to resume EVA');
    }
  }
  // A late arrival can still continue after accepting its radiation penalty.
  if (next.storm.phase === 'passed' && next.sheltered && MISSIONS[next.stage]?.id === 'survive') complete(next, 'survive');
  if (!next.event && next.time >= next.nextEventAt && next.storm.phase !== 'active' && next.status === 'playing') {
    const eventIndex = Math.floor(Math.random() * events.length);
    next.event = { ...events[eventIndex], choices: events[eventIndex].choices.map(choice => ({
      ...choice, consequence: getDecisionConsequence(choice.id, state.difficulty),
    })) };
    next.eventCount += 1;
    next.nextEventAt = next.time + difficulty.eventBase + Math.floor(Math.random() * difficulty.eventRange);
    record(next, `Engineering alert: ${next.event.title}.`, 'Decision required');
  }
  return checkFailure(next);
}

export function getAdvisor(state) {
  return getFlightAdvisor(state);
}

export function getRating(state) {
  return getRatingDetails(state).rating;
}
