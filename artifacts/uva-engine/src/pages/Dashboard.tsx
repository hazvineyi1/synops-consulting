import { useGetDashboardSummary, useGetDashboardActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Activity as ActivityIcon, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: isActivityLoading } = useGetDashboardActivity();

  if (isSummaryLoading || isActivityLoading) {
    return <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground mt-2">Pipeline status and required actions across all projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activeProjects || 0}</div>
            <p className="text-xs text-muted-foreground">Out of {summary?.totalProjects || 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gate Blocked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.gateBlockedCount || 0}</div>
            <p className="text-xs text-muted-foreground">Projects require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{summary?.overdueCount || 0}</div>
            <p className="text-xs text-muted-foreground">Past target delivery date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalClients || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Pipeline Stages</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {summary?.projectsByStage?.map((stage) => (
              <Card key={stage.stage} className="bg-secondary/20">
                <CardHeader className="pb-2">
                  <CardDescription>Stage {stage.stage}</CardDescription>
                  <CardTitle className="text-lg">{stage.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stage.count}</div>
                  <Link href={`/projects?stage=${stage.stage}`} className="text-sm text-primary hover:underline inline-flex items-center mt-2">
                    View projects <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {activity?.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-4">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{item.action}</span> {item.entityType.toLowerCase()} <span className="font-medium">{item.entityTitle}</span>
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <Link href={`/projects/${item.projectId}`} className="hover:underline">
                          {item.projectTitle}
                        </Link>
                        <span>&middot;</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
