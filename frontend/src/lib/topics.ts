import type { Problem } from "../api/client";

export type Topic = NonNullable<Problem["topics"]>[number];

// Same order as app/topics.py on the backend.
export const topicLabel: Record<Topic, string> = {
  implementation: "Implementation",
  math: "Math",
  "number-theory": "Number theory",
  strings: "Strings",
  sorting: "Sorting",
  greedy: "Greedy",
  "brute-force": "Brute force",
  dp: "DP",
  graphs: "Graphs",
  "data-structures": "Data structures",
  geometry: "Geometry",
  simulation: "Simulation",
};

export const TOPICS = Object.keys(topicLabel) as Topic[];

export function isTopic(value: string): value is Topic {
  return value in topicLabel;
}
