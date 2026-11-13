import { useI18n } from "../i18n";
import { topicLabel, type Topic } from "../lib/topics";

export default function TopicChips({ topics }: { topics: Topic[] }) {
  const { t } = useI18n();

  if (topics.length === 0) return null;

  return (
    <span className="flex flex-wrap gap-1">
      {topics.map((topic) => (
        <span key={topic} className="rounded bg-ink-2 px-1 py-0.5 font-mono text-xs text-neutral-400">
          {t(topicLabel[topic])}
        </span>
      ))}
    </span>
  );
}
