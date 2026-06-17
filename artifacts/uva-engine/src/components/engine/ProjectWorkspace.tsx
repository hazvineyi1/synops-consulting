import { type ReactNode } from "react";
import { useParams, Link } from "wouter";
import { Lock } from "lucide-react";
import { useGetProject, getGetProjectQueryKey, type Project } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, type Crumb } from "@/components/engine/PageHeader";
import { StageRail } from "@/components/engine/StageRail";
import { getStage, STAGE_COUNT } from "@/lib/stages";

interface WorkspaceContext {
  project: Project;
}

interface ProjectWorkspaceProps {
  /**
   * The stage this page represents (Intake=0..Handoff=3). Omit on the project
   * overview hub, where the rail shows progress without a "you are here" marker.
   */
  stageId?: number;
  /** Overrides the default subtitle (the stage blurb). */
  subtitle?: string;
  /** Right-aligned header actions; receives the loaded project. */
  actions?: (ctx: WorkspaceContext) => ReactNode;
  /** Extra meta shown under the title (client, due date, status). */
  meta?: (ctx: WorkspaceContext) => ReactNode;
  children: (ctx: WorkspaceContext) => ReactNode;
}

/**
 * One shared frame for every page about a single project (the overview hub and
 * each stage workspace). It loads the project once, then renders a consistent
 * header (breadcrumb, project title, stage badge) and the StageRail timeline so a
 * builder always sees where they are and can move directly between stages. Pages
 * supply only their own content through the render prop, keeping each surface calm
 * and uniform.
 */
export function ProjectWorkspace({ stageId, subtitle, actions, meta, children }: ProjectWorkspaceProps) {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  const stage = stageId != null ? getStage(stageId) : undefined;
  const ctx: WorkspaceContext = { project };

  const currentStage = getStage(project.stage);
  const isLocked = stage != null && stage.id > project.stage;
  const resumeHref = currentStage
    ? `/projects/${project.id}/${currentStage.slug}`
    : `/projects/${project.id}`;

  const crumbs: Crumb[] = [
    { label: "Dashboard", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: project.title, href: `/projects/${project.id}` },
    ...(stage ? [{ label: stage.title }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <PageHeader
        title={project.title}
        subtitle={subtitle ?? stage?.blurb}
        crumbs={crumbs}
        actions={actions?.(ctx)}
      >
        {(stage || meta) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {stage && (
              <Badge variant="secondary" className="uppercase tracking-wide">
                Stage {stage.id + 1} of {STAGE_COUNT}: {stage.title}
              </Badge>
            )}
            {meta?.(ctx)}
          </div>
        )}
      </PageHeader>

      <section aria-label="Curriculum pipeline">
        <StageRail
          projectId={project.id}
          currentStage={project.stage}
          viewingStage={stageId}
          variant="full"
        />
      </section>

      <div className="space-y-6">
        {isLocked ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">This stage is not open yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {stage?.title} opens once the earlier stages are complete.
              {currentStage ? ` Continue from the current stage, ${currentStage.title}.` : ""}
            </p>
            <Link
              href={resumeHref}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Go to {currentStage ? currentStage.title : "the project"}
            </Link>
          </div>
        ) : (
          children(ctx)
        )}
      </div>
    </div>
  );
}
