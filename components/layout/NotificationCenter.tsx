"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ExternalLink,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc } from "@/lib/formatters";
import type { 
  ConjunctionEvent, 
  ManeuverProposal, 
  Advisory, 
  CrisisInjectionResponse 
} from "@/types/contract";

type NotificationType = "CRITICAL" | "SUCCESS" | "WARNING" | "INFO" | "ALERT";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

interface ToastItem {
  id: string;
  type: "CRITICAL" | "SUCCESS" | "WARNING" | "INFO";
  title: string;
  message: string;
  link?: string;
  timestamp: number;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-seed-1",
    type: "CRITICAL",
    title: "Critical Conjunction Flagged",
    message: "Conjunction CJ-142: Object 44521 vs Object 38221 (Pc: 2.30 × 10⁻³, Miss: 48m).",
    time: "10m ago",
    read: false,
    link: "/cases/cj-iss-cosmos-2026-09-001"
  },
  {
    id: "n-seed-2",
    type: "WARNING",
    title: "Unexpected Burn Detected",
    message: "Orbital drift anomaly detected on Sat-7 (Δv 1.45 m/s in cross-track vector).",
    time: "42m ago",
    read: false,
    link: "/alerts"
  },
  {
    id: "n-seed-3",
    type: "INFO",
    title: "SGP4 Propagation Cycle Complete",
    message: "Synchronized 632 orbital state vectors across all tracked LEO shell corridors.",
    time: "2h ago",
    read: true,
    link: "/profiles"
  }
];

