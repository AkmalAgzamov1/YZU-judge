import { topicLabel, type Topic } from "../lib/topics";

export default function TopicChips({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;

  return (
    <span className="flex flex-wrap gap-1">
      {topics.map((topic) => (
        <span key={topic} className="rounded bg-ink-2 px-1 py-0.5 font-mono text-xs text-neutral-400">
          {topicLabel[topic]}
        </span>
      ))}
    </span>
  );
}
