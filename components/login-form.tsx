"use client";

import { KeyRound, LogIn, UserPlus } from "lucide-react";
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

function GoogleLogo({ size = 17 }: { size?: number }) {
  return <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.54 1 10.22 1 12s.43 3.46 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" fill="#EA4335" />
  </svg>;
}

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

  return <main className="grid min-h-screen place-items-center bg-ink p-4">
    <section className="card w-full max-w-sm">
      <p className="text-xs font-bold tracking-[.22em] text-emerald-300">SSC WAR ROOM</p>
      <h1 className="mt-2 text-2xl font-black">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Your account stays signed in on this device until you sign out.</p>

      {mode !== "reset" && <button className="btn-quiet mt-5 w-full" disabled={loading} onClick={() => void submit(loginWithGoogle)}>
        <GoogleLogo size={17} />
        Continue with Google
      </button>}

      {mode !== "reset" && <div className="my-5 border-t border-white/10" />}

      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (mode === "reset") void reset();
        else void submit(() => mode === "register" ? registerWithEmail(email, password, name) : loginWithEmail(email, password));
      }}>
        {mode === "register" && <label className="block">
          <span className="label">Name <span className="normal-case tracking-normal">(optional)</span></span>
          <input className="input" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>}

        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        {mode !== "reset" && <label className="block">
          <span className="label">Password</span>
          <input className="input" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>}

        {error && <p className="text-xs leading-5 text-rose-300">{error}</p>}
        {notice && <p className="text-xs leading-5 text-emerald-300">{notice}</p>}

        <button className="btn-primary w-full" disabled={loading} type="submit">
          {mode === "register" ? <UserPlus size={17} /> : mode === "reset" ? <KeyRound size={17} /> : <LogIn size={17} />}
          {loading ? "Please wait..." : actionLabel}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-emerald-300">
        {mode !== "sign-in" && <button onClick={() => setMode("sign-in")}>Sign in</button>}
        {mode !== "register" && <button onClick={() => setMode("register")}>Create account</button>}
        {mode !== "reset" && <button onClick={() => setMode("reset")}>Forgot password?</button>}
      </div>
    </section>
  </main>;
}
