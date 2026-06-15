import { useParams, Link } from "wouter";
import { useGetProject, useGetProjectGateStatus, useUpdateProject, useAdvanceProjectStage, getGetProjectQueryKey, getGetProjectGateStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, AlertTriangle, CheckCircle2, ChevronRight, BookOpen, PenTool, LayoutTemplate, Layers, CheckSquare, FileOutput } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 0, title: "Intake", icon: BookOpen, href: "intake" },
  { id: 1, title: "Design", icon: PenTool, href: "design" },
  { id: 2, title: "Prototype", icon: LayoutTemplate, href: "prototype" },
  { id: 3, title: "Production", icon: Layers, href: "production" },
  { id: 4, title: "QA", icon: CheckSquare, href: "qa" },
  { id: 5, title: "Handoff", icon: FileOutput, href: "handoff" }
];

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: gateStatus, isLoading: isGateLoading } = useGetProjectGateStatus(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectGateStatusQueryKey(projectId) }
  });

  const advanceStage = useAdvanceProjectStage();

  const handleAdvance = () => {
    advanceStage.mutate({ id: projectId, data: { notes: "Advanced from UI" } }, {
      onSuccess: () => {
        toast({ title: "Project advanced to next stage" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
      },
      onError: () => {
        toast({ title: "Failed to advance project", variant: "destructive" });
      }
    });
  };

  if (isProjectLoading || isGateLoading) return <div className="p-8">Loading...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/projects" className="hover:underline">Projects</Link>
            <span>/</span>
            <span>{project.title}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <Link href={`/clients/${project.clientId}`} className="flex items-center gap-1 hover:underline text-primary">
              <Building2 className="h-4 w-4" />
              {project.clientName}
            </Link>
            {project.targetDeliveryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due {format(new Date(project.targetDeliveryDate), 'MMM d, yyyy')}
              </span>
            )}
            <Badge variant={project.status === 'gate_blocked' ? 'destructive' : project.status === 'complete' ? 'default' : 'secondary'} className="uppercase">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Pipeline Visual */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
          {STAGES.map((stage) => {
            const isCurrent = project.stage === stage.id;
            const isPast = project.stage > stage.id;
            const isFuture = project.stage < stage.id;
            
            return (
              <div 
                key={stage.id} 
                className={cn(
                  "flex-1 p-4 flex flex-col relative",
                  isCurrent ? "bg-primary/5" : isPast ? "bg-muted/30" : "opacity-50"
                )}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold",
                      isCurrent ? "bg-primary text-primary-foreground" : 
                      isPast ? "bg-muted-foreground text-background" : "bg-muted text-muted-foreground"
                    )}>
                      {stage.id}
                    </div>
                    <span className={cn(
                      "font-semibold text-sm",
                      isCurrent ? "text-primary" : "text-foreground"
                    )}>
                      {stage.title}
                    </span>
                  </div>
                  <stage.icon className={cn("h-5 w-5", isCurrent ? "text-primary" : "text-muted-foreground")} />
                </div>
                
                {(isCurrent || isPast) ? (
                  <Button variant={isCurrent ? "default" : "outline"} className="w-full mt-auto" size="sm" asChild>
                    <Link href={`/projects/${project.id}/${stage.href}`}>
                      {isCurrent ? "Work in Stage" : "Review"}
                    </Link>
                  </Button>
                ) : (
                  <div className="text-xs text-center text-muted-foreground mt-auto py-2">Locked</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Stage: {STAGES[project.stage]?.title}</CardTitle>
              <CardDescription>Gate Requirements for Stage {project.stage + 1}</CardDescription>
            </CardHeader>
            <CardContent>
              {gateStatus ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {gateStatus.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-md border bg-card">
                        {req.met ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        ) : req.blocking ? (
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{req.label}</p>
                          {req.detail && <p className="text-xs text-muted-foreground mt-1">{req.detail}</p>}
                        </div>
                        {!req.met && req.blocking && (
                          <Badge variant="destructive" className="ml-auto shrink-0">Blocking</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t flex justify-end">
                    <Button 
                      onClick={handleAdvance} 
                      disabled={!gateStatus.canAdvance || advanceStage.isPending}
                      variant={gateStatus.canAdvance ? "default" : "secondary"}
                    >
                      Advance to Stage {project.stage + 1}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No gate requirements loaded.</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase">Tier</span>
                  <span className="font-medium">{project.tier || "Unspecified"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase">Modality</span>
                  <span className="font-medium capitalize">{project.modality?.replace('_', ' ') || "Unspecified"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase">LMS</span>
                  <span className="font-medium capitalize">{project.lms?.replace(/_/g, ' ') || "Not specified"}</span>
                </div>
              </div>
              {project.description && (
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase">Description</span>
                  <span className="whitespace-pre-wrap">{project.description}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STAGES.map(stage => (
                <Button key={stage.id} variant="outline" className="w-full justify-start" asChild disabled={project.stage < stage.id}>
                  <Link href={`/projects/${project.id}/${stage.href}`}>
                    <stage.icon className="mr-2 h-4 w-4" />
                    {stage.title} Workspace
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
