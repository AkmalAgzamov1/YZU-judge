export const STARTER_CODE = `# Read from standard input, print to standard output.
import sys

for line in sys.stdin:
    pass
`;

// scope keeps mock exam drafts apart from everyday practice drafts.
const draftKey = (problemId: number, scope?: string) =>
  scope ? `yzu-judge:draft:${scope}:${problemId}` : `yzu-judge:draft:${problemId}`;

export function loadDraft(problemId: number, scope?: string) {
  try {
    return localStorage.getItem(draftKey(problemId, scope)) ?? STARTER_CODE;
  } catch {
    return STARTER_CODE;
  }
}

export function saveDraft(problemId: number, code: string, scope?: string) {
  try {
    localStorage.setItem(draftKey(problemId, scope), code);
  } catch {
    // Storage can be unavailable in private windows; the editor still works.
  }
}
