import { useGetDashboardSummary, useGetDashboardActivity, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/engine/PageHeader";
import { StageRail } from "@/components/engine/StageRail";
import { format } from "date-fns";

function isOverdue(p: { targetDeliveryDate?: string | null; status: string }): boolean {
  if (!p.targetDeliveryDate || p.status === "complete") return false;
  return new Date(p.targetDeliveryDate) < new Date();
}

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: isActivityLoading } = useGetDashboardActivity();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects();

  if (isSummaryLoading || isActivityLoading || isProjectsLoading) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse space-y-6 p-6 md:p-8">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-16 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  const allProjects = projects ?? [];
  const needsAttention = allProjects
    .filter((p) => p.status === "gate_blocked" || isOverdue(p))
    .slice(0, 5);
  const activeProjects = allProjects
    .filter((p) => p.status === "active")
    .sort((a, b) => b.stage - a.stage)
    .slice(0, 6);

  const stats = [
    { label: "Active projects", value: summary?.activeProjects ?? 0 },
    { label: "Gate blocked", value: summary?.gateBlockedCount ?? 0, tone: "destructive" as const },
    { label: "Overdue", value: summary?.overdueCount ?? 0, tone: "warn" as const },
    { label: "Clients", value: summary?.totalClients ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Where your curriculum projects stand and what needs you next."
      />

      {/* Compact stats strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div
              className={
                "mt-1 text-2xl font-bold " +
                (s.tone === "destructive" && s.value > 0
                  ? "text-destructive"
                  : s.tone === "warn" && s.value > 0
                    ? "text-accent"
                    : "text-foreground")
              }
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Needs attention */}
      <section className="space-y-3" aria-label="Needs attention">
        <h2 className="text-lg font-semibold tracking-tight">Needs attention</h2>
        {needsAttention.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              Every project is on track. Nothing is blocked or overdue.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {needsAttention.map((p) => {
                const overdue = isOverdue(p);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50"
                  >
                    {p.status === "gate_blocked" ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                    ) : (
                      <Clock className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.clientName}</div>
                    </div>
                    <Badge variant={p.status === "gate_blocked" ? "destructive" : "secondary"}>
                      {p.status === "gate_blocked" ? "Gate blocked" : "Overdue"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Active projects */}
        <section className="space-y-3 lg:col-span-2" aria-label="Active projects">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Active projects</h2>
            <Link href="/projects" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active projects yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((p) => (
                <Card key={p.id} className="transition-colors hover:bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">{p.clientName}</div>
                      </div>
                      {p.targetDeliveryDate && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Due {format(new Date(p.targetDeliveryDate), "MMM d")}
                        </span>
                      )}
                    </div>
                    <StageRail
                      projectId={p.id}
                      currentStage={p.stage}
                      variant="compact"
                      className="mt-3"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="space-y-3" aria-label="Recent activity">
          <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-4">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{item.action}</span> {item.entityType.toLowerCase()}{" "}
                        <span className="font-medium">{item.entityTitle}</span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href={`/projects/${item.projectId}`} className="hover:underline">
                          {item.projectTitle}
                        </Link>
                        <span aria-hidden="true">&middot;</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
