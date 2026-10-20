
export type Verdict =
  | "pending"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "compilation_error"
  | "runtime_error"
  | "internal_error";

interface VerdictConfig {
  label: string;
  tone: "success" | "danger" | "warning" | "info" | "neutral";
}

const VERDICT_CONFIG = {
  pending: { label: "Pending", tone: "warning" },
  running: { label: "Running", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  wrong_answer: { label: "Wrong Answer", tone: "danger" },
  time_limit_exceeded: {
    label: "Time Limit Exceeded",
    tone: "warning",
  },
  memory_limit_exceeded: {
    label: "Memory Limit Exceeded",
    tone: "warning",
  },
  compilation_error: { label: "Compilation Error", tone: "danger" },
  runtime_error: { label: "Runtime Error", tone: "danger" },
  internal_error: { label: "Internal Error", tone: "neutral" },
} satisfies Record<Verdict, VerdictConfig>;

interface VerdictChipProps {
  verdict: Verdict;
}

export function VerdictChip({ verdict }: VerdictChipProps) {
  const config = VERDICT_CONFIG[verdict];

  return (
    <span className={`verdict-chip verdict-chip--${config.tone}`}>
      <span className="verdict-chip__indicator" aria-hidden="true" />
      {config.label}
    </span>
  );
}
