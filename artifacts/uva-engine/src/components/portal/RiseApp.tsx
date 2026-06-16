import { type ReactNode } from "react";
import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { ProductLayout } from "@/components/portal/ProductLayout";
import { PRODUCT_MAP } from "@/lib/products";
import RiseWorkspace from "@/pages/rise/RiseWorkspace";
import RiseHistory from "@/pages/rise/RiseHistory";

function RiseNavLink({
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

export function RiseApp() {
  const rise = PRODUCT_MAP.rise;
  const [location] = useLocation();
  return (
    <ProductLayout
      product={rise}
      nav={
        <nav className="flex items-center gap-1" aria-label="Rise sections">
          <RiseNavLink href="/" active={location === "/"}>
            Assessment
          </RiseNavLink>
          <RiseNavLink href="/history" active={location === "/history"}>
            History
          </RiseNavLink>
        </nav>
      }
    >
      <Switch>
        <Route path="/history" component={RiseHistory} />
        <Route path="/" component={RiseWorkspace} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </ProductLayout>
  );
}
