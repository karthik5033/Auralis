"use client";

import React from "react";
import Link from "next/link";
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
  Orbit
} from "lucide-react";

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
          <Link href="/dashboard" className="px-6 py-3 bg-black dark:bg-white dark:bg-zinc-950 text-white dark:text-black dark:text-white rounded-md font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg">
            Launch Command Center <ArrowRight className="w-4 h-4" />
          </Link>

          <Link href="/analytics" className="px-6 py-3 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-md font-medium flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            Explore Cascade Model <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="max-w-[1400px] mx-auto px-4 py-16">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-orange-100 text-orange-500 rounded-md">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="flex items-center text-sm font-medium text-black dark:text-white">
                +38% <TrendingUp className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">37</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Active Conjunctions</div>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full">Last 24 hours</span>
            </div>
          </div>
          
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-cyan-100 text-cyan-600 rounded-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex items-center text-sm font-medium text-black dark:text-white">
                +22% <TrendingUp className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">8,412</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Tracked Objects</div>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full">CelesTrak & Space-Track</span>
            </div>
          </div>
          
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                -16% <TrendingDown className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">5</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">High-Risk Alerts</div>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full">Pc &gt; 10⁻⁴ Threshold</span>
            </div>
          </div>
          
          <div className="col-span-1 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-md">
                <Bookmark className="w-5 h-5" />
              </div>
              <div className="flex items-center text-sm font-medium text-black dark:text-white">
                +38% <TrendingUp className="w-3 h-3 ml-1" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">91.3%</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Maneuvers Resolved</div>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full">Autonomous Yield</span>
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col justify-between min-w-[280px]">
            <div>
              <h3 className="font-semibold text-lg mb-2">Tracked Payloads</h3>
              <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-full">Active Satellites</span>
            </div>
            <div className="mt-8 flex items-baseline gap-2">
              <span className="text-3xl font-bold">4,240</span>
              <span className="text-sm font-medium text-emerald-500">+12% cataloged</span>
            </div>
            <CustomerAvatar />
          </div>
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="col-span-1 md:col-span-6 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-bold text-xl mb-1">Orbital Conjunction Risk Index</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Altitude shell density profile (LEO 400km - 1,200km)</p>
              </div>
              <button className="text-zinc-400 dark:text-zinc-500 hover:text-black dark:text-white">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            {/* SVG Area Chart */}
            <div className="relative h-64 w-full">
              {/* Y Axis Labels */}
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-zinc-400 dark:text-zinc-500">
                <span>$6K</span>
                <span>$5K</span>
                <span>$4K</span>
                <span>$3K</span>
                <span>$2K</span>
                <span>$1K</span>
              </div>
              
              <div className="absolute left-10 right-0 top-2 bottom-6">
                {/* Grid lines */}
                <div className="w-full h-full flex flex-col justify-between">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-full h-px border-t border-dashed border-zinc-200 dark:border-zinc-800"></div>
                  ))}
                </div>
                
                {/* SVG Graph */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path d="M0,70 L15,70 L30,40 L50,40 L65,55 L80,55 L100,20 L100,100 L0,100 Z" fill="url(#gradientArea)" />
                  {/* Line */}
                  <path d="M0,70 L15,70 L30,40 L50,40 L65,55 L80,55 L100,20" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>

              {/* X Axis Labels */}
              <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between text-xs text-zinc-400 dark:text-zinc-500">
                <span>MO</span>
                <span>TU</span>
                <span>WE</span>
                <span>TH</span>
                <span>FR</span>
                <span>SA</span>
                <span>SU</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-xl mb-1">Δv Fuel Ledger</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Maneuver fuel expenditure</p>
              </div>
              <button className="text-zinc-400 dark:text-zinc-500 hover:text-black dark:text-white">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <div className="p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm">
                  <Wallet className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">Starlink Fleet</div>
                  <div className="font-bold text-lg">0.48 m/s</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <div className="p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">OneWeb Cluster</div>
                  <div className="font-bold text-lg">0.32 m/s</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <div className="p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm">
                  <CircleDollarSign className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">ESA Sentinel</div>
                  <div className="font-bold text-lg">0.18 m/s</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg mb-1">Active Conjunction Screening</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Real-time Close Approaches</p>
              </div>
              <button className="text-zinc-400 dark:text-zinc-500 hover:text-black dark:text-white">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-orange-100 rounded-md">
                    <Mail className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="font-medium text-sm">Starlink vs Cosmos Deb</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-500 font-bold">48m</span>
                  <span className="text-xs text-rose-500 font-medium">Critical</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-teal-100 rounded-md">
                    <MailOpen className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="font-medium text-sm">Sentinel-2A vs SL-16</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">112m</span>
                  <span className="text-xs text-amber-500 font-medium">Negotiating</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-yellow-100 rounded-md">
                    <MousePointerClick className="w-4 h-4 text-yellow-600" />
                  </div>
                  <span className="font-medium text-sm">OneWeb vs Fengyun</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-500 font-bold">340m</span>
                  <span className="text-xs text-emerald-500 font-medium">Avoided</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-md">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm">NOAA-20 vs Fragment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">185m</span>
                  <span className="text-xs text-zinc-400 font-medium">Watch</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-red-100 rounded-md">
                    <TriangleAlert className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="font-medium text-sm">ISS Corridor Sweep</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-500">1.8km</span>
                  <span className="text-xs text-emerald-500 font-medium">Cleared</span>
                </div>
              </div>
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
              {/* Left Side: Infinite Vertical Marquee */}
              <div className="w-28 h-full relative overflow-hidden mask-image-vertical flex-shrink-0 flex items-center justify-center">
                <div className="flex flex-col gap-3 animate-marquee-v py-4 w-full items-center">
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">LEO-550</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">SSO-780</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm whitespace-nowrap text-center">LEO-1200</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">ISS-420</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">MEO-20200</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">GEO-35786</div>
                  
                  {/* Duplicate set for seamless infinite loop */}
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">LEO-550</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">SSO-780</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm whitespace-nowrap text-center">LEO-1200</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">ISS-420</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">MEO-20200</div>
                  <div className="px-4 py-1.5 bg-white dark:bg-zinc-950 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm whitespace-nowrap text-center">GEO-35786</div>
                </div>
              </div>

              {/* Middle: Solid Connecting Line */}
              <div className="flex-1 h-[1px] bg-gray-200/80 mx-1"></div>

              {/* Right Side: Small Card */}
              <div className="w-44 h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-sm flex flex-col justify-center flex-shrink-0">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">Shell Risk Profile</div>
                <div className="text-[10px] text-zinc-400 mb-1.5 leading-tight">Foster-1992 2D Pc calculation.</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">Automated covariance error ellipsoid integration.</div>
              </div>
            </div>
          </div>

          {/* Icon Library Support */}
          <div className="p-6 md:p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed lg:border-b-0 lg:border-r flex flex-col min-h-[460px]">
            <h3 className="text-2xl font-bold mb-3">Tracking Telemetry Feeds</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed text-sm">
              Continuous ingestion pipeline connecting CelesTrak SGP4, Space-Track, and ESA DISCOS for comprehensive space situational awareness.
            </p>

            <div className="w-full mt-auto bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative h-60 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 240" preserveAspectRatio="none">
                <path d="M 200 65 C 200 120, 110 120, 110 175" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
                <path d="M 200 65 C 200 120, 290 120, 290 175" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
              </svg>

              {/* Top Node */}
              <div className="absolute left-1/2 top-10 -translate-x-1/2 z-10">
                <div className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm animate-float-slow whitespace-nowrap">
                  CelesTrak SGP4
                </div>
              </div>

              {/* Bottom Left Node */}
              <div className="absolute left-[27.5%] bottom-10 -translate-x-1/2 z-10">
                <div className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm animate-float-slower whitespace-nowrap">
                  Space-Track Ephemeris
                </div>
              </div>

              {/* Bottom Right Node */}
              <div className="absolute left-[72.5%] bottom-10 -translate-x-1/2 z-10">
                <div className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm animate-float-slow whitespace-nowrap">
                  ESA DISCOS
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
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 240" preserveAspectRatio="none">
                <line x1="110" y1="55" x2="200" y2="120" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
                <line x1="290" y1="55" x2="200" y2="120" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
                <line x1="110" y1="185" x2="200" y2="120" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
                <line x1="290" y1="185" x2="200" y2="120" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="animate-dash-move" />
              </svg>

              {/* Top Left */}
              <div className="absolute left-[27.5%] top-8 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-700 dark:text-zinc-300 font-medium shadow-sm animate-float-slow whitespace-nowrap">
                  Style
                </div>
              </div>

              {/* Top Right */}
              <div className="absolute left-[72.5%] top-8 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-700 dark:text-zinc-300 font-medium shadow-sm animate-float-slower whitespace-nowrap">
                  Font
                </div>
              </div>

              {/* Center Badge */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="px-4 py-2 bg-slate-100 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-mono text-slate-800 shadow-sm animate-float-slow whitespace-nowrap">
                  --sgp4-v2
                </div>
              </div>

              {/* Bottom Left */}
              <div className="absolute left-[27.5%] bottom-8 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-700 dark:text-zinc-300 font-medium shadow-sm animate-float-slower whitespace-nowrap">
                  Icon
                </div>
              </div>

              {/* Bottom Right */}
              <div className="absolute left-[72.5%] bottom-8 -translate-x-1/2 z-10">
                <div className="px-3.5 py-1.5 bg-black text-white border border-black rounded-full text-xs font-medium shadow-sm animate-float-slow whitespace-nowrap">
                  Theme
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Row 1: 2-col then 3-col */}
        <div className="border-t border-b border-zinc-200 dark:border-zinc-800 border-dashed mb-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Import/Export */}
            <div className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-800 border-dashed lg:border-b-0 lg:border-r flex flex-col items-center text-center overflow-hidden">
              <h3 className="text-2xl font-bold mb-4">Ingest & Export Conjunction Messages (CDM)</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm text-sm">Streamline data exchange between ground stations, Space-Track ephemeris, and automated flight dynamics systems.</p>
              
              <div className="w-full overflow-x-auto pb-4 -mx-4 px-4 flex justify-center no-scrollbar">
                <div className="relative w-[650px] h-48 flex-shrink-0 mt-auto">
                  <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 16 25 L 30 25 L 30 50 L 35 50" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 16 75 L 30 75 L 30 50" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <line x1="35" y1="50" x2="65" y2="50" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 65 50 L 70 50 L 70 25 L 84 25" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 70 50 L 70 75 L 84 75" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="absolute left-[16%] top-[25%] -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><FileCode className="w-3 h-3"/> Your Project</div>
                  <div className="absolute left-[16%] top-[75%] -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><FileCode className="w-3 h-3"/> Ground Station</div>
                  <div className="absolute left-[35%] top-[50%] -translate-x-1/2 -translate-y-1/2 px-2 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-1 z-10 whitespace-nowrap"><Download className="w-3 h-3" /> Import</div>
                  <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black dark:bg-zinc-900 text-white rounded-md text-xs font-medium shadow-md flex items-center gap-2 z-20 whitespace-nowrap"><Sparkles className="w-4 h-4"/> Auralis Engine</div>
                  <div className="absolute left-[65%] top-[50%] -translate-x-1/2 -translate-y-1/2 px-2 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-1 z-10 whitespace-nowrap"><Upload className="w-3 h-3" /> Export</div>
                  <div className="absolute left-[84%] top-[25%] -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><FileCode className="w-3 h-3"/> Your Project</div>
                  <div className="absolute left-[84%] top-[75%] -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><FileCode className="w-3 h-3"/> Ground Station</div>
                </div>
              </div>
            </div>

            {/* Theme Starters */}
            <div className="p-6 md:p-10 flex flex-col items-center text-center overflow-hidden">
              <h3 className="text-2xl font-bold mb-4">Orbital Shell Visualizers</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm text-sm">Inspect polar corridors, sun-synchronous bands, and equatorial orbits in real time.</p>
              
              <div className="w-full overflow-x-auto pb-4 -mx-4 px-4 flex justify-center no-scrollbar">
                <div className="relative w-[500px] h-48 flex-shrink-0 mt-auto">
                  <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 30 50 L 50 50 L 50 25 L 70 25" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 50 50 L 50 75 L 70 75" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  
                  <div className="absolute left-[30%] top-[20%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><span className="w-4 h-4 grid grid-cols-2 gap-0.5"><span className="bg-red-400 rounded-sm"></span><span className="bg-blue-400 rounded-sm"></span><span className="bg-yellow-400 rounded-sm"></span><span className="bg-green-400 rounded-sm"></span></span> LEO Polar Corridor</div>
                  <div className="absolute left-[30%] top-[50%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><span className="w-4 h-4 grid grid-cols-2 gap-0.5"><span className="bg-pink-300 rounded-sm"></span><span className="bg-blue-300 rounded-sm"></span><span className="bg-yellow-200 rounded-sm"></span><span className="bg-purple-300 rounded-sm"></span></span> Sun-Synchronous 780km</div>
                  <div className="absolute left-[30%] top-[80%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><span className="w-4 h-4 grid grid-cols-2 gap-0.5"><span className="bg-yellow-600 rounded-sm"></span><span className="bg-orange-500 rounded-sm"></span><span className="bg-yellow-700 rounded-sm"></span><span className="bg-orange-600 rounded-sm"></span></span> Equatorial LEO 550km</div>
                  
                  <div className="absolute left-[70%] top-[25%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><Sun className="w-4 h-4"/> Light Mode</div>
                  <div className="absolute left-[70%] top-[75%] -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white border border-black rounded-full text-sm font-medium shadow-sm flex items-center gap-2 z-10 whitespace-nowrap"><Moon className="w-4 h-4"/> Dark Mode</div>
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
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">Marvel</div>
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs flex items-center gap-1 shadow-sm whitespace-nowrap"><span className="w-3 h-3 grid grid-cols-2 gap-0.5"><span className="bg-red-400 rounded-sm"></span><span className="bg-blue-400 rounded-sm"></span><span className="bg-yellow-400 rounded-sm"></span><span className="bg-green-400 rounded-sm"></span></span> Clean Slate</div>
                <div className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 text-xs flex items-center gap-1 whitespace-nowrap"><span className="w-3 h-3 grid grid-cols-2 gap-0.5"><span className="bg-black rounded-sm"></span><span className="bg-black rounded-sm"></span><span className="bg-black rounded-sm"></span><span className="bg-red-500 rounded-sm"></span></span> Default</div>
              </div>
            </div>
            <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 border-dashed md:border-b-0 md:border-r flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-3">Collision Probability (Pc) Grading</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Automatic risk categorization: Critical (Pc &gt; 10⁻⁴), Elevated (Pc &gt; 10⁻⁵), and Nominal.</p>
              <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white dark:bg-zinc-950 shadow-sm text-sm self-start">
                Primary Color
                <div className="flex gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                </div>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-3">Astrodynamics State Vector Tuning</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Refine radial, along-track, and cross-track covariance uncertainties with ground radar.</p>
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 shadow-sm font-serif text-xl font-bold text-zinc-800 dark:text-zinc-200">
                  Ag
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="inline-flex items-center px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 shadow-sm text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                    Inter <span className="text-gray-300 mx-1.5">|</span> 16px
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900 shadow-sm text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                    Medium
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Theme Sharing, AI Generation, Color Contrast and Bottom extensions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-zinc-200 dark:border-zinc-800 border-dashed">
          {/* Column 1 */}
          <div className="border-r border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col">
            {/* Multi-Operator Agent Coordination */}
            <div className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col h-full overflow-hidden">
              <h3 className="text-xl font-bold mb-4">Multi-Operator Agent Coordination</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed text-sm">
                Autonomous proxy agents negotiate avoidance maneuvers between operators to eliminate defensive burns and game-theoretic deadlocks.
              </p>
              
              <div className="w-full overflow-x-auto pb-4 -mx-4 px-4 flex justify-center no-scrollbar">
                <div className="relative w-[350px] h-48 flex-shrink-0 mt-auto">
                  <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="25" y1="50" x2="50" y2="50" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 50 50 L 60 50 L 60 25 L 75 25" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <line x1="50" y1="50" x2="75" y2="50" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M 50 50 L 60 50 L 60 75 L 75 75" fill="none" stroke="#e5e7eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="absolute left-[20%] top-[50%] -translate-x-1/2 -translate-y-1/2 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm z-10 flex flex-col items-center">
                    <Database className="w-6 h-6 mb-2 text-zinc-600 dark:text-zinc-300"/>
                    <span className="text-[10px] font-medium whitespace-nowrap">Database</span>
                  </div>
                  <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm z-10 text-zinc-400 dark:text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-8.31l-4.52-4.52"/></svg>
                  </div>
                  <div className="absolute left-[75%] top-[25%] -translate-x-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm z-10"><User className="w-4 h-4" /></div>
                  <div className="absolute left-[75%] top-[50%] -translate-x-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm z-10"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="12" x="3" y="4" rx="2" ry="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg></div>
                  <div className="absolute left-[75%] top-[75%] -translate-x-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm z-10"><Code className="w-4 h-4" /></div>
                </div>
              </div>
            </div>
            
            {/* Maneuver Simulation & Rollback */}
            <div className="p-6 md:p-10 flex flex-col h-full overflow-hidden">
              <h3 className="text-xl font-bold mb-4">Maneuver Simulation & Rollback</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed text-sm">
                Simulate prograde and retrograde burn options, preview secondary conjunction risks, and verify zero collision paths.
              </p>
              
              <div className="flex gap-2 justify-center mb-6 flex-wrap">
                <button className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium flex items-center gap-2 whitespace-nowrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg> Undo</button>
                <button className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium flex items-center gap-2 text-zinc-400 dark:text-zinc-500 whitespace-nowrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg> Redo</button>
              </div>

              <div className="mt-auto relative w-full h-48 border border-zinc-200 dark:border-zinc-800 rounded-t-xl bg-white dark:bg-zinc-950 shadow-lg overflow-hidden flex flex-col">
                <div className="h-4 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-2 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 p-2 flex bg-white dark:bg-zinc-950 opacity-50">
                   <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 p-2 text-center text-[5px]">Sizzling Summer Delights</div>
                   <div className="w-16 border-l border-zinc-200 dark:border-zinc-800 pl-1 text-[4px] leading-tight">Theme settings<br/>Colors...</div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="border-r border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col">
            {/* Autonomous Agent Negotiation Engine */}
            <div className="p-6 md:p-10 flex flex-col h-full pb-0">
              <h3 className="text-xl font-bold mb-4 text-center">Autonomous Agent Negotiation Engine</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center text-sm leading-relaxed">
                Deploy autonomous agent proxies to compute Nash equilibrium maneuver agreements based on remaining fuel reserves.
              </p>
              <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden h-72 relative mt-2 mb-auto">
                <div className="p-3 font-semibold text-center border-b border-zinc-200 dark:border-zinc-800 text-[10px]">AI Auralis Engine</div>
                <div className="p-3 flex justify-between text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                  <span className="font-medium">LLM Configuration</span>
                  <span className="text-zinc-500 dark:text-zinc-400">claude-sonnet-4-6</span>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-950 h-full flex flex-col gap-2">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded text-[10px] text-zinc-700 dark:text-zinc-300 mb-2 leading-relaxed">
                    colors are more intense and attention-grabbing while maintaining good contrast with their backgrounds.
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">
                    <span className="flex items-center gap-1"><FileCode className="w-3 h-3"/> Preview</span>
                    <span className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500"><TriangleAlert className="w-3 h-3"/> Reset to this checkpoint</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm flex flex-col">
                    <div className="flex gap-1 items-center mb-2 justify-between">
                       <span className="text-[10px] font-semibold">Theme Preview</span>
                       <span className="flex gap-1"><span className="w-2 h-2 bg-black rounded-full"></span><span className="w-2 h-2 bg-gray-400 rounded-full"></span><span className="w-2 h-2 bg-gray-200 rounded-full"></span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[8px] font-medium">
                      <div className="flex gap-2 items-center"><div className="w-4 h-4 bg-black rounded"></div>primary<br/>#000000</div>
                      <div className="flex gap-2 items-center"><div className="w-4 h-4 bg-gray-200 rounded"></div>secondary<br/>#e5e7eb</div>
                      <div className="flex gap-2 items-center"><div className="w-4 h-4 bg-zinc-100 dark:bg-zinc-900 rounded"></div>accent<br/>#f3f4f6</div>
                      <div className="flex gap-2 items-center"><div className="w-4 h-4 bg-red-600 rounded"></div>destructive<br/>#dc2626</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat Box */}
            <div className="p-6 md:p-10 flex flex-col h-full border-t border-zinc-200 dark:border-zinc-800 border-dashed">
              <h3 className="text-xl font-bold mb-4">Orbital Advisory Copilot</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed text-sm">
                Ask natural language queries like 'Which shells are trending toward cascade?' or 'Summarize conjunction CJ-142'.
              </p>
              <div className="relative mt-auto w-full">
                <div className="bg-black dark:bg-zinc-900 text-white p-4 rounded-xl rounded-br-sm text-sm mb-2 shadow-sm inline-block max-w-[85%]">
                  Which shells are trending toward cascade?
                </div>
                <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">
                  <input type="text" placeholder="Ask Auralis Copilot..." className="w-full p-4 outline-none text-sm" />
                  <div className="flex items-center justify-between p-2 px-4 border-t border-zinc-200 dark:border-zinc-800 flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-black dark:text-white whitespace-nowrap">+ New chat</span>
                      <span className="cursor-pointer hover:text-black dark:text-white whitespace-nowrap">Enhance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">25/500</span>
                      <button className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg> Stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col">
            {/* Color Contrast */}
            <div className="p-6 md:p-10 border-b border-zinc-200 dark:border-zinc-800 border-dashed flex flex-col h-full min-h-[450px]">
              <h3 className="text-xl font-bold mb-4">Collision Risk Threshold Validation</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
                Instantly validate conjunction miss distances against NASA & ESA collision probability action limits.
              </p>
              <div className="relative w-full flex-1 flex justify-center items-end bg-white dark:bg-zinc-950">
                <div className="absolute bottom-16 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20">
                  <div className="p-3 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
                    <span className="font-semibold text-sm">Secondary</span>
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">16.44 <Check className="w-3 h-3"/></span>
                  </div>
                  <div className="flex h-32">
                    <div className="w-1/3 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white flex flex-col items-center justify-center p-2 border-r border-zinc-200 dark:border-zinc-800">
                      <span className="text-3xl font-bold">Aa</span>
                      <span className="text-[10px] mt-1 whitespace-nowrap">Sample Text</span>
                    </div>
                    <div className="w-2/3 p-3 flex flex-col justify-center gap-2">
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">BACKGROUND</div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800"></span>
                        <span className="text-xs font-medium">Color</span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">oklch(0.97 0 0)</div>
                      
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">FOREGROUND</div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-black rounded border border-zinc-200 dark:border-zinc-800"></span>
                        <span className="text-xs font-medium">Color</span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400">oklch(0.205 0 0)</div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-20 w-60 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-12 z-10 scale-95 flex justify-between px-4 pt-2 text-xs">
                  <span>Primary</span><span className="text-green-600">17.18 ✓</span>
                </div>
                <div className="absolute bottom-24 w-56 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-12 z-0 scale-90 flex justify-between px-4 pt-2 text-xs">
                   <span>Destructive</span><span className="text-green-600">4.77 ✓</span>
                </div>
              </div>
            </div>

            {/* Orbital Catalog Registry */}
            <div className="p-6 md:p-10 flex flex-col h-full">
              <h3 className="text-xl font-bold mb-4">Orbital Catalog Registry</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
                Access your personal registry of custom themes generated with the Auralis Engine, alongside the built-in theme registry.
              </p>
              
              <div className="flex flex-col items-center mt-auto w-full max-w-[280px] mx-auto">
                <div className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-full text-[11px] sm:text-xs font-mono mb-4 shadow-sm w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
                   $ auralis pull @catalog/leo-780-conjunctions
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm relative -mt-4 z-10 whitespace-nowrap">
                  <FileCode className="w-3 h-3" /> Copy CLI
                </div>
                <div className="w-px h-8 bg-gray-200 -mt-4"></div>
                <div className="w-full bg-black text-white rounded-t-xl p-4 pt-6 text-center font-mono text-sm relative mt-0 overflow-hidden h-24">
                   <div className="absolute top-3 left-3 flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                   </div>
                   Terminal
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
            <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl overflow-hidden flex" style={{height: '500px'}}>
              {/* App UI Left */}
              <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/50">
                <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-4 bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-1.5 font-bold text-xs"><Orbit className="w-3.5 h-3.5 text-primary"/> Auralis Flight Ops</div>
                  <div className="flex gap-4 ml-auto text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Overview</span>
                    <span>Conjunctions</span>
                    <span className="text-black dark:text-white font-semibold">Maneuvers</span>
                    <span>Object Graph</span>
                  </div>
                </div>
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
              </div>
              
              {/* Maneuver Planner Sidebar Right */}
              <div className="w-64 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
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
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/100?img=1" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">sadman <div className="w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">@sadmann17</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">Auralis predicted conjunction CJ-142 48 hours before commercial catalogs.</p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/100?img=2" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Julian <div className="w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">@jlndev</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">The autonomous agent negotiation saved 0.22 m/s delta-v on our science mission.</p>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm opacity-30">
              {/* Faded review in screenshot */}
              <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">The epidemiological SIR cascade model gives us the first true leading indicator for orbital congestion tipping points.</p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/100?img=3" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Parth Makwana</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">Founder</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                  <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">G</div> G2
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">Auralis eliminated the prisoner's dilemma between our constellation and ESA Sentinel.</p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm opacity-50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/100?img=4" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">Ali Bey <div className="w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px]">✓</div></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">@alibey_10</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  <span className="w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[10px]">X</span> x.com
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">The cryptographic audit trail makes regulatory compliance with USSPACECOM effortless.</p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5f4d43] text-white flex items-center justify-center text-lg font-bold">
                    Д
                  </div>
                  <div>
                    <div className="font-bold text-sm">Дмитрий Капишевский</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">Frontend Engenier</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                  <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">G</div> G2
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm">Essential flight dynamics tooling for mega-constellation operations.</p>
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
            Access mission control feeds for <span className="font-bold text-black dark:text-white dark:text-white">active orbits</span>, monitor <span className="font-bold text-black dark:text-white dark:text-white">unlimited</span> spacecraft.
            <br />
            Trusted by commercial constellation operators and space research centers.
          </p>
        </div>
        
        {/* Logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 max-w-4xl mx-auto mb-16 opacity-50 grayscale">
          <div className="text-2xl font-serif italic font-light">grooved learning</div>
          <div className="text-2xl font-bold flex items-center gap-1"><TriangleAlert className="w-6 h-6 rotate-90"/>scale<span className="border border-black rounded-lg px-1 text-sm bg-black text-white">app</span></div>
          <div className="text-2xl font-bold lowercase">attentive®</div>
          <div className="text-xl font-bold leading-none text-right">chrono<br/>innovation</div>
          <div className="text-2xl font-bold">OneTex</div>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold text-black dark:text-white">Flight-Critical Precision:</span> Every orbital propagator, covariance model & negotiation algorithm is verified against standard CCSDS benchmarks.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> Continuous CelesTrak TLE ephemeris streaming and SGP4 validation updated daily.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto overflow-hidden">
          <div className="flex flex-nowrap md:flex-wrap md:grid md:grid-cols-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm bg-white dark:bg-zinc-950 p-2 gap-2 overflow-x-auto">
            {/* COMMERCIAL */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl min-w-[200px]">
              <h3 className="font-bold text-lg">COMMERCIAL</h3>
            </div>
            
            {/* Community */}
            <div className="p-6 min-w-[200px]">
              <h3 className="font-bold text-lg flex items-center gap-2">Community <span className="w-2 h-2 rounded-full bg-red-500"></span></h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Academic & Research</p>
            </div>
            
            {/* Basic */}
            <div className="p-6 min-w-[200px]">
              <h3 className="font-bold text-lg flex items-center gap-2">Basic <span className="w-2 h-2 rounded-full bg-gray-400"></span></h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Small Constellations (&lt;10 sats)</p>
            </div>
            
            {/* Pro */}
            <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 relative min-w-[200px]">
              <div className="absolute top-0 right-4 -translate-y-1/2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Best Value</div>
              <h3 className="font-bold text-lg flex items-center gap-2">Pro <span className="w-2 h-2 rounded-full bg-orange-500"></span></h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Mega-Constellations (&gt;100 sats)</p>
            </div>
            
            {/* Team */}
            <div className="p-6 min-w-[200px]">
              <h3 className="font-bold text-lg">Team</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Defense & Civil Space Agencies</p>
            </div>
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
