import type { Problem } from "../api/client";
import { useI18n, type Key } from "../i18n";

export type Difficulty = Problem["difficulty"];

export const difficultyColor: Record<Difficulty, string> = {
  easy: "text-emerald-400",
  medium: "text-yzu-yellow",
  hard: "text-yzu-red",
};

// English labels, which are also the translation keys: show them with t().
export const difficultyLabel: Record<Difficulty, Key> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useI18n();

  return (
    <span className={`text-sm font-medium ${difficultyColor[difficulty]}`}>
      {t(difficultyLabel[difficulty])}
    </span>
  );
}
