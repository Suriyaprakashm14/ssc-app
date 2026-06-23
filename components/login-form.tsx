"use client";

import { Chrome, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { loginWithEmail, loginWithGoogle, registerWithEmail, requestPasswordReset } from "@/services/auth-service";

type Mode = "sign-in" | "register" | "reset";

const messageFor = (error: unknown) => {
  if (!(error instanceof Error)) return "Authentication failed. Please try again.";
  if (error.message.includes("auth/email-already-in-use")) return "An account already exists for this email.";
  if (error.message.includes("auth/invalid-credential")) return "Incorrect email or password.";
  if (error.message.includes("auth/weak-password")) return "Use a password with at least six characters.";
  return error.message;
};

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    await submit(async () => {
      await requestPasswordReset(email);
      setNotice("If an account exists for this email, a password-reset link has been sent.");
    });
  };

  const title = mode === "register" ? "Create your account" : mode === "reset" ? "Reset your password" : "Start your mission";
  const actionLabel = mode === "register" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in";

  return <main className="grid min-h-screen place-items-center bg-ink p-4"><section className="card w-full max-w-sm"><p className="text-xs font-bold tracking-[.22em] text-emerald-300">SSC WAR ROOM</p><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">Your account stays signed in on this device until you sign out.</p>{mode !== "reset" && <button className="btn-quiet mt-5 w-full" disabled={loading} onClick={() => void submit(loginWithGoogle)}><Chrome size={17} />Continue with Google</button>}{mode !== "reset" && <div className="my-5 border-t border-white/10" />}<form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (mode === "reset") void reset(); else void submit(() => mode === "register" ? registerWithEmail(email, password, name) : loginWithEmail(email, password)); }}>{mode === "register" && <label className="block"><span className="label">Name <span className="normal-case tracking-normal">(optional)</span></span><input className="input" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} /></label>}<label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{mode !== "reset" && <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}{error && <p className="text-xs leading-5 text-rose-300">{error}</p>}{notice && <p className="text-xs leading-5 text-emerald-300">{notice}</p>}<button className="btn-primary w-full" disabled={loading} type="submit">{mode === "register" ? <UserPlus size={17} /> : mode === "reset" ? <KeyRound size={17} /> : <LogIn size={17} />}{loading ? "Please wait…" : actionLabel}</button></form><div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-emerald-300">{mode !== "sign-in" && <button onClick={() => setMode("sign-in")}>Sign in</button>}{mode !== "register" && <button onClick={() => setMode("register")}>Create account</button>}{mode !== "reset" && <button onClick={() => setMode("reset")}>Forgot password?</button>}</div></section></main>;
}
