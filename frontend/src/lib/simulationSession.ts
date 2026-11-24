const SIMULATION_PREFIX = "yzu-judge:simulation";
const POSITION_PREFIX = "yzu-judge:exam-position";

export type SimulationScope = "problem" | "mock";

function simulationKey(scope: SimulationScope, id: number) {
  return `${SIMULATION_PREFIX}:${scope}:${id}`;
}

// sessionStorage keeps the switch through a reload but not into a new tab, so a
// fresh visit still starts in the normal interface.
export function loadSimulationMode(scope: SimulationScope, id: number) {
  try {
    return sessionStorage.getItem(simulationKey(scope, id)) === "1";
  } catch {
    return false;
  }
}

export function saveSimulationMode(scope: SimulationScope, id: number, enabled: boolean) {
  try {
    if (enabled) {
      sessionStorage.setItem(simulationKey(scope, id), "1");
    } else {
      sessionStorage.removeItem(simulationKey(scope, id));
    }
  } catch {
    // Storage can be unavailable in private windows; the switch still works.
  }
}

// The mock exam remembers which problem was open when the page reloaded.
export function loadExamPosition(examId: number) {
  try {
    const value = Number(sessionStorage.getItem(`${POSITION_PREFIX}:${examId}`));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveExamPosition(examId: number, position: number) {
  try {
    sessionStorage.setItem(`${POSITION_PREFIX}:${examId}`, String(position));
  } catch {
    // Storage can be unavailable; switching still works for this page view.
  }
}
