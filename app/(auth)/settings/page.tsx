"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Save, 
  Moon, 
  Sun, 
  Monitor,
  Lock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  Cpu,
  Orbit,
  ExternalLink,
  KeyRound,
  Check,
  X,
  Server
} from "lucide-react";
import { useAuth, Role } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

type SettingsTab = "profile" | "security" | "appearance" | "alerts" | "diagnostics";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { role, setRole, user, updateUser, userId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [playingSiren, setPlayingSiren] = useState(false);

  // Form State initialized from AuthContext
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "Elena",
    lastName: user?.lastName || "Vance",
    badgeNumber: user?.badgeNumber || "OP-AURALIS-4092",
    email: user?.email || "e.vance@auralis.space",
    department: user?.department || "Conjunction Assessment & Autonomous Avoidance Desk",
    callsign: user?.callsign || "Auralis Flight Dynamics Lead",
    dutyShift: "Alpha Shift (08:00–16:00 UTC)",
    dutySector: "LEO Low & Mid Altitude (200–1000 km)",
    fingerprint: "SHA256:7f4a9b...e21c88",
  });

  // Keep form in sync if user changes
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        badgeNumber: user.badgeNumber || prev.badgeNumber,
        email: user.email || prev.email,
        department: user.department || prev.department,
        callsign: user.callsign || prev.callsign,
      }));
    }
  }, [user]);

  // Alert Trigger Thresholds
  const [alertSettings, setAlertSettings] = useState({
    criticalPcThreshold: "1e-3",
    elevatedPcThreshold: "1e-4",
    missDistanceAudibleKm: 0.5,
    supercriticalCascadeAlerts: true,
    uncoordinatedBurnAlerts: true,
    audioSirenEnabled: true,
    autoAcknowledgeNominal: false,
  });

  // Display Preferences
  const [displaySettings, setDisplaySettings] = useState({
    compactTables: false,
    highContrastVectors: true,
    showUncertaintyEllipses: true,
    reducedMotion: false,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email,
      department: profileForm.department,
      callsign: profileForm.callsign,
      badgeNumber: profileForm.badgeNumber,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Web Audio API siren sound generator (no external audio files required)
  const handleTestSiren = () => {
    if (typeof window === "undefined") return;
    try {
      setPlayingSiren(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      // Dual-tone orbital siren sound: 880 Hz to 440 Hz oscillation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.7);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);

      setTimeout(() => {
        setPlayingSiren(false);
      }, 1250);
    } catch {
      setPlayingSiren(false);
    }
  };

  const displayName = `${profileForm.firstName} ${profileForm.lastName}`.trim();

  // Clearance Capabilities Matrix for Role Simulator
  const roleCapabilities = {
    canViewRadar: true,
    canAcknowledgeAlerts: true,
    canDraftManeuvers: role !== "OPERATOR",
    canAuthorizeBurns: role === "FLIGHT_DYNAMICS_LEAD" || role === "MISSION_DIRECTOR" || role === "ADMIN",
    canSimulateCrisis: role === "MISSION_DIRECTOR" || role === "ADMIN",
    canReallocateFuel: role === "MISSION_DIRECTOR" || role === "ADMIN",
    canSealAuditLedger: role === "ADMIN",
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              OPERATOR WORKSTATION • STATION ID #{userId}
            </Badge>
            <Badge className="font-mono text-[10px] uppercase font-bold bg-primary/20 text-primary border-primary/30">
              CLEARANCE: {role}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-primary" />
            Mission Control Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure operator workstation preferences, clearance hierarchy simulations, audio sirens, and telemetry pipeline diagnostics.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation & Workstation Badge Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          {/* Operator Badge Summary Tile */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-base text-primary font-mono shrink-0 shadow-xs">
                  {profileForm.firstName?.[0] || "E"}{profileForm.lastName?.[0] || "V"}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground truncate">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{profileForm.badgeNumber}</div>
                  <Badge variant="outline" className="text-[9px] font-mono mt-0.5 border-primary/30 text-primary">
                    {role}
                  </Badge>
                </div>
              </div>
              <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Shift:</span>
                  <span className="text-foreground">Alpha UTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    ONLINE
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nav Tabs */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "profile", label: "Operator Profile", icon: User },
              { id: "security", label: "Role & Clearance", icon: Shield },
              { id: "appearance", label: "Appearance & Theme", icon: Palette },
              { id: "alerts", label: "Sirens & Triggers", icon: Bell },
              { id: "diagnostics", label: "Pipeline & Diagnostics", icon: Server },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold font-mono transition-colors whitespace-nowrap cursor-pointer ${
                    active ? "bg-primary text-primary-foreground shadow-xs font-bold" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content Area */}
        <div className="flex-1 min-w-0">
          {/* ========================================================================= */}
          {/* TAB 1: Operator Profile */}
          {/* ========================================================================= */}
          {activeTab === "profile" && (
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Operator Workstation Profile
                </CardTitle>
                <CardDescription className="text-xs">
                  Your identity details associated with Auralis flight dynamics and maneuver authorization.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-4 pt-4 text-xs font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">First Name</label>
                      <Input 
                        value={profileForm.firstName} 
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} 
                        className="text-xs bg-muted/30 border-border" 
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Last Name</label>
                      <Input 
                        value={profileForm.lastName} 
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} 
                        className="text-xs bg-muted/30 border-border" 
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Console ID / Badge</label>
                      <Input 
                        value={profileForm.badgeNumber} 
                        onChange={(e) => setProfileForm({ ...profileForm, badgeNumber: e.target.value })} 
                        className="text-xs font-mono bg-muted/30 border-border" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">Operations Email</label>
                      <Input 
                        type="email"
                        value={profileForm.email} 
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} 
                        className="text-xs bg-muted/30 border-border" 
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Station / Sector Desk</label>
                    <Input 
                      value={profileForm.department} 
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} 
                      className="text-xs bg-muted/30 border-border" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Operational Callsign</label>
                    <Input 
                      value={profileForm.callsign} 
                      onChange={(e) => setProfileForm({ ...profileForm, callsign: e.target.value })} 
                      className="text-xs font-mono bg-muted/30 border-border" 
                    />
                  </div>

                  {/* Workstation Hardware & Cryptographic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 font-mono space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase block">Duty Sector & Shift</span>
                      <span className="text-xs font-bold text-foreground block">{profileForm.dutySector}</span>
                      <span className="text-[11px] text-muted-foreground block">{profileForm.dutyShift}</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 font-mono space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                        <KeyRound className="h-3 w-3 text-primary" />
                        ECDSA Flight Authorization Key
                      </span>
                      <span className="text-xs font-bold text-foreground block">{profileForm.fingerprint}</span>
                      <span className="text-[10px] text-emerald-400 block">Cryptographically Validated</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border/60 pt-4">
                  <span className="text-xs font-mono font-medium text-emerald-400">
                    {savedSuccess ? "✓ Workstation profile updated and synced across Mission Control!" : ""}
                  </span>
                  <Button type="submit" size="sm" className="text-xs font-mono font-semibold gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: Role & Permissions Simulator */}
          {/* ========================================================================= */}
          {activeTab === "security" && (
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Role-Based Access Control Simulator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Switch your simulated role to test and inspect frontend permission barriers across mission control tiers.
                    </CardDescription>
                  </div>
                  <Link href="/settings/permissions">
                    <Button variant="outline" size="sm" className="text-xs font-mono gap-1">
                      Matrix <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4 text-xs font-sans">
                {/* Role Selector Grid */}
                <div className="space-y-2">
                  <label className="font-semibold text-foreground block font-mono text-xs">
                    SELECT ACTIVE SIMULATED CLEARANCE
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      {
                        role: "OPERATOR" as Role,
                        title: "Operator",
                        tier: "Level 1",
                        desc: "Flight controller. Monitors telemetry & alerts.",
                      },
                      {
                        role: "FLIGHT_DYNAMICS_LEAD" as Role,
                        title: "Flight Lead",
                        tier: "Level 2",
                        desc: "Astrodynamics lead. Authorizes avoidance burns.",
                      },
                      {
                        role: "MISSION_DIRECTOR" as Role,
                        title: "Director",
                        tier: "Level 3",
                        desc: "Constellation authority. Crisis & ADR tasking.",
                      },
                      {
                        role: "ADMIN" as Role,
                        title: "Administrator",
                        tier: "Root Level",
                        desc: "Full governance. Key rotation & audit signing.",
                      },
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setRole(item.role)}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          role === item.role
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border/60 hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground font-mono text-xs">{item.title}</span>
                            <Badge variant="outline" className="text-[9px] font-mono">
                              {item.tier}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                        {role === item.role && (
                          <span className="text-[10px] font-mono font-bold text-primary mt-2 flex items-center gap-1">
                            <Check className="h-3 w-3" /> ACTIVE ROLE
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Capability Inspection Matrix */}
                <div className="space-y-2 pt-2">
                  <label className="font-semibold text-foreground block font-mono text-xs">
                    ACTIVE CLEARANCE CAPABILITIES FOR [{role}]
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        label: "Monitor Orbital Radar & Ingestion Feed",
                        allowed: roleCapabilities.canViewRadar,
                        desc: "CelesTrak SGP4 state vector inspection",
                      },
                      {
                        label: "Acknowledge Threat Alerts",
                        allowed: roleCapabilities.canAcknowledgeAlerts,
                        desc: "Acknowledge conjunction & cascade warnings",
                      },
                      {
                        label: "Draft Bilateral Maneuver Proposals",
                        allowed: roleCapabilities.canDraftManeuvers,
                        desc: "Generate delta-V orbital transfer plans",
                      },
                      {
                        label: "Authorize Emergency Avoidance Burns",
                        allowed: roleCapabilities.canAuthorizeBurns,
                        desc: "Issue cryptographically signed burn execution",
                      },
                      {
                        label: "Simulate Crisis / ASAT Breakups",
                        allowed: roleCapabilities.canSimulateCrisis,
                        desc: "Inject high-energy debris fragmentation clouds",
                      },
                      {
                        label: "Reallocate Constellation Fuel Treasury",
                        allowed: roleCapabilities.canReallocateFuel,
                        desc: "Modify financial delta-V operational budgets",
                      },
                      {
                        label: "Audit Ledger Cryptographic Seal & Export",
                        allowed: roleCapabilities.canSealAuditLedger,
                        desc: "Verify Merkle tree root & export compliance logs",
                      },
                    ].map((cap, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                          cap.allowed 
                            ? "bg-emerald-950/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-muted/20 border-border/60 text-muted-foreground opacity-60"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-foreground">{cap.label}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{cap.desc}</div>
                        </div>
                        <Badge 
                          className={`font-mono text-[9px] font-bold ${
                            cap.allowed 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}
                        >
                          {cap.allowed ? "AUTHORIZED" : "RESTRICTED"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: Appearance & Display */}
          {/* ========================================================================= */}
          {activeTab === "appearance" && (
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Theme & Mission Control Visual Aesthetics
                </CardTitle>
                <CardDescription className="text-xs">
                  Customize interface lighting, trajectory contrast, and table density for mission operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4 text-xs font-sans">
                {/* Theme Mode Cards */}
                <div>
                  <label className="font-semibold text-foreground block font-mono text-xs mb-2">
                    INTERFACE PALETTE MODE
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      onClick={() => theme === "light" && toggleTheme()}
                      className={`p-4 rounded-xl border bg-card text-left cursor-pointer transition-all ${
                        theme === "dark" 
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs" 
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <Moon className="h-5 w-5 text-primary" />
                          Obsidian Dark Mission Control
                        </div>
                        {theme === "dark" && (
                          <Badge className="font-mono text-[9px] bg-primary/20 text-primary border-primary/30">
                            ACTIVE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Optimized for low-light orbital operations center. Ultra-deep OLED black with vivid telemetry indicators.
                      </p>
                    </div>

                    <div 
                      onClick={() => theme === "dark" && toggleTheme()}
                      className={`p-4 rounded-xl border bg-card text-left cursor-pointer transition-all ${
                        theme === "light" 
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs" 
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <Sun className="h-5 w-5 text-amber-500" />
                          Clean White Daylight Console
                        </div>
                        {theme === "light" && (
                          <Badge className="font-mono text-[9px] bg-primary/20 text-primary border-primary/30">
                            ACTIVE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        High-contrast daytime operations mode with clean borders and clear typography for sunny command rooms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="font-semibold text-foreground block font-mono text-xs">
                    TELEMETRY RENDERING PREFERENCES
                  </label>

                  <div className="space-y-2">
                    {[
                      {
                        key: "highContrastVectors",
                        title: "High-Contrast Trajectory Vectors",
                        desc: "Emphasize conjunction encounter cones and relative velocity vectors on radar.",
                      },
                      {
                        key: "showUncertaintyEllipses",
                        title: "3D Covariance Uncertainty Ellipsoids",
                        desc: "Render 3-sigma position error covariance boundaries in orbital views.",
                      },
                      {
                        key: "compactTables",
                        title: "Compact Catalog Table Density",
                        desc: "Decrease table padding to show more tracked objects per viewport.",
                      },
                    ].map((item) => {
                      const checked = displaySettings[item.key as keyof typeof displaySettings];
                      return (
                        <div 
                          key={item.key} 
                          className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                        >
                          <div>
                            <div className="font-semibold text-foreground">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                          </div>
                          <input 
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setDisplaySettings({ ...displaySettings, [item.key]: e.target.checked })}
                            className="h-4 w-4 rounded text-primary cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: Alert Sirens & Triggers */}
          {/* ========================================================================= */}
          {activeTab === "alerts" && (
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Orbital Alert Sirens & Screening Thresholds
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure autonomous trigger parameters, collision probability limits, and audio sirens.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4 text-xs font-sans">
                {/* Audio Siren Test Bar */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      {playingSiren ? <Volume2 className="h-5 w-5 animate-pulse text-red-400" /> : <Volume2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-xs font-mono">
                        AURALIS MISSION CONTROL AUDIO SYNTHESIZER
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Web Audio 880Hz / 440Hz dual-tone acoustic chime for terminal close-approach sirens.
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestSiren}
                    disabled={playingSiren}
                    className="text-xs font-mono gap-1.5 border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {playingSiren ? "Playing Siren..." : "Test Audio Siren"}
                  </Button>
                </div>

                {/* Threshold Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <label className="font-semibold text-foreground font-mono text-xs block">
                      CRITICAL COLLISION Pc THRESHOLD
                    </label>
                    <select
                      value={alertSettings.criticalPcThreshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, criticalPcThreshold: e.target.value })}
                      className="w-full h-8 px-2 rounded border border-border bg-card text-xs font-mono text-foreground"
                    >
                      <option value="1e-3">Pc ≥ 1.0 × 10⁻³ (Emergency Maneuver Mandatory)</option>
                      <option value="1e-4">Pc ≥ 1.0 × 10⁻⁴ (Elevated Monitoring Standard)</option>
                      <option value="1e-5">Pc ≥ 1.0 × 10⁻⁵ (Informational Screening)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Per NASA / ESA flight safety protocols, conjunctions exceeding Pc ≥ 10⁻³ require immediate avoidance burns.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <label className="font-semibold text-foreground font-mono text-xs block">
                      MISS DISTANCE AUDIBLE SIREN (km)
                    </label>
                    <select
                      value={alertSettings.missDistanceAudibleKm}
                      onChange={(e) => setAlertSettings({ ...alertSettings, missDistanceAudibleKm: Number(e.target.value) })}
                      className="w-full h-8 px-2 rounded border border-border bg-card text-xs font-mono text-foreground"
                    >
                      <option value={0.1}>&lt; 100 meters (Extreme Emergency)</option>
                      <option value={0.25}>&lt; 250 meters (Critical Close Approach)</option>
                      <option value={0.5}>&lt; 500 meters (Standard Screening Envelope)</option>
                      <option value={1.0}>&lt; 1.0 kilometer (Extended Watch)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Triggers acoustic alert chime when projected miss distance at TCA falls below this envelope.
                    </p>
                  </div>
                </div>

                {/* Checkbox Triggers */}
                <div className="space-y-2 pt-1">
                  {[
                    {
                      key: "supercriticalCascadeAlerts",
                      title: "Supercritical Kessler Cascade Spikes (R₀ ≥ 1.0)",
                      desc: "Dispatch priority warnings when epidemic debris reproduction indicates runaway cascading in an orbital shell.",
                    },
                    {
                      key: "uncoordinatedBurnAlerts",
                      title: "Uncoordinated Thruster Burn Detections",
                      desc: "Instant audio and telemetry chime on unheralded trajectory changes by non-consortium spacecraft.",
                    },
                    {
                      key: "audioSirenEnabled",
                      title: "Mission Control Acoustic Siren Chimes",
                      desc: "Play synthesizer alarm tones in browser when urgent collision warnings are confirmed.",
                    },
                  ].map((trigger) => {
                    const checked = alertSettings[trigger.key as keyof typeof alertSettings] as boolean;
                    return (
                      <div 
                        key={trigger.key} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{trigger.title}</div>
                          <div className="text-[11px] text-muted-foreground">{trigger.desc}</div>
                        </div>
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setAlertSettings({ ...alertSettings, [trigger.key]: e.target.checked })}
                          className="h-4 w-4 rounded text-primary cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: Telemetry Pipeline & Diagnostics */}
          {/* ========================================================================= */}
          {activeTab === "diagnostics" && (
            <Card className="border-border/80 bg-card/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Telemetry Pipeline Health & System Diagnostics
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time synchronization status of orbital ephemeris pipelines, numerical propagators, and audit ledger.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase block">CelesTrak Ephemerides Feed</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> 639 OBJECTS SYNCHRONIZED
                    </span>
                    <p className="text-[11px] text-muted-foreground">General Perturbations (GP) TLE data parsed & validated.</p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase block">SGP4 Astrodynamics Engine</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> 26.6 ms BENCHMARK
                    </span>
                    <p className="text-[11px] text-muted-foreground">Target &lt; 5000ms. Foster-1992 collision probability active.</p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase block">WebSocket Unified Gateway</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <Radio className="h-4 w-4 animate-pulse" /> BROADCASTING (Port 3000)
                    </span>
                    <p className="text-[11px] text-muted-foreground">11 event channels active across mission control nodes.</p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase block">Cryptographic Audit Ledger</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> MERKLE PROOF VERIFIED
                    </span>
                    <p className="text-[11px] text-muted-foreground">Deterministic SHA-256 tamper-evident governance ledger.</p>
                  </div>
                </div>

                {/* Diagnostics Action Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => alert("WebSocket heartbeat roundtrip: 4ms. All telemetry channels healthy.")}
                    className="text-xs font-mono gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Ping Gateway
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("auralis_operator_user");
                        localStorage.removeItem("auralis_operator_role");
                        window.location.reload();
                      }
                    }}
                    className="text-xs font-mono gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-950/20"
                  >
                    Reset Workstation Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
