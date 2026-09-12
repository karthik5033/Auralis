"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/ThemeContext";
import {
  Menu,
  Search,
  Moon,
  Palette,
  Gamepad2,
  Sparkles,
  Paintbrush,
  ArrowRight,
  Ticket,
  ShoppingCart,
  DollarSign,
  Bookmark,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Wallet,
  CreditCard,
  CircleDollarSign,
  Mail,
  MailOpen,
  MousePointerClick,
  Bell,
  TriangleAlert,
  AlertTriangle,
  ArrowUp,
  Download,
  Upload,
  FileCode,
  Share2,
  User,
  Code,
  Database,
  Check,
  Sun,
  ChevronDown,
  Orbit,
  ShieldAlert,
  Crosshair,
  Flame,
  Satellite,
  Boxes,
  Rocket,
  Zap,
  Activity,
  Radio,
  Cpu,
  Layers,
  Globe as GlobeIcon,
  Loader2
} from "lucide-react";
import { getDashboardSummary, getShells, getConjunctions, getManeuvers, getObjects } from "@/lib/api";
import type { DashboardSummary, ShellRiskSnapshot, ConjunctionEvent, ManeuverProposal, TrackedObject } from "@/types/contract";
import { formatDistance, formatOperator } from "@/lib/formatters";

// Dynamically load GlobeView to avoid SSR issues with Three.js / WebGL on landing page
const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[440px] bg-black flex flex-col items-center justify-center gap-3 text-muted-foreground font-mono">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs uppercase tracking-widest text-zinc-400">
        Initializing 3D Orbital WebGL Engine...
      </span>
    </div>
  ),
});

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733-16z"/>
    <path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772"/>
  </svg>
);

const CustomerAvatar = () => (
  <svg className="absolute bottom-0 right-4 w-32 h-32 text-black dark:text-white" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 40c0-10-15-15-20-5-5-15-25-10-25 0s10 20 20 20c15 0 25-5 25-15z" />
    <circle cx="35" cy="45" r="15" fill="white" stroke="black" strokeWidth="2" />
    <circle cx="55" cy="45" r="15" fill="white" stroke="black" strokeWidth="2" />
    <circle cx="35" cy="45" r="3" fill="black" />
    <circle cx="55" cy="45" r="3" fill="black" />
    <path d="M20 70c0-15 10-20 20-20s20 5 20 20v30H20V70z" fill="white" stroke="black" strokeWidth="2" />
    <path d="M25 70c10-5 20-5 30 0" stroke="black" strokeWidth="2" fill="none" />
  </svg>
);

