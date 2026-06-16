import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { EngineApp } from "@/components/layout/EngineApp";
import PortalDashboard from "@/pages/portal/PortalDashboard";

/**
 * Client-side gate for the curriculum portal. Mounted under a `nest`ed
 * /portal route, so locations and redirects here are relative to /portal.
 * The server independently enforces auth on every gated API route — this is
 * a UX gate, not the security boundary.
 */
export function ProtectedPortal() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="~/portal/login" />;
  }

  return (
    <Switch>
      <Route path="/dashboard" component={PortalDashboard} />
      <Route path="/engine" nest>
        <EngineApp />
      </Route>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route>
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
  );
}
