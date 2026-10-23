
import type { ReactNode } from "react";
import { Button } from "../components/Button";
import {
  VerdictChip,
  type Verdict,
} from "../components/VerdictChip";
 
const colorTokens = [
  ["Brand", "brand"],
  ["Brand secondary", "brand-2"],
  ["Accent", "accent"],
  ["Signal", "signal"],
  ["Background", "bg"],
  ["Surface", "surface"],
  ["Surface secondary", "surface-2"],
  ["Border", "border"],
  ["Text", "text"],
  ["Secondary text", "text-2"],
  ["Muted", "muted"],
] as const;

const verdicts: Verdict[] = [
  "pending",
  "running",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "compilation_error",
  "runtime_error",
  "internal_error",
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="tile-section">
      <div className="tile-section__heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function StyleTile() {
  return (
    <main className="tile-page">
      <header className="tile-header">
        <div className="tile-brand">
          <span className="tile-brand__mark">YZU</span>
          <div>
            <strong>YZU Judge</strong>
            <span>Frontend design system</span>
          </div>
        </div>
        <span className="tile-header__label">MILESTONE 01</span>
      </header>

      <section className="tile-hero">
        <span className="eyebrow">DESIGN FOUNDATION</span>
        <h1>One system. Every page.</h1>
        <p>
          The visual foundation for a CPE preparation platform built
          for the Yuan Ze University community.
        </p>
        <div className="tile-hero__actions">
          <Button>Start practicing</Button>
          <Button variant="outline">Explore problems</Button>
        </div>
      </section>

      <Section
        title="01. Color palette"
        description="Semantic tokens keep the visual system consistent."
      >
        <div className="color-grid">
          {colorTokens.map(([label, token]) => (
            <div className="color-swatch" key={token}>
              <div
                className={`color-swatch__sample color-swatch__sample--${token}`}
              />
              <strong>{label}</strong>
              <code>--color-{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="02. Typography"
        description="Three typefaces, each with a clear responsibility."
      >
        <div className="type-grid">
          <article className="type-sample">
            <span className="eyebrow">HEADINGS · SOURCE SANS 3</span>
            <h3>Prepare for CPE.</h3>
            <p>Clear hierarchy makes the next step obvious.</p>
          </article>

          <article className="type-sample type-sample--serif">
            <span className="eyebrow">PROBLEM STATEMENT · SOURCE SERIF 4</span>
            <h3>Find the maximum subarray sum.</h3>
            <p>
              Given an integer array, determine the largest sum
              obtainable from a non-empty contiguous subarray.
            </p>
          </article>

          <article className="type-sample type-sample--code">
            <span className="eyebrow">CODE · SOURCE CODE PRO</span>
            <pre>{`int main() {\n  cout << "Hello, YZU!";\n  return 0;\n}`}</pre>
          </article>
        </div>
      </Section>

      <Section
        title="03. Buttons"
        description="Variants and states should remain consistent across pages."
      >
        <div className="component-panel">
          <div className="button-row">
            <div className="state-column">
              <span className="state-label">Primary</span>
              <Button>Continue</Button>
              <Button className="demo-hover">Hover preview</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="state-column">
              <span className="state-label">Outline</span>
              <Button variant="outline">View problems</Button>
              <Button variant="outline" className="demo-hover">
                Hover preview
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="04. Submission verdicts"
        description="Every backend status has an explicit label and visual tone."
      >
        <div className="verdict-grid">
          {verdicts.map((verdict) => (
            <div className="verdict-example" key={verdict}>
              <VerdictChip verdict={verdict} />
              <code>{verdict}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="05. Submission history"
        description="Tabular numbers make IDs and execution metrics easier to compare."
      >
        <div className="table-wrapper">
          <table className="submission-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Problem</th>
                <th>Language</th>
                <th>Runtime</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="numeric">#001</td>
                <td>Two Sum</td>
                <td>C++</td>
                <td className="numeric">12 ms</td>
                <td><VerdictChip verdict="accepted" /></td>
              </tr>
              <tr>
                <td className="numeric">#002</td>
                <td>Maximum Subarray</td>
                <td>C++</td>
                <td className="numeric">24 ms</td>
                <td><VerdictChip verdict="wrong_answer" /></td>
              </tr>
              <tr>
                <td className="numeric">#003</td>
                <td>Binary Search</td>
                <td>C++</td>
                <td className="numeric">--</td>
                <td><VerdictChip verdict="running" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="06. Form controls"
        description="Keyboard focus must be easy to see."
      >
        <form
          className="input-demo"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="problem-search">Search problems</label>
          <input
            id="problem-search"
            name="problem-search"
            type="text"
            placeholder="Try “binary search”"
          />
          <p>Click the field or press Tab to inspect the focus indicator.</p>
        </form>
      </Section>

      <footer className="tile-footer">
        <span>YZU Judge · Design Foundation</span>
        <span>Built for CPE preparation</span>
      </footer>
    </main>
  );
}
