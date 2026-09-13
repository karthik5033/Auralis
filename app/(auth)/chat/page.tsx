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
  MessageSquare,
  User,
  Trash2,
  Layers,
  Terminal,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAdvisories, sendChatMessage, type ChatResponse } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import type { Advisory, RiskLevel } from "@/types/contract";
import Link from "next/link";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

const PRESET_QUERIES = [
  "Which orbital shells are trending towards runaway cascade?",
  "Synthesize avoidance recommendation for ISS vs Cosmos-2251",
  "Summarize bilateral negotiation status for critical conjunctions",
  "Estimate lifetime fuel cost for Starlink constellation avoidance burns"
];

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
  timestamp: string;
}

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<"copilot" | "stream">("copilot");
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `**AURALIS Mission Control Advisory Copilot Online.**\n\nI am your autonomous astrodynamics and space situational awareness flight director. I continuously monitor live SGP4 orbital propagation, Foster-1992 collision probabilities ($P_c$), SIR Kessler cascade trends ($R_0$), and bilateral avoidance burn solutions.\n\n*How can I assist your mission today?*`,
      timestamp: new Date().toISOString(),
      sources: []
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing advisory alerts for the stream tab
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

  // Subscribe to real-time incoming advisories from WebSocket / SSE
  useWebSocket("advisory:new", (newAdv) => {
    setAdvisories((prev) => [newAdv, ...prev]);
  });

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === "copilot") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, activeTab]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText ?? input).trim();
    if (!textToSend || isThinking) return;

    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    setChatError(null);

    // Prepare history payload for API
    const historyPayload = messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const chatRes = await sendChatMessage(textToSend, historyPayload);

      const assistantMsg: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: chatRes.response,
        sources: chatRes.sources || [],
        timestamp: chatRes.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Failed sending message to Advisory Copilot:", err);
      setChatError(err instanceof Error ? err.message : "Failed to connect to Advisory Copilot backend.");
      
      // Fallback message so user is never left hanging
      const errorFallbackMsg: ConversationMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: "assistant",
        content: `**Advisory Agent Briefing:**\n\nI have received your query regarding *"${textToSend}"*.\n\nOur continuous background risk assessor is screening orbital assets. For real-time collision details, please refer to the **Conjunction Events** portal or inspect active altitude band statistics on the **Analytics & Trends** page.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorFallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `**Conversation cleared.** Advisory Copilot standing by for space traffic intelligence queries.`,
        timestamp: new Date().toISOString(),
      }
    ]);
    setChatError(null);
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
              CONTRACT §1.6 • ADVISORY SYNTHESIS
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {advisories.length} SYNTHESIZED BRIEFS
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Bot className="w-6 h-6 text-cyan-400" />
            Advisory Agent Natural Language Copilot
          </h1>
        </div>

        {/* View Switcher & Clear Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab("copilot")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              AI Copilot
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stream")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === "stream"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Advisory Stream ({advisories.length})
            </button>
          </div>

          {activeTab === "copilot" && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="h-8 px-2.5 text-xs font-mono text-muted-foreground hover:text-foreground"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {chatError && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-xs font-mono text-amber-300 shrink-0">
          {chatError}
        </div>
      )}

      {/* Preset Prompts Bar */}
      <div className="py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase whitespace-nowrap">
          Quick Queries:
        </span>
        {PRESET_QUERIES.map((query, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(query)}
            disabled={isThinking}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-card border border-border/70 text-foreground/80 hover:text-foreground hover:border-cyan-500/40 hover:bg-cyan-950/10 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {activeTab === "copilot" ? (
        /* Copilot Chat Window */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3">
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isUser
                      ? "bg-primary text-primary-foreground border-primary/50"
                      : "bg-cyan-950/60 text-cyan-400 border-cyan-500/40"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 text-xs font-sans leading-relaxed border shadow-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground border-primary/40 rounded-tr-none font-medium"
                      : "bg-card border-border/80 text-foreground rounded-tl-none font-mono"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-border/40 text-[10px] opacity-70">
                    <span className="font-bold uppercase tracking-wider">
                      {isUser ? "Mission Operator" : "Auralis Copilot"}
                    </span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-[13px]">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}

                  {/* Telemetry Sources & Links */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                        Referenced Telemetry:
                      </span>
                      {msg.sources.map((src, i) => (
                        <Link key={i} href={src.url}>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-cyan-400 border-cyan-500/40 gap-1 hover:bg-cyan-950/20 cursor-pointer"
                          >
                            {src.name} <ExternalLink className="h-2.5 w-2.5" />
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking State */}
          {isThinking && (
            <div className="flex gap-3 max-w-4xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-cyan-950/60 text-cyan-400 border-cyan-500/40">
                <BrainCircuit className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl p-4 bg-card border border-cyan-500/30 text-foreground rounded-tl-none font-mono text-xs flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-muted-foreground">
                  Evaluating live orbital ephemerides, covariance matrices, and cascade trends...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        /* Advisory Feed Stream */
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-3">
          {advisories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-xs bg-card rounded-xl border border-border">
              No automatic advisories generated yet. All orbits nominal.
            </div>
          ) : (
            advisories.map((adv) => {
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
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                    {adv.title}
                  </h3>

                  <div className="text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-lg border border-border/50">
                    {adv.body}
                  </div>

                  {(adv.relatedEventIds.length > 0 || adv.relatedObjectIds.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-border/40 font-mono text-xs">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                        Related Telemetry:
                      </span>
                      {adv.relatedEventIds.map((eId) => (
                        <Link key={eId} href={`/cases/${eId}`}>
                          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30 gap-1 hover:bg-cyan-950/20 cursor-pointer">
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
            })
          )}
        </div>
      )}

      {/* Input Prompt Box (Only active in Copilot mode) */}
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
            className="font-mono text-xs h-11 bg-card border-border/80 focus-visible:ring-cyan-500/30 shadow-inner"
          />
          <Button 
            type="submit" 
            disabled={isThinking || !input.trim()}
            className="gap-1.5 font-mono text-xs font-bold shrink-0 h-11 px-5 bg-cyan-500 hover:bg-cyan-400 text-black shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Synthesize
          </Button>
        </form>
      </div>
    </div>
  );
}
