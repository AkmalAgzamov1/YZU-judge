import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cpePapersApi, type CpePaper } from "../api/client";
import AppShell from "../components/AppShell";
import ProblemWorkspace from "../components/problem/ProblemWorkspace";
import { buttonPrimary, focusRing } from "../components/ui";

// Tags a problem with the past CPE papers it appeared in.
function PaperTags({ problemId }: { problemId: number }) {
  const [papers, setPapers] = useState<CpePaper[]>([]);

  useEffect(() => {
    let cancelled = false;

    cpePapersApi.list().then(
      (all) => {
        if (!cancelled) {
          setPapers(all.filter((paper) => paper.problems.some((item) => item.problem_id === problemId)));
        }
      },
      () => {},
    );

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  return (
    <>
      {papers.map((paper) => (
        <span key={paper.id} className="rounded border border-white/10 px-1 text-xs text-neutral-400">
          From {paper.title}
        </span>
      ))}
    </>
  );
}

export default function ProblemPage() {
  const { id } = useParams();
  const problemId = Number(id);

  return (
    <AppShell>
      {Number.isInteger(problemId) && problemId > 0 ? (
        <ProblemWorkspace
          key={problemId}
          problemId={problemId}
          topSlot={
            <Link
              to="/problems"
              className={`inline-flex items-center gap-2 rounded-lg text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Problems
            </Link>
          }
          metaSlot={<PaperTags problemId={problemId} />}
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">No such problem</h1>
          <Link to="/problems" className={`${buttonPrimary} mt-8`}>
            Back to problems
          </Link>
        </div>
      )}
    </AppShell>
  );
}
