import { Link } from "wouter";
import { usePageMeta } from "@/lib/seo";
import {
  useGetCadenceEngagements,
  getGetCadenceEngagementsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function CadenceEngagements() {
  usePageMeta("Cadence - Engagements", "Engagement command center.");
  const { data, isLoading } = useGetCadenceEngagements({
    query: { queryKey: getGetCadenceEngagementsQueryKey() },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Engagements</h1>
        <p className="text-sm text-muted-foreground">
          Track milestones, deliverables, and QA gates across every engagement.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : data?.length === 0 ? (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            No engagements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data?.map((e) => {
            const pct =
              e.deliverableCount > 0
                ? Math.round((e.completedDeliverableCount / e.deliverableCount) * 100)
                : 0;
            return (
              <Link key={e.id} href={`/engagements/${e.id}`} className="group block">
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {e.practiceArea}
                        </Badge>
                        <CardTitle className="text-lg transition-colors group-hover:text-primary">
                          {e.title}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {e.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {e.description && (
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {e.completedDeliverableCount} of {e.deliverableCount}{" "}
                          deliverables complete
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} aria-label={`${pct} percent complete`} />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">
                        {e.milestoneCount} milestones
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        Open
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
