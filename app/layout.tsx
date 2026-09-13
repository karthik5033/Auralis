import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";

import { WebSocketProvider } from "@/components/providers/WebSocketProvider";

export const metadata: Metadata = {
  title: "Auralis | Orbital Debris & Collision Risk Mission Control",
  description: "Mission control for orbital debris — track every object in orbit, see what's about to collide, and watch autonomous agents negotiate who moves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
