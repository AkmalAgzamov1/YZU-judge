import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { type CSSProperties, type KeyboardEvent } from "react";
import type { Extension } from "@codemirror/state";
import type { EditorLanguage } from "../../lib/languages";

// A light code theme for the exam workspace: white paper, Courier New, blue
// keywords and numbers, red operators, green comments and strings.
const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#ffffff",
      color: "#191919",
      fontSize: "var(--sim-code-size, 16.2px)",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily: '"Courier New", "PMingLiU", "MingLiU", monospace',
      lineHeight: "var(--sim-code-line, 18.4px)",
    },
    ".cm-content": {
      caretColor: "#000000",
      padding: "2px 0",
    },
    ".cm-gutters": {
      backgroundColor: "#ffffff",
      color: "#7d8fa8",
      border: "none",
      fontFamily: '"Courier New", "PMingLiU", monospace',
      fontSize: "12px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "28px",
      padding: "0 6px 0 0",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#7d8fa8" },
    ".cm-cursor": { borderLeftColor: "#000000" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "#0a5fd8 !important",
      color: "#ffffff",
    },
    ".cm-matchingBracket": { backgroundColor: "#dbe8ff", outline: "none" },
    ".cm-tooltip": {
      backgroundColor: "#ffffe1",
      border: "1px solid #7a7a7a",
      color: "#000000",
      fontFamily: '"Microsoft Sans Serif", Tahoma, sans-serif',
      fontSize: "11px",
    },
  },
  { dark: false },
);

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: "#0000c0", fontWeight: "bold" },
  { tag: [tags.number, tags.bool, tags.null], color: "#0000c0" },
  { tag: [tags.string, tags.special(tags.string), tags.comment], color: "#008000" },
  { tag: [tags.operator, tags.punctuation], color: "#c00000" },
  { tag: [tags.className, tags.typeName], color: "#0000c0" },
  { tag: [tags.variableName, tags.propertyName], color: "#191919" },
]);

const baseExtensions: Record<EditorLanguage, Extension[]> = {
  python: [python()],
  c_gcc: [cpp()],
  c_msvc: [cpp()],
  java8: [java()],
  java11: [java()],
  cpp: [cpp()],
};

const extensionsFor = Object.fromEntries(
  Object.entries(baseExtensions).map(([language, extensions]) => [
    language,
    [...extensions, syntaxHighlighting(highlight), EditorState.tabSize.of(4)],
  ]),
) as Record<EditorLanguage, Extension[]>;

interface SimulationCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  language: EditorLanguage;
  ariaLabel: string;
  fontSize: number;
}

export default function SimulationCodeEditor({
  value,
  onChange,
  onSubmit,
  language,
  ariaLabel,
  fontSize,
}: SimulationCodeEditorProps) {
  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      onSubmit();
    }
  }

  return (
    <div
      className="sim-editor-host"
      style={
        {
          "--sim-code-size": `${fontSize}px`,
          "--sim-code-line": `${Math.round(fontSize * 1.14)}px`,
        } as CSSProperties
      }
      onKeyDownCapture={handleKeyDownCapture}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={editorTheme}
        extensions={extensionsFor[language]}
        height="100%"
        className="sim-editor-cm"
        aria-label={ariaLabel}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
        }}
      />
    </div>
  );
}
