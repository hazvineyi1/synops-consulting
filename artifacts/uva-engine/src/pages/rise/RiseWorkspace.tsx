import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetRiseLevels,
  getGetRiseLevelsQueryKey,
  useGetRiseBank,
  getGetRiseBankQueryKey,
  useAnswerRiseItem,
  useSaveRiseSession,
  getGetRiseSessionsQueryKey,
  type RisePathStep,
  type RiseSessionInputLevel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCcw,
  GraduationCap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

type Phase = "intro" | "active" | "results";

const TOTAL_QUESTIONS = 6;

const SKILLS = [
  "Main idea",
  "Inference",
  "Vocabulary in context",
  "Evaluate argument",
] as const;

const FALLBACK_LEVELS: { value: RiseSessionInputLevel; label: string }[] = [
  { value: "elementary", label: "Elementary (Grades 3 to 5)" },
  { value: "secondary", label: "Secondary (Grades 6 to 12)" },
  { value: "higher", label: "Higher Education" },
];

function masteryRung(mastery: number): string {
  if (mastery >= 0.8) return "Advanced";
  if (mastery >= 0.6) return "Proficient";
  if (mastery >= 0.4) return "Developing";
  return "Emerging";
}

export default function RiseWorkspace() {
  usePageMeta("Rise - Adaptive Assessment", "Level-aware adaptive reading and reasoning.");
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState<RiseSessionInputLevel>("secondary");
  const [path, setPath] = useState<RisePathStep[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<
    { correct: boolean; correctIndex: number; hint?: string | null } | null
  >(null);
  const [mastery, setMastery] = useState<number>(0.5);
  const [adaptationNote, setAdaptationNote] = useState<string>("");
  const questionRef = useRef<HTMLDivElement>(null);

  const { data: levelOptions } = useGetRiseLevels({
    query: { queryKey: getGetRiseLevelsQueryKey(), staleTime: 5 * 60 * 1000 },
  });
  const levels = (levelOptions && levelOptions.length > 0
    ? levelOptions
    : FALLBACK_LEVELS) as { value: RiseSessionInputLevel; label: string }[];

  const { data: bank, isLoading: loadingBank } = useGetRiseBank(
    { level },
    {
      query: {
        enabled: phase !== "intro",
        queryKey: getGetRiseBankQueryKey({ level }),
      },
    },
  );

  const answerMut = useAnswerRiseItem();
  const saveMut = useSaveRiseSession();

  const skillById = useMemo(() => {
    const map = new Map<string, string>();
    bank?.items.forEach((i) => map.set(i.id, i.skill));
    return map;
  }, [bank]);

  const currentItem = useMemo(
    () => bank?.items.find((i) => i.id === currentItemId) ?? null,
    [bank, currentItemId],
  );

  // Pick the opening item once the bank is ready: start near the middle of the
  // available difficulty range so the engine can move up or down from a neutral
  // prior.
  useEffect(() => {
    if (phase !== "active" || !bank || currentItemId || path.length > 0) return;
    const opener = [...bank.items].sort(
      (a, b) => Math.abs(a.difficulty - 3) - Math.abs(b.difficulty - 3),
    )[0];
    if (opener) {
      setCurrentItemId(opener.id);
      setAdaptationNote(
        `Starting at difficulty ${opener.difficulty} of 5 with a neutral estimate. The engine will adjust after every answer.`,
      );
    }
  }, [phase, bank, currentItemId, path.length]);

  useEffect(() => {
    if (phase === "active" && currentItemId) {
      questionRef.current?.focus();
    }
  }, [currentItemId, phase]);

  const handleStart = () => {
    setPhase("active");
    setPath([]);
    setCurrentItemId(null);
    setSelectedOption(null);
    setLastResult(null);
    setMastery(0.5);
    setAdaptationNote("");
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentItemId || !currentItem) return;
    if (answerMut.isPending) return;
    try {
      const result = await answerMut.mutateAsync({
        data: { itemId: currentItemId, optionIndex: selectedOption },
      });
      setLastResult(result);

      const step: RisePathStep = {
        itemId: currentItemId,
        difficulty: currentItem.difficulty,
        correct: result.correct,
      };
      setPath((prev) => [...prev, step]);

      // Mastery on a 0 to 1 scale. A correct answer adds more when the item was
      // hard; a miss subtracts more when the item was easy. Difficulty is 1 to 5.
      let next = mastery;
      if (result.correct) {
        next = Math.min(0.99, mastery + 0.09 * (currentItem.difficulty / 5));
      } else {
        next = Math.max(0.01, mastery - 0.09 * ((6 - currentItem.difficulty) / 5));
      }
      setMastery(next);

      const willFinish = path.length + 1 >= TOTAL_QUESTIONS;
      if (willFinish) {
        setAdaptationNote("Enough signal gathered. Building the learner profile.");
      } else if (result.correct) {
        setAdaptationNote(
          "Correct. The engine is raising difficulty and moving to a new skill to find your edge.",
        );
      } else {
        setAdaptationNote(
          "Not quite. The engine is easing difficulty and will keep sampling new skills.",
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNext = async () => {
    if (!bank || !currentItem) return;

    if (path.length >= TOTAL_QUESTIONS) {
      await finishSession();
      return;
    }

    const targetDiff = lastResult?.correct
      ? Math.min(5, currentItem.difficulty + 1)
      : Math.max(1, currentItem.difficulty - 1);

    const seenSkills = new Set(
      path.map((p) => skillById.get(p.itemId)).filter(Boolean) as string[],
    );

    const unused = bank.items.filter((i) => !path.some((p) => p.itemId === i.id));
    if (unused.length === 0) {
      await finishSession();
      return;
    }

    // Score each candidate by closeness to the target difficulty, with a
    // penalty for skills already tested so one run spans every area.
    let best = unused[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const item of unused) {
      const diffGap = Math.abs(item.difficulty - targetDiff);
      const skillPenalty = seenSkills.has(item.skill) ? 1.5 : 0;
      const score = diffGap + skillPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }

    setCurrentItemId(best.id);
    setSelectedOption(null);
    setLastResult(null);
  };

  const finishSession = async () => {
    setPhase("results");
    try {
      const correctCount = path.filter((p) => p.correct).length;
      await saveMut.mutateAsync({
        data: {
          level,
          itemsAttempted: path.length,
          correctCount,
          masteryEstimate: Math.round(mastery * 100),
          finalRung: masteryRung(mastery),
          path,
        },
      });
      // Refresh the history list so a new run shows up immediately.
      void queryClient.invalidateQueries({ queryKey: getGetRiseSessionsQueryKey() });
    } catch (err) {
      console.error("Failed to save session", err);
    }
  };

  const handleReset = () => {
    setPhase("intro");
    setPath([]);
    setCurrentItemId(null);
    setSelectedOption(null);
    setLastResult(null);
    setMastery(0.5);
    setAdaptationNote("");
  };

  // ── Intro: pick a level ─────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              <GraduationCap className="h-3.5 w-3.5" /> Adaptive Reading and Reasoning
            </div>
            <CardTitle className="text-2xl">Choose a level to begin</CardTitle>
            <p className="text-muted-foreground leading-relaxed">
              Rise tailors each assessment to the learner's level. Pick a band,
              then answer a short adaptive sequence. After every response the
              engine updates its estimate of mastery and chooses the next passage
              by difficulty and skill across main idea, inference, vocabulary in
              context, and evaluating an argument.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <fieldset className="space-y-3">
              <legend className="sr-only">Select a reading level</legend>
              {levels.map((l) => {
                const selected = level === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLevel(l.value)}
                    className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium">{l.label}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                      aria-hidden="true"
                    >
                      {selected && <CheckCircle2 className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })}
            </fieldset>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStart} size="lg" className="w-full sm:w-auto">
              Begin assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Active: answer questions ────────────────────────────────────
  if (phase === "active") {
    if (loadingBank || !currentItem) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      );
    }

    const answered = path.length;
    const correctSoFar = path.filter((p) => p.correct).length;
    const accuracy = answered > 0 ? Math.round((correctSoFar / answered) * 100) : 0;
    const questionNumber = Math.min(
      lastResult ? path.length : path.length + 1,
      TOTAL_QUESTIONS,
    );

    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Question column */}
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-4 pt-0">
              <div className="flex gap-1" aria-hidden="true">
                {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full ${
                      i < path.length
                        ? "bg-primary"
                        : i === path.length
                          ? "bg-primary/40"
                          : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Q{questionNumber} of {TOTAL_QUESTIONS}
              </span>
            </CardHeader>
            <CardContent className="space-y-6 px-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                  {currentItem.skill}
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">
                  Difficulty {currentItem.difficulty} / 5
                </span>
              </div>

              <div className="rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed md:text-base">
                {currentItem.passage}
              </div>
              <div
                ref={questionRef}
                tabIndex={-1}
                className="text-lg font-medium text-foreground outline-none"
              >
                {currentItem.question}
              </div>

              <div className="space-y-3" role="group" aria-label="Answer choices">
                {currentItem.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const showCorrect = lastResult && idx === lastResult.correctIndex;
                  const showIncorrect = lastResult && isSelected && !lastResult.correct;

                  let bgClass = "bg-card border-border hover:bg-muted/50";
                  if (lastResult) {
                    if (showCorrect)
                      bgClass =
                        "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300";
                    else if (showIncorrect)
                      bgClass =
                        "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300";
                    else bgClass = "bg-card border-border opacity-50";
                  } else if (isSelected) {
                    bgClass = "bg-primary/5 border-primary";
                  }

                  let srStatus = "";
                  if (lastResult) {
                    if (showCorrect) srStatus = "Correct answer: ";
                    else if (showIncorrect) srStatus = "Your answer, incorrect: ";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={lastResult !== null}
                      onClick={() => setSelectedOption(idx)}
                      className={`flex w-full gap-3 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${bgClass}`}
                    >
                      <div className="mt-0.5 shrink-0" aria-hidden="true">
                        {showCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : showIncorrect ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input"
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                        )}
                      </div>
                      <span
                        className={
                          lastResult && !showCorrect && !showIncorrect ? "opacity-70" : ""
                        }
                      >
                        {srStatus && <span className="sr-only">{srStatus}</span>}
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {lastResult && !lastResult.correct && lastResult.hint && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                  <div className="mt-0.5 shrink-0 font-bold">Hint:</div>
                  <div>{lastResult.hint}</div>
                </div>
              )}

              <div className="sr-only" role="status" aria-live="polite">
                {lastResult
                  ? `${lastResult.correct ? "Correct." : "Incorrect."}${
                      !lastResult.correct && lastResult.hint
                        ? " Hint: " + lastResult.hint
                        : ""
                    } ${adaptationNote}`
                  : ""}
              </div>
            </CardContent>
            <CardFooter className="justify-end px-0 pb-0">
              {!lastResult ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null || answerMut.isPending}
                >
                  {answerMut.isPending ? "Checking..." : "Submit answer"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {path.length >= TOTAL_QUESTIONS ? "See results" : "Next question"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Live learner model */}
          <aside
            className="space-y-4 lg:border-l lg:border-border lg:pl-6"
            aria-label="Live learner model"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Learner model, live
            </h2>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-xs text-muted-foreground">Estimated mastery</div>
              <div className="font-mono text-3xl font-bold text-primary">
                {Math.round(mastery * 100)}%
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(mastery * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round(mastery * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Answered</div>
                <div className="font-mono text-xl font-semibold">
                  {answered}
                  <span className="text-sm text-muted-foreground">/{TOTAL_QUESTIONS}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Accuracy</div>
                <div className="font-mono text-xl font-semibold">{accuracy}%</div>
              </div>
            </div>

            {adaptationNote && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
                {adaptationNote}
              </div>
            )}

            {path.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Adaptive log</div>
                <ul className="space-y-1.5">
                  {path.map((p, i) => (
                    <li
                      key={p.itemId}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {i + 1}. {skillById.get(p.itemId)}
                      </span>
                      <span className="flex items-center gap-2 font-mono">
                        d{p.difficulty}
                        {p.correct ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-green-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                        )}
                        <span className="sr-only">{p.correct ? "correct" : "incorrect"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────
  const chartData = path.map((p, i) => ({
    step: i + 1,
    difficulty: p.difficulty,
    status: p.correct ? "Correct" : "Incorrect",
  }));

  const perSkill = SKILLS.map((skill) => {
    const steps = path.filter((p) => skillById.get(p.itemId) === skill);
    const correct = steps.filter((p) => p.correct).length;
    return {
      skill,
      attempted: steps.length,
      correct,
      pct: steps.length > 0 ? Math.round((correct / steps.length) * 100) : null,
    };
  });

  const attemptedSkills = perSkill.filter((s) => s.attempted > 0);
  const strength = [...attemptedSkills].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const focus = [...attemptedSkills].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  const correctTotal = path.filter((p) => p.correct).length;
  const levelLabel = levels.find((l) => l.value === level)?.label ?? level;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-2 px-0 pb-8 pt-0 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Learner profile ready</CardTitle>
          <p className="text-muted-foreground">
            {levelLabel}. Built from {path.length} adaptive responses across{" "}
            {attemptedSkills.length} skill areas.
          </p>
        </CardHeader>

        <CardContent className="grid gap-8 px-0 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted p-6">
              <div className="mb-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Estimated mastery
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold">
                  {Math.round(mastery * 100)}%
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {masteryRung(mastery)}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {correctTotal} of {path.length} correct, with difficulty tuned to each answer.
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">By skill area</h3>
              {perSkill.map((s) => (
                <div key={s.skill} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.skill}</span>
                    <span className="font-mono text-xs">
                      {s.attempted > 0 ? `${s.correct}/${s.attempted}` : "not sampled"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${s.pct ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {strength && focus && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
                    <TrendingUp className="h-3.5 w-3.5" /> Strength
                  </div>
                  <div className="mt-1 text-sm font-medium">{strength.skill}</div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <TrendingDown className="h-3.5 w-3.5" /> Focus area
                  </div>
                  <div className="mt-1 text-sm font-medium">{focus.skill}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Difficulty path</h3>
            <div className="h-64 w-full rounded-xl border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="step"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Question", position: "insideBottom", offset: -4, fontSize: 12 }}
                  />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    formatter={(value: number, _name, props) => [
                      `Difficulty ${value} (${props.payload.status})`,
                      `Q${props.payload.step}`,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="difficulty"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              The line shows how the engine raised or eased difficulty after each answer.
              {saveMut.isError && " This run could not be saved to your history."}
            </p>
            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
              <RefreshCcw className="mr-2 h-4 w-4" /> Start a new assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
