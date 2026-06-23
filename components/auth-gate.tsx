"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebaseConfigured } from "@/firebase/config";
import { initializeAuth, logout } from "@/services/auth-service";
import { StudyStateSync } from "@/components/study-state-sync";

type AuthContextValue = {
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthGate.");
  return context;
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    initializeAuth().then((auth) => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
    }).catch(() => {
      if (active) setUser(null);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    const pathname = window.location.pathname;
    const onLoginPage = pathname === "/login";
    const onLogoutPage = pathname === "/logout";
    if (user === null && !onLoginPage) window.location.replace("/login");
    if (user && onLoginPage && !onLogoutPage) window.location.replace("/");
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({ user: user ?? null, signOut: logout }), [user]);
  if (!firebaseConfigured) return <main className="grid min-h-screen place-items-center bg-ink p-4"><section className="card max-w-md text-sm text-rose-300">Firebase is not configured. Add the public Firebase variables to .env.local.</section></main>;
  if (user === undefined) return <LoadingAuth />;

  const pathname = window.location.pathname;
  const onLoginPage = pathname === "/login";
  const onLogoutPage = pathname === "/logout";
  if ((user === null && !onLoginPage) || (user && onLoginPage && !onLogoutPage)) return <LoadingAuth />;

  return <AuthContext.Provider value={value}>{user ? <StudyStateSync userId={user.uid}>{children}</StudyStateSync> : children}</AuthContext.Provider>;
}

function LoadingAuth() {
  return <main className="grid min-h-screen place-items-center p-4"><div className="card w-full max-w-sm animate-pulse"><div className="h-6 w-32 rounded bg-white/10" /><div className="mt-4 h-20 rounded bg-white/5" /></div></main>;
}
