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
        className={`katex-display-container text-center py-1 px-1 my-0.5 rounded bg-zinc-950/60 border border-zinc-800/80 text-cyan-200 select-none overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&_.katex-display]:my-0 [&_.katex]:text-[11px] sm:[&_.katex]:text-xs [&_.katex]:leading-tight max-w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`katex-inline-container inline-block align-middle text-cyan-200 overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&_.katex]:text-[10px] sm:[&_.katex]:text-[11px] [&_.katex]:leading-tight max-w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
