"use client";

import React, { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Bell, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";

type NotificationType = "CRITICAL" | "ALERT" | "WARNING" | "INFO" | string;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time?: string;
  timestamp?: string;
  read: boolean;
  link?: string;
}

const INITIAL_MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    type: "CRITICAL",
    title: "Critical Conjunction Alert",
    message: "Conjunction CJ-142: Object 44521 vs Object 38221 (Pc: 3.8e-4, Miss: 48m).",
    time: "10 mins ago",
    read: false,
    link: "/cases"
  },
  {
    id: "n-2",
    type: "WARNING",
    title: "Unexpected Burn Detected",
    message: "Anomaly: unexpected burn detected on Sat-7 (Δv 1.45 m/s).",
    time: "42 mins ago",
    read: false,
    link: "/alerts"
  },
  {
    id: "n-3",
    type: "INFO",
    title: "CelesTrak Sync Complete",
    message: "Successfully synchronized 8,412 orbital state vectors via SGP4 propagator.",
    time: "2 hours ago",
    read: true,
    link: "/data-ingestion"
  }
];

export function NotificationCenter() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "CRITICAL":
      case "ALERT":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "WARNING":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "INFO":
      default:
        return <Info className="w-5 h-5 text-zinc-400" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="relative p-2 rounded-md hover:bg-muted focus-visible:outline-none transition-colors cursor-pointer">
        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse border-2 border-card shadow-sm">
            {unreadCount}
          </span>
        )}
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="px-1.5 min-w-[20px] justify-center">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={markAllAsRead} title="Mark all read" className="h-8 w-8">
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearAll} title="Clear all" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">No new notifications</p>
              <p className="text-xs mt-1">You're all caught up with recent signals.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                    !notification.read && "bg-muted/30"
                  )}
                >
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm font-semibold", !notification.read && "text-foreground")}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium pt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
