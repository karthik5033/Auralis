"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface LatexMathProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export function LatexMath({ math, displayMode = false, className = "" }: LatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
        strict: false
      });
    } catch (e) {
      console.error("KaTeX rendering error:", e);
      return `<span class="font-mono text-xs text-rose-400">${math}</span>`;
    }
  }, [math, displayMode]);

  if (displayMode) {
    return (
      <div
        className={`katex-display-container overflow-x-auto py-1 px-2 my-1.5 rounded bg-zinc-950/70 border border-zinc-800/80 text-cyan-200 select-none ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`katex-inline-container inline-block align-middle text-cyan-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
