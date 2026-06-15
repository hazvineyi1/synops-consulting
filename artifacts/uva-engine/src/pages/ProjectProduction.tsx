import { useParams, Link } from "wouter";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ProjectProduction() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Stage 3</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Production</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Status</CardTitle>
          <CardDescription>Track build progress across all modules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">0%</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
            
            <div className="rounded-md border divide-y">
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Settings2 className="h-10 w-10 mb-4" />
                <p>Modules will appear here once intake is complete.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
