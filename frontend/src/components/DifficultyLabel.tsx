import type { Problem } from "../api/client";

export type Difficulty = Problem["difficulty"];

// eslint-disable-next-line react-refresh/only-export-components
export const difficultyColor: Record<Difficulty, string> = {
  easy: "text-emerald-400",
  medium: "text-yzu-yellow",
  hard: "text-yzu-red",
};

// eslint-disable-next-line react-refresh/only-export-components
export const difficultyLabel: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`text-sm font-medium ${difficultyColor[difficulty]}`}>
      {difficultyLabel[difficulty]}
    </span>
  );
}
