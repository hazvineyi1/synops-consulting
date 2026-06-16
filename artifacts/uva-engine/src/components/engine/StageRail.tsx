import { Link } from "wouter";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_COUNT, stageState, getStage } from "@/lib/stages";

interface StageRailProps {
  projectId: number;
  /** The stage the project is currently on (0-5). */
  currentStage: number;
  /**
   * "full": labelled, interactive rail for the project hub.
   * "compact": slim progress strip for cards and lists (non-interactive).
   */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * The visible backbone of the curriculum pipeline. Renders the six stages in
 * order with done / current / locked states. Done and current stages link to
 * their workspace; locked stages are not yet reachable (the server enforces the
 * gates). Accessible: an ordered list, aria-current on the active stage, and
 * text (not color alone) conveys each stage's state.
 */
export function StageRail({ projectId, currentStage, variant = "full", className }: StageRailProps) {
  if (variant === "compact") {
    const current = getStage(currentStage);
    const doneCount = Math.min(currentStage, STAGE_COUNT);
    return (
      <div className={className}>
        <ol className="flex items-center gap-1" aria-label="Pipeline progress">
          {STAGES.map((stage) => {
            const state = stageState(stage.id, currentStage);
            return (
              <li key={stage.id} className="flex-1">
                <span className="sr-only">
                  {stage.title}: {state}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-1.5 rounded-full",
                    state === "done" && "bg-primary",
                    state === "current" && "bg-accent",
                    state === "locked" && "bg-muted"
                  )}
                />
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Stage {Math.min(currentStage + 1, STAGE_COUNT)} of {STAGE_COUNT}
          {current ? `: ${current.title}` : ""}
          <span className="text-muted-foreground/70"> ({doneCount} complete)</span>
        </p>
      </div>
    );
  }

  return (
    <ol
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
        className
      )}
      aria-label="Curriculum pipeline stages"
    >
      {STAGES.map((stage) => {
        const state = stageState(stage.id, currentStage);
        const Icon = stage.icon;
        const reachable = state !== "locked";
        const stateLabel = state === "done" ? "Completed" : state === "current" ? "In progress" : "Locked";

        const inner = (
          <>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  state === "current" && "bg-primary text-primary-foreground",
                  state === "done" && "bg-primary/15 text-primary",
                  state === "locked" && "bg-muted text-muted-foreground"
                )}
              >
                {state === "done" ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : state === "locked" ? (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  stage.id
                )}
              </span>
              <Icon
                className={cn(
                  "h-4 w-4",
                  state === "current" ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 min-w-0">
              <div
                className={cn(
                  "truncate text-sm font-semibold",
                  state === "locked" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {stage.title}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{stateLabel}</div>
            </div>
          </>
        );

        const base = cn(
          "block rounded-lg border p-3 text-left transition-colors",
          state === "current" && "border-primary/40 bg-primary/5",
          state === "done" && "bg-card hover:bg-muted/50",
          state === "locked" && "border-dashed bg-muted/20"
        );

        return (
          <li key={stage.id}>
            {reachable ? (
              <Link
                href={`/projects/${projectId}/${stage.slug}`}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`${stage.title}: ${stateLabel}. Open workspace.`}
                className={cn(base, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
              >
                {inner}
              </Link>
            ) : (
              <div className={base} aria-label={`${stage.title}: ${stateLabel}`}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
