"use client";

import React from "react";
import { Bell, Search, Menu, Command, Radio, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { usePathname, useRouter } from "next/navigation";
import { NotificationCenter } from "./NotificationCenter";

export function TopHeader() {
  const { language, setLanguage, t } = useLanguage();
  const { role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

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
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b bg-card/80 px-6 backdrop-blur-md">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="text-sm font-medium text-muted-foreground hidden md:flex items-center">
          <span className="hover:text-foreground cursor-pointer transition-colors">Auralis Mission Control</span>
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground font-semibold">{title}</span>
        </div>
      </div>
      
      <div className="flex flex-1 items-center justify-end space-x-3">
        {/* Global Search */}
        <form onSubmit={handleSearch} className="relative hidden w-full max-w-md md:flex items-center group">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objects, conjunctions, or shells..."
            className="w-full bg-muted/50 border-border/50 pl-9 pr-12 focus-visible:ring-1 focus-visible:bg-background transition-all text-xs"
          />
          <div className="absolute right-1.5 flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </form>

        {/* User Role Badge */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center px-2.5 py-1 bg-muted/60 border border-border/60 rounded-md text-[11px] font-mono font-semibold tracking-wide text-muted-foreground">
            <Radio className="w-3 h-3 mr-1.5 text-emerald-500 animate-pulse" />
            {role || "OPERATOR"}
          </div>
        </div>

        {/* Theme Toggle Button (Sun / Moon) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60"
          title={theme === "dark" ? "Switch to White Theme" : "Switch to Black Theme"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>

        {/* Notifications */}
        <NotificationCenter />
      </div>
    </header>
  );
}
