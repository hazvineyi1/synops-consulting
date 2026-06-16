import { type ReactNode } from "react";
import { ProductLayout } from "@/components/portal/ProductLayout";
import { usePageMeta } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/products";

/**
 * Generic, branded "in development" workspace for roadmap products (and a
 * temporary state for build-now products before their engine ships).
 */
export function ProductPlaceholder({
  product,
  children,
}: {
  product: Product;
  children?: ReactNode;
}) {
  usePageMeta(`${product.name} - ${product.title}`, product.blurb);

  return (
    <ProductLayout product={product}>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:py-16">
        <div className="space-y-2">
          <p
            className="text-sm font-medium uppercase tracking-widest"
            style={{ color: product.accent }}
          >
            {product.vertical}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-lg text-muted-foreground">{product.title}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>In development</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{product.blurb}</p>
            <p>
              This workspace is scaffolded and on the roadmap. The interface here
              fills in as the engine ships.
            </p>
          </CardContent>
        </Card>

        {product.planned && product.planned.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Planned capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {product.planned.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: product.accent }}>
                      -
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {product.noPhi && (
          <Card>
            <CardHeader>
              <CardTitle>Data handling</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Tend is built as an intake and coordination workflow only. It uses
                synthetic data and accepts no protected health information until a
                HIPAA-ready environment is in place. Do not enter real patient data.
              </p>
            </CardContent>
          </Card>
        )}

        {children}
      </div>
    </ProductLayout>
  );
}
