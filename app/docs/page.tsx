"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { AuralisLogo } from "@/components/ui/AuralisLogo";
import {
  BookOpen,
  Layers,
  Search,
  Compass,
  Code2,
  Terminal,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Radio,
  Orbit,
  Cpu,
  Database,
  ExternalLink,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Key,
  Globe,
  Lock,
  ArrowRight
} from "lucide-react";

interface ApiEndpointDoc {
  method: "GET" | "POST" | "PUT";
  path: string;
  tag: string;
  summary: string;
  description: string;
  curl: string;
  ts: string;
  python: string;
  response: string;
}

export default function DocsPage() {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("quickstart");
  const [selectedLanguage, setSelectedLanguage] = useState<"curl" | "ts" | "python">("curl");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const navSections = [
    { id: "quickstart", title: "Quickstart & Setup", icon: Zap },
    { id: "spacetrack", title: "Space-Track US Space Force", icon: Radio },
    { id: "astrodynamics", title: "SGP4 Astrodynamics Engine", icon: Orbit },
    { id: "agents", title: "Autonomous Multi-Agent Swarm", icon: Cpu },
    { id: "api-objects", title: "API: Objects & Ephemeris", icon: Database },
    { id: "api-conjunctions", title: "API: Conjunction Alerts", icon: AlertTriangle },
    { id: "api-shells", title: "API: Orbital Shells (SIR)", icon: Flame },
    { id: "api-maneuvers", title: "API: Maneuver Execution", icon: Activity },
    { id: "websocket", title: "WebSocket Real-Time Stream", icon: Globe },
    { id: "compliance", title: "Governance & Audit Logs", icon: ShieldCheck },
  ];

  const apiEndpoints: ApiEndpointDoc[] = [
    {
      method: "GET",
      path: "/api/v1/objects",
      tag: "CATALOG",
      summary: "Query cataloged satellites and debris",
      description: "Returns paginated orbital bodies with SGP4 coordinates, velocity vectors, apogee, perigee, and operator metadata.",
      curl: `curl -X GET "https://auralis.app/api/v1/objects?type=satellite&limit=20" \\
  -H "Accept: application/json"`,
      ts: `import { getObjects } from "@/lib/api";

const objects = await getObjects({ type: "satellite", limit: 20 });
console.log(\`Retrieved \${objects.length} tracked assets\`);`,
      python: `import requests

res = requests.get("https://auralis.app/api/v1/objects", params={"type": "satellite", "limit": 20})
data = res.json()
print(f"Tracking {len(data['items'])} satellites")`,
      response: `{
  "items": [
    {
      "id": "25544",
      "name": "ISS (ZARYA)",
      "noradId": 25544,
      "type": "satellite",
      "operator": "NASA / International",
      "position": { "x": -2340.5, "y": 4210.8, "z": 4812.1 },
      "velocity": { "vx": -5.12, "vy": -4.21, "vz": 3.89 },
      "orbitalElements": { "semiMajorAxisKm": 6791.2, "eccentricity": 0.0005, "inclinationDeg": 51.64 },
      "status": "active"
    }
  ],
  "total": 631
}`
    },
    {
      method: "GET",
      path: "/api/v1/objects/:id",
      tag: "TELEMETRY DOSSIER",
      summary: "Get single object real-time coordinates & ephemeris",
      description: "Returns live propagating coordinates, state vectors, covariance matrix, and recent conjunction encounters for a specific NORAD ID.",
      curl: `curl -X GET "https://auralis.app/api/v1/objects/25544" \\
  -H "Accept: application/json"`,
      ts: `const dossier = await fetch("/api/v1/objects/25544").then(r => r.json());
console.log("Current Alt:", dossier.altitudeKm, "km");`,
      python: `import requests

dossier = requests.get("https://auralis.app/api/v1/objects/25544").json()
print("ISS Latitude:", dossier["latitude"], "Longitude:", dossier["longitude"])`,
      response: `{
  "id": "25544",
  "name": "ISS (ZARYA)",
  "noradId": 25544,
  "altitudeKm": 418.5,
  "latitude": -28.452,
  "longitude": 134.219,
  "orbitalPeriodMinutes": 92.8,
  "tle": {
    "line1": "1 25544U 98067A   26255.48203819  .00014285  00000-0  25841-3 0  9993",
    "line2": "2 25544  51.6418 214.3921 0005128 112.4821 247.6892 15.50192841489124"
  }
}`
    },
    {
      method: "GET",
      path: "/api/v1/conjunctions",
      tag: "CONJUNCTION SCREENING",
      summary: "List high-risk close approaches",
      description: "Returns all active conjunction encounters ingested from Space-Track CDMs and SGP4 covariance screenings, sorted by miss distance and collision probability (Pc).",
      curl: `curl -X GET "https://auralis.app/api/v1/conjunctions?minPc=1e-4" \\
  -H "Accept: application/json"`,
      ts: `import { getConjunctions } from "@/lib/api";

const alerts = await getConjunctions();
const critical = alerts.filter(c => c.pc > 1e-4);`,
      python: `import requests

alerts = requests.get("https://auralis.app/api/v1/conjunctions").json()
critical = [c for c in alerts if c["pc"] > 1e-4]`,
      response: `[
  {
    "id": "cdm-1693988026",
    "primaryObjectId": "starlink-1007",
    "secondaryObjectId": "cosmos-2251-deb",
    "tca": "2026-09-15T05:40:19.506Z",
    "missDistanceKm": 0.19,
    "relativeVelocityKmS": 14.82,
    "pc": 0.00025102,
    "status": "action_required"
  }
]`
    },
    {
      method: "POST",
      path: "/api/v1/maneuvers/:id/approve",
      tag: "MANEUVER APPROVAL",
      summary: "Operator approval for autonomous avoidance burn",
      description: "Digitally signs and logs approval of an AI-negotiated burn vector, transmitting burn commands to the satellite operator gateway.",
      curl: `curl -X POST "https://auralis.app/api/v1/maneuvers/prop-8921/approve" \\
  -H "Content-Type: application/json" \\
  -d '{"operator": "SpaceX Flight Dynamics", "rationale": "Cleared for execution at TCA-18h"}'`,
      ts: `await fetch("/api/v1/maneuvers/prop-8921/approve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ operator: "SpaceX Flight Dynamics", rationale: "Approved" })
});`,
      python: `import requests

res = requests.post(
  "https://auralis.app/api/v1/maneuvers/prop-8921/approve",
  json={"operator": "SpaceX Flight Dynamics", "rationale": "Approved"}
)
print("Burn status:", res.json()["status"])`,
      response: `{
  "id": "prop-8921",
  "status": "approved",
  "approvedBy": "SpaceX Flight Dynamics",
  "approvedAt": "2026-09-13T03:30:00Z",
  "auditLogId": "audit-tx-49102"
}`
    }
  ];

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return apiEndpoints;
    const q = searchQuery.toLowerCase();
    return apiEndpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.tag.toLowerCase().includes(q)
    );
  }, [searchQuery, apiEndpoints]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <AuralisLogo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
            <BookOpen className="w-3.5 h-3.5" />
            DEVELOPER & OPERATOR DOCS v2.4
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/architecture"
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Architecture</span>
          </Link>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-sm font-semibold text-background bg-foreground rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Compass className="w-4 h-4" />
            <span>Command Center</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter documentation..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-card border border-border focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              <div className="text-xs font-mono text-muted-foreground px-3 mb-2 tracking-wider uppercase">
                Documentation Index
              </div>
              {navSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = selectedSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedSection(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left ${
                      isSelected
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-muted-foreground"}`} />
                    <span>{sec.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Space-Track Badge */}
            <div className="p-4 rounded-xl bg-card border border-border/80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>US Space Force Verified</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Connects live to Space-Track.org for official Conjunction Data Messages (CDMs).
              </p>
            </div>
          </aside>

          {/* Documentation Content Area */}
          <main className="lg:col-span-9 space-y-16">
            {/* Quickstart Section */}
            <section id="quickstart" className="space-y-6 pt-2">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase">GETTING STARTED</div>
                <h1 className="text-3xl font-extrabold mt-1">Quickstart & Setup</h1>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Auralis is a Next.js 16 full-stack mission control application. It operates in offline mode with pre-seeded ephemerides or live mode using Space-Track credentials.
                </p>
              </div>

              {/* Environment Variables Card */}
              <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    Environment Variables Configuration (.env.local)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `# Space-Track Official US Space Force Ingestion\nSPACE_TRACK_USER=your_username\nSPACE_TRACK_PASSWORD=your_password\n\n# Multi-Key Gemini 2.5 Flash Rotator Pool\nGOOGLE_API_KEY_1=AIzaSy...\nGOOGLE_API_KEY_2=AIzaSy...\nGEMINI_MODEL=gemini-2.5-flash`,
                        "env-code"
                      )
                    }
                    className="p-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted rounded"
                  >
                    {copiedCodeId === "env-code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeId === "env-code" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-border text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  <pre>{`# Space-Track Official US Space Force Ingestion
SPACE_TRACK_USER=your_username
SPACE_TRACK_PASSWORD=your_password

# Multi-Key Gemini 2.5 Flash Rotator Pool (Strictly gemini-2.5-flash)
GOOGLE_API_KEY_1=AIzaSy...
GOOGLE_API_KEY_2=AIzaSy...
GOOGLE_API_KEY_3=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash`}</pre>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Rate Limit Notice:</strong> Space-Track strictly enforces a 20-30 requests/minute ceiling. Auralis features an internal 10-minute in-memory cache to prevent account suspension.
                  </span>
                </div>
              </div>
            </section>

            {/* Space-Track Ingestion Section */}
            <section id="spacetrack" className="space-y-6 pt-4 border-t border-border">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase">OFFICIAL US SPACE FORCE INTEGRATION</div>
                <h2 className="text-2xl font-bold mt-1">Space-Track CDM Ingestion Protocol</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Conjunction Data Messages (CDMs) are the gold standard for orbital risk assessment, generated by the 18th Space Defense Squadron.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    Session Authentication
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Authenticates via POST payload to <code className="font-mono text-cyan-400">/ajaxauth/login</code> and retains session cookies across subsequent requests.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-card border border-border space-y-2">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Rate-Limited 10-Minute Caching
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cached in memory to strictly guarantee zero rate-limit 429 penalties. Automatically falls back to high-fidelity live TLE fixtures if credentials are unset.
                  </p>
                </div>
              </div>
            </section>

            {/* Astrodynamics Engine Section */}
            <section id="astrodynamics" className="space-y-6 pt-4 border-t border-border">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase">CORE ASTRODYNAMICS</div>
                <h2 className="text-2xl font-bold mt-1">SGP4 Perturbation & Collision Screening</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Propagation runs in pure TypeScript utilizing the SGP4 algorithm, taking NORAD Two-Line Elements (TLEs) and computing True Equator Mean Equinox (TEME) state vectors.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Coordinate Frames Transformation Pipeline</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                    <div className="text-muted-foreground text-[10px]">FRAME 1</div>
                    <div className="font-bold text-cyan-400 mt-1">TEME</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">True Equator Mean Equinox</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                    <div className="text-muted-foreground text-[10px]">FRAME 2</div>
                    <div className="font-bold text-indigo-400 mt-1">ECI / ECEF</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Earth-Centered Fixed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                    <div className="text-muted-foreground text-[10px]">FRAME 3</div>
                    <div className="font-bold text-emerald-400 mt-1">WGS-84 Geodetic</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Lat / Lon / Alt (km)</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Autonomous Multi-Agent Swarm Section */}
            <section id="agents" className="space-y-6 pt-4 border-t border-border">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase">AI SWARM INTEGRATION</div>
                <h2 className="text-2xl font-bold mt-1">Autonomous Gemini 2.5 Flash Architecture</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  The multi-agent system uses a rotating ring buffer of 12 Google Gemini API keys with strict 45-second 429 quarantines and zero-thinking budget parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="text-xs font-mono text-cyan-400 uppercase">MODEL ENFORCEMENT</div>
                  <div className="font-semibold text-sm">Strictly gemini-2.5-flash</div>
                  <p className="text-xs text-muted-foreground">
                    Locked to prevent unbudgeted model drift. High-rate limit resilience with structured JSON outputs.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="text-xs font-mono text-purple-400 uppercase">FAILOVER ROTATOR</div>
                  <div className="font-semibold text-sm">Automated 12-Key Ring Buffer</div>
                  <p className="text-xs text-muted-foreground">
                    Instantly catches 429 / 403 / 400 errors, quarantines failing keys for 45s, and seamlessly shifts requests to healthy keys.
                  </p>
                </div>
              </div>
            </section>

            {/* REST API Reference Section */}
            <section id="api-objects" className="space-y-6 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase">REST API SPECIFICATION</div>
                  <h2 className="text-2xl font-bold mt-1">Endpoints Reference</h2>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border self-start">
                  {(["curl", "ts", "python"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                        selectedLanguage === lang
                          ? "bg-background text-cyan-400 font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoints List */}
              <div className="space-y-8">
                {filteredEndpoints.map((ep, idx) => {
                  const codeSnippet =
                    selectedLanguage === "curl" ? ep.curl : selectedLanguage === "ts" ? ep.ts : ep.python;
                  return (
                    <div key={idx} className="p-6 rounded-2xl bg-card border border-border space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                              ep.method === "GET"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}
                          >
                            {ep.method}
                          </span>
                          <span className="font-mono text-sm font-semibold">{ep.path}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground uppercase">{ep.tag}</span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{ep.description}</p>

                      {/* Request Code Block */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                          <span>Request ({selectedLanguage.toUpperCase()})</span>
                          <button
                            onClick={() => copyToClipboard(codeSnippet, `req-${idx}`)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-0.5 rounded"
                          >
                            {copiedCodeId === `req-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedCodeId === `req-${idx}` ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-border text-xs font-mono text-zinc-300 overflow-x-auto">
                          <pre>{codeSnippet}</pre>
                        </div>
                      </div>

                      {/* Response Code Block */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                          <span>Response 200 OK (JSON)</span>
                          <button
                            onClick={() => copyToClipboard(ep.response, `res-${idx}`)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-0.5 rounded"
                          >
                            {copiedCodeId === `res-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedCodeId === `res-${idx}` ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-border text-xs font-mono text-zinc-300 overflow-x-auto">
                          <pre>{ep.response}</pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* WebSocket Stream Section */}
            <section id="websocket" className="space-y-6 pt-4 border-t border-border">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase">HIGH FREQUENCY TELEMETRY</div>
                <h2 className="text-2xl font-bold mt-1">WebSocket Live Streaming (/ws)</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Real-time push channel transmitting orbit updates, risk evaluations, and negotiation logs.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                <div className="text-xs font-mono text-muted-foreground">SUBSCRIBED WEBSOCKET EVENT TYPES:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
                    <span className="text-cyan-400 font-bold">objects:updated</span>
                    <p className="text-muted-foreground font-sans text-[11px] mt-1">SGP4 coordinates delta update</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
                    <span className="text-amber-400 font-bold">conjunction:created</span>
                    <p className="text-muted-foreground font-sans text-[11px] mt-1">New encounter detected</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
                    <span className="text-emerald-400 font-bold">maneuver:resolved</span>
                    <p className="text-muted-foreground font-sans text-[11px] mt-1">Bilateral avoidance burn agreed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
                    <span className="text-purple-400 font-bold">anomaly:detected</span>
                    <p className="text-muted-foreground font-sans text-[11px] mt-1">Orbital element residual alert</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Docs Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AuralisLogo size="sm" />
            <span className="text-xs text-muted-foreground">
              Official Auralis Astrodynamics & API Documentation
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/architecture"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              View Architecture Spec
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Launch Command Center <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
