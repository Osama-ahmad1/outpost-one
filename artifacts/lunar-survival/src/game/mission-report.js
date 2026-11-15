import { normalizeLearning, MISSION_LEARNING } from './mission-learning.js';

const RESOURCE_KEYS = ['oxygen', 'energy', 'water', 'food', 'shield'];
const DECISION_TITLES = ['Regolith on the array:', 'Cooling loop pressure drop:', 'Battery temperature warning:'];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const reserve = value => finite(value) ? Math.max(0, Math.min(100, value)) : 0;

export function normalizeReport(value) {
  return {
    historyComplete: value?.historyComplete === true,
    lowestReserve: finite(value?.lowestReserve) ? reserve(value.lowestReserve) : null,
    decisions: Array.isArray(value?.decisions) ? value.decisions.filter(item =>
      Number.isInteger(item?.logIndex) && item.logIndex >= 0 && item.changes &&
      RESOURCE_KEYS.every(key => finite(item.changes[key]))
    ).map(item => ({ logIndex: item.logIndex, changes: { ...item.changes } })) : [],
    shelterEntries: Array.isArray(value?.shelterEntries) ? value.shelterEntries.filter(item =>
      finite(item?.time) && ['quiet', 'warning', 'active', 'passed'].includes(item.phase)
    ).map(item => ({ time: item.time, phase: item.phase })) : [],
  };
}

// Observation only: never changes resource values, objectives, clocks or events.
export function observeResources(state) {
  const report = normalizeReport(state.report);
  const current = Math.min(...RESOURCE_KEYS.map(key => reserve(state.resources?.[key])));
  return { ...report, lowestReserve: report.lowestReserve === null ? current : Math.min(report.lowestReserve, current) };
}

export function restoreMissionState(state) {
  return { ...state, learning: normalizeLearning(state.learning), report: normalizeReport(state.report) };
}

export function getRatingDetails(state) {
  if (state.status !== 'won') return {
    rating: 'MISSION ABORTED',
    reason: state.cause || 'The mission ended before all eight objectives were secured.',
  };
  const values = RESOURCE_KEYS.map(key => reserve(state.resources?.[key]));
  const minimum = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const report = normalizeReport(state.report);
  const lowest = Math.min(minimum, report.lowestReserve ?? minimum);
  const allComplete = Object.keys(MISSION_LEARNING).every(id => state.completed?.includes(id));
  if (allComplete && minimum >= 35 && average >= 75 && report.historyComplete && lowest >= 25) return {
    rating: 'EXEMPLARY COMMAND',
    reason: 'All eight objectives secured, with an average reserve of at least 75, every final reserve at least 35, and none recorded below 25.',
  };
  if (minimum < 20 || average < 45 || lowest < 20) return {
    rating: 'AGAINST THE ODDS',
    reason: 'The crew succeeded, but reserves fell below 20 or the final average was below 45.',
  };
  return {
    rating: 'MISSION ACCOMPLISHED',
    reason: report.historyComplete
      ? 'The crew succeeded with usable reserves, but did not meet all exemplary resource-management thresholds.'
      : 'The crew succeeded; complete reserve history is unavailable for this older save, so the top rating cannot be verified.',
  };
}

export function buildMissionReport(state) {
  const report = normalizeReport(state.report);
  const log = Array.isArray(state.log) ? state.log : [];
  const decisions = log.flatMap((entry, index) => {
    if (!DECISION_TITLES.some(title => entry.text?.startsWith(title))) return [];
    const measured = report.decisions.find(item => item.logIndex === index);
    return [{ time: entry.time, text: entry.text, statedEffect: entry.effect,
      changes: measured?.changes || null }];
  });
  const totals = Object.fromEntries(RESOURCE_KEYS.map(key => [key, { cost: 0, benefit: 0 }]));
  for (const decision of decisions) {
    if (!decision.changes) continue;
    for (const key of RESOURCE_KEYS) {
      totals[key].cost += Math.max(0, -decision.changes[key]);
      totals[key].benefit += Math.max(0, decision.changes[key]);
    }
  }
  const stormStart = log.find(entry => entry.text === 'Simulated solar particle event in progress. Stay inside the shelter.');
  const warning = log.find(entry => entry.text === 'SIMULATED SOLAR EVENT: return to the storm shelter.');
  const shelterLog = log.filter(entry => entry.text === 'Crew secured inside the regolith storm shelter.');
  const relevantEntry = report.shelterEntries.find(entry => entry.phase !== 'quiet');
  let shelterResponse = 'Storm not reached; no storm response recorded.';
  if (relevantEntry) {
    shelterResponse = relevantEntry.phase === 'warning'
      ? `Entered shelter during the warning at T+${Math.floor(relevantEntry.time)}s.`
      : relevantEntry.phase === 'active'
        ? `Entered shelter after radiation began at T+${Math.floor(relevantEntry.time)}s.`
        : `Entered shelter after the storm passed at T+${Math.floor(relevantEntry.time)}s.`;
  } else if (warning || stormStart || state.storm?.phase !== 'quiet') {
    shelterResponse = shelterLog.length
      ? 'Shelter entry appears in the log; its storm phase was not recorded in this older save.'
      : 'No shelter entry recorded during this mission.';
  } else if (shelterLog.length) {
    shelterResponse = 'Entered shelter before a storm warning; no storm response recorded yet.';
  }
  const learning = normalizeLearning(state.learning);
  return {
    ...getRatingDetails(state),
    score: finite(state.xp) ? state.xp : 0,
    objectives: new Set((state.completed || []).filter(id => MISSION_LEARNING[id])).size,
    decisions, totals, measuredDecisions: decisions.filter(item => item.changes).length,
    shelterResponse,
    criticalFailures: state.status === 'lost' ? [state.cause || 'Mission failed; cause not recorded.'] : [],
    lowestReserve: report.lowestReserve,
    historyComplete: report.historyComplete,
    learning,
    concepts: (state.completed || []).filter(id => MISSION_LEARNING[id]).map(id => MISSION_LEARNING[id].science),
    sourcesExplored: null,
  };
}
