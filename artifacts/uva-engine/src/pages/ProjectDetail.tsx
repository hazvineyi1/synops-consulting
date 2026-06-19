import { useParams, Link } from "wouter";
import {
  useGetProjectGateStatus,
  useAdvanceProjectStage,
  getGetProjectQueryKey,
  getGetProjectGateStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Clock,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ProjectWorkspace } from "@/components/engine/ProjectWorkspace";
import { getStage, STAGE_COUNT } from "@/lib/stages";

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "gate_blocked") return "destructive";
  if (status === "complete") return "default";
  return "secondary";
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gateStatus } = useGetProjectGateStatus(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectGateStatusQueryKey(projectId) },
  });

  const advanceStage = useAdvanceProjectStage();

  const handleAdvance = () => {
    advanceStage.mutate(
      { id: projectId, data: { notes: "Advanced from UI" } },
      {
        onSuccess: () => {
          toast({ title: "Project advanced to the next stage" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
        },
        onError: () => {
          toast({ title: "Could not advance the project", variant: "destructive" });
        },
      }
    );
  };

  return (
    <ProjectWorkspace
      subtitle="Project overview and what is needed to move forward."
      meta={({ project }) => (
        <>
          <Link
            href={`/clients/${project.clientId}`}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {project.clientName}
          </Link>
          {project.targetDeliveryDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Due {format(new Date(project.targetDeliveryDate), "MMM d, yyyy")}
            </span>
          )}
          <Badge variant={statusVariant(project.status)} className="uppercase">
            {project.status.replace("_", " ")}
          </Badge>
        </>
      )}
    >
      {({ project }) => {
        const currentStage = getStage(project.stage);
        const nextStage = getStage(project.stage + 1);
        const hasNext = project.stage < STAGE_COUNT - 1;

        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardDescription className="uppercase tracking-wide">
                    Current stage {project.stage + 1} of {STAGE_COUNT}
                  </CardDescription>
                  <CardTitle className="text-xl">{currentStage?.title ?? "Stage"}</CardTitle>
                  {currentStage?.blurb && <CardDescription>{currentStage.blurb}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentStage && (
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link href={`/projects/${project.id}/${currentStage.slug}`}>
                        Continue in {currentStage.title} workspace
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      What is needed to advance{nextStage ? ` to ${nextStage.title}` : ""}
                    </h3>
                    {gateStatus && gateStatus.requirements.length > 0 ? (
                      <ul className="space-y-2">
                        {gateStatus.requirements.map((req, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-md border bg-card p-3"
                          >
                            {req.met ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                            ) : req.blocking ? (
                              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                            ) : (
                              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" aria-hidden="true" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{req.label}</p>
                              {req.detail && <p className="mt-1 text-xs text-muted-foreground">{req.detail}</p>}
                            </div>
                            <span className="ml-auto shrink-0 text-xs font-medium">
                              {req.met ? (
                                <span className="text-primary">Done</span>
                              ) : req.blocking ? (
                                <Badge variant="destructive">Blocking</Badge>
                              ) : (
                                <span className="text-muted-foreground">Optional</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No requirements loaded for this stage.</p>
                    )}
                  </div>

                  {hasNext && (
                    <div className="flex justify-end border-t pt-4">
                      <Button
                        onClick={handleAdvance}
                        disabled={!gateStatus?.canAdvance || advanceStage.isPending}
                        variant={gateStatus?.canAdvance ? "default" : "secondary"}
                      >
                        Advance to {nextStage?.title ?? "next stage"}
                        <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="mb-1 block text-xs uppercase text-muted-foreground">Tier</span>
                    <span className="font-medium">{project.tier || "Unspecified"}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs uppercase text-muted-foreground">Modality</span>
                    <span className="font-medium capitalize">
                      {project.modality?.replace("_", " ") || "Unspecified"}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs uppercase text-muted-foreground">LMS</span>
                    <span className="font-medium capitalize">
                      {project.lms?.replace(/_/g, " ") || "Not specified"}
                    </span>
                  </div>
                  {project.description && (
                    <div>
                      <span className="mb-1 block text-xs uppercase text-muted-foreground">Description</span>
                      <p className="whitespace-pre-wrap">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agendas</CardTitle>
                  <CardDescription>
                    Weekly agendas, action items, correspondence, and calendar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/projects/${project.id}/meetings`}>
                      <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
                      Open agendas
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Time tracking</CardTitle>
                  <CardDescription>Log hours worked on this project.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/projects/${project.id}/time`}>
                      <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                      Open time tracker
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        );
      }}
    </ProjectWorkspace>
  );
}
