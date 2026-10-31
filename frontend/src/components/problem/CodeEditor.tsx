import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { type KeyboardEvent } from "react";
import type { Extension } from "@codemirror/state";
import type { Language } from "../../lib/languages";

const editorTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#181818", color: "#e5e5e5", fontSize: "14px", height: "100%" },
    ".cm-scroller": { fontFamily: '"Geist Mono Variable", ui-monospace, monospace', lineHeight: "20px" },
    ".cm-content": { caretColor: "#ffffff", padding: "12px 0" },
    ".cm-gutters": { backgroundColor: "#181818", color: "#525252", border: "none" },
    ".cm-activeLine": { backgroundColor: "#1f1f1f" },
    ".cm-activeLineGutter": { backgroundColor: "#1f1f1f", color: "#a3a3a3" },
    ".cm-cursor": { borderLeftColor: "#ffffff" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(47, 91, 211, 0.45) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "#313131", outline: "none" },
  },
  { dark: true },
);

// Syntax colors borrow from the YZU palette, lightened for dark backgrounds.
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: "#7aa2ff" },
  { tag: [tags.string, tags.special(tags.string)], color: "#86efac" },
  { tag: [tags.number, tags.bool, tags.null], color: "#f5c518" },
  { tag: tags.comment, color: "#737373" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#ffffff" },
  { tag: [tags.definition(tags.variableName), tags.className], color: "#fca5a5" },
  { tag: [tags.operator, tags.punctuation], color: "#a3a3a3" },
]);

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  language?: Language;
}

const extensionsFor: Record<Language, Extension[]> = {
  python: [python(), syntaxHighlighting(highlight)],
  cpp: [cpp(), syntaxHighlighting(highlight)],
};

export default function CodeEditor({ value, onChange, onSubmit, readOnly = false, language = "python" }: CodeEditorProps) {
  // Catch Ctrl/Cmd + Enter before CodeMirror turns it into a new line.
  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (onSubmit && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      onSubmit();
    }
  }

  return (
    <div className="h-full" onKeyDownCapture={handleKeyDownCapture}>
      <CodeMirror
        value={value}
        onChange={onChange}
        editable={!readOnly}
        readOnly={readOnly}
        theme={editorTheme}
        extensions={extensionsFor[language]}
        height={readOnly ? "auto" : "100%"}
        maxHeight={readOnly ? "480px" : undefined}
        className="h-full"
        aria-label="Code editor"
        basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: !readOnly }}
      />
    </div>
  );
}
