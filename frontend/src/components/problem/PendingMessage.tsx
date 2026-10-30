import type { Submission } from "../../api/client";

export default function PendingMessage({ status, stale }: { status: Submission["status"]; stale: boolean }) {
  return (
    <>
      <p className="animate-pulse text-neutral-300">
        {status === "running" ? "running against hidden tests…" : "waiting in the judge queue…"}
      </p>
      {stale && (
        <p className="mt-3 font-sans text-sm text-neutral-500">
          This is taking longer than usual. The judge may be offline. Your
          submission is saved and will be judged when it is back.
        </p>
      )}
    </>
  );
}
