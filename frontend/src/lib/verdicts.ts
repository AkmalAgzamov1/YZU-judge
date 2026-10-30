import type { Submission, SubmissionResult } from "../api/client";

export type SubmissionStatus = Submission["status"];
export type TestVerdict = SubmissionResult["verdict"];

export const verdictLabel: Record<SubmissionStatus, string> = {
  pending: "In queue",
  running: "Running",
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  time_limit_exceeded: "Time limit exceeded",
  memory_limit_exceeded: "Memory limit exceeded",
  runtime_error: "Runtime error",
  compilation_error: "Compilation error",
  internal_error: "Judge error",
};

// One color per verdict, used everywhere a verdict appears.
export const verdictColor: Record<SubmissionStatus, string> = {
  pending: "text-neutral-400",
  running: "text-neutral-400",
  accepted: "text-emerald-400",
  wrong_answer: "text-yzu-red",
  time_limit_exceeded: "text-yzu-yellow",
  memory_limit_exceeded: "text-sky-400",
  runtime_error: "text-orange-400",
  compilation_error: "text-orange-400",
  internal_error: "text-neutral-400",
};

export function isFinished(status: SubmissionStatus) {
  return status !== "pending" && status !== "running";
}
