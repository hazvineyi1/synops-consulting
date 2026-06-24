import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  ExternalLink,
  Check,
  Minus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPlans,
  useGetBillingSubscription,
  getGetBillingSubscriptionQueryKey,
  useCreateBillingCheckout,
  useCreateBillingPortal,
  useReconcileBilling,
  type PlanCatalogEntry,
  type PlanFeatures,
  type BillingCheckoutInputTier,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { canManageSchool } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Interval = "month" | "year";

const FEATURE_ROWS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "whiteLabel", label: "White-label branding" },
  { key: "multiAccreditorExport", label: "Multi-accreditor export" },
  { key: "customDomain", label: "Custom domain" },
];

function priceLabel(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

function limitLabel(limit: number | null): string {
  if (limit === null) return "Unlimited active courses";
  return `Up to ${limit} active ${limit === 1 ? "course" : "courses"}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "Expired";
    case "unpaid":
      return "Unpaid";
    case "none":
      return "No subscription";
    default:
      return status;
  }
}

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<Interval>("month");

  const { data: sub, isLoading: subLoading } = useGetBillingSubscription({
    query: { queryKey: getGetBillingSubscriptionQueryKey() },
  });
  const { data: plans } = useListPlans();

  const checkout = useCreateBillingCheckout();
  const portal = useCreateBillingPortal();
  const reconcile = useReconcileBilling();

  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("checkout");
    if (!outcome) return;
    reconciledRef.current = true;

    if (outcome === "success") {
      const sessionId = params.get("session_id") ?? undefined;
      reconcile.mutate(
        { data: { sessionId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getGetBillingSubscriptionQueryKey(),
            });
            toast({
              title: "Subscription updated",
              description: "Your plan is now active.",
            });
          },
          onError: () =>
            toast({
              title: "We could not confirm checkout yet",
              description:
                "If your payment went through, it will sync within a few minutes.",
              variant: "destructive",
            }),
        },
      );
    } else if (outcome === "cancel") {
      toast({ title: "Checkout canceled" });
    }

    const cleaned = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canManageSchool(user?.role)) {
    return null;
  }

  const startCheckout = (tier: BillingCheckoutInputTier) => {
    checkout.mutate(
      { data: { tier, interval: billingInterval } },
      {
        onSuccess: (redirect) => {
          window.location.href = redirect.url;
        },
        onError: () =>
          toast({
            title: "Could not start checkout",
            description: "Please try again.",
            variant: "destructive",
          }),
      },
    );
  };

  const openPortal = () => {
    portal.mutate(undefined, {
      onSuccess: (redirect) => {
        window.location.href = redirect.url;
      },
      onError: () =>
        toast({
          title: "Could not open the billing portal",
          description: "Please try again.",
          variant: "destructive",
        }),
    });
  };

  const paid = (plans ?? [])
    .filter((p) => p.tier !== "trial")
    .sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents);
  const currentPrice =
    (plans ?? []).find((p) => p.tier === sub?.tier)?.monthlyPriceCents ?? 0;

  const trialEnds = fmtDate(sub?.trialEndsAt);
  const renews = fmtDate(sub?.currentPeriodEnd);
  const limit = sub?.activeCourseLimit ?? null;
  const used = sub?.activeCourseCount ?? 0;
  const usagePct =
    limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Plan and billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization's subscription. Pricing meters on the number
          of simultaneously active courses.
        </p>
      </header>

      {subLoading || !sub ? (
        <div
          className="h-40 animate-pulse rounded-lg border border-border bg-muted/40"
          aria-hidden="true"
        />
      ) : (
        <>
          {sub.trialExpired && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-destructive">Your free trial has ended</p>
                <p className="text-muted-foreground">
                  Choose a plan below to keep adding and activating courses.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {sub.planLabel}
                    <Badge variant={sub.subscriptionStatus === "active" ? "default" : "secondary"}>
                      {statusLabel(sub.subscriptionStatus)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {sub.tier === "trial" && trialEnds
                      ? `Free trial ends ${trialEnds}.`
                      : renews
                        ? `Renews ${renews}.`
                        : "Manage your plan and payment details below."}
                  </CardDescription>
                </div>
                {sub.hasStripeCustomer && (
                  <Button
                    variant="outline"
                    onClick={openPortal}
                    disabled={portal.isPending}
                  >
                    {portal.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Manage billing
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active courses</span>
                  <span className="font-medium">
                    {used}
                    {limit === null ? " used (unlimited)" : ` of ${limit}`}
                  </span>
                </div>
                {limit !== null && (
                  <Progress
                    value={usagePct}
                    aria-label={`${used} of ${limit} active courses used`}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="choose-plan" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="choose-plan" className="text-lg font-semibold tracking-tight">
                Choose a plan
              </h2>
              <div
                className="inline-flex rounded-md border border-border p-0.5"
                role="group"
                aria-label="Billing interval"
              >
                <button
                  type="button"
                  onClick={() => setBillingInterval("month")}
                  aria-pressed={billingInterval === "month"}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    billingInterval === "month"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("year")}
                  aria-pressed={billingInterval === "year"}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    billingInterval === "year"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {paid.map((plan) => {
                const isCurrent = sub.tier === plan.tier;
                const isUpgrade = plan.monthlyPriceCents > currentPrice;
                return (
                  <PlanCard
                    key={plan.tier}
                    plan={plan}
                    isCurrent={isCurrent}
                    actionLabel={
                      isCurrent
                        ? "Current plan"
                        : `${isUpgrade ? "Upgrade to" : "Switch to"} ${plan.label}`
                    }
                    pending={checkout.isPending}
                    onSelect={() => startCheckout(plan.tier as BillingCheckoutInputTier)}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Yearly billing is charged once per year. Plan changes,
              cancellations, and payment methods are managed in the billing
              portal. Lowering your plan below your active course count is blocked
              until you archive courses.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  actionLabel,
  pending,
  onSelect,
}: {
  plan: PlanCatalogEntry;
  isCurrent: boolean;
  actionLabel: string;
  pending: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className={cn("flex flex-col", isCurrent && "border-primary ring-1 ring-primary/20")}>
      <CardHeader className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{plan.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">
            {priceLabel(plan.monthlyPriceCents)}
          </span>
          <span className="text-sm text-muted-foreground">per month</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent || pending}
          onClick={onSelect}
        >
          {pending && !isCurrent && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {actionLabel}
        </Button>
        <div className="space-y-3">
          <p className="text-sm font-medium">{limitLabel(plan.activeCourseLimit)}</p>
          <ul className="space-y-2 border-t border-border pt-3">
            {FEATURE_ROWS.map((row) => {
              const included = plan.features[row.key];
              return (
                <li key={row.key} className="flex items-center gap-2 text-sm">
                  {included ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <Minus
                      className="h-4 w-4 shrink-0 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn(included ? "text-foreground" : "text-muted-foreground/60")}>
                    {row.label}
                  </span>
                  <span className="sr-only">{included ? "included" : "not included"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
