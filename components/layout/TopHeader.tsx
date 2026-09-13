"use client";

import React from "react";
import { Bell, Search, Menu, Command, Radio, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { NotificationCenter } from "./NotificationCenter";
import { CommandPalette } from "./CommandPalette";

export function TopHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [utcTime, setUtcTime] = React.useState<string>("");

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  let title = "Command Center";
  if (pathname?.includes('/chat')) {
    title = "Advisory";
  } else if (pathname?.includes('/network')) {
    title = "Object Graph";
  } else if (pathname?.includes('/dashboard')) {
    title = "Command Center";
  } else if (pathname?.includes('/analytics')) {
    title = "Analytics & Trends";
  } else if (pathname?.includes('/cases')) {
    title = "Conjunction Events";
  } else if (pathname?.includes('/profiles')) {
    title = "Tracked Objects";
  } else if (pathname?.includes('/alerts')) {
    title = "Risk Alerts";
  } else if (pathname?.includes('/financial')) {
    title = "Fuel Ledger";
  } else if (pathname?.includes('/audit')) {
    title = "Audit & Governance";
  } else if (pathname?.includes('/settings')) {
    title = "Settings";
  } else if (pathname?.includes('/data-ingestion')) {
    title = "Data Ingestion";
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/70 bg-card/85 px-6 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="mr-1 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Breadcrumbs */}
          <div className="text-sm font-medium hidden md:flex items-center gap-2 select-none">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-[11px] font-mono text-zinc-400 hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Return to Auralis Landing Page"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auralis Mission Control</span>
            </Link>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="text-foreground font-bold text-xs font-mono tracking-wide">{title}</span>
          </div>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2.5">
          {/* Global Search & Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="relative hidden w-full max-w-md md:flex items-center justify-between px-3 py-1.5 bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-cyan-500/40 rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
              <span className="text-xs font-sans text-muted-foreground/80">Search objects, conjunctions, or shells...</span>
            </div>
            <div className="flex h-5 select-none items-center gap-1 rounded border border-border/80 bg-background/80 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </button>

          {/* Real-time UTC Epoch Clock */}
          {utcTime && (
            <div className="hidden lg:flex items-center px-2.5 py-1 bg-muted/30 border border-border/50 rounded-md text-[10px] font-mono text-zinc-400 tracking-wider">
              <span>{utcTime}</span>
            </div>
          )}

          {/* Operator Status Badge */}
          <div className="hidden sm:flex items-center">
            <div className="flex items-center px-2.5 py-1 bg-emerald-950/20 border border-emerald-500/30 rounded-md text-[11px] font-mono font-semibold tracking-wide text-emerald-400">
              <Radio className="w-3 h-3 mr-1.5 text-emerald-400 animate-pulse" />
              <span>{role || "OPERATOR"}</span>
            </div>
          </div>

          {/* Theme Toggle Button (Sun / Moon) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-all border border-border/60 hover:border-border cursor-pointer shadow-xs"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Notifications */}
          <NotificationCenter />
        </div>
      </header>

      {/* Global Spotlight Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
