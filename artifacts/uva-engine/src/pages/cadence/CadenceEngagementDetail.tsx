import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { usePageMeta } from "@/lib/seo";
import {
  useGetCadenceEngagement,
  getGetCadenceEngagementQueryKey,
  useUpdateCadenceDeliverable,
  useUpdateCadenceMilestone,
  type CadenceDeliverable,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MILESTONE_STATUSES = ["Pending", "In progress", "Complete"];
const DONE_STATUS = "Complete";

function cleanError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.replace(/^HTTP \d+[^:]*:\s*/, "");
  }
  return "Something went wrong.";
}

function GateBadge({ status }: { status: string }) {
  if (status === "passed") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">QA passed</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive">QA failed</Badge>;
  }
  return <Badge variant="outline">QA pending</Badge>;
}

export default function CadenceEngagementDetail({ id }: { id: number }) {
  const { data, isLoading } = useGetCadenceEngagement(id, {
    query: { queryKey: getGetCadenceEngagementQueryKey(id) },
  });
  usePageMeta(
    data ? `Cadence - ${data.engagement.title}` : "Cadence",
    "Engagement detail with milestones and QA-gated deliverables.",
  );

  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getGetCadenceEngagementQueryKey(id) });

  const delMut = useUpdateCadenceDeliverable({
    mutation: {
      onSuccess: invalidate,
      onError: (err) =>
        toast({
          title: "Update blocked",
          description: cleanError(err),
          variant: "destructive",
        }),
    },
  });
  const milMut = useUpdateCadenceMilestone({
    mutation: { onSuccess: invalidate },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-muted-foreground">Engagement not found.</p>
        <Link href="/engagements" className="mt-4 inline-block text-primary underline">
          Back to engagements
        </Link>
      </div>
    );
  }

  const { engagement, milestones, deliverables } = data;
  const pct =
    engagement.deliverableCount > 0
      ? Math.round(
          (engagement.completedDeliverableCount / engagement.deliverableCount) * 100,
        )
      : 0;
  const busy = delMut.isPending || milMut.isPending;

  const setGate = (d: CadenceDeliverable, qaGateStatus: "pending" | "passed" | "failed") =>
    delMut.mutate({ id: d.id, data: { qaGateStatus } });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="space-y-3">
        <Link
          href="/engagements"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All engagements
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <Badge variant="secondary" className="text-xs font-normal">
              {engagement.practiceArea}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">{engagement.title}</h1>
            {engagement.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {engagement.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="capitalize">
            {engagement.status}
          </Badge>
        </div>
        <div className="max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {engagement.completedDeliverableCount} of {engagement.deliverableCount}{" "}
              deliverables complete
            </span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} aria-label={`${pct} percent complete`} />
        </div>
      </div>

      <Separator />

      {/* Milestones */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Milestones</h2>
        <div className="grid gap-3">
          {milestones.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="font-medium">{m.title}</div>
                <Select
                  value={m.status}
                  onValueChange={(status) =>
                    milMut.mutate({ id: m.id, data: { status } })
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="w-44" aria-label={`Status for ${m.title}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MILESTONE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Deliverables</h2>
        <p className="text-sm text-muted-foreground">
          A deliverable cannot be marked complete until its QA gate has passed.
        </p>
        <div className="grid gap-3">
          {deliverables.map((d) => {
            const isDone = d.status === DONE_STATUS;
            const canComplete = d.qaGateStatus === "passed" && !isDone;
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-base">{d.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={isDone ? "default" : "outline"} className="capitalize">
                        {d.status}
                      </Badge>
                      <GateBadge status={d.qaGateStatus} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {d.qaNotes && (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">QA notes: </span>
                      {d.qaNotes}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      QA gate
                    </span>
                    <Button
                      size="sm"
                      variant={d.qaGateStatus === "passed" ? "default" : "outline"}
                      disabled={busy || d.qaGateStatus === "passed"}
                      onClick={() => setGate(d, "passed")}
                    >
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant={d.qaGateStatus === "failed" ? "destructive" : "outline"}
                      disabled={busy || d.qaGateStatus === "failed"}
                      onClick={() => setGate(d, "failed")}
                    >
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || d.qaGateStatus === "pending"}
                      onClick={() => setGate(d, "pending")}
                    >
                      Reset
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    {isDone ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          delMut.mutate({ id: d.id, data: { status: "In progress" } })
                        }
                      >
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy || !canComplete}
                        onClick={() =>
                          delMut.mutate({ id: d.id, data: { status: DONE_STATUS } })
                        }
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Mark complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
