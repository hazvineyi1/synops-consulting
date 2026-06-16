import { Link } from "wouter";
import {
  useGetRiseSessions,
  getGetRiseSessionsQueryKey,
} from "@workspace/api-client-react";
import { usePageMeta } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  elementary: "Elementary (Grades 3 to 5)",
  secondary: "Secondary (Grades 6 to 12)",
  higher: "Higher Education",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RiseHistory() {
  usePageMeta("Rise - Assessment History", "Past adaptive assessment runs.");
  const { data, isLoading } = useGetRiseSessions({
    query: { queryKey: getGetRiseSessionsQueryKey() },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Assessment history</h1>
          <p className="text-sm text-muted-foreground">
            Every completed adaptive run, with mastery and the skills it sampled.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New assessment <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            No assessments yet. Start one to build a learner profile.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((s) => {
            const accuracy =
              s.itemsAttempted > 0
                ? Math.round((s.correctCount / s.itemsAttempted) * 100)
                : 0;
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {LEVEL_LABELS[s.level] ?? s.level}
                      </Badge>
                      <CardTitle className="text-lg">{formatDate(s.createdAt)}</CardTitle>
                    </div>
                    {s.finalRung && (
                      <Badge variant="outline" className="capitalize">
                        {s.finalRung}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Mastery</div>
                      <div className="font-mono text-xl font-semibold text-primary">
                        {s.masteryEstimate}%
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                      <div className="font-mono text-xl font-semibold">{accuracy}%</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Questions</div>
                      <div className="font-mono text-xl font-semibold">
                        {s.correctCount}
                        <span className="text-sm text-muted-foreground">
                          /{s.itemsAttempted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {s.path.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        Difficulty path
                      </div>
                      <ul className="flex flex-wrap gap-1.5" aria-label="Difficulty path">
                        {s.path.map((p, i) => (
                          <li
                            key={`${s.id}-${i}`}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs"
                          >
                            d{p.difficulty}
                            {p.correct ? (
                              <CheckCircle2
                                className="h-3.5 w-3.5 text-green-600"
                                aria-hidden="true"
                              />
                            ) : (
                              <XCircle
                                className="h-3.5 w-3.5 text-red-600"
                                aria-hidden="true"
                              />
                            )}
                            <span className="sr-only">
                              {p.correct ? "correct" : "incorrect"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
