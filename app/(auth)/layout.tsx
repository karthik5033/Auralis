"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="print:hidden h-full flex z-30 relative pointer-events-auto shrink-0">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        <div className="print:hidden relative z-20">
          <TopHeader />
        </div>
        <main ref={mainRef} className="flex-1 flex flex-col relative overflow-y-auto bg-slate-50/50 dark:bg-background/95">
          {children}
        </main>
      </div>
    </div>
  );
}
