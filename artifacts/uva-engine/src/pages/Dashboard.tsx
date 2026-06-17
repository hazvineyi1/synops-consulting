import { useGetDashboardSummary, useGetDashboardActivity, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, Clock, ArrowRight, CheckCircle2,
  FolderKanban, ShieldAlert, Users, type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/engine/PageHeader";
import { StageRail } from "@/components/engine/StageRail";
import { format } from "date-fns";

function isOverdue(p: { targetDeliveryDate?: string | null; status: string }): boolean {
  if (!p.targetDeliveryDate || p.status === "complete") return false;
  return new Date(p.targetDeliveryDate) < new Date();
}

type StatTone = "default" | "destructive" | "warn";

function statValueColor(tone: StatTone, value: number): string {
  if (value > 0 && tone === "destructive") return "text-destructive";
  if (value > 0 && tone === "warn") return "text-accent";
  return "text-foreground";
}

function statIconColor(tone: StatTone, value: number): string {
  if (value > 0 && tone === "destructive") return "text-destructive";
  if (value > 0 && tone === "warn") return "text-accent";
  return "text-muted-foreground";
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
  const needsAttentionIds = new Set(needsAttention.map((p) => p.id));
  // Exclude anything already triaged above so no project appears twice.
  const activeProjects = allProjects
    .filter((p) => p.status === "active" && !needsAttentionIds.has(p.id))
    .sort((a, b) => b.stage - a.stage)
    .slice(0, 6);

  const stats: { label: string; value: number; tone: StatTone; icon: LucideIcon }[] = [
    { label: "Active projects", value: summary?.activeProjects ?? 0, tone: "default", icon: FolderKanban },
    { label: "Gate blocked", value: summary?.gateBlockedCount ?? 0, tone: "destructive", icon: ShieldAlert },
    { label: "Overdue", value: summary?.overdueCount ?? 0, tone: "warn", icon: Clock },
    { label: "Clients", value: summary?.totalClients ?? 0, tone: "default", icon: Users },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 md:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Where your curriculum projects stand and what needs you next."
      />

      {/* 1. Overview: at-a-glance counts */}
      <section aria-label="Overview">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <Icon className={"h-4 w-4 shrink-0 " + statIconColor(s.tone, s.value)} aria-hidden="true" />
                </div>
                <div className={"mt-2 text-3xl font-bold tabular-nums " + statValueColor(s.tone, s.value)}>
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Needs attention: what to triage first */}
      <section className="space-y-4" aria-label="Needs attention">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Needs attention</h2>
          {needsAttention.length > 0 && (
            <span className="text-sm text-muted-foreground">{needsAttention.length} to review</span>
          )}
        </div>
        {needsAttention.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              Every project is on track. Nothing is blocked or overdue.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {needsAttention.map((p) => {
                const blocked = p.status === "gate_blocked";
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                  >
                    {blocked ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                    ) : (
                      <Clock className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.clientName}</div>
                    </div>
                    <Badge variant={blocked ? "destructive" : "secondary"} className="shrink-0">
                      {blocked ? "Gate blocked" : "Overdue"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* 3. Ongoing work and history */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Active projects */}
        <section className="space-y-4 lg:col-span-2" aria-label="Active projects">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Active projects</h2>
            <Link href="/projects" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No other active projects right now.
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
        <section className="space-y-4" aria-label="Recent activity">
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
