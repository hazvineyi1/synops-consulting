import { type ReactNode } from "react";
import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { EngineApp } from "@/components/layout/EngineApp";
import { CadenceApp } from "@/components/portal/CadenceApp";
import { RiseApp } from "@/components/portal/RiseApp";
import { MeridianApp } from "@/components/portal/MeridianApp";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import HubAdmin from "@/pages/portal/HubAdmin";
import { ProductLayout } from "@/components/portal/ProductLayout";
import { ProductPlaceholder } from "@/components/portal/ProductPlaceholder";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_MAP, type Product } from "@/lib/products";

function HubNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function HubApp() {
  const { user } = useAuth();
  const [location] = useLocation();
  const hub = PRODUCT_MAP.hub;
  const isAdmin = user?.role === "admin";

  return (
    <ProductLayout
      product={hub}
      nav={
        <nav className="flex items-center gap-1" aria-label="Hub sections">
          <HubNavLink href="/dashboard" active={location === "/dashboard" || location === "/"}>
            Dashboard
          </HubNavLink>
          {isAdmin && (
            <HubNavLink href="/admin" active={location === "/admin"}>
              Admin
            </HubNavLink>
          )}
        </nav>
      }
    >
      <Switch>
        <Route path="/dashboard" component={PortalDashboard} />
        <Route path="/admin">
          {isAdmin ? <HubAdmin /> : <Redirect to="/dashboard" />}
        </Route>
        <Route path="/" component={PortalDashboard} />
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </ProductLayout>
  );
}

/**
 * Maps a product to its authenticated workspace. Routes here are relative to
 * the `/{key}` nest. Build-now products that do not yet have their engine wired
 * fall through to the branded placeholder.
 */
export function ProductApp({ product }: { product: Product }) {
  switch (product.key) {
    case "compass":
      return <EngineApp />;

    case "hub":
      return <HubApp />;

    case "cadence":
      return <CadenceApp />;

    case "rise":
      return <RiseApp />;

    case "meridian":
      return <MeridianApp />;

    default:
      return <ProductPlaceholder product={product} />;
  }
}
