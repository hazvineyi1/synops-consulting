import { useParams, Link } from "wouter";
import {
  useGetProject,
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
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/engine/PageHeader";
import { StageRail } from "@/components/engine/StageRail";
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

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: gateStatus, isLoading: isGateLoading } = useGetProjectGateStatus(projectId, {
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

  if (isProjectLoading || isGateLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  const currentStage = getStage(project.stage);
  const nextStage = getStage(project.stage + 1);
  const hasNext = project.stage < STAGE_COUNT - 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <PageHeader
        title={project.title}
        crumbs={[{ label: "Projects", href: "/projects" }, { label: project.title }]}
      >
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
        </div>
      </PageHeader>

      <section aria-label="Pipeline">
        <StageRail projectId={project.id} currentStage={project.stage} variant="full" />
      </section>

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
        </aside>
      </div>
    </div>
  );
}
