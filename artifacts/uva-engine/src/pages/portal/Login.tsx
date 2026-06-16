import { useState, type FormEvent } from "react";
import { Link, Redirect } from "wouter";
import { useAuth, authErrorMessage } from "@/lib/auth-context";
import { usePageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/portal/AuthShell";

export default function Login() {
  usePageMeta("Client portal sign in", "Sign in to the Synops Advisory Group client portal.");
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Drive the post-auth redirect from auth state, not an imperative navigate
  // inside the submit handler. Navigating imperatively races the auth-context
  // re-render, which can mount the gated portal before `user` propagates and
  // bounce the visitor straight back to the login page.
  if (user) {
    return <Redirect to="~/portal/dashboard" />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your client portal."
      footer={
        <p>
          Need an account?{" "}
          <Link href="/portal/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Password reset is coming soon. Contact us if you are locked out.
        </p>
      </form>
    </AuthShell>
  );
}
