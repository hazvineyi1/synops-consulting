import { useState, useMemo } from "react";
import { 
  useGetDemoLevels, 
  getGetDemoLevelsQueryKey,
  useGetDemoBank,
  getGetDemoBankQueryKey,
  useAnswerDemoItem,
  useSaveDemoSession,
  DemoAnswerInput,
  DemoPathStep,
  DemoSessionInputLevel
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ArrowRight, RefreshCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

type Phase = "select_level" | "active" | "results";

export function AdaptiveDemo() {
  const [phase, setPhase] = useState<Phase>("select_level");
  const [selectedLevel, setSelectedLevel] = useState<DemoSessionInputLevel | "">("");
  
  // Active session state
  const [path, setPath] = useState<DemoPathStep[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{correct: boolean, correctIndex: number, hint?: string | null} | null>(null);
  const [masteryEstimate, setMasteryEstimate] = useState<number>(0.5);

  const { data: levels, isLoading: loadingLevels } = useGetDemoLevels({
    query: { queryKey: getGetDemoLevelsQueryKey() }
  });

  const { data: bank, isLoading: loadingBank } = useGetDemoBank(
    { level: selectedLevel as DemoSessionInputLevel },
    { query: { enabled: !!selectedLevel && phase !== "select_level", queryKey: getGetDemoBankQueryKey({ level: selectedLevel as DemoSessionInputLevel }) } }
  );

  const answerMut = useAnswerDemoItem();
  const saveMut = useSaveDemoSession();

  // Pick first item when bank loads
  if (bank && !currentItemId && phase === "active" && path.length === 0) {
    // Start near the middle of the 1-5 difficulty range for the level.
    const startItem = [...bank.items].sort(
      (a, b) => Math.abs(a.difficulty - 3) - Math.abs(b.difficulty - 3),
    )[0];
    if (startItem) {
      setCurrentItemId(startItem.id);
    }
  }

  const currentItem = useMemo(() => {
    return bank?.items.find(i => i.id === currentItemId) || null;
  }, [bank, currentItemId]);

  const handleStart = () => {
    if (!selectedLevel) return;
    setPhase("active");
    setPath([]);
    setCurrentItemId(null);
    setSelectedOption(null);
    setLastResult(null);
    setMasteryEstimate(0.5); // Reset mastery to prior prior
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentItemId || !currentItem) return;

    try {
      const result = await answerMut.mutateAsync({
        data: { itemId: currentItemId, optionIndex: selectedOption }
      });
      
      setLastResult(result);
      
      const newPathStep = {
        itemId: currentItemId,
        difficulty: currentItem.difficulty,
        correct: result.correct
      };
      
      const newPath = [...path, newPathStep];
      setPath(newPath);

      // Simplified mastery update on a 0-1 scale. Item difficulty is 1-5.
      // A correct answer raises mastery more when the item was harder; a miss
      // lowers it more when the item was easier.
      let newMastery = masteryEstimate;
      if (result.correct) {
        newMastery = Math.min(0.99, masteryEstimate + 0.08 * (currentItem.difficulty / 5));
      } else {
        newMastery = Math.max(0.01, masteryEstimate - 0.08 * ((6 - currentItem.difficulty) / 5));
      }
      setMasteryEstimate(newMastery);

    } catch (err) {
      console.error(err);
    }
  };

  const handleNext = async () => {
    if (!bank || !currentItem) return;

    // Check if we should end
    if (path.length >= 6) {
      await finishSession();
      return;
    }

    // Adaptive logic (difficulty is 1-5):
    // If correct, target a harder item; if incorrect, target an easier one.
    const targetDiff = lastResult?.correct
      ? Math.min(5, currentItem.difficulty + 1)
      : Math.max(1, currentItem.difficulty - 1);

    const unusedItems = bank.items.filter(i => !path.some(p => p.itemId === i.id));
    
    if (unusedItems.length === 0) {
      await finishSession();
      return;
    }

    // Find closest to target difficulty
    let nextItem = unusedItems[0];
    let minDiff = Math.abs(nextItem.difficulty - targetDiff);
    
    for (const item of unusedItems) {
      const d = Math.abs(item.difficulty - targetDiff);
      if (d < minDiff) {
        minDiff = d;
        nextItem = item;
      }
    }

    setCurrentItemId(nextItem.id);
    setSelectedOption(null);
    setLastResult(null);
  };

  const finishSession = async () => {
    setPhase("results");
    try {
      if (selectedLevel) {
        const correctCount = path.filter(p => p.correct).length;
        await saveMut.mutateAsync({
          data: {
            level: selectedLevel as DemoSessionInputLevel,
            itemsAttempted: path.length,
            correctCount,
            masteryEstimate: Math.round(masteryEstimate * 100),
            path
          }
        });
      }
    } catch (err) {
      console.error("Failed to save session", err);
    }
  };

  const handleReset = () => {
    setPhase("select_level");
    setSelectedLevel("");
    setPath([]);
    setCurrentItemId(null);
    setSelectedOption(null);
    setLastResult(null);
  };

  // Render Phase: Select Level
  if (phase === "select_level") {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Select a context</CardTitle>
          <p className="text-sm text-muted-foreground">The same reasoning engine adapts its vocabulary and complexity to the learner.</p>
        </CardHeader>
        <CardContent className="px-0">
          {loadingLevels ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <RadioGroup value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as DemoSessionInputLevel)} className="gap-3">
              {levels?.map((lvl) => (
                <div key={lvl.value} className="flex items-center space-x-2 border border-border p-4 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedLevel(lvl.value as DemoSessionInputLevel)}>
                  <RadioGroupItem value={lvl.value} id={lvl.value} />
                  <Label htmlFor={lvl.value} className="flex-1 cursor-pointer font-medium">{lvl.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
        <CardFooter className="px-0 pb-0">
          <Button disabled={!selectedLevel} onClick={handleStart} className="w-full">Start Demo</Button>
        </CardFooter>
      </Card>
    );
  }

  // Render Phase: Active
  if (phase === "active") {
    if (loadingBank || !currentItem) {
      return (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="px-0 pt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between pb-4">
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-2 w-8 rounded-full ${i < path.length ? 'bg-primary' : i === path.length ? 'bg-primary/40' : 'bg-muted'}`} />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{selectedLevel} • Q{path.length + 1}</span>
        </CardHeader>
        <CardContent className="px-0 space-y-6">
          <div className="bg-muted p-4 rounded-lg text-sm md:text-base leading-relaxed border border-border">
            {currentItem.passage}
          </div>
          <div className="font-medium text-foreground text-lg">
            {currentItem.question}
          </div>
          
          <div className="space-y-3">
            {currentItem.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const showCorrect = lastResult && idx === lastResult.correctIndex;
              const showIncorrect = lastResult && isSelected && !lastResult.correct;
              
              let bgClass = "bg-card border-border hover:bg-muted/50";
              if (lastResult) {
                if (showCorrect) bgClass = "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300";
                else if (showIncorrect) bgClass = "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300";
                else bgClass = "bg-card border-border opacity-50";
              } else if (isSelected) {
                bgClass = "bg-primary/5 border-primary";
              }

              return (
                <button
                  key={idx}
                  disabled={lastResult !== null}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-lg border transition-all flex gap-3 ${bgClass}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {showCorrect ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                     showIncorrect ? <XCircle className="w-5 h-5 text-red-600" /> :
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{String.fromCharCode(65 + idx)}</div>}
                  </div>
                  <span className={lastResult && !showCorrect && !showIncorrect ? "opacity-70" : ""}>{opt}</span>
                </button>
              );
            })}
          </div>

          {lastResult && lastResult.hint && !lastResult.correct && (
            <div className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 p-4 rounded-lg text-sm flex gap-3 items-start">
              <div className="shrink-0 font-bold mt-0.5">Hint:</div>
              <div>{lastResult.hint}</div>
            </div>
          )}
        </CardContent>
        <CardFooter className="px-0 pb-0 justify-end">
          {!lastResult ? (
            <Button onClick={handleSubmitAnswer} disabled={selectedOption === null}>Submit Answer</Button>
          ) : (
            <Button onClick={handleNext} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {path.length >= 6 ? "Finish" : "Next Question"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // Render Phase: Results
  const chartData = path.map((p, i) => ({
    step: i + 1,
    difficulty: p.difficulty,
    status: p.correct ? "Correct" : "Incorrect"
  }));

  const recommendedLevel = masteryEstimate > 0.8 && selectedLevel !== "higher" 
    ? (selectedLevel === "elementary" ? "Secondary" : "Higher Ed")
    : masteryEstimate < 0.3 && selectedLevel !== "elementary"
      ? (selectedLevel === "higher" ? "Secondary" : "Elementary")
      : "Continue current level";

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 text-center space-y-2 pb-8">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl">Assessment Complete</CardTitle>
        <p className="text-muted-foreground">The engine has estimated the learner's current mastery level based on their path.</p>
      </CardHeader>
      
      <CardContent className="px-0 grid sm:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-muted p-6 rounded-xl border border-border">
            <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Estimated Mastery</div>
            <div className="text-4xl font-bold font-mono">{(masteryEstimate * 100).toFixed(0)}%</div>
            <div className="mt-4 text-sm">
              <span className="text-muted-foreground">Recommendation: </span>
              <span className="font-medium">{recommendedLevel}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Performance summary</h4>
            <div className="text-sm text-muted-foreground">
              Answered {path.filter(p=>p.correct).length} of {path.length} items correctly. The engine dynamically adjusted difficulty after each response to zero in on the learner's precise capability edge.
            </div>
          </div>
        </div>

        <div className="h-[200px] sm:h-auto border border-border rounded-xl p-4 bg-card">
          <h4 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider text-center">Difficulty Path</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="step" tick={{fontSize: 12}} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 1]} tickFormatter={(v)=>v.toFixed(1)} tick={{fontSize: 12}} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--primary))' }}
              />
              <Line 
                type="stepAfter" 
                dataKey="difficulty" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill={payload.status === "Correct" ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                      stroke="hsl(var(--card))"
                      strokeWidth={1}
                      key={`dot-${payload.step}`}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      
      <CardFooter className="px-0 pb-0 pt-8 justify-center">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Try another level
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AdaptiveDemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      <AdaptiveDemo />
    </div>
  );
}