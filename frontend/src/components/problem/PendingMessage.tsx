import type { Submission } from "../../api/client";
import { useI18n } from "../../i18n";

export default function PendingMessage({ status, stale }: { status: Submission["status"]; stale: boolean }) {
  const { t } = useI18n();

  return (
    <>
      <p className="animate-pulse text-neutral-300">
        {status === "running" ? t("running against hidden tests…") : t("waiting in the judge queue…")}
      </p>
      {stale && (
        <p className="mt-3 font-sans text-sm text-neutral-500">
          {t(
            "This is taking longer than usual. The judge may be offline. Your submission is saved and will be judged when it is back.",
          )}
        </p>
      )}
    </>
  );
}