export function NotificationCenter() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Helper to trigger a floating toast and auto-dismiss after 6 seconds
  const addToast = useCallback((toast: Omit<ToastItem, "timestamp">) => {
    const newToast: ToastItem = { ...toast, timestamp: Date.now() };
    setActiveToasts((prev) => [newToast, ...prev.slice(0, 3)]); // show max 4 toasts simultaneously

    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 6000);
  }, []);

  const dismissToast = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. WebSocket listener: conjunction:created (Critical only -> red toast)
  useWebSocket("conjunction:created", (event: ConjunctionEvent) => {
    if (event.riskLevel === "critical") {
      const id = `notif-conj-${event.id}-${Date.now()}`;
      const title = "Critical Conjunction Alert";
      const message = `Conjunction ${event.id}: ${event.primaryObjectId} vs ${event.secondaryObjectId} (Pc: ${formatScientificPc(event.collisionProbability)}, Miss: ${(event.missDistance * 1000).toFixed(0)}m).`;
      const link = `/cases/${event.id}`;

      setNotifications((prev) => [
        {
          id,
          type: "CRITICAL",
          title,
          message,
          time: "Just now",
          read: false,
          link,
        },
        ...prev,
      ]);

      addToast({
        id,
        type: "CRITICAL",
        title,
        message,
        link,
      });
    }
  });

  // 2. WebSocket listener: maneuver:resolved (Green toast)
  useWebSocket("maneuver:resolved", (proposal: ManeuverProposal) => {
    const id = `notif-maneuver-${proposal.id}-${Date.now()}`;
    const deltaVStr = proposal.deltaV?.magnitude
      ? `${proposal.deltaV.magnitude.toFixed(2)} m/s`
      : "calculated";
    const title = "Maneuver Proposal Resolved";
    const message = `Bilateral burn accepted for ${proposal.maneuveringObjectId} (${deltaVStr} Δv). Residual Pc: ${proposal.resultingPc ? formatScientificPc(proposal.resultingPc) : "minimized"}.`;
    const link = `/cases/${proposal.conjunctionEventId || ""}`;

    setNotifications((prev) => [
      {
        id,
        type: "SUCCESS",
        title,
        message,
        time: "Just now",
        read: false,
        link,
      },
      ...prev,
    ]);

    addToast({
      id,
      type: "SUCCESS",
      title,
      message,
      link,
    });
  });

  // 3. WebSocket listener: advisory:new (Silent notification entry, no intrusive toast popup)
  useWebSocket("advisory:new", (advisory: Advisory) => {
    const id = `notif-adv-${advisory.id}-${Date.now()}`;
    const title = `Advisory: ${advisory.title}`;
    const message = advisory.body.length > 130 ? `${advisory.body.slice(0, 130)}...` : advisory.body;
    const link = "/chat";

    setNotifications((prev) => [
      {
        id,
        type: "INFO",
        title,
        message,
        time: "Just now",
        read: false,
        link,
      },
      ...prev,
    ]);
  });

  // 4. WebSocket listener: crisis:injected (Amber / Warning toast)
  useWebSocket("crisis:injected", (crisis: CrisisInjectionResponse) => {
    const id = `notif-crisis-${Date.now()}`;
    const title = "Orbital Breakup Cascade Injected";
    const message = `Simulated catastrophe spawned ${crisis.injectedObjectCount} fragments across shells ${crisis.affectedShellIds.join(", ")}. Supercritical R₀ alert triggered.`;
    const link = "/analytics";

    setNotifications((prev) => [
      {
        id,
        type: "WARNING",
        title,
        message,
        time: "Just now",
        read: false,
        link,
      },
      ...prev,
    ]);

    addToast({
      id,
      type: "WARNING",
      title,
      message,
      link,
    });
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "CRITICAL":
      case "ALERT":
        return <AlertCircle className="w-5 h-5 text-destructive shrink-0" />;
      case "SUCCESS":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "WARNING":
        return <Flame className="w-5 h-5 text-amber-400 shrink-0" />;
      case "INFO":
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const handleToastClick = (toast: ToastItem) => {
    dismissToast(toast.id);
    if (toast.link) {
      router.push(toast.link);
    }
  };

  return (
    <>
      {/* Floating Tactical Toast Stack (Top-Right Viewport Portal) */}
      {mounted && createPortal(
        <div 
          aria-live="polite"
          className="fixed top-20 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        >
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => handleToastClick(toast)}
              className={cn(
                "pointer-events-auto relative flex flex-col gap-1.5 p-3.5 rounded-lg border shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 cursor-pointer group hover:scale-[1.02] bg-card/95 text-card-foreground animate-in slide-in-from-top-3 fade-in duration-200",
                toast.type === "CRITICAL" &&
                  "bg-destructive/10 dark:bg-destructive/15 border-destructive/70 text-foreground shadow-[0_4px_25px_rgba(239,68,68,0.25)]",
                toast.type === "SUCCESS" &&
                  "bg-emerald-500/10 dark:bg-emerald-950/60 border-emerald-500/70 text-foreground shadow-[0_4px_25px_rgba(16,185,129,0.25)]",
                toast.type === "WARNING" &&
                  "bg-amber-500/10 dark:bg-amber-950/60 border-amber-500/70 text-foreground shadow-[0_4px_25px_rgba(245,158,11,0.25)]",
                toast.type === "INFO" &&
                  "bg-sky-500/10 dark:bg-sky-950/60 border-sky-500/70 text-foreground shadow-[0_4px_25px_rgba(14,165,233,0.25)]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {toast.type === "CRITICAL" && (
                    <span className="flex h-2 w-2 rounded-full bg-destructive animate-ping" />
                  )}
                  {toast.type === "SUCCESS" && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                  {toast.type === "WARNING" && (
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  {toast.type === "INFO" && (
                    <span className="flex h-2 w-2 rounded-full bg-sky-400" />
                  )}
                  <span className={cn(
                    "text-[10px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded",
                    toast.type === "CRITICAL" && "bg-destructive/20 text-destructive",
                    toast.type === "SUCCESS" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                    toast.type === "WARNING" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                    toast.type === "INFO" && "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                  )}>
                    {toast.type === "CRITICAL" ? "COLLISION THREAT" : toast.type === "SUCCESS" ? "RESOLVED" : toast.type === "WARNING" ? "KINETIC CASCADE" : "ADVISORY"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => dismissToast(toast.id, e)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Body */}
              <div className="space-y-0.5 pr-2">
                <p className="text-xs font-semibold text-foreground tracking-tight">
                  {toast.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              {/* Footer quick action */}
              {toast.link && (
                <div className="flex items-center justify-end pt-1">
                  <span className="text-[10px] font-mono text-primary group-hover:underline flex items-center gap-1 font-medium">
                    Review Details <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Slide-over Notification Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger className="relative p-2 rounded-md hover:bg-muted focus-visible:outline-none transition-colors cursor-pointer">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-mono font-bold text-destructive-foreground animate-pulse border-2 border-card shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </SheetTrigger>
        
        <SheetContent className="w-[400px] sm:w-[460px] p-0 flex flex-col bg-card/95 backdrop-blur-xl border-border">
          <SheetHeader className="p-6 border-b border-border/80">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                Orbital Alert Center
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="px-1.5 h-5 text-[10px] font-mono min-w-[20px] justify-center">
                    {unreadCount} UNREAD
                  </Badge>
                )}
              </SheetTitle>
              <div className="flex gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={markAllAsRead} 
                  title="Mark all read" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearAll} 
                  title="Clear all alerts" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-semibold">No active notifications</p>
                <p className="text-xs mt-1 text-muted-foreground/80">All orbital signals nominal. Autonomous screening active.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex gap-3.5 p-4 hover:bg-muted/40 transition-colors cursor-pointer relative",
                    !notification.read && "bg-muted/20"
                  )}
                >
                  {!notification.read && (
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 rounded-r-full",
                      notification.type === "CRITICAL" ? "bg-destructive" : notification.type === "SUCCESS" ? "bg-emerald-500" : notification.type === "WARNING" ? "bg-amber-500" : "bg-sky-500"
                    )} />
                  )}
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs font-semibold tracking-tight",
                        !notification.read ? "text-foreground font-bold" : "text-foreground/80"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    {notification.link && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] font-mono text-primary hover:underline">
                        <span>Inspect Case</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
