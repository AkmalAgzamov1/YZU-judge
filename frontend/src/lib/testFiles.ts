// Pairs dropped test files into input and output by name. Understands
// 1.in / 1.out (also .ans), 1_input.txt / 1_output.txt, input1.txt / output1.txt.

export interface TestPair {
  name: string;
  input: File;
  output: File;
}

export interface PairingResult {
  pairs: TestPair[];
  // Files that matched no pattern or have no partner.
  leftovers: string[];
}

type Side = "input" | "output";

const patterns: { regex: RegExp; side: Side; nameGroup: number }[] = [
  { regex: /^(.+)\.(in|input)(\.txt)?$/i, side: "input", nameGroup: 1 },
  { regex: /^(.+)\.(out|output|ans|answer)(\.txt)?$/i, side: "output", nameGroup: 1 },
  { regex: /^(.+)[_-](in|input)\.txt$/i, side: "input", nameGroup: 1 },
  { regex: /^(.+)[_-](out|output|ans|answer)\.txt$/i, side: "output", nameGroup: 1 },
  { regex: /^(in|input)[_-]?(.+)\.txt$/i, side: "input", nameGroup: 2 },
  { regex: /^(out|output|ans|answer)[_-]?(.+)\.txt$/i, side: "output", nameGroup: 2 },
];

function classify(fileName: string): { name: string; side: Side } | null {
  for (const { regex, side, nameGroup } of patterns) {
    const match = fileName.match(regex);
    if (match) return { name: match[nameGroup], side };
  }
  return null;
}

export function pairTestFiles(files: File[]): PairingResult {
  const groups = new Map<string, Partial<Record<Side, File>>>();
  const leftovers: string[] = [];

  for (const file of files) {
    const found = classify(file.name);
    if (!found) {
      leftovers.push(file.name);
      continue;
    }
    const group = groups.get(found.name) ?? {};
    if (group[found.side]) {
      leftovers.push(file.name);
      continue;
    }
    group[found.side] = file;
    groups.set(found.name, group);
  }

  const pairs: TestPair[] = [];
  for (const [name, group] of groups) {
    if (group.input && group.output) {
      pairs.push({ name, input: group.input, output: group.output });
    } else {
      leftovers.push((group.input ?? group.output)!.name);
    }
  }

  // Natural order, so 2 comes before 10.
  pairs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { pairs, leftovers };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
