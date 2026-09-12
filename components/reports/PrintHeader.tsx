import React from 'react';
import { Orbit } from 'lucide-react';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
}

export function PrintHeader({ title, subtitle }: PrintHeaderProps) {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-foreground pb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Orbit className="h-8 w-8 text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground uppercase tracking-wider">Auralis</h1>
            <p className="text-xs text-muted-foreground font-medium">ORBITAL MISSION CONTROL — FLIGHT DYNAMICS</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">FLIGHT CRITICAL</p>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