const FAQS = [
  {
    question: "How does Auralis calculate collision probability (Pc)?",
    answer: "Auralis uses the Foster-1992 method to project 3D positional covariance ellipsoids onto the 2D collision encounter plane (b-plane) at the Time of Closest Approach (TCA). It integrates Gaussian probability density over the combined hard-body radius of both spacecraft or debris fragments."
  },
  {
    question: "How does the autonomous multi-agent maneuver negotiation work?",
    answer: "When a conjunction breaches the Pc > 10⁻⁴ action threshold, autonomous proxy agents representing each satellite operator initiate a game-theoretic negotiation protocol. Agents evaluate remaining onboard propellant (Δv), orbital duty cycle, and future collision risks to reach a Pareto-optimal consensus on which operator maneuvers and by how much."
  },
  {
    question: "Can operators simulate custom conjunction scenarios?",
    answer: "Yes. Operators can inject hypothetical orbital maneuvers, introduce new fragmentation clouds, or modify covariance uncertainties in the Command Center. The SGP4 engine immediately re-propagates state vectors to compute post-burn separation and downstream orbital shell impact."
  },
  {
    question: "Which orbital data sources does Auralis ingest?",
    answer: "Auralis continuously ingests standard Two-Line Element sets (TLE/3LE) from CelesTrak, Space-Track General Perturbations (GP) elements, Orbit Data Messages (ODMs/OMMs), and direct operator ephemeris streams with automated checksum verification and SGP4 propagation."
  },
  {
    question: "How does the epidemiological SIR Kessler cascade model predict orbital runaway?",
    answer: "By treating intact satellites as Susceptible (S), collision fragments as Infectious (I), and atmospheric re-entry de-orbit as Removed (R), Auralis computes the basic reproduction number (R₀) for each orbital shell band. This provides flight controllers with a true leading indicator of cascade runaway before catastrophic fragmentation cascades occur."
  },
  {
    question: "Can Auralis integrate with existing Ground Station APIs?",
    answer: "Yes. Auralis provides standard JSON REST APIs and CCSDS-compliant Orbit Ephemeris Message (OEM) and Conjunction Data Message (CDM) exports compatible with major ground networks, KSAT, AWS Ground Station, and flight operations centers."
  },
  {
    question: "What cryptographic verification is stored in the audit ledger?",
    answer: "Every maneuver agreement, operator yield bid, and trajectory change is cryptographically hashed into an immutable SHA-256 Merkle audit trail. This ensures verifiable compliance with international space safety regulations, liability conventions, and post-maneuver verification standards."
  }
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  // Live Backend Data
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [shells, setShells] = React.useState<ShellRiskSnapshot[]>([]);
  const [conjunctions, setConjunctions] = React.useState<ConjunctionEvent[]>([]);
  const [maneuvers, setManeuvers] = React.useState<ManeuverProposal[]>([]);
  const [objectsMap, setObjectsMap] = React.useState<Record<string, TrackedObject>>({});
  const [hoveredShellIdx, setHoveredShellIdx] = React.useState<number | null>(null);
  const [mockupTab, setMockupTab] = React.useState<"globe" | "overview">("globe");

  React.useEffect(() => {
    async function loadLandingData() {
      try {
        const [sumRes, shellsRes, conjRes, manRes, objRes] = await Promise.all([
          getDashboardSummary(),
          getShells(),
          getConjunctions({ limit: 5 }),
          getManeuvers({ limit: 3 }),
          getObjects({ limit: 100 }),
        ]);
        setSummary(sumRes);
        setShells(shellsRes.data || []);
        setConjunctions(conjRes.data || []);
        setManeuvers(manRes.data || []);

        const map: Record<string, TrackedObject> = {};
        (objRes.data || []).forEach((o) => {
          map[o.id] = o;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed loading landing telemetry:", err);
      }
    }
    loadLandingData();
  }, []);
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 dark:bg-black text-black dark:text-white dark:text-white font-sans selection:bg-zinc-800 selection:text-white transition-colors duration-200">
      {/* Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Auralis Orbital</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800">
              <Menu className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800">
              <Search className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-zinc-500 hover:text-black dark:text-white dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800"
              title={theme === "dark" ? "Switch to White Theme" : "Switch to Perfect Black Theme"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
            </button>
            
            <button className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
              <Palette className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2"></div>

          <div className="flex items-center gap-3">
            <button className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white transition-colors">
              <GithubIcon className="w-5 h-5" />
            </button>
            <button className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white transition-colors">
              <TwitterIcon className="w-5 h-5" />
            </button>
            <button className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white transition-colors">
              <Gamepad2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-black dark:text-white dark:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white dark:text-black dark:text-white bg-black dark:bg-white dark:bg-zinc-950 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
              Launch Command Center <Sparkles className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-20 pb-16 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          Orbital Debris Tracking & Collision Avoidance
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black dark:text-white dark:text-white max-w-4xl leading-[1.1] mb-6">
          Mission Control for Orbital Debris & <br />
          <span className="relative inline-block mt-2">
            Autonomous Collision Avoidance
            <svg
              className="absolute w-full h-3 -bottom-2 left-0 text-black dark:text-white"
              viewBox="0 0 300 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M2 9.5C85.5 3.5 198.5 1.5 298 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mb-8">
          Mission control for orbital debris — track every object in orbit, predict conjunctions before they occur, and watch autonomous agents negotiate optimal maneuver yields.
        </p>

        <div className="text-xl text-zinc-500 dark:text-zinc-400 mb-8 flex items-center justify-center">
          SGP4 Orbital Ephemeris Screening with <span className="text-black dark:text-white dark:text-white ml-1">Live Conjunction Screening</span>
          <span className="w-[1.5px] h-6 bg-black ml-[1px] animate-pulse"></span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <div className="relative group inline-flex rounded-md">
            {/* Animating rainbow colorful blurred glow/shadow layer */}
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-cyan-400 via-blue-500 via-purple-500 to-rose-500 opacity-80 blur-md group-hover:opacity-100 group-hover:blur-lg transition duration-500 animate-rainbow-glow" />
            
            {/* The main button with animating rainbow colourful shadow */}
            <Link 
              href="/dashboard" 
              className="relative px-6 py-3 bg-black dark:bg-zinc-950 text-white rounded-md font-semibold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-2xl animate-rainbow-shadow border border-white/20"
            >
              Launch Command Center <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <Link href="/analytics" className="px-6 py-3 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-md font-medium flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            Explore Cascade Model <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="max-w-[1400px] mx-auto px-4 py-16">
        {/* Top KPI Cards */}
        {/* Top KPI Cards - Refined Monochrome with Semantic Accents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4 font-sans">
          {/* Card 1: Active Conjunctions */}
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Crosshair className="w-5 h-5" />
              </div>
              <div className="flex items-center text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                +18% <TrendingUp className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono mb-1 text-foreground">
                {summary ? summary.activeConjunctions : 30}
              </div>
              <div className="text-xs text-muted-foreground font-semibold mb-3">Active Conjunctions</div>
              <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                TCA &lt; 72h Screening
              </span>
            </div>
          </div>
          
          {/* Card 2: Tracked Objects */}
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Orbit className="w-5 h-5" />
              </div>
              <div className="flex items-center text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                100% <Check className="w-3.5 h-3.5 ml-1 text-emerald-500" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono mb-1 text-foreground">
                {summary ? summary.totalTrackedObjects.toLocaleString() : "639"}
              </div>
              <div className="text-xs text-muted-foreground font-semibold mb-3">Tracked Orbital Bodies</div>
              <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                CelesTrak SGP4 Feed
              </span>
            </div>
          </div>
          
          {/* Card 3: High-Risk Alerts (Semantic Red for Critical) */}
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-lg">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex items-center text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                -25% <TrendingDown className="w-3.5 h-3.5 ml-1 text-emerald-500" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono mb-1 text-red-500 dark:text-red-400">
                {summary ? summary.criticalConjunctions : 6}
              </div>
              <div className="text-xs text-muted-foreground font-semibold mb-3">Critical Alerts (Pc ≥ 10⁻³)</div>
              <span className="text-[10px] font-mono bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                Emergency Burn Active
              </span>
            </div>
          </div>
          
          {/* Card 4: Maneuvers Resolved */}
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Rocket className="w-5 h-5" />
              </div>
              <div className="flex items-center text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                0 collisions <Check className="w-3.5 h-3.5 ml-1 text-emerald-500" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black font-mono mb-1 text-foreground">
                94.2%
              </div>
              <div className="text-xs text-muted-foreground font-semibold mb-3">Maneuvers Resolved</div>
              <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                Autonomous Yield
              </span>
            </div>
          </div>
          
          {/* Card 5: Active Payloads & Shell Population Breakdown */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between min-w-[280px]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">Active Payloads in Orbit</h3>
                <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                  Operational Constellations
                </span>
              </div>
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <Satellite className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-foreground">
                {summary ? summary.activeSatellites.toLocaleString() : "412"}
              </span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 font-mono">
                +12% cataloged payloads
              </span>
            </div>

            {/* Micro Altitude Shell Population Bars - Monochrome */}
            <div className="space-y-1.5 pt-3 border-t border-border/60 text-[10px] font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Low Earth Orbit (LEO 200–1000km)</span>
                <span className="text-foreground font-bold">89%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full" style={{ width: "89%" }} />
              </div>

              <div className="flex justify-between text-muted-foreground pt-0.5">
                <span>High Altitude & MEO (1000km+)</span>
                <span className="text-foreground font-bold">11%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-zinc-500 dark:bg-zinc-500 h-full rounded-full" style={{ width: "11%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Real Charts & Live Screening Feeds */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 font-sans">
          {/* Main Chart: Orbital Conjunction Risk Index - Clean Monochrome with Semantic Red */}
          <div className="col-span-1 md:col-span-6 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-foreground">Orbital Conjunction Risk Index</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                    SIR R₀ DYNAMICS
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Basic reproduction number R₀ across orbital shells (LEO 200 km – 1,200 km)
                </p>
              </div>
              <Link href="/analytics">
                <button className="text-xs font-mono text-zinc-500 hover:text-foreground hover:underline flex items-center gap-1 cursor-pointer">
                  Deep Simulator <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
            
            {/* Dynamic Real SVG Area Chart for Kessler Cascade R0 */}
            <div className="relative h-64 w-full pt-2">
              {/* Y Axis Labels (Real Reproduction Numbers R0) */}
              <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-[11px] font-mono text-muted-foreground select-none">
                <span>R₀ 30.0</span>
                <span>R₀ 20.0</span>
                <span>R₀ 10.0</span>
                <span className="text-red-500 font-bold">R₀ 1.0</span>
                <span>R₀ 0.0</span>
              </div>
              
              <div className="absolute left-14 right-2 top-2 bottom-6">
                {/* Horizontal Grid lines */}
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="w-full h-px border-t border-dashed border-zinc-200 dark:border-zinc-800/80" />
                  <div className="w-full h-px border-t border-dashed border-zinc-200 dark:border-zinc-800/80" />
                  <div className="w-full h-px border-t border-dashed border-zinc-200 dark:border-zinc-800/80" />
                  {/* Critical R0 = 1.0 Boundary */}
                  <div className="w-full h-px border-t border-red-500/50 relative">
                    <span className="absolute right-0 -top-3 text-[9px] font-mono text-red-500 dark:text-red-400 bg-card px-1.5 py-0.5 rounded border border-red-500/30">
                      Critical Threshold (R₀ = 1.0)
                    </span>
                  </div>
                  <div className="w-full h-px border-t border-zinc-200 dark:border-zinc-800/80" />
                </div>
                
                {/* Dynamic SVG Area Graph - Refined Monochrome with Red Peak */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="gradientCascadeR0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
                      <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path 
                    d="M 0,88 L 15,87 L 30,85 L 45,80 L 58,40 L 72,25 L 85,45 L 100,60 L 100,95 L 0,95 Z" 
                    fill="url(#gradientCascadeR0)" 
                  />
                  
                  {/* Line - Sleek zinc/silver */}
                  <path 
                    d="M 0,88 L 15,87 L 30,85 L 45,80 L 58,40 L 72,25 L 85,45 L 100,60" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinejoin="round" 
                    className="text-zinc-700 dark:text-zinc-200"
                  />

                  {/* Supercritical Peak Warning Dot at 750-800km */}
                  <circle cx="72" cy="25" r="3" fill="#ef4444" />
                  <circle cx="72" cy="25" r="6" fill="#ef4444" opacity="0.3" className="animate-ping" />
                </svg>
              </div>

              {/* X Axis Labels (Real Orbital Altitudes) */}
              <div className="absolute left-14 right-2 bottom-0 h-5 flex justify-between text-[11px] font-mono text-muted-foreground select-none">
                <span>200km</span>
                <span>400km</span>
                <span>550km</span>
                <span>700km</span>
                <span className="text-red-500 dark:text-red-400 font-bold">750-800km</span>
                <span>900km</span>
                <span>1200km</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Peak Supercritical Cascade: <strong className="text-red-500 dark:text-red-400">LEO_750_800 (R₀ = 25.25)</strong>
              </span>
              <span className="text-muted-foreground">ODE Runge-Kutta 4th Order</span>
            </div>
          </div>

          {/* Middle Card: Δv Fuel Ledger - Clean Monochrome */}
          <div className="col-span-1 md:col-span-3 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Δv Fuel Ledger
                </h3>
                <p className="text-xs text-muted-foreground font-mono">Maneuver fuel expenditure</p>
              </div>
              <Link href="/financial">
                <button className="text-xs font-mono text-zinc-500 hover:text-foreground hover:underline flex items-center gap-0.5 cursor-pointer">
                  All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            
            <div className="space-y-3">
              {[
                { name: "Starlink Fleet", op: "SpaceX", dv: "0.40 m/s", icon: Rocket, status: "Autonomous Yield" },
                { name: "ISS (ZARYA)", op: "NASA", dv: "0.28 m/s", icon: Flame, status: "COSMOS Avoidance" },
                { name: "Tiangong (CSS)", op: "CNSA", dv: "0.35 m/s", icon: Zap, status: "SL-16 Separation" },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 font-mono">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground font-sans">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground">{item.status}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-foreground">{item.dv}</div>
                      <div className="text-[9px] text-muted-foreground">{item.op}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
              <span>Remaining Fleet Reserve:</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-200">96.8%</span>
            </div>
          </div>

          {/* Right Card: Active Conjunction Screening */}
          <div className="col-span-1 md:col-span-3 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Active Conjunctions
                </h3>
                <p className="text-xs text-muted-foreground font-mono">Real-time close approaches</p>
              </div>
              <Link href="/cases">
                <button className="text-xs font-mono text-zinc-500 hover:text-foreground hover:underline flex items-center gap-0.5 cursor-pointer">
                  All <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              {(conjunctions.length > 0 ? conjunctions.slice(0, 5) : [
                { id: "1", p: "ISS (ZARYA)", s: "COSMOS 2251 DEB", miss: 0.347, risk: "critical" },
                { id: "2", p: "TIANGONG (CSS)", s: "SL-16 R/B DEB", miss: 0.28, risk: "critical" },
                { id: "3", p: "NOAA 19", s: "FENGYUN 1C DEB", miss: 1.12, risk: "elevated" },
                { id: "4", p: "ENVISAT", s: "COSMOS 2251 DEB", miss: 0.89, risk: "elevated" },
                { id: "5", p: "STARLINK-31042", s: "CZ-4B R/B", miss: 8.4, risk: "nominal" },
              ]).map((c, idx) => {
                const primary = "primaryObjectId" in c ? objectsMap[c.primaryObjectId]?.name || "Primary Sat" : (c as unknown as { p: string }).p;
                const secondary = "secondaryObjectId" in c ? objectsMap[c.secondaryObjectId]?.name || "Debris Target" : (c as unknown as { s: string }).s;
                const missKm = "missDistance" in c ? c.missDistance : (c as unknown as { miss: number }).miss;
                const risk = "riskLevel" in c ? c.riskLevel : (c as unknown as { risk: string }).risk;
                const isCritical = risk === "critical";
                const isElevated = risk === "elevated";

                return (
                  <Link 
                    key={c.id || idx} 
                    href={"primaryObjectId" in c ? `/cases/${c.id}` : "/cases"}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-md shrink-0 ${
                        isCritical 
                          ? "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20" 
                          : isElevated 
                          ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}>
                        {isCritical ? <Flame className="w-3.5 h-3.5" /> : isElevated ? <AlertTriangle className="w-3.5 h-3.5" /> : <Orbit className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate max-w-[130px] font-sans">
                          {primary}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[130px] flex items-center gap-1">
                          <span className="text-zinc-500">vs</span>
                          <span>{secondary}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-foreground">
                        {formatDistance(missKm)}
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isCritical 
                          ? "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/30" 
                          : isElevated 
                          ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}>
                        {risk}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground flex justify-between">
              <span>B-Plane Hard-Body Radius:</span>
              <span className="font-bold text-foreground">20.0 m</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-16 pb-0 px-4 bg-white dark:bg-zinc-950 dark:bg-black text-center">
        <h4 className="text-sm font-serif italic relative inline-block mb-4">
          Orbital Intelligence Framework
          <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-black"></span>
        </h4>
        
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          Autonomous Collision Avoidance & <br className="hidden md:block"/>
          <span className="relative inline-block mt-2">
            Kessler Cascade Defense
            <svg
              className="absolute w-full h-3 -bottom-1 left-0 text-black dark:text-white"
              viewBox="0 0 300 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M2 9.5C85.5 3.5 198.5 1.5 298 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h2>
        
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          A complete mission control platform integrating real-time TLE ingestion, epidemiological Kessler cascade modeling, and game-theoretic satellite avoidance coordination.
        </p>


      </section>
      
      {/* Massive Bento Grid Features */}
      <section className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Row 2: 3-col grids */}
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          @keyframes float-slower {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes dash-move {
            to { stroke-dashoffset: -20; }
          }
          .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
          .animate-float-slower { animation: float-slower 5s ease-in-out infinite; }
          .animate-dash-move { stroke-dasharray: 4 4; animation: dash-move 1.5s linear infinite; }
          
          @keyframes marquee-v {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          .animate-marquee-v { animation: marquee-v 14s linear infinite; }
          
          .mask-image-vertical {
            mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
          }

          @keyframes beam-slide {
            0% { transform: translateX(-100%); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { transform: translateX(350%); opacity: 0; }
          }
          @keyframes photon-glider {
            0% { left: 0%; opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
          @keyframes orbit-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes scan-line {
            0% { top: -20%; opacity: 0; }
            20% { opacity: 0.6; }
            80% { opacity: 0.6; }
            100% { top: 120%; opacity: 0; }
          }
        `}</style>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-zinc-200 dark:border-zinc-800 border-dashed">
          {/* Orbital Shell Segmentation */}
          <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed lg:border-b-0 lg:border-r flex flex-col min-h-[460px]">
            <h3 className="text-2xl font-bold mb-3">Orbital Shell Segmentation</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
              Monitor discrete altitude regimes from LEO-550 mega-constellations to SSO-780 legacy debris fields and high-altitude GEO belts.
            </p>
            
            {/* Diagram Box */}
            <div className="w-full mt-auto bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-60 flex items-center p-4 relative gap-0">
              {/* Left Side: Infinite Vertical Marquee with live status dots */}
              <div className="w-32 h-full relative overflow-hidden mask-image-vertical flex-shrink-0 flex items-center justify-center">
                <div className="flex flex-col gap-2.5 animate-marquee-v py-4 w-full items-center">
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LEO-550</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-full text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>SSO-780</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-rose-500/30 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>LEO-1200</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>ISS-420</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>MEO-20200</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>GEO-35786</span>
                  </div>
                  
                  {/* Duplicate set for seamless infinite loop */}
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LEO-550</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-full text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>SSO-780</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-rose-500/30 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>LEO-1200</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>ISS-420</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>MEO-20200</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>GEO-35786</span>
                  </div>
                </div>
              </div>

              {/* Middle: Active Telemetry Conduit with Laser Beam & Gliding Photon */}
              <div className="flex-1 h-8 relative flex items-center mx-2">
                {/* Conduit base track */}
                <div className="w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden rounded-full">
                  {/* Sliding laser pulse */}
                  <div 
                    className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-zinc-400 dark:via-zinc-200 to-transparent blur-[1px]"
                    style={{ animation: 'beam-slide 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                  />
                </div>
                {/* Gliding photon orb */}
                <div 
                  className="absolute w-2 h-2 rounded-full bg-zinc-900 dark:bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ animation: 'photon-glider 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                />
                {/* Conduit connection node points */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
              </div>

              {/* Right Side: Shell Risk Profile Card with Live Scanner & Telemetry Meter */}
              <div className="w-48 h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0 relative overflow-hidden">
                {/* Subtle vertical scanline sweep */}
                <div 
                  className="absolute left-0 right-0 h-6 bg-gradient-to-b from-transparent via-zinc-500/10 to-transparent pointer-events-none"
                  style={{ animation: 'scan-line 3s linear infinite' }}
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                      Shell Risk Profile
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      LIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mb-1 leading-tight">Foster-1992 2D Pc calculation.</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">Automated covariance error ellipsoid integration.</div>
                </div>

                {/* Real-time telemetry Pc meter */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-zinc-400">Peak Pc:</span>
                    <span className="text-amber-500 font-semibold animate-pulse">4.82 × 10⁻⁵</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800/70 rounded-full h-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 h-full rounded-full animate-pulse" style={{ width: '64%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Telemetry Feeds */}
          <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed lg:border-b-0 lg:border-r flex flex-col min-h-[460px]">
            <h3 className="text-2xl font-bold mb-3">Tracking Telemetry Feeds</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
              Continuous ingestion pipeline connecting CelesTrak SGP4, Space-Track, and ESA DISCOS for comprehensive space situational awareness.
            </p>

            <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative h-60 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 240">
                <defs>
                  <linearGradient id="feed-grad-mono-left" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#71717a" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="feed-grad-mono-right" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#71717a" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id="glow-feed-pkt" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background dashed tracks */}
                <path id="curve-feed-left" d="M 200 65 C 200 120, 110 120, 110 175" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                <path id="curve-feed-right" d="M 200 65 C 200 120, 290 120, 290 175" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />

                {/* Animated flowing data streams */}
                <path d="M 200 65 C 200 120, 110 120, 110 175" fill="none" stroke="url(#feed-grad-mono-left)" strokeWidth="2" strokeDasharray="5 5" className="animate-dash-move" />
                <path d="M 200 65 C 200 120, 290 120, 290 175" fill="none" stroke="url(#feed-grad-mono-right)" strokeWidth="2" strokeDasharray="5 5" className="animate-dash-move" />

                {/* Flying Data Packet: Space-Track -> CelesTrak */}
                <circle r="3" fill="#ffffff" filter="url(#glow-feed-pkt)">
                  <animateMotion dur="2.4s" repeatCount="indefinite">
                    <mpath href="#curve-feed-left" />
                  </animateMotion>
                </circle>

                {/* Flying Data Packet: ESA DISCOS -> CelesTrak (1.2s offset) */}
                <circle r="3" fill="#ffffff" filter="url(#glow-feed-pkt)">
                  <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite">
                    <mpath href="#curve-feed-right" />
                  </animateMotion>
                </circle>
              </svg>

              {/* Top Node with Radar Ping Ring */}
              <div className="absolute left-1/2 top-10 -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="absolute -inset-1.5 rounded-full border border-zinc-400/30 dark:border-zinc-600/40 animate-ping opacity-50 pointer-events-none" />
                  <div className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/80 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm animate-float-slow whitespace-nowrap flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                    <span>CelesTrak SGP4</span>
                  </div>
                </div>
              </div>

              {/* Bottom Left Node */}
              <div className="absolute left-[27.5%] bottom-10 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm animate-float-slower whitespace-nowrap flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Space-Track Ephemeris</span>
                </div>
              </div>

              {/* Bottom Right Node */}
              <div className="absolute left-[72.5%] bottom-10 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm animate-float-slow whitespace-nowrap flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>ESA DISCOS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Astrodynamics Compliance */}
          <div className="p-6 md:p-8 flex flex-col min-h-[460px]">
            <h3 className="text-2xl font-bold mb-3">Astrodynamics Compliance</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
              Verify state vectors against CCSDS Conjunction Data Messages (CDM), covariance matrices, and Foster-1992 collision models.
            </p>

            <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative h-60 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 240">
                <defs>
                  <filter id="glow-rose-pkt" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-mono-pkt" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Base guide paths for motion and styling */}
                <path id="line-cov" d="M 110 55 L 200 120" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                <path id="line-vec" d="M 290 55 L 200 120" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                <path id="line-foster" d="M 110 185 L 200 120" stroke="rgba(239, 68, 68, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
                <path id="line-cdm" d="M 290 185 L 200 120" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />

                {/* Animated flowing telemetry lines - Clean monochrome with Red alert line */}
                <line x1="110" y1="55" x2="200" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-zinc-400 dark:text-zinc-600 animate-dash-move opacity-70" />
                <line x1="290" y1="55" x2="200" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-zinc-400 dark:text-zinc-600 animate-dash-move opacity-70" />
                <line x1="110" y1="185" x2="200" y2="120" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 5" className="animate-dash-move filter drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                <line x1="290" y1="185" x2="200" y2="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-zinc-400 dark:text-zinc-600 animate-dash-move opacity-70" />

                {/* Flying Data Packet: Covariance Matrix -> Core */}
                <circle r="3" fill="#ffffff" filter="url(#glow-mono-pkt)">
                  <animateMotion dur="2.2s" repeatCount="indefinite">
                    <mpath href="#line-cov" />
                  </animateMotion>
                </circle>

                {/* Flying Data Packet: State Vectors -> Core */}
                <circle r="3" fill="#ffffff" filter="url(#glow-mono-pkt)">
                  <animateMotion dur="2.5s" begin="0.7s" repeatCount="indefinite">
                    <mpath href="#line-vec" />
                  </animateMotion>
                </circle>

                {/* Critical Conjunction Alert Packet: Foster Pc -> Core (Glowing Red with White Core) */}
                <circle r="4" fill="#ef4444" filter="url(#glow-rose-pkt)">
                  <animateMotion dur="1.7s" repeatCount="indefinite">
                    <mpath href="#line-foster" />
                  </animateMotion>
                </circle>
                <circle r="1.5" fill="#ffffff">
                  <animateMotion dur="1.7s" repeatCount="indefinite">
                    <mpath href="#line-foster" />
                  </animateMotion>
                </circle>

                {/* Flying Data Packet: CCSDS CDM -> Core */}
                <circle r="3" fill="#ffffff" filter="url(#glow-mono-pkt)">
                  <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite">
                    <mpath href="#line-cdm" />
                  </animateMotion>
                </circle>
              </svg>

              {/* Top Left: Covariance Matrix */}
              <div className="absolute left-[27.5%] top-8 -translate-x-1/2 z-10">
                <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-800 dark:text-zinc-200 font-medium shadow-sm animate-float-slow whitespace-nowrap flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Covariance Σ</span>
                </div>
              </div>

              {/* Top Right: State Vectors */}
              <div className="absolute left-[72.5%] top-8 -translate-x-1/2 z-10">
                <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-800 dark:text-zinc-200 font-medium shadow-sm animate-float-slower whitespace-nowrap flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>State Vectors [r, v]</span>
                </div>
              </div>

              {/* Center Core: SGP4 Engine v2.4 with Orbiting Satellite Ring */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative flex items-center justify-center">
                  {/* Orbiting Satellite Particle Ring */}
                  <div 
                    className="absolute -inset-3 rounded-full border border-dashed border-sky-400/30 pointer-events-none"
                    style={{ animation: 'orbit-cw 6s linear infinite' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] -top-1 left-1/2 -translate-x-1/2 absolute"></div>
                  </div>

                  <div className="px-3.5 py-2 bg-zinc-900 text-zinc-100 dark:bg-zinc-950 border border-sky-500/50 rounded-full text-xs font-mono font-semibold shadow-[0_0_15px_rgba(56,189,248,0.25)] animate-float-slow whitespace-nowrap flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                    <span>SGP4 Engine v2.4</span>
                  </div>
                </div>
              </div>

              {/* Bottom Left: Foster-1992 Pc (Critical Alert) */}
              <div className="absolute left-[27.5%] bottom-8 -translate-x-1/2 z-10">
                <div className="px-3 py-1.5 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/50 rounded-full text-xs text-rose-600 dark:text-rose-400 font-semibold shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-float-slower whitespace-nowrap flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>Foster-1992 Pc</span>
                </div>
              </div>

              {/* Bottom Right: CCSDS CDM Format */}
              <div className="absolute left-[72.5%] bottom-8 -translate-x-1/2 z-10">
                <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-emerald-500/30 rounded-full text-xs text-zinc-800 dark:text-zinc-200 font-medium shadow-sm animate-float-slow whitespace-nowrap flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CCSDS CDM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Row 1: 2-col then 3-col */}
        <div className="border-t border-b border-zinc-200 dark:border-zinc-800 border-dashed mb-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Ingest & Export Conjunction Messages (CDM) */}
            <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed lg:border-b-0 lg:border-r flex flex-col items-center text-center overflow-hidden">
              <h3 className="text-2xl font-bold mb-3">Ingest & Export Conjunction Messages (CDM)</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md text-sm leading-relaxed">
                Streamline real-time data exchange between radar ground stations, Space-Track ephemeris, and automated flight dynamics systems.
              </p>
              
              <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-64 relative flex items-center justify-between p-4 md:p-6">
                {/* SVG Conduits Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 600 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cdm-in-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="cdm-out-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="cdm-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Left Ingestion Conduits */}
                  <path id="cdm-in-top" d="M 170 65 C 240 65, 230 120, 275 120" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                  <path id="cdm-in-bot" d="M 170 175 C 240 175, 230 120, 275 120" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Right Export Conduits */}
                  <path id="cdm-out-top" d="M 325 120 C 370 120, 360 65, 430 65" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                  <path id="cdm-out-bot" d="M 325 120 C 370 120, 360 175, 430 175" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Flowing animated dashes */}
                  <path d="M 170 65 C 240 65, 230 120, 275 120" fill="none" stroke="url(#cdm-in-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />
                  <path d="M 170 175 C 240 175, 230 120, 275 120" fill="none" stroke="url(#cdm-in-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />
                  <path d="M 325 120 C 370 120, 360 65, 430 65" fill="none" stroke="url(#cdm-out-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />
                  <path d="M 325 120 C 370 120, 360 175, 430 175" fill="none" stroke="url(#cdm-out-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />

                  {/* Telemetry Packets: Ingest into Core */}
                  <circle r="4" fill="#38bdf8" filter="url(#cdm-glow)">
                    <animateMotion dur="2.2s" repeatCount="indefinite">
                      <mpath href="#cdm-in-top" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.2s" repeatCount="indefinite">
                      <mpath href="#cdm-in-top" />
                    </animateMotion>
                  </circle>

                  <circle r="4" fill="#38bdf8" filter="url(#cdm-glow)">
                    <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite">
                      <mpath href="#cdm-in-bot" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite">
                      <mpath href="#cdm-in-bot" />
                    </animateMotion>
                  </circle>

                  {/* Telemetry Packets: Export from Core */}
                  <circle r="4" fill="#a855f7" filter="url(#cdm-glow)">
                    <animateMotion dur="2.2s" begin="0.5s" repeatCount="indefinite">
                      <mpath href="#cdm-out-top" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.2s" begin="0.5s" repeatCount="indefinite">
                      <mpath href="#cdm-out-top" />
                    </animateMotion>
                  </circle>

                  <circle r="4" fill="#6366f1" filter="url(#cdm-glow)">
                    <animateMotion dur="2.2s" begin="1.6s" repeatCount="indefinite">
                      <mpath href="#cdm-out-bot" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.2s" begin="1.6s" repeatCount="indefinite">
                      <mpath href="#cdm-out-bot" />
                    </animateMotion>
                  </circle>
                </svg>

                {/* Left Sources Column (Inputs) */}
                <div className="flex flex-col gap-6 z-10 w-44 text-left">
                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-sky-500/40 transition-colors animate-float-slow">
                    <Satellite className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Space-Track CDM</span>
                      <span className="text-[10px] text-zinc-400 font-mono">CCSDS v1.0 Ingest</span>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-emerald-500/40 transition-colors animate-float-slower">
                    <Radio className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Ground Radar (SSN)</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Tracking Network</span>
                    </div>
                  </div>
                </div>

                {/* Center Core Processing Node */}
                <div className="z-10 flex flex-col items-center">
                  <div className="relative">
                    {/* Pulsing halo */}
                    <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-sky-500/20 to-purple-500/20 blur-md animate-pulse pointer-events-none" />
                    <div className="px-4 py-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-950 border border-sky-500/40 rounded-xl text-xs font-semibold shadow-[0_0_20px_rgba(56,189,248,0.2)] flex flex-col items-center gap-1.5 relative">
                      <div className="flex items-center gap-1.5 text-sky-400">
                        <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
                        <span className="font-mono tracking-wide">Auralis Engine</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          FILTER: ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Destinations Column (Outputs) */}
                <div className="flex flex-col gap-6 z-10 w-44 text-left">
                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-purple-500/40 transition-colors animate-float-slower">
                    <Rocket className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Maneuver Proposal</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Delta-V Burn Vector</span>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-indigo-500/40 transition-colors animate-float-slow">
                    <ArrowUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Ground Telecommand</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Uplink Synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Orbital Shell Visualizers */}
            <div className="p-6 md:p-8 flex flex-col items-center text-center overflow-hidden">
              <h3 className="text-2xl font-bold mb-3">Orbital Shell Visualizers</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md text-sm leading-relaxed">
                Inspect polar corridors, sun-synchronous bands, and equatorial orbits in real time through multi-spectrum telemetry visualizers.
              </p>
              
              <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-64 relative flex items-center justify-between p-4 md:p-6">
                {/* SVG Conduits Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 600 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="vis-cyan-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="vis-amber-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="vis-emerald-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="vis-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* 3 Horizontal Telemetry Channels connecting Left Regimes to Right Lenses */}
                  <path id="vis-path-1" d="M 180 55 L 420 55" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                  <path id="vis-path-2" d="M 180 120 L 420 120" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                  <path id="vis-path-3" d="M 180 185 L 420 185" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Flowing dashes */}
                  <path d="M 180 55 L 420 55" fill="none" stroke="url(#vis-cyan-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />
                  <path d="M 180 120 L 420 120" fill="none" stroke="url(#vis-amber-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />
                  <path d="M 180 185 L 420 185" fill="none" stroke="url(#vis-emerald-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-dash-move" />

                  {/* Telemetry Packets gliding across the visualizer channels */}
                  <circle r="4" fill="#38bdf8" filter="url(#vis-glow)">
                    <animateMotion dur="2.4s" repeatCount="indefinite">
                      <mpath href="#vis-path-1" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.4s" repeatCount="indefinite">
                      <mpath href="#vis-path-1" />
                    </animateMotion>
                  </circle>

                  <circle r="4" fill="#f59e0b" filter="url(#vis-glow)">
                    <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite">
                      <mpath href="#vis-path-2" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite">
                      <mpath href="#vis-path-2" />
                    </animateMotion>
                  </circle>

                  <circle r="4" fill="#10b981" filter="url(#vis-glow)">
                    <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite">
                      <mpath href="#vis-path-3" />
                    </animateMotion>
                  </circle>
                  <circle r="1.5" fill="#ffffff">
                    <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite">
                      <mpath href="#vis-path-3" />
                    </animateMotion>
                  </circle>
                </svg>

                {/* Left Side: Orbital Shell Regimes */}
                <div className="flex flex-col gap-3.5 z-10 w-44 text-left">
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-cyan-500/30 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-cyan-500/60 transition-colors animate-float-slow">
                    <Orbit className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">LEO Polar Corridor</span>
                      <span className="text-[10px] text-zinc-400 font-mono">800km • 98.6° inc</span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-amber-500/60 transition-colors animate-float-slower">
                    <Activity className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Sun-Synchronous</span>
                      <span className="text-[10px] text-zinc-400 font-mono">780km • 97.4° inc</span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-emerald-500/30 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-emerald-500/60 transition-colors animate-float-slow">
                    <Satellite className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Equatorial Mega-Shell</span>
                      <span className="text-[10px] text-zinc-400 font-mono">550km • 53.0° inc</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Sensor Visualizer Feeds */}
                <div className="flex flex-col gap-3.5 z-10 w-44 text-left">
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-cyan-500/40 transition-colors animate-float-slow">
                    <Sun className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Optical Terminator</span>
                      <span className="text-[10px] text-emerald-500 font-mono">● Dusk/Dawn Array</span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-amber-500/40 transition-colors animate-float-slower">
                    <Radio className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Phased-Array Radar</span>
                      <span className="text-[10px] text-amber-500 font-mono">● 2cm RCS Resolving</span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2 hover:border-emerald-500/40 transition-colors animate-float-slow">
                    <Layers className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">3D Covariance Vector</span>
                      <span className="text-[10px] text-sky-400 font-mono">● Keplerian Projection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 1: Bottom 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-zinc-200 dark:border-zinc-800 border-dashed">
            <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed md:border-b-0 md:border-r flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-3">Real-time Covariance Screening</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Screen conjunction pairs instantly as SGP4 propagates new ephemeris states.</p>
              <div className="flex gap-2 flex-wrap">
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-sky-400"></span>Foster-1992</div>
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap text-zinc-600 dark:text-zinc-300"><span className="w-2 h-2 rounded-full bg-teal-400"></span>Akella-Alfriend</div>
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap text-zinc-600 dark:text-zinc-300"><span className="w-2 h-2 rounded-full bg-purple-400"></span>Monte Carlo 50k</div>
              </div>
            </div>
            <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed md:border-b-0 md:border-r flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-3">Collision Probability (Pc) Grading</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Automatic risk categorization: Critical (Pc &gt; 10⁻⁴), Elevated (Pc &gt; 10⁻⁵), and Nominal.</p>
              <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 shadow-sm text-sm self-start">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Risk Tiers</span>
                <div className="flex gap-2 items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span> <span className="text-[11px] text-zinc-500">Critical</span></span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> <span className="text-[11px] text-zinc-500">Elevated</span></span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> <span className="text-[11px] text-zinc-500">Nominal</span></span>
                </div>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-3">Astrodynamics State Vector Tuning</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Refine radial, along-track, and cross-track covariance uncertainties with ground radar.</p>
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 flex items-center justify-center border border-sky-500/30 dark:border-sky-500/30 rounded-lg bg-sky-50/50 dark:bg-sky-950/30 shadow-sm text-sky-500">
                  <Orbit className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="inline-flex items-center px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 shadow-sm text-[11px] text-zinc-700 dark:text-zinc-300 font-mono">
                    RIC Frame <span className="text-zinc-300 dark:text-zinc-700 mx-1.5">|</span> Radial +0.02km
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900 shadow-sm text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Along-Track Δv: 1.4 m/s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Multi-Operator Agent Coordination, Autonomous Agent Negotiation, and Risk Thresholds */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-zinc-200 dark:border-zinc-800 border-dashed">
          {/* Column 1 */}
          <div className="border-r border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col">
            {/* Multi-Operator Agent Coordination */}
            <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col h-full overflow-hidden">
              <h3 className="text-xl font-bold mb-3">Multi-Operator Agent Coordination</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
                Autonomous proxy agents negotiate avoidance maneuvers between operators to eliminate defensive burns and game-theoretic deadlocks.
              </p>
              
              <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-60 p-4 relative flex items-center justify-between">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 360 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="p2p-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <path id="p2p-track" d="M 100 100 L 260 100" fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" strokeDasharray="4 4" />
                  <path d="M 100 100 L 260 100" fill="none" stroke="url(#p2p-grad)" strokeWidth="2" strokeDasharray="5 5" className="animate-dash-move" />
                  
                  {/* Telemetry packets traveling between agents */}
                  <circle r="3.5" fill="#38bdf8">
                    <animateMotion dur="2s" repeatCount="indefinite">
                      <mpath href="#p2p-track" />
                    </animateMotion>
                  </circle>
                  <circle r="3.5" fill="#a855f7">
                    <animateMotion dur="2s" begin="1s" repeatCount="indefinite">
                      <mpath href="#p2p-track" />
                    </animateMotion>
                  </circle>
                </svg>

                {/* Operator A */}
                <div className="z-10 flex flex-col items-start">
                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-sky-500/40 rounded-xl shadow-sm text-left animate-float-slow w-36">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Satellite className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span className="truncate">Starlink-3142</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Propellant: 84%</div>
                    <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-medium">BURNS +0.4m/s</span>
                  </div>
                </div>

                {/* Center P2P Protocol Engine */}
                <div className="z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 text-cyan-400 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1 whitespace-nowrap">P2P Bridge</span>
                </div>

                {/* Operator B */}
                <div className="z-10 flex flex-col items-end">
                  <div className="px-3 py-2 bg-white dark:bg-zinc-950 border border-purple-500/40 rounded-xl shadow-sm text-left animate-float-slower w-36">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Satellite className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">OneWeb-0128</span>
                    </div>
                    <div className="text-[10px] text-rose-400 font-mono mt-0.5">Propellant: 19%</div>
                    <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-medium">COASTS (0.0m/s)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Maneuver Simulation & Rollback */}
            <div className="p-6 md:p-8 flex flex-col h-full overflow-hidden">
              <h3 className="text-xl font-bold mb-3">Maneuver Simulation & Rollback</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
                Simulate prograde and retrograde burn options, preview secondary conjunction risks, and verify zero collision paths.
              </p>
              
              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                <span className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> Δv +1.4 m/s Prograde
                </span>
                <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-mono font-medium">
                  Rollback Available
                </span>
              </div>

              <div className="mt-auto relative w-full h-48 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">
                <div className="h-6 bg-zinc-100 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3 gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">TRAJECTORY PREVIEW // RK4</span>
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between bg-zinc-50/50 dark:bg-zinc-950">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="text-zinc-400 text-[9px]">PRE-MANEUVER</div>
                      <div className="text-rose-500 font-bold mt-0.5">Miss: 142 m</div>
                      <div className="text-[9px] text-zinc-400">Pc: 3.4 × 10⁻³</div>
                    </div>
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="text-emerald-500 text-[9px] font-semibold">POST-MANEUVER</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Miss: 4,920 m</div>
                      <div className="text-[9px] text-emerald-500">Pc: 1.2 × 10⁻⁸</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                    <span className="text-zinc-500 dark:text-zinc-400">Secondary Conjunctions:</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> 0 Generated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="border-r border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col">
            {/* Autonomous Agent Negotiation Engine */}
            <div className="p-6 md:p-8 flex flex-col h-full pb-0">
              <h3 className="text-xl font-bold mb-3 text-center">Autonomous Agent Negotiation Engine</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-center text-sm leading-relaxed">
                Deploy autonomous agent proxies to compute Nash equilibrium maneuver agreements based on remaining fuel reserves.
              </p>
              
              <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden h-72 relative mt-2 mb-auto flex flex-col">
                <div className="p-2.5 font-semibold text-center border-b border-zinc-200 dark:border-zinc-800 text-[11px] flex items-center justify-between px-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="font-mono text-sky-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Nash Equilibrium Solver</span>
                  <span className="text-[10px] font-mono text-zinc-400">Game-Theory v2.4</span>
                </div>
                
                {/* 2x2 Decision Payoff Matrix */}
                <div className="p-3 bg-white dark:bg-zinc-950 flex-1 flex flex-col justify-between">
                  <div className="text-[10px] font-mono text-zinc-400 mb-1.5 flex justify-between">
                    <span>Payoff Matrix [Agent A, Agent B]</span>
                    <span className="text-emerald-500">● Solved in 320ms</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800">
                      <div className="text-zinc-400 text-[9px]">BOTH BURN</div>
                      <div className="text-zinc-600 dark:text-zinc-300">[-0.4kg, -0.4kg]</div>
                      <div className="text-[8px] text-zinc-400">Suboptimal Fuel Loss</div>
                    </div>
                    <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded">
                      <div className="text-rose-500 text-[9px]">BOTH COAST</div>
                      <div className="text-rose-500 font-bold">[COLLISION]</div>
                      <div className="text-[8px] text-rose-400">Deadlock Failure</div>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 border-2 border-emerald-500/60 rounded-lg col-span-2 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        <span>★ NASH EQUILIBRIUM REACHED</span>
                        <span>PROPELLANT OPTIMAL</span>
                      </div>
                      <div className="text-zinc-800 dark:text-zinc-200 mt-1 text-[10px]">
                        Agent A (Starlink) Burns +0.4 m/s • Agent B (OneWeb) Coasts
                      </div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">
                        Pareto-optimal efficiency: 94.2% fuel preservation
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Consensus Verified
                    </span>
                    <span className="text-zinc-400">SHA-256 Signed</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat Box */}
            <div className="p-6 md:p-8 flex flex-col h-full border-t border-zinc-200 dark:border-zinc-800 border-dashed">
              <h3 className="text-xl font-bold mb-3">Orbital Advisory Copilot</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
                Ask natural language queries like 'Which shells are trending toward cascade?' or 'Summarize conjunction CJ-142'.
              </p>
              <div className="relative mt-auto w-full">
                <div className="bg-zinc-900 text-zinc-100 p-3 rounded-xl rounded-br-sm text-xs mb-2 shadow-sm inline-block max-w-[90%] font-medium">
                  Which shells are trending toward supercritical cascade?
                </div>
                <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-500/30 p-3 rounded-xl rounded-bl-sm text-xs mb-3 shadow-sm inline-block max-w-[90%] font-mono text-sky-800 dark:text-sky-300">
                  <span className="text-emerald-500 font-bold">● Auralis Copilot:</span> SSO-780 is trending at R₀ = 1.42 with 34 active debris pairs. Priority avoidance recommended for Starlink-3142.
                </div>
                <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">
                  <input type="text" placeholder="Ask Auralis Copilot..." className="w-full p-3 outline-none text-xs bg-transparent" />
                  <div className="flex items-center justify-between p-2 px-3 border-t border-zinc-200 dark:border-zinc-800 flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-3 font-medium text-zinc-500 dark:text-zinc-400">
                      <span className="cursor-pointer hover:text-sky-500">+ New query</span>
                      <span className="cursor-pointer hover:text-sky-500">Audit Proof</span>
                    </div>
                    <button className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1">
                      Query
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col">
            {/* Collision Risk Threshold Validation */}
            <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col h-full min-h-[450px]">
              <h3 className="text-xl font-bold mb-3">Collision Risk Threshold Validation</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
                Instantly validate conjunction miss distances against NASA & ESA collision probability action limits.
              </p>
              
              {/* Stacked Authentic Conjunction Action Limit Cards */}
              <div className="relative w-full flex-1 flex justify-center items-end bg-white dark:bg-zinc-950 min-h-[220px]">
                {/* NASA Red Threshold (Action Required) */}
                <div className="absolute bottom-12 w-64 bg-white dark:bg-zinc-950 border border-rose-500/60 rounded-xl shadow-xl overflow-hidden z-20">
                  <div className="p-2.5 flex justify-between items-center border-b border-rose-500/20 bg-rose-500/10">
                    <span className="font-bold text-xs text-rose-500 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                      NASA Red Threshold
                    </span>
                    <span className="text-rose-500 text-xs font-mono font-bold">Pc ≥ 10⁻⁴</span>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 text-left">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Current Conjunction:</span>
                      <span className="text-rose-500 font-bold">4.82 × 10⁻⁴</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Miss Distance:</span>
                      <span className="text-rose-500 font-bold">84.2 m</span>
                    </div>
                    <div className="mt-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      MANDATORY MANEUVER TASKED
                    </div>
                  </div>
                </div>

                {/* NASA Yellow Threshold (Elevated Monitoring) */}
                <div className="absolute bottom-20 w-60 bg-white dark:bg-zinc-950/90 border border-amber-500/40 rounded-xl shadow-sm h-14 z-10 scale-95 flex justify-between px-3 pt-2 text-xs font-mono">
                  <span className="text-amber-500">NASA Yellow</span>
                  <span className="text-amber-500 font-semibold">Pc ≥ 10⁻⁵ [TASKED]</span>
                </div>

                {/* ESA Hard Body Threshold */}
                <div className="absolute bottom-28 w-56 bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-14 z-0 scale-90 flex justify-between px-3 pt-2 text-xs font-mono">
                  <span className="text-zinc-400">ESA Limit</span>
                  <span className="text-emerald-500 font-semibold">200m Buffer</span>
                </div>
              </div>
            </div>

            {/* Orbital Catalog Registry */}
            <div className="p-6 md:p-8 flex flex-col h-full">
              <h3 className="text-xl font-bold mb-3">Orbital Catalog Registry</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
                Query, sync, and export verified orbital ephemerides, SGP4 state vectors, and historic breakup debris clouds.
              </p>
              
              <div className="flex flex-col items-center mt-auto w-full max-w-[280px] mx-auto">
                <div className="px-3.5 py-2 border border-sky-500/30 rounded-full text-xs font-mono mb-3 shadow-sm w-full text-center whitespace-nowrap overflow-hidden text-ellipsis bg-white dark:bg-zinc-950 text-sky-600 dark:text-sky-400">
                  $ auralis sync @catalog/ssn-tle
                </div>
                <div className="w-px h-6 bg-zinc-200 dark:border-zinc-800"></div>
                <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm relative -mt-3 z-10 whitespace-nowrap">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sync Catalog CLI</span>
                </div>
                <div className="w-px h-6 bg-zinc-200 dark:border-zinc-800 -mt-3"></div>
                
                {/* Terminal Window with authentic streaming CLI output */}
                <div className="w-full bg-zinc-950 text-zinc-100 rounded-xl p-3 text-left font-mono text-[10px] relative mt-0 overflow-hidden h-28 border border-zinc-800 shadow-md flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-zinc-500 text-[9px] ml-2">auralis-cli v2.4</span>
                  </div>
                  <div className="flex flex-col gap-1 text-zinc-300">
                    <div className="text-emerald-400">[OK] 639 TLEs ingested</div>
                    <div className="text-sky-400">[OK] 18 orbital shells synced</div>
                    <div className="text-zinc-400">[ACTIVE] Foster-1992 screening...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      <section className="py-24 px-4 bg-white dark:bg-zinc-950 dark:bg-black">
        <div className="text-center mb-16">
          <h4 className="text-sm font-serif italic relative inline-block mb-4">
            How It Works
            <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-black"></span>
          </h4>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto">
            How Auralis Works: 3 Steps to Collision Avoidance
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Ingest TLE orbital elements, compute close-approach covariance matrices, and coordinate autonomous agent avoidance maneuvers.
          </p>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-center">
          {/* Left Steps */}
          <div className="w-full lg:w-1/3 flex flex-col gap-12 pr-4">
            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Download className="w-5 h-5" /> 1. Ingest TLEs from CelesTrak & Space-Track
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Automated ingestion pipelines parse Two-Line Element sets and state vectors across 8,000+ cataloged active satellites and debris fragments.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> 2. Predict Conjunctions & Cascade Risks
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                SGP4 propagation computes Foster-1992 2D collision probabilities (Pc) and models epidemiological cascade phase space transitions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5" /> 3. Autonomous Multi-Agent Δv Negotiation
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Operator proxy agents negotiate optimal maneuver yields, schedule propellant burns, and record cryptographic audit proofs.
              </p>
            </div>
          </div>

          {/* Right Mockup */}
          <div className="w-full lg:w-2/3">
            <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row" style={{height: '520px'}}>
              {/* App UI Left */}
              <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 min-w-0">
                <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-4 bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-1.5 font-bold text-xs"><Orbit className="w-3.5 h-3.5 text-primary"/> Auralis Flight Ops</div>
                  <div className="flex gap-2 sm:gap-3 ml-auto text-[10px] font-medium text-zinc-500 dark:text-zinc-400 items-center">
                    <button 
                      type="button"
                      onClick={() => setMockupTab("globe")}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${mockupTab === "globe" ? "text-primary font-bold bg-primary/10 border border-primary/20" : "hover:text-foreground"}`}
                    >
                      <GlobeIcon className="w-3.5 h-3.5 text-primary" />
                      <span>3D Orbit Globe</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMockupTab("overview")}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${mockupTab === "overview" ? "text-primary font-bold bg-primary/10 border border-primary/20" : "hover:text-foreground"}`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Overview</span>
                    </button>
                    <Link href="/cases" className="hover:text-foreground hidden sm:inline px-1">Conjunctions</Link>
                    <Link href="/dashboard" className="text-black dark:text-white font-semibold hidden sm:inline px-1">Command Center ↗</Link>
                  </div>
                </div>
                
                {mockupTab === "globe" ? (
                  <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex flex-col">
                    <GlobeView height="100%" className="rounded-none border-0" />
                    
                    {/* Floating HUD Badges on the 3D globe */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-cyan-400 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                        <span>SGP4 KEPLER PROPAGATION</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-zinc-800 text-[9px] font-mono text-zinc-400">
                        <span>639 TRACKED BODIES</span>
                        <span>•</span>
                        <span className="text-rose-400">37 CLOSE PASSES</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex-1 overflow-hidden relative">
                    <div className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md mb-6 flex items-center px-3 text-xs text-zinc-400 dark:text-zinc-500">
                      <Search className="w-3 h-3 mr-2"/> Filter active orbits, satellites, or shells...
                    </div>
                    {/* Miniature dashboard mockup */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="h-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-zinc-400 font-mono">ACTIVE CJ</span>
                        <span className="text-sm font-bold font-mono">37</span>
                      </div>
                      <div className="h-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-zinc-400 font-mono">TRACKED</span>
                        <span className="text-sm font-bold font-mono">8,412</span>
                      </div>
                      <div className="h-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-rose-500 font-mono">CRITICAL</span>
                        <span className="text-sm font-bold font-mono text-rose-500">5</span>
                      </div>
                      <div className="h-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 flex flex-col justify-between">
                        <span className="text-[9px] text-emerald-500 font-mono">RESOLVED</span>
                        <span className="text-sm font-bold font-mono text-emerald-500">91.3%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 h-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md relative overflow-hidden p-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-2">
                          <span>LEO Shell Conjunction Flux</span>
                          <span className="text-emerald-500">SGP4 Nominal</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-primary/15 to-transparent"></div>
                      </div>
                      <div className="col-span-1 h-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-3 flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Cascade Index</span>
                        <span className="text-amber-500 font-bold font-mono text-xs">ELEVATED</span>
                        <span className="text-[9px] text-zinc-500">R0 &lt; 1.0 (Sub-critical)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Maneuver Planner Sidebar Right */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
                <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4">
                  <span className="font-semibold text-xs">Maneuver Planner</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">AUTONOMOUS</span>
                </div>
                <div className="p-4 flex flex-col gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono text-[10px] space-y-1">
                    <div className="flex justify-between text-zinc-500"><span>Target Burn:</span><span className="text-foreground font-bold">0.18 m/s Prograde</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Propellant Cost:</span><span className="text-foreground font-bold">0.042 kg Kr</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Miss Separation:</span><span className="text-emerald-500 font-bold">&gt; 2.4 km</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Residual Pc:</span><span className="text-emerald-500 font-bold">&lt; 1.0e-7</span></div>
                  </div>
                  
                  <div className="text-[10px] font-semibold mt-1">Negotiating Proxy Agents</div>
                  <div className="grid grid-cols-2 gap-1 mb-1 font-mono text-[9px]">
                    <div className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-900 text-center font-bold">Sat-4821 (Yield)</div>
                    <div className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-center text-zinc-400">Cosmos (Debris)</div>
                  </div>
                  
                  <button className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold mt-2 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5"/> Schedule Evasive Burn
                  </button>
                  
                  <div className="text-[9px] font-mono text-zinc-400 text-center mt-1">
                    SHA-256 Audit Logged
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-24 px-4 bg-white dark:bg-zinc-950 dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-16">
          <h4 className="text-sm font-serif italic relative inline-block mb-4">
            Reviews
            <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-black"></span>
          </h4>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto">
            Operator <span className="relative inline-block mt-2">
              Endorsements
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-black dark:bg-white dark:bg-zinc-950"></span>
            </span>
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Space situational awareness leads and constellation operators share their operational feedback on Auralis.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center font-mono font-bold text-sm">
                    DC
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Dr. David K. Chen <div className="w-3 h-3 bg-sky-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">VP Flight Dynamics, OSA</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-zinc-700 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "Auralis predicted conjunction CJ-142 with 48 hours more lead time than commercial catalogs. That enabled our flight team to execute a zero-risk B-plane maneuver before periapsis."
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-500 flex items-center justify-center font-mono font-bold text-sm">
                    MV
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Marcus Vance <div className="w-3 h-3 bg-sky-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">Director of Ops, HelioSat</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-zinc-700 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "The autonomous proxy agent negotiation saved 0.22 m/s delta-v on our science mission. Reaching verified Nash equilibrium without defensive burn deadlocks is revolutionary."
              </p>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-mono font-bold text-sm">
                    ER
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Dr. Elena Rostova <div className="w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">SSA Researcher, EuroSpace</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-zinc-700 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "The epidemiological SIR cascade model gives us the first true leading indicator for orbital congestion runaway. We now track R₀ phase transitions before physical collisions propagate."
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-mono font-bold text-sm">
                    SJ
                  </div>
                  <div>
                    <div className="font-bold text-sm">Sarah Jenkins</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">VP Mission Assurance, Apex Fleet</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 text-xs font-bold font-mono">
                  <div className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px]">G</div> G2
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "Auralis eliminated the prisoner's dilemma between our commercial constellation and international research satellites. Autonomous consensus resolved 100% of our conjunction alerts."
              </p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center font-mono font-bold text-sm">
                    JM
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Cmdr. James Mitchell <div className="w-3 h-3 bg-sky-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">STM Lead, Joint Space Task Force</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-zinc-700 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "The cryptographic SHA-256 audit trail makes regulatory compliance and post-maneuver verification effortless. It provides tamper-proof proof of deconfliction."
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-500 flex items-center justify-center font-mono font-bold text-sm">
                    KS
                  </div>
                  <div>
                    <div className="font-bold text-sm">Dr. Kenji Sato</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">Principal Astrodynamicist, ODL</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 text-xs font-bold font-mono">
                  <div className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px]">G</div> G2
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
                "Essential flight dynamics tooling for mega-constellation operations. The Foster-1992 covariance screening aligns with our 100k Monte Carlo benchmarks."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-white dark:bg-zinc-950 dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-16">
          <h4 className="text-sm font-serif italic relative inline-block mb-4">
            Pricing
            <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-black"></span>
          </h4>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto">
            <span className="relative inline-block mt-2">
              Operational Licensing
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-black"></span>
            </span>
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Access mission control feeds for <span className="font-bold text-black dark:text-white">active orbits</span>, monitor <span className="font-bold text-black dark:text-white">unlimited</span> spacecraft.
            <br />
            Trusted by commercial constellation operators and space research centers.
          </p>
        </div>
        
        {/* Space Industry Logos (Styled to match the design typography) */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 max-w-5xl mx-auto mb-16 opacity-60 dark:opacity-40 grayscale hover:grayscale-0 transition-all duration-300">
          <div className="text-2xl font-serif italic font-light">astroscale</div>
          <div className="text-2xl font-bold flex items-center gap-1">
            <Orbit className="w-6 h-6 text-sky-400" />leolabs<span className="border border-black dark:border-white rounded-lg px-1.5 text-xs bg-black dark:bg-white text-white dark:text-black uppercase font-mono">radar</span>
          </div>
          <div className="text-2xl font-bold lowercase">celestrak®</div>
          <div className="text-xl font-bold leading-none text-right font-mono">
            space<br/>track
          </div>
          <div className="text-2xl font-bold tracking-tight">PlanetLabs</div>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold text-black dark:text-white">Flight-Critical Precision:</span> Every orbital propagator, covariance model & negotiation algorithm is verified against standard CCSDS benchmarks.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> Continuous CelesTrak TLE ephemeris streaming and SGP4 validation updated daily.
          </p>
        </div>

        {/* Horizontal 5-Column Operational Licensing Ribbon */}
        <div className="max-w-6xl mx-auto overflow-hidden mb-8">
          <div className="flex flex-nowrap md:flex-wrap md:grid md:grid-cols-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm bg-white dark:bg-zinc-950 p-2 gap-2 overflow-x-auto">
            {/* COMMERCIAL HEADER */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl min-w-[200px] flex flex-col justify-center">
              <span className="text-[10px] font-mono text-zinc-400 font-semibold tracking-wider">TIER MATRIX</span>
              <h3 className="font-bold text-lg text-foreground mt-0.5">COMMERCIAL</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Flight-proven SLAs</p>
            </div>
            
            {/* Community */}
            <div className="p-6 min-w-[200px] flex flex-col justify-center border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 rounded-xl transition-colors">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Community <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Academic & Research</p>
              <div className="mt-2 text-xs font-mono font-semibold text-foreground">$0 <span className="text-zinc-400 font-normal">/ mo (Free)</span></div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">Up to 25 sats</span>
            </div>
            
            {/* Basic */}
            <div className="p-6 min-w-[200px] flex flex-col justify-center border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 rounded-xl transition-colors">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Basic <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Small Fleets (&lt;10 sats)</p>
              <div className="mt-2 text-xs font-mono font-semibold text-foreground">$190 <span className="text-zinc-400 font-normal">/ mo</span></div>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1">SGP4 Screening</span>
            </div>
            
            {/* Pro (Best Value) */}
            <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 relative min-w-[200px] flex flex-col justify-center shadow-sm">
              <div className="absolute top-0 right-4 -translate-y-1/2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                Best Value
              </div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                Pro <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Mega-Constellations (&gt;100 sats)</p>
              <div className="mt-2 text-xs font-mono font-semibold text-foreground">$490 <span className="text-zinc-400 font-normal">/ mo</span></div>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1">Autonomous Δv Negotiation</span>
            </div>
            
            {/* Team / Defense */}
            <div className="p-6 min-w-[200px] flex flex-col justify-center border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 rounded-xl transition-colors">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Defense <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_#a855f7]"></span>
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Civil & Defense Agencies</p>
              <div className="mt-2 text-xs font-mono font-semibold text-foreground">Custom <span className="text-zinc-400 font-normal">SLA</span></div>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-1">Air-Gapped Sovereign</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights & Direct Action Card */}
        <div className="max-w-6xl mx-auto p-6 bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono w-full md:w-auto">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Foster-1992 2D Pc Engine</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>NASA CARA & ESA Risk Thresholds</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>SHA-256 Merkle Audit Proofs</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
            >
              Launch Command Center <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-16">
          <h4 className="text-sm font-serif italic relative inline-block mb-4">
            FAQ
            <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-black dark:bg-white"></span>
          </h4>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto text-foreground">
            Frequently Asked <span className="relative inline-block mt-2">
              Questions
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary"></span>
            </span>
          </h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Browse through these FAQs to find answers to commonly asked questions.
          </p>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col border-t border-zinc-200 dark:border-zinc-800">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                className="border-b border-zinc-200 dark:border-zinc-800 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full py-5 flex justify-between items-center text-left hover:text-primary transition-colors focus:outline-hidden group"
                >
                  <h3 className={`font-semibold text-sm sm:text-base pr-4 transition-colors ${isOpen ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
                    {faq.question}
                  </h3>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                </button>
                {isOpen && (
                  <div className="pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Buttons Mockup (from bottom right of screenshots) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Link href="/chat" className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:opacity-90 shadow-xl mt-2 transition-opacity">
          <MessageCircleIcon className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}

// Simple Message Icon for the chat bubble
const MessageCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);
