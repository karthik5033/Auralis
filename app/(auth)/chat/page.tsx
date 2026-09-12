"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  Radio, 
  ExternalLink,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Orbit,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAdvisories } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import type { Advisory, RiskLevel } from "@/types/contract";
import Link from "next/link";

const PRESET_QUERIES = [
  "Which orbital shells are trending towards runaway cascade?",
  "Synthesize avoidance recommendation for ISS vs Cosmos-2251",
  "Summarize bilateral negotiation status for critical conjunctions",
  "Estimate lifetime fuel cost for Starlink constellation avoidance burns"
];

export default function ChatPage() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function loadAdvisories() {
      try {
        const res = await getAdvisories({ limit: 50 });
        if (!mounted) return;
        setAdvisories(res.data);
      } catch (err) {
        console.error("Failed loading advisories:", err);
      }
    }
    loadAdvisories();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to new incoming advisories from WebSocket via unified provider
  useWebSocket("advisory:new", (newAdv) => {
    setAdvisories((prev) => [newAdv, ...prev]);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [advisories, isThinking]);

  const handleSend = (textQuery?: string) => {
    const text = textQuery || input;
    if (!text.trim() || isThinking) return;

    setIsThinking(true);
    setInput("");

    // Synthesize from advisories currently returned by the backend.
    setTimeout(() => {
      const latest = advisories[0];
      const relatedEventIds = latest?.relatedEventIds ?? [];
      const relatedObjectIds = latest?.relatedObjectIds ?? [];
      const generatedAdv: Advisory = {
        id: `adv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: latest?.severity ?? "nominal",
        title: latest ? `Backend briefing: ${text.slice(0, 45)}` : "No backend advisories available",
        body: latest
          ? `Current backend advisory context for this query:\n\n${latest.title}\n${latest.body}`
          : "The backend returned no advisory records for this briefing. Refresh the live telemetry and try again.",
        relatedEventIds,
        relatedObjectIds,
        agentSource: "advisory",
      };

      setAdvisories((prev) => [generatedAdv, ...prev]);
      setIsThinking(false);
    }, 700);
  };

  const getSeverityBadge = (severity: RiskLevel) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase bg-red-950/80 text-red-400 border-red-500/40">
            CRITICAL ADVISORY
          </Badge>
        );
      case "elevated":
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase bg-amber-950/80 text-amber-400 border-amber-500/40">
            ELEVATED RISK
          </Badge>
        );
      default:
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border-emerald-500/40">
            NOMINAL INTELLIGENCE
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto w-full p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.6 • ADVISORY SYNTHESIS
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {advisories.length} SYNTHESIZED BRIEFS
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2 mt-0.5">
            <Bot className="w-6 h-6 text-primary" />
            Advisory Agent Natural Language Copilot
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ADVISORY STREAM ACTIVE
        </div>
      </div>

      {/* Preset Prompts Bar */}
      <div className="py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase whitespace-nowrap">
          Quick Queries:
        </span>
        {PRESET_QUERIES.map((query, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(query)}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-muted/40 border border-border/70 text-foreground/80 hover:text-foreground hover:bg-muted whitespace-nowrap transition-colors cursor-pointer"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Advisory Feed Chat Window */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3">
        {advisories.map((adv) => {
          const isCrit = adv.severity === "critical";

          return (
            <div 
              key={adv.id} 
              className={`p-4 sm:p-5 rounded-xl border transition-all shadow-sm ${
                isCrit
                  ? "border-red-500/40 bg-red-950/15"
                  : adv.severity === "elevated"
                  ? "border-amber-500/30 bg-amber-950/10"
                  : "border-border/80 bg-card/80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/50 mb-3">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(adv.severity)}
                  <span className="text-xs font-mono font-bold text-foreground">
                    Agent: {adv.agentSource.toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {new Date(adv.timestamp).toLocaleString()}
                </span>
              </div>

              <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                {adv.title}
              </h3>

              <div className="text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-lg border border-border/50">
                {adv.body}
              </div>

              {/* Related Object & Conjunction References */}
              {(adv.relatedEventIds.length > 0 || adv.relatedObjectIds.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-border/40 font-mono text-xs">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Related Telemetry:
                  </span>
                  {adv.relatedEventIds.map((eId) => (
                    <Link key={eId} href={`/cases/${eId}`}>
                      <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 gap-1 hover:bg-primary/10 cursor-pointer">
                        Conjunction {eId.slice(0, 8)}... <ExternalLink className="h-2.5 w-2.5" />
                      </Badge>
                    </Link>
                  ))}
                  {adv.relatedObjectIds.map((oId) => (
                    <Link key={oId} href={`/profiles/${oId}`}>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 gap-1 hover:bg-emerald-950/20 cursor-pointer">
                        Asset {oId.slice(0, 8)}... <ExternalLink className="h-2.5 w-2.5" />
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3 font-mono text-xs text-muted-foreground animate-pulse">
            <BrainCircuit className="h-5 w-5 text-primary animate-spin" />
            <span>Advisory Agent reasoning over SGP4 ephemerides and Foster-1992 covariance...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div className="pt-3 shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input 
            placeholder="Ask Advisory Copilot about collision risks, orbital shells, or maneuver options..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            className="font-mono text-xs h-10 bg-card border-border/80"
          />
          <Button 
            type="submit" 
            disabled={isThinking || !input.trim()}
            className="gap-1.5 font-mono text-xs font-bold shrink-0 h-10 px-4"
          >
            <Send className="h-3.5 w-3.5" />
            Synthesize
          </Button>
        </form>
      </div>
    </div>
  );
}
