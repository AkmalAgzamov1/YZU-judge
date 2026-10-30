export const STARTER_CODE = `# Read from standard input, print to standard output.
import sys

for line in sys.stdin:
    pass
`;

const draftKey = (problemId: number) => `yzu-judge:draft:${problemId}`;

export function loadDraft(problemId: number) {
  try {
    return localStorage.getItem(draftKey(problemId)) ?? STARTER_CODE;
  } catch {
    return STARTER_CODE;
  }
}

export function saveDraft(problemId: number, code: string) {
  try {
    localStorage.setItem(draftKey(problemId), code);
  } catch {
    // Storage can be unavailable in private windows; the editor still works.
  }
}
