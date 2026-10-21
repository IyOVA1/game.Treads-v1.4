import { useState } from "react";
import { useAccountStore } from "../../store/accountStore";
import { useTankStore } from "../../store/tankStore";
import "./AuthScreen.css";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, setError, login, register, continueAsGuest, loading } =
    useAccountStore();
  const hydrate = useTankStore((s) => s.hydrateFromAccount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok =
      mode === "login" ? await login(email, password) : await register(email, password);
    if (ok) await hydrate();
  };

  const guest = async () => {
    continueAsGuest();
    await hydrate();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Treads</h1>
        <p className="tagline">Modular tank combat</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@email.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "register" ? "min 6 characters" : ""}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-primary" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button type="button" className="auth-guest" onClick={guest}>
          Continue as Guest
        </button>
        <p className="auth-hint">
          Guest progress stays on this device only. Accounts sync via Supabase.
        </p>
      </div>
    </div>
  );
}
