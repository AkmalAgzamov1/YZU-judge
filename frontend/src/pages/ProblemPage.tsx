import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cpePapersApi, type CpePaper } from "../api/client";
import AppShell from "../components/AppShell";
import SimulationMode from "../components/simulation/SimulationMode";
import ProblemWorkspace from "../components/problem/ProblemWorkspace";
import { buttonPrimary, focusRing } from "../components/ui";
import { useI18n } from "../i18n";
import { loadSimulationMode, saveSimulationMode } from "../lib/simulationSession";

// Tags a problem with the past CPE papers it appeared in.
function PaperTags({ problemId }: { problemId: number }) {
  const { t } = useI18n();
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
          {t("From {paper}", { paper: paper.title })}
        </span>
      ))}
    </>
  );
}

export default function ProblemPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const problemId = Number(id);
  const validProblem = Number.isInteger(problemId) && problemId > 0;
  const [simulation, setSimulation] = useState(() => validProblem && loadSimulationMode("problem", problemId));

  function enterSimulation() {
    saveSimulationMode("problem", problemId, true);
    setSimulation(true);
  }

  function exitSimulation() {
    saveSimulationMode("problem", problemId, false);
    setSimulation(false);
  }

  if (simulation && validProblem) {
    return (
      <SimulationMode
        problems={[{ position: 1, problem_id: problemId, title: "" }]}
        initialPosition={1}
        onExit={exitSimulation}
      />
    );
  }

  return (
    <AppShell>
      {validProblem ? (
        <ProblemWorkspace
          key={problemId}
          problemId={problemId}
          onEnterSimulation={enterSimulation}
          topSlot={
            <Link
              to="/problems"
              className={`inline-flex items-center gap-2 rounded-lg text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Problems")}
            </Link>
          }
          metaSlot={<PaperTags problemId={problemId} />}
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">{t("No such problem")}</h1>
          <Link to="/problems" className={`${buttonPrimary} mt-8`}>
            {t("Back to problems")}
          </Link>
        </div>
      )}
    </AppShell>
  );
}
