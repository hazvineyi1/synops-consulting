import { Switch, Route, Redirect } from "wouter";
import { ProductLayout } from "@/components/portal/ProductLayout";
import { PRODUCT_MAP } from "@/lib/products";
import CadenceEngagements from "@/pages/cadence/CadenceEngagements";
import CadenceEngagementDetail from "@/pages/cadence/CadenceEngagementDetail";

export function CadenceApp() {
  const cadence = PRODUCT_MAP.cadence;
  return (
    <ProductLayout product={cadence}>
      <Switch>
        <Route path="/engagements/:id">
          {(params) => <CadenceEngagementDetail id={Number(params.id)} />}
        </Route>
        <Route path="/engagements" component={CadenceEngagements} />
        <Route path="/" component={CadenceEngagements} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </ProductLayout>
  );
}
