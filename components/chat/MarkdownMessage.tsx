import React from "react";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  // Parse paragraphs and lines
  const sections = content.split(/\n\n+/);

  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {sections.map((section, sIdx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // Check if section is a Header (### or ## or #)
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={sIdx} className="font-bold text-sm text-cyan-400 mt-2 mb-1 flex items-center gap-2">
              {formatInline(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={sIdx} className="font-extrabold text-base text-cyan-300 mt-2.5 mb-1.5 flex items-center gap-2">
              {formatInline(trimmed.replace(/^##\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={sIdx} className="font-black text-lg text-foreground mt-3 mb-2 flex items-center gap-2">
              {formatInline(trimmed.replace(/^#\s+/, ""))}
            </h2>
          );
        }

        // Check if section contains list items (lines starting with •, -, *, or numbered)
        const lines = trimmed.split(/\n/);
        const isList = lines.every((l) => /^\s*([•\-*]|\d+\.)\s+/.test(l.trim()) || l.trim().startsWith("- ") || l.trim().startsWith("  -"));

        if (isList) {
          return (
            <ul key={sIdx} className="space-y-1.5 my-2 pl-1">
              {lines.map((line, lIdx) => {
                const isSubItem = line.startsWith("  ") || line.startsWith("\t");
                const cleanLine = line.replace(/^\s*([•\-*]|\d+\.)\s+/, "").trim();
                return (
                  <li 
                    key={lIdx} 
                    className={`flex items-start gap-2 text-xs leading-relaxed ${
                      isSubItem ? "pl-5 text-muted-foreground" : "text-foreground/90"
                    }`}
                  >
                    <span className="text-cyan-400 font-bold shrink-0 select-none">
                      {isSubItem ? "↳" : "•"}
                    </span>
                    <span className="flex-1">{formatInline(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Standard paragraph with inline formatting
        return (
          <p key={sIdx} className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {formatInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and common math symbols
 */
function formatInline(text: string): React.ReactNode[] {
  // Clean common LaTeX delimiters for clean display
  const cleaned = text
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\approx/g, "≈")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\times/g, "×")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\hat\{v\}/g, "v̂")
    .replace(/\\rightarrow/g, "→")
    .replace(/\$R_0\$/g, "R₀")
    .replace(/\$P_c\$/g, "Pc")
    .replace(/\$/g, "");

  // Tokenize bold, code, italic
  const parts: React.ReactNode[] = [];
  // Regex to match **bold**, `code`, and *italic*
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const tokens = cleaned.split(regex);

  tokens.forEach((token, index) => {
    if (!token) return;

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={index}
          className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 mx-0.5"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*") && !token.startsWith("**")) {
      parts.push(
        <em key={index} className="italic text-muted-foreground">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }
  });

  return parts;
}
