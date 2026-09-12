"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Role = "OPERATOR" | "FLIGHT_DYNAMICS_LEAD" | "MISSION_DIRECTOR" | "ADMIN";

export interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  badgeNumber?: string;
  department?: string;
  callsign?: string;
}

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  userId: string;
  user: MockUser | null;
  updateUser: (updated: Partial<MockUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("OPERATOR");
  const [userId, setUserId] = useState<string>("OP-4482");
  const [user, setUser] = useState<MockUser | null>({
    id: "OP-4482",
    firstName: "Elena",
    lastName: "Vance",
    email: "e.vance@auralis.space",
    role: "OPERATOR",
    badgeNumber: "AURALIS-FDC-04",
    department: "Conjunction Assessment & Autonomous Avoidance Desk",
    callsign: "Auralis Flight Dynamics"
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("auralis_operator_role") as Role;
      if (savedRole && ["OPERATOR", "FLIGHT_DYNAMICS_LEAD", "MISSION_DIRECTOR", "ADMIN"].includes(savedRole)) {
        setRoleState(savedRole);
      }
      const savedUser = localStorage.getItem("auralis_operator_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser((prev) => ({ ...prev, ...parsed, role: savedRole || prev?.role || "OPERATOR" }));
        } catch {
          // ignore error
        }
      } else if (savedRole && user) {
        setUser((prev) => prev ? { ...prev, role: savedRole } : null);
      }
    }
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("auralis_operator_role", newRole);
    }
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, role: newRole };
      if (typeof window !== "undefined") {
        localStorage.setItem("auralis_operator_user", JSON.stringify(next));
      }
      return next;
    });
  };

  const updateUser = (updated: Partial<MockUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      if (typeof window !== "undefined") {
        localStorage.setItem("auralis_operator_user", JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ role, setRole, userId, user, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
