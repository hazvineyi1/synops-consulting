import { useState, type FormEvent } from "react";
import { Link, Redirect } from "wouter";
import { useAuth, authErrorMessage } from "@/lib/auth-context";
import { usePageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/portal/AuthShell";
import type { Product } from "@/lib/products";

export default function ProductLogin({ product }: { product: Product }) {
  usePageMeta(
    `Sign in to ${product.name}`,
    `Sign in to ${product.name}, the ${product.title} from Synops Advisory Group.`,
  );
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Drive the post-auth redirect from auth state, not an imperative navigate,
  // which would race the auth-context re-render and bounce back to login. Land
  // users on the product they belong to.
  if (user) {
    return <Redirect to={`~/${user.productKey}`} />;
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
      title={`Sign in to ${product.name}`}
      subtitle={product.title}
      eyebrow={`${product.name} \u00b7 ${product.vertical}`}
      panelLine={product.panelLine}
      panelNote={
        product.status === "roadmap"
          ? "This product is in development. Sign in to preview the workspace."
          : undefined
      }
      accent={product.accent}
      footer={
        product.hasRegister ? (
          <p>
            Need an account?{" "}
            <Link
              href={`/${product.key}/register`}
              className="font-medium hover:underline"
              style={{ color: product.accent }}
            >
              Create one
            </Link>
          </p>
        ) : (
          <p>Access to {product.name} is provisioned by your engagement team.</p>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
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
        <Button
          type="submit"
          className="w-full text-white hover:opacity-90"
          style={{ backgroundColor: product.accent }}
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Password reset is coming soon. Contact us if you are locked out.
        </p>
      </form>
    </AuthShell>
  );
}
