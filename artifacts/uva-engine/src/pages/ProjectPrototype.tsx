import { useParams, Link } from "wouter";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectPrototype() {
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
            <Badge variant="outline">Stage 2</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Prototype</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prototype Module Build</CardTitle>
              <CardDescription>Develop a representative module to establish design patterns before full production.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-lg bg-card flex flex-col items-center justify-center min-h-[200px] text-center">
                <Play className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Select Prototype Module</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">Choose one module from the intake stage to serve as the prototype for this course.</p>
                <Button>Select Module</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Prototype Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
                  <span className="text-sm">Design Patterns Approved</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
                  <span className="text-sm">Media Standards Met</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground shrink-0" />
                  <span className="text-sm">Client Sign-off Obtained</span>
                </div>
              </div>
              <Button className="w-full mt-4" disabled>Submit for Approval</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
