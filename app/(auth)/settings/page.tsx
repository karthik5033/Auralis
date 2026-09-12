"use client";

import React, { useState } from "react";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Save, 
  Moon, 
  Sun, 
  Monitor,
  Lock
} from "lucide-react";
import { useAuth, Role } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "notifications" | "security">("profile");
  const { role, setRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "Elena Vance",
    badge: "OP-AURALIS-4092",
    email: "e.vance@auralis.space",
    division: "Conjunction Assessment & Autonomous Avoidance Desk"
  });

  const [notifySettings, setNotifySettings] = useState({
    criticalAlerts: true,
    conjunctionAlerts: true,
    weeklyReport: false,
    soundEffects: true
  });

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mission Control Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure operator workstation preferences, clearance hierarchy simulations, and orbital alert triggers.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <User className="w-4 h-4" />
              Operator Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "security" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Shield className="w-4 h-4" />
              Role & Permissions Simulator
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "appearance" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Palette className="w-4 h-4" />
              Appearance & Theme
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === "notifications" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bell className="w-4 h-4" />
              Alert Triggers
            </button>
          </nav>
        </aside>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Operator Workstation Profile</CardTitle>
                <CardDescription className="text-xs">
                  Your identity details associated with Auralis flight dynamics and maneuver authorization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Operator Name</label>
                    <Input 
                      value={profileForm.name} 
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                      className="text-xs" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Console ID</label>
                    <Input value={profileForm.badge} disabled className="text-xs font-mono bg-muted/40" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Operations Email</label>
                  <Input 
                    value={profileForm.email} 
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} 
                    className="text-xs" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Station / Sector Desk</label>
                  <Input 
                    value={profileForm.division} 
                    onChange={(e) => setProfileForm({ ...profileForm, division: e.target.value })} 
                    className="text-xs" 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t pt-4">
                <span className="text-xs text-emerald-600 font-medium">{savedSuccess ? "Preferences saved successfully!" : ""}</span>
                <Button onClick={handleSave} size="sm" className="text-xs font-semibold gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Security & Role Simulator Tab */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Role-Based Access Simulation
                </CardTitle>
                <CardDescription className="text-xs">
                  Switch your simulated role to test and inspect frontend permission barriers (Operator vs Flight Dynamics Lead vs Mission Director vs Admin).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-semibold text-foreground block">Current Active Role</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(["OPERATOR", "FLIGHT_DYNAMICS_LEAD", "MISSION_DIRECTOR", "ADMIN"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          role === r ? "border-primary bg-primary/10 shadow-sm" : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-bold text-foreground text-xs">{r}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {r === "OPERATOR" ? "Flight Controller" :
                           r === "FLIGHT_DYNAMICS_LEAD" ? "Astrodynamics Lead" :
                           r === "MISSION_DIRECTOR" ? "Constellation Authority" : "Full Governance"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5 font-mono">
                  <span className="font-bold text-foreground block">Active Security Session</span>
                  <p className="text-muted-foreground">Operator Token: AURALIS-OPS-SEC-2026</p>
                  <p className="text-muted-foreground">Current UI clearance level: <span className="font-bold text-primary">{role}</span></p>
                </div>

                <div className="pt-2">
                  <Link href="/settings/permissions">
                    <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      View Full Permissions Matrix
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Theme & Interface Appearance</CardTitle>
                <CardDescription className="text-xs">Select between Perfect Black mode and Clean White mode.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => theme === "dark" && toggleTheme()}
                    className={`p-3 rounded-lg border bg-card text-center cursor-pointer transition-all ${
                      theme === "light" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    }`}
                  >
                    <Sun className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <span className="font-semibold">White Theme</span>
                  </div>
                  <div 
                    onClick={() => theme === "light" && toggleTheme()}
                    className={`p-3 rounded-lg border bg-card text-center cursor-pointer transition-all ${
                      theme === "dark" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    }`}
                  >
                    <Moon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <span className="font-semibold">Black Theme</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Alert Trigger Preferences</CardTitle>
                <CardDescription className="text-xs">Configure real-time notifications for orbital conjunction events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-semibold text-foreground">Critical Collision Alerts (Pc &gt; 10⁻⁴)</p>
                    <p className="text-muted-foreground text-[11px]">Receive push notification when miss distance is under 50m</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifySettings.criticalAlerts} 
                    onChange={(e) => setNotifySettings({ ...notifySettings, criticalAlerts: e.target.checked })} 
                    className="h-4 w-4 rounded text-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-semibold text-foreground">Uncoordinated Thruster Burn Detections</p>
                    <p className="text-muted-foreground text-[11px]">Instant audio alert on unheralded trajectory changes</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notifySettings.conjunctionAlerts} 
                    onChange={(e) => setNotifySettings({ ...notifySettings, conjunctionAlerts: e.target.checked })} 
                    className="h-4 w-4 rounded text-primary"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
