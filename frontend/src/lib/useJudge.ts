import { useEffect, useRef, useState } from "react";
import { ApiError, submissionsApi, type Submission, type SubmissionResult } from "../api/client";
import { isFinished } from "./verdicts";

const STALE_AFTER_MS = 60_000;

// Polls a submission until the judge finishes, then loads per test results.
// Mount it with a key per submission so state starts fresh.
export default function useJudge(
  submissionId: number | null,
  onFinished?: (submission: Submission) => void,
) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [results, setResults] = useState<SubmissionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A 403 or 404 will not fix itself, so polling stops.
  const [fatal, setFatal] = useState<ApiError | null>(null);
  const [stale, setStale] = useState(false);
  const finishedRef = useRef(onFinished);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (submissionId == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function tick(id: number) {
      try {
        const current = await submissionsApi.get(id);
        if (cancelled) return;
        setSubmission(current);
        setError(null);

        if (isFinished(current.status)) {
          const testResults = await submissionsApi.results(id).catch(() => []);
          if (cancelled) return;
          setResults([...testResults].sort((a, b) => a.test_case_id - b.test_case_id));
          finishedRef.current?.(current);
          return;
        }

        const elapsed = Date.now() - startedAt;
        setStale(elapsed > STALE_AFTER_MS);
        timer = setTimeout(() => tick(id), elapsed > 20_000 ? 3000 : 1000);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setFatal(err);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Lost connection to the judge.");
        timer = setTimeout(() => tick(id), 3000);
      }
    }

    void tick(submissionId);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submissionId]);

  return { submission, results, error, fatal, stale };
}
