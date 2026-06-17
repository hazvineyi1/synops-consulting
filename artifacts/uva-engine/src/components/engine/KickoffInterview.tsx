import { useEffect, useMemo, useState } from "react";
import type { KickoffState, KickoffAnswer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  MessageCircleQuestion,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import {
  KICKOFF_VERSION,
  KICKOFF_START_NODE,
  KICKOFF_SPINE_LENGTH,
  getKickoffNode,
  getOptionLabel,
  buildKickoffSummary,
  type KickoffContext,
} from "@/lib/kickoff-flow";
import { getMethod, type MethodKey } from "@/lib/instructional-methods";

interface KickoffInterviewProps {
  designMethod: MethodKey | null;
  value: KickoffState;
  onChange: (next: KickoffState) => void;
}

export function KickoffInterview({ designMethod, value, onChange }: KickoffInterviewProps) {
  const answers = useMemo<KickoffAnswer[]>(() => value.answers ?? [], [value.answers]);
  const summary = value.summary ?? [];
  const completed = value.completed ?? false;
  const currentNodeId = value.currentNodeId ?? null;
  const node = currentNodeId ? getKickoffNode(currentNodeId) : undefined;

  const answeredIds = useMemo(() => answers.map((a) => a.nodeId), [answers]);
  const answerRecord = useMemo(
    () => Object.fromEntries(answers.map((a) => [a.nodeId, a.value])),
    [answers],
  );

  const [selected, setSelected] = useState<string>("");
  useEffect(() => {
    setSelected(currentNodeId ? (answerRecord[currentNodeId] ?? "") : "");
    // Re-seed the radio selection whenever the visible node changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId]);

  const base = (): Partial<KickoffState> => ({
    version: KICKOFF_VERSION,
    designMethod: designMethod ?? null,
  });

  const begin = () => {
    onChange({
      ...base(),
      currentNodeId: KICKOFF_START_NODE,
      completed: false,
      answers: [],
      summary: [],
    });
  };

  const startOver = () => {
    onChange({
      ...base(),
      currentNodeId: null,
      completed: false,
      answers: [],
      summary: [],
    });
  };

  const handleNext = () => {
    if (!node || !selected) return;
    const idx = answeredIds.indexOf(node.id);
    const prefix = idx >= 0 ? answers.slice(0, idx) : answers.slice();
    const newAnswer: KickoffAnswer = {
      nodeId: node.id,
      prompt: node.prompt,
      value: selected,
      label: getOptionLabel(node, selected),
    };
    const newAnswers = [...prefix, newAnswer];
    const ctx: KickoffContext = {
      designMethod: designMethod ?? null,
      answers: Object.fromEntries(newAnswers.map((a) => [a.nodeId, a.value])),
    };
    const nextId = node.next(selected, ctx);
    if (!nextId) {
      onChange({
        ...base(),
        currentNodeId: null,
        completed: true,
        answers: newAnswers,
        summary: buildKickoffSummary(ctx.answers, designMethod ?? null),
      });
    } else {
      onChange({
        ...base(),
        currentNodeId: nextId,
        completed: false,
        answers: newAnswers,
        summary: [],
      });
    }
  };

  const handleBack = () => {
    const curIdx = currentNodeId ? answeredIds.indexOf(currentNodeId) : -1;
    let target: string | null;
    if (curIdx > 0) target = answeredIds[curIdx - 1];
    else if (curIdx === 0) target = null;
    else target = answeredIds.length > 0 ? answeredIds[answeredIds.length - 1] : null;

    if (target === null) {
      onChange({ ...base(), currentNodeId: null, completed: false, answers: [], summary: [] });
    } else {
      onChange({ ...base(), currentNodeId: target, completed: false, answers, summary: [] });
    }
  };

  const reviseLast = () => {
    const lastId = answeredIds[answeredIds.length - 1];
    if (!lastId) {
      startOver();
      return;
    }
    onChange({ ...base(), currentNodeId: lastId, completed: false, answers, summary: [] });
  };

  // Recovery: the saved position points at a node that no longer exists (for
  // example after the flow graph changes). Resume at the most recent answer
  // whose node still resolves, trimming any answers past it; otherwise reset.
  const resumeLastValid = () => {
    for (let i = answeredIds.length - 1; i >= 0; i--) {
      if (getKickoffNode(answeredIds[i])) {
        onChange({
          ...base(),
          currentNodeId: answeredIds[i],
          completed: false,
          answers: answers.slice(0, i + 1),
          summary: [],
        });
        return;
      }
    }
    startOver();
  };

  // A saved currentNodeId that no longer resolves to a node (and is not a
  // completed run) would otherwise render an empty card.
  const isStranded = !completed && currentNodeId !== null && !node;
  const canResume = answeredIds.some((id) => getKickoffNode(id));

  const methodName = designMethod ? (getMethod(designMethod)?.name ?? null) : null;

  // Approximate progress along the linear spine of the flow.
  const answeredCount = currentNodeId
    ? answeredIds.indexOf(currentNodeId) >= 0
      ? answeredIds.indexOf(currentNodeId)
      : answers.length
    : answers.length;
  const questionNumber = answeredCount + 1;
  const progressPct = Math.min(100, Math.round((answeredCount / KICKOFF_SPINE_LENGTH) * 100));

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle className="text-lg">Kickoff interview</CardTitle>
            <CardDescription className="m-0">
              A guided conversation to frame the engagement. Rules-based, no AI.
            </CardDescription>
          </div>
        </div>
        {methodName ? (
          <Badge
            variant="secondary"
            className="border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/10"
          >
            {methodName}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {/* Intro */}
        {!completed && !currentNodeId ? (
          <div className="space-y-4">
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              Answer a short set of expert framing questions. Your answers branch the conversation
              and adapt to the project design method. Nothing is written automatically; you get a
              summary you can act on.
            </p>
            <p className="text-sm text-muted-foreground">
              {methodName
                ? `Tailored to ${methodName}.`
                : "No design method is selected yet. The interview will recommend one you can confirm on the Prepare tab."}
            </p>
            <Button onClick={begin}>
              Begin interview
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        {/* Recovery: saved at a step that no longer exists */}
        {isStranded ? (
          <div className="space-y-4">
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              This interview was saved at a step that is no longer available. You can resume from
              your last saved answer or start over.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canResume ? (
                <Button onClick={resumeLastValid}>
                  Resume from last answer
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
              <Button variant="outline" onClick={startOver}>
                <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            </div>
          </div>
        ) : null}

        {/* Question */}
        {!completed && node ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Question {questionNumber}
                </span>
              </div>
              <Progress value={progressPct} className="h-1.5" aria-label="Interview progress" />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-base font-semibold text-foreground">{node.prompt}</legend>
              {node.helpText ? (
                <p className="text-sm text-muted-foreground">{node.helpText}</p>
              ) : null}
              <RadioGroup value={selected} onValueChange={setSelected} className="gap-2">
                {node.options.map((opt) => {
                  const id = `${node.id}-${opt.value}`;
                  const active = selected === opt.value;
                  return (
                    <Label
                      key={opt.value}
                      htmlFor={id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <RadioGroupItem id={id} value={opt.value} className="mt-0.5" />
                      <span className="text-sm font-normal leading-snug text-foreground">
                        {opt.label}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleNext} disabled={!selected}>
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button variant="ghost" onClick={startOver} className="ml-auto text-muted-foreground">
                <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            </div>
          </div>
        ) : null}

        {/* Results */}
        {completed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
              Kickoff complete. Here is what you decided.
            </div>
            {summary.length > 0 ? (
              <ul className="space-y-2">
                {summary.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No summary was generated.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={reviseLast}>
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Revise last answer
              </Button>
              <Button variant="ghost" onClick={startOver} className="text-muted-foreground">
                <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
