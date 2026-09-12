"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquarePlus, 
  MessageSquare, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Bot,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string[];
  citations?: { title: string; link: string }[];
  timestamp: string;
}

const PRESET_QUERIES = [
  "Which shells are trending toward cascade?",
  "Summarize conjunction CJ-142",
  "What is the optimal collision avoidance maneuver for Starlink-4821?",
  "Calculate fuel budget impact of a 0.2 m/s prograde burn"
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m-1",
    role: "assistant",
    content: "Welcome, Operator. I am your Auralis Orbital Advisory Copilot. I analyze SGP4 ephemeris, collision probabilities, Kessler cascade dynamics, and autonomous maneuver negotiations across orbital shells. How can I assist your flight dynamics operations today?",
    timestamp: "10:00 AM"
  },
  {
    id: "m-2",
    role: "user",
    content: "Summarize conjunction CJ-142 and cascade threat level.",
    timestamp: "10:02 AM"
  },
  {
    id: "m-3",
    role: "assistant",
    content: `### Conjunction CJ-142 Flight Advisory Summary

**Primary Event:** Starlink-4821 (NORAD 52109) vs Cosmos-2251 Debris (NORAD 34120)
**Orbital Shell:** LEO 550km Starlink Shell (Alt: 550.2 km, Inclination: 53.2°)
**Collision Risk:** Pc = 3.8e-4 (CRITICAL — Exceeds 1.0e-4 action threshold)
**Miss Distance:** 48 meters (Radial: 12m, In-track: 38m, Cross-track: 26m)
**Time of Closest Approach (TCA):** 2026-09-12 18:24:00 UTC

#### Autonomous Maneuver Recommendation:
1. **Executing Vehicle:** Starlink-4821 (Electric Ion Thruster active).
2. **Planned Delta-V:** Δv = 0.18 m/s radial-out burn at TCA - 3 orbits (13:45 UTC).
3. **Outcome:** Increases radial separation to > 2.4 km, lowering Pc to < 1.0e-7.
4. **Propellant Cost:** 0.042 kg Krypton, preserves nominal 5-year operational margin.

#### Cascade Impact (SIR Model):
No secondary cascade chain predicted in LEO 550km if maneuver is executed on timeline.`,
    reasoning: [
      "Propagated SGP4 state vectors using CelesTrak GP element set 2026-09-12.",
      "Computed 3D covariance ellipsoid intersections using Foster-1992 method.",
      "Negotiated maneuver allocation with autonomous operator protocol."
    ],
    citations: [
      { title: "Conjunction CJ-142 Dossier", link: "/cases" },
      { title: "Object Profile: Starlink-4821", link: "/profiles" },
      { title: "Fuel Ledger: Δv Burn Record", link: "/financial" }
    ],
    timestamp: "10:02 AM"
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({ "m-3": true });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isThinking) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: `### Orbital Advisory Synthesis for: "${text}"\n\n- **Shell Telemetry:** Evaluated 8,412 active state vectors across Low Earth Orbit and Sun-Synchronous bands.\n- **Cascade Dynamics:** LEO 550-780km shell density is currently at nominal R0 < 1.0 (sub-critical).\n- **Recommended Protocol:** Verify scheduled maneuver windows in Conjunction Events or inspect live trajectory intersections in the Object Graph.`,
        reasoning: [
          "Queried SGP4 ephemeris index for active catalog objects.",
          "Evaluated epidemiological SIR cascade propagation differential equations.",
          "Confirmed autonomous negotiation consensus for avoidance maneuvers."
        ],
        citations: [
          { title: "Object Graph Topology", link: "/network" },
          { title: "Cascade Analytics", link: "/analytics" }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 800);
  };

  const toggleReasoning = (id: string) => {
    setExpandedReasoning(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sessions Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/60 p-4">
        <Button 
          onClick={() => setMessages([INITIAL_MESSAGES[0]])}
          className="w-full justify-start gap-2 mb-4 text-xs font-semibold"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Advisory Session
        </Button>

        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
          Recent Queries
        </div>
        <div className="space-y-1 overflow-y-auto flex-1">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-between cursor-pointer">
            <span className="truncate">CJ-142 Advisory Audit</span>
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-between cursor-pointer transition-colors">
            <span className="truncate">LEO 550km Cascade Risk</span>
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-between cursor-pointer transition-colors">
            <span className="truncate">Cosmos-2251 Fragmentation</span>
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          </div>
        </div>

        <div className="border-t pt-3 mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>AI Engine: SGP4 + Gemini Advisory</span>
          <Badge variant="outline" className="text-[9px]">ONLINE</Badge>
        </div>
      </aside>

      {/* Main Chat Flow */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {messages.map((m) => (
            <div 
              key={m.id}
              className={`flex gap-3 max-w-4xl ${m.role === 'user' ? 'ml-auto justify-end' : 'mr-auto'}`}
            >
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`space-y-2 ${m.role === 'user' ? 'max-w-xl' : 'flex-1'}`}>
                <div 
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-card border border-border rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* AI Reasoning Disclosure */}
                  {m.reasoning && m.reasoning.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <button 
                        type="button"
                        onClick={() => toggleReasoning(m.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        <span>AI Reasoning Chain ({m.reasoning.length} steps)</span>
                        {expandedReasoning[m.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>

                      {expandedReasoning[m.id] && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                          {m.reasoning.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="font-mono text-[10px] text-primary mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Citations & Evidence Links */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground self-center">Evidence Sources:</span>
                      {m.citations.map((c, idx) => (
                        <Link key={idx} href={c.link}>
                          <Badge variant="secondary" className="text-[11px] gap-1 hover:bg-primary/20 transition-colors cursor-pointer">
                            {c.title}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`text-[10px] text-muted-foreground px-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 border">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 max-w-xl mr-auto">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-none flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary animate-spin" />
                Propagating orbital covariance & reasoning...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips */}
        <div className="px-4 lg:px-6 py-2 border-t border-border/50 bg-card/40 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Suggested:</span>
          {PRESET_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted text-foreground transition-colors whitespace-nowrap shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 lg:p-6 border-t bg-card">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI: 'Which shells are trending toward cascade?' or 'Summarize conjunction CJ-142'..."
              className="flex-1 py-5 text-sm"
            />
            <Button type="submit" disabled={!input.trim() || isThinking} className="gap-1.5 font-semibold">
              <Send className="h-4 w-4" />
              Ask
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
