import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// The problem pane uses a light paper-like sheet in Times New Roman instead of
// the dark site theme, so the statement gets its own renderer.
const components: Components = {
  h1: ({ children }) => <h3 className="sim-md-h">{children}</h3>,
  h2: ({ children }) => <h3 className="sim-md-h">{children}</h3>,
  h3: ({ children }) => <h3 className="sim-md-h">{children}</h3>,
  h4: ({ children }) => <h3 className="sim-md-h">{children}</h3>,
  p: ({ children }) => <p className="sim-md-p">{children}</p>,
  ul: ({ children }) => <ul className="sim-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="sim-md-ol">{children}</ol>,
  li: ({ children }) => <li className="sim-md-li">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="sim-md-a">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="sim-md-strong">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ children, className }) =>
    className ? <code className={`${className} sim-md-codeblock`}>{children}</code> : <code className="sim-md-code">{children}</code>,
  pre: ({ children }) => <pre className="sim-md-pre">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="sim-md-quote">{children}</blockquote>,
  hr: () => <hr className="sim-md-hr" />,
  table: ({ children }) => (
    <div className="sim-md-tablewrap">
      <table className="sim-md-table">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="sim-md-th">{children}</th>,
  td: ({ children }) => <td className="sim-md-td">{children}</td>,
  img: ({ src, alt }) => <img src={src} alt={alt ?? ""} className="sim-md-img" />,
};

export default function SimulationStatement({ markdown }: { markdown: string }) {
  return (
    <div className="sim-md">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
