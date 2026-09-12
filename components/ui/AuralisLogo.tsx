"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AuralisLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function AuralisLogo({
  size = "md",
  showText = true,
  className,
}: AuralisLogoProps) {
  const iconDimensions = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textSizes = {
    sm: "text-base tracking-widest",
    md: "text-lg tracking-[0.22em]",
    lg: "text-2xl tracking-[0.25em]",
  }[size];

  return (
    <div className={cn("flex items-center gap-3 select-none group", className)}>
      {/* High-Tech Aerospace Hexagonal Orbital Emblem */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl overflow-hidden shrink-0 transition-all duration-300",
          "bg-gradient-to-br from-zinc-900 via-black to-zinc-950",
          "border border-cyan-500/30 group-hover:border-cyan-400/60",
          "shadow-[0_0_12px_rgba(6,182,212,0.25)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.45)]",
          iconDimensions
        )}
      >
        {/* Ambient Holographic Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-sky-500/10 to-emerald-500/20 opacity-75 group-hover:opacity-100 transition-opacity" />

        {/* Embedded High-Resolution Emblem Graphic */}
        <Image
          src="/images/auralis-logo.jpg"
          alt="Auralis Orbital Emblem"
          width={48}
          height={48}
          className="w-full h-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </div>

      {/* Brand Typography & Sub-Badge */}
      {showText && (
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={cn(
              "font-mono font-black text-foreground transition-all duration-200",
              "bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent",
              textSizes
            )}
          >
            AURALIS
          </span>
          <span className="rounded-md bg-cyan-500/10 border border-cyan-400/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.2)]">
            ORBITAL
          </span>
        </div>
      )}
    </div>
  );
}

export default AuralisLogo;
