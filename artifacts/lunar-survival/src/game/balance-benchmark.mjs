import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as engine from './engine.js';

// Reproducible direct-route benchmark at the browser's 1x walking/driving speeds.
// No save injection, teleports, changes to starting reserves, or files written.
const KEYS = ['oxygen', 'energy', 'water', 'food', 'shield'];
function seeded(seed) {
  let value = seed;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
}

export function runCampaign(difficulty, seed, strategy = 'careful', decisionDelay = 0) {
  const originalRandom = Math.random;
  Math.random = seeded(seed);
  let state = engine.createGame(difficulty);
  const minima = { ...state.resources };
  const decisions = [];
  function update(next) {
    state = next;
    for (const key of KEYS) minima[key] = Math.min(minima[key], state.resources[key]);
  }
  function resolve() {
    if (!state.event || state.status !== 'playing') return;
    for (let elapsed = 0; elapsed < decisionDelay && state.status === 'playing'; elapsed += 0.25) {
      update(engine.tickGame(state, 0.25));
    }
    if (state.status !== 'playing') return;
    const choice = strategy === 'careful'
      ? state.event.choices.map(option => ({
        id: option.id,
        reserve: Math.min(...Object.values(engine.chooseEvent(state, option.id).resources)),
      })).sort((a, b) => b.reserve - a.reserve)[0].id
      : { dust: 'clean', leak: 'seal', battery: 'heat' }[state.event.id];
    decisions.push(choice);
    update(engine.chooseEvent(state, choice));
  }
  function tick() {
    update(engine.tickGame(state, 0.25));
    resolve();
  }
  function travel(id) {
    const target = id === 'rover' ? state.roverPosition : engine.LOCATIONS.find(item => item.id === id);
    for (let i = 0; i < 2000 && state.status === 'playing'; i++) {
      resolve();
      const dx = target.x - state.player.x, dz = target.z - state.player.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.01) return;
      const step = Math.min(distance, (state.rover ? 9 : 4.6) * 0.25);
      update(engine.movePlayer(state, {
        x: state.player.x + dx / distance * step,
        z: state.player.z + dz / distance * step,
      }));
      tick();
    }
  }
  function work(id) {
    travel(id);
    update(engine.interact(state, id));
    for (let i = 0; i < 100 && state.progress && state.status === 'playing'; i++) tick();
  }
  try {
    for (const id of ['habitat', 'oxygen', 'solar', 'ice']) work(id);
    travel('rover');
    update(engine.interact(state, 'rover'));
    work('survey');
    if (strategy !== 'careful') {
      while (state.storm.phase !== 'passed' && state.status === 'playing') tick();
      if (strategy === 'never-shelter') {
        while (state.status === 'playing' && state.time < 6000) tick();
        return { state, minima, decisions };
      }
    }
    if (state.status === 'playing') {
      travel('shelter');
      update(engine.interact(state, 'shelter'));
      while (state.storm.phase !== 'passed' && state.status === 'playing') tick();
      if (state.stage === 6) tick();
      update(engine.interact(state, 'shelter'));
      work('repair');
    }
    return { state, minima, decisions };
  } finally {
    Math.random = originalRandom;
  }
}

function sampleRules(difficulty) {
  const originalRandom = Math.random;
  Math.random = seeded(9821);
  try {
    const results = [];
    let idle = engine.createGame(difficulty);
    results.push(engine.tickGame(idle, 60));
    while (idle.status === 'playing') idle = engine.tickGame(idle, 0.25);
    results.push(idle);
    for (const sheltered of [false, true]) {
      const state = engine.createGame(difficulty);
      state.storm = { phase: 'active', remaining: 35 };
      state.sheltered = sheltered;
      results.push(engine.tickGame(state, 35));
    }
    for (let index = 0; index < 3; index++) {
      Math.random = () => (index + 0.1) / 3;
      const state = engine.createGame(difficulty);
      state.resources = Object.fromEntries(KEYS.map(key => [key, 50]));
      state.nextEventAt = 0;
      const ready = engine.tickGame(state, 0.25);
      results.push(ready);
      for (const choice of ready.event.choices) results.push(engine.chooseEvent(ready, choice.id));
    }
    return results;
  } finally {
    Math.random = originalRandom;
  }
}

const LEGACY_DIGESTS = {
  easy: 'bb237c6823795a62bc05e0cc21f7d1411edb4a15ba402d477dd7905ecfb3e1b7',
  normal: '8cd3b3ef9c5ac474c858e45426eec306b5d14aca8442986213e212498db9240a',
};

for (const difficulty of ['easy', 'normal', 'hard']) {
  const samples = sampleRules(difficulty);
  const summaries = {};
  const all = [];
  for (const strategy of ['careful', 'late-shelter', 'never-shelter']) {
    const runs = Array.from({ length: 100 }, (_, index) => runCampaign(difficulty, index + 1, strategy));
    all.push(...runs);
    const range = getter => [
      Math.min(...runs.map(getter)),
      Math.max(...runs.map(getter)),
    ].map(value => +value.toFixed(3));
    summaries[strategy] = {
      wins: runs.filter(run => run.state.status === 'won').length,
      losses: runs.filter(run => run.state.status === 'lost').length,
      time: range(run => run.state.time),
      minimum: range(run => Math.min(...Object.values(run.minima))),
      minima: Object.fromEntries(KEYS.map(key => [key, range(run => run.minima[key])])),
      final: Object.fromEntries(KEYS.map(key => [key, range(run => run.state.resources[key])])),
    };
  }
  // Hash full states, event payloads, logs, timings and histories, not rounded summaries.
  const digest = createHash('sha256').update(JSON.stringify({ samples, all })).digest('hex');
  console.log(`BENCHMARK ${difficulty}: ${JSON.stringify({ digest, idleLossTime: samples[1].time, ...summaries })}`);
  if (!process.argv.includes('--record-baseline')) {
    if (difficulty !== 'hard') assert.equal(digest, LEGACY_DIGESTS[difficulty], `${difficulty}: identical to pre-change simulation`);
    assert.equal(summaries.careful.wins, 100);
    assert.ok(summaries.careful.minimum[0] > 25, `${difficulty}: careful minimum above 25`);
    assert.equal(samples[1].status, 'lost', 'Idle player loses');
    if (difficulty === 'hard') {
      assert.equal(summaries['late-shelter'].losses, 100, 'Full storm exposure loses');
      assert.equal(summaries['never-shelter'].losses, 100);
      const delayed = Array.from({ length: 100 }, (_, index) => runCampaign('hard', index + 1, 'careful', 10));
      assert.ok(delayed.every(run => run.state.status === 'won' && Math.min(...Object.values(run.minima)) > 25));
      console.log(`PASS: Hard with 10s reading time per event: 100/100 wins; minimum ${Math.min(...delayed.flatMap(run => Object.values(run.minima))).toFixed(3)}`);
    }
  }
}
