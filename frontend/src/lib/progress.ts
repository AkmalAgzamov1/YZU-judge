import type { Problem, Submission } from "../api/client";

export type SolveStatus = "solved" | "attempted";

const difficultyOrder: Record<Problem["difficulty"], number> = { easy: 0, medium: 1, hard: 2 };

export function sortByDifficulty(problems: Problem[]) {
  return [...problems].sort(
    (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || a.id - b.id,
  );
}

// A problem is solved once any submission is accepted, attempted otherwise.
export function buildStatuses(submissions: Submission[]): Map<number, SolveStatus> {
  const statuses = new Map<number, SolveStatus>();
  for (const submission of submissions) {
    if (submission.status === "accepted") {
      statuses.set(submission.problem_id, "solved");
    } else if (!statuses.has(submission.problem_id)) {
      statuses.set(submission.problem_id, "attempted");
    }
  }
  return statuses;
}

// The backend stores UTC without a zone marker; days are counted in local time.
export function serverDate(iso: string) {
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function countByDay(submissions: Submission[]) {
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const key = dayKey(serverDate(submission.created_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function streaks(counts: Map<string, number>, today = new Date()) {
  // The current streak survives until the end of today, so start from
  // yesterday when nothing was sent yet today.
  let cursor = counts.has(dayKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (counts.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const days = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of days) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    run = previous && dayKey(addDays(previous, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  return { current, best };
}

// Weeks as columns, Monday first, ending with the current week.
export function activityGrid(counts: Map<string, number>, weeks: number, today = new Date()) {
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const todayKey = dayKey(today);

  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(start, week * 7 + weekday);
      const key = dayKey(date);
      return { key, date, count: counts.get(key) ?? 0, future: key > todayKey };
    }),
  );
}
