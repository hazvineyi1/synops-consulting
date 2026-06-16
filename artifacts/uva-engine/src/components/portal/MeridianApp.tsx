import { type ReactNode } from "react";
import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { ProductLayout } from "@/components/portal/ProductLayout";
import { PRODUCT_MAP } from "@/lib/products";
import MeridianProviders from "@/pages/meridian/Providers";
import MeridianNetworkAdequacy from "@/pages/meridian/NetworkAdequacy";
import MeridianDisputes from "@/pages/meridian/Disputes";

function MeridianNavLink({
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

export function MeridianApp() {
  const meridian = PRODUCT_MAP.meridian;
  const [location] = useLocation();
  return (
    <ProductLayout
      product={meridian}
      nav={
        <nav className="flex items-center gap-1" aria-label="Meridian sections">
          <MeridianNavLink href="/" active={location === "/" || location === "/providers"}>
            Providers
          </MeridianNavLink>
          <MeridianNavLink href="/network-adequacy" active={location === "/network-adequacy"}>
            Network Adequacy
          </MeridianNavLink>
          <MeridianNavLink href="/disputes" active={location === "/disputes"}>
            Disputes
          </MeridianNavLink>
        </nav>
      }
    >
      <Switch>
        <Route path="/network-adequacy" component={MeridianNetworkAdequacy} />
        <Route path="/disputes" component={MeridianDisputes} />
        <Route path="/providers" component={MeridianProviders} />
        <Route path="/" component={MeridianProviders} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </ProductLayout>
  );
}
