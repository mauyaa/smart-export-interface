import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { loginExpert, setSession } from "../lib/experts";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Expert Login — SmartExports" },
      { name: "description", content: "Expert portal login for SmartExports advisors." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginExpert(email.trim(), password);
      setSession(data.expert);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl text-foreground">SmartExports</Link>
          <p className="text-sm text-muted-foreground mt-1">Expert Portal</p>
        </div>

        <div className="bg-card border border-rule rounded-lg p-8 shadow-sm">
          <h1 className="font-display text-2xl text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">Access your assigned escalations.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </Field>

            {error && (
              <div className="text-sm text-[color:var(--risky)] bg-[color:var(--risky-soft)] border border-[color:var(--risky)]/30 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            New expert?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border: 1px solid var(--rule);
          border-radius: 0.375rem;
          background: var(--background);
          color: var(--foreground);
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
