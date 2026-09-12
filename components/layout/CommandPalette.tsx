"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Orbit,
  Crosshair,
  ShieldAlert,
  Radio,
  FileText,
  Activity,
  Layers,
  Settings,
  Fuel,
  Database,
  ArrowRight,
  X,
  Command,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  category: "Navigation" | "Tracked Objects" | "Conjunctions";
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  // Navigation Routes
  { id: "nav-dash", category: "Navigation", title: "Command Center", subtitle: "Real-time 3D tactical orbital tracking globe", href: "/dashboard", icon: Orbit, badge: "PAGE" },
  { id: "nav-cases", category: "Navigation", title: "Conjunction Events", subtitle: "High-probability orbital collision screenings", href: "/cases", icon: Crosshair, badge: "PAGE" },
  { id: "nav-profiles", category: "Navigation", title: "Tracked Objects Catalog", subtitle: "Full SGP4 NORAD catalog dossier search", href: "/profiles", icon: Layers, badge: "PAGE" },
  { id: "nav-alerts", category: "Navigation", title: "Risk & Cascade Alerts", subtitle: "Epidemiological runaway debris forecast", href: "/alerts", icon: ShieldAlert, badge: "PAGE" },
  { id: "nav-network", category: "Navigation", title: "Object Graph Topology", subtitle: "Cross-orbital cluster adjacency network", href: "/network", icon: Activity, badge: "PAGE" },
  { id: "nav-advisory", category: "Navigation", title: "Autonomous Advisory", subtitle: "Gemini multi-agent flight bulletins", href: "/chat", icon: Radio, badge: "PAGE" },
  { id: "nav-fuel", category: "Navigation", title: "Fuel & Maneuver Ledger", subtitle: "Propellant burn economics & Delta-V budgets", href: "/financial", icon: Fuel, badge: "PAGE" },
  { id: "nav-audit", category: "Navigation", title: "Audit & Governance", subtitle: "Immutable cryptographic event log", href: "/audit", icon: FileText, badge: "PAGE" },
  { id: "nav-ingest", category: "Navigation", title: "Data Ingestion", subtitle: "Live Space-Track & CelesTrak feeds", href: "/data-ingestion", icon: Database, badge: "PAGE" },
  { id: "nav-settings", category: "Navigation", title: "Mission Settings", subtitle: "API keys, operator profiles, and telemetry config", href: "/settings", icon: Settings, badge: "PAGE" },

  // Key Objects
  { id: "obj-iss", category: "Tracked Objects", title: "ISS (ZARYA)", subtitle: "NORAD 25544 • Altitude 418.5 km • Active Space Station", href: "/profiles/sat-iss-25544", icon: Orbit, badge: "STATION", badgeColor: "text-sky-400 border-sky-500/40 bg-sky-950/40" },
  { id: "obj-tiangong", category: "Tracked Objects", title: "TIANGONG (CSS)", subtitle: "NORAD 48274 • Altitude 385.2 km • Multi-module Habitat", href: "/profiles/sat-tiangong-48274", icon: Orbit, badge: "STATION", badgeColor: "text-amber-400 border-amber-500/40 bg-amber-950/40" },
  { id: "obj-cosmos", category: "Tracked Objects", title: "COSMOS 2251 DEBRIS", subtitle: "NORAD 33777 • Altitude 418.9 km • Fragment in ISS corridor", href: "/profiles/deb-cosmos-33777", icon: Crosshair, badge: "DEBRIS", badgeColor: "text-red-400 border-red-500/40 bg-red-950/40" },
  { id: "obj-noaa", category: "Tracked Objects", title: "NOAA 19", subtitle: "NORAD 33591 • Altitude 808.2 km • Sun-Synchronous Polar Asset", href: "/profiles/sat-noaa19-33591", icon: Orbit, badge: "SATELLITE", badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40" },
  { id: "obj-fengyun", category: "Tracked Objects", title: "FENGYUN 1C DEBRIS", subtitle: "NORAD 31113 • Altitude 809.1 km • ASAT Target Remnant", href: "/profiles/deb-fengyun-31113", icon: Crosshair, badge: "DEBRIS", badgeColor: "text-red-400 border-red-500/40 bg-red-950/40" },
  { id: "obj-starlink", category: "Tracked Objects", title: "STARLINK-31042", subtitle: "NORAD 55201 • Altitude 540.0 km • Autonomous Hall thrusters", href: "/profiles/sat-starlink-31042", icon: Orbit, badge: "SATELLITE", badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40" },

  // Conjunctions
  { id: "conj-iss", category: "Conjunctions", title: "CJ-142: ISS ⚡ COSMOS-2251", subtitle: "Pc: 2.32 × 10⁻³ • Miss: 347m • Primary Action Triggered", href: "/cases", icon: ShieldAlert, badge: "CRITICAL", badgeColor: "text-red-400 border-red-500/50 bg-red-950/50" },
  { id: "conj-noaa", category: "Conjunctions", title: "CJ-108: NOAA 19 ⚡ FENGYUN-1C", subtitle: "Pc: 4.80 × 10⁻⁴ • Miss: 1,120m • Risk Assessor Elevated", href: "/cases", icon: ShieldAlert, badge: "ELEVATED", badgeColor: "text-amber-400 border-amber-500/50 bg-amber-950/50" },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return SEARCH_ITEMS.slice(0, 10);
    const q = query.toLowerCase().trim();
    return SEARCH_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      } else if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            router.push(filteredItems[selectedIndex].href);
            onClose();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Spotlight Command Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-zinc-950/95 p-0 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden z-10 flex flex-col font-mono text-xs">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3 bg-zinc-900/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search satellites, debris, conjunctions, or mission pages..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 shrink-0 border border-zinc-700">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Orbit className="w-8 h-8 mx-auto mb-2 opacity-30 animate-spin" />
              <p className="text-xs">No matching objects, conjunctions, or routes found.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 shadow-sm"
                      : "hover:bg-zinc-900/50 text-muted-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate font-sans text-xs">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 font-mono ${
                              item.badgeColor || "text-zinc-400 border-zinc-700"
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "translate-x-0.5 text-cyan-400" : "opacity-0"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 bg-zinc-950 text-[10px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">↵</kbd> Select
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400/80 font-mono">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Auralis Spotlight Command Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
