import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProject, getGetProjectQueryKey,
  useGetProjectGateStatus, getGetProjectGateStatusQueryKey,
  useAdvanceProjectStage,
  useListCourses, getListCoursesQueryKey, useCreateCourse, useUpdateCourse,
  useListObjectives, getListObjectivesQueryKey, useCreateObjective, useDeleteObjective,
  useGetIntakeProgress, getGetIntakeProgressQueryKey, useUpdateIntakeProgress,
  useCreateLedgerEntry,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight, Plus, Check, ChevronDown, ChevronUp, Play, Square,
  UploadCloud, PlayCircle, Pause,
  AlertTriangle,
  CheckCircle2, Trash2, ArrowRight, Loader2, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Data Definitions
const INVENTORY = [
  { id: 1, asset: "Lecture-deck.pptx (58 slides)", decision: "Rebuild", rights: "Own", a11y: "low-contrast + alt text", a11yWarn: true },
  { id: 2, asset: "4 lecture recordings (~72 min)", decision: "Reuse", rights: "Own", a11y: "needs captions + transcript", a11yWarn: true },
  { id: 3, asset: "Syllabus_F23.pdf (prior)", decision: "Refresh", rights: "Own", a11y: "untagged structure", a11yWarn: true },
  { id: 4, asset: "Alberts textbook (5th ed.)", decision: "Reuse", rights: "Licensed", a11y: "compliant", a11yWarn: false },
  { id: 5, asset: "6 article PDFs (reading list)", decision: "Reuse", rights: "Permissions", a11y: "2 untagged", a11yWarn: true },
  { id: 6, asset: "Prior Canvas build (F23)", decision: "Refresh", rights: "Own", a11y: "mixed", a11yWarn: true },
  { id: 7, asset: "12 diagrams/images (figures)", decision: "Refresh", rights: "Own", a11y: "alt text needed", a11yWarn: true },
];

const SEGMENTS = [
  {
    time: "0:00", title: "Welcome, roles & how we work", sub: "Partnership and cadence",
    checklist: ["Introduce the team", "Confirm communication cadence", "Set approach: prototype-first, accessible by construction, transparent AI"],
    captures: ["Roles", "Cadence"], lens: { name: "Co-design", desc: "Collaborative building" }
  },
  {
    time: "0:05", title: "Vision & teaching philosophy", sub: "What success looks like",
    checklist: ["What does success feel like for students?", "Signature teaching moves to preserve?", "What frustrates about the current version?"],
    captures: ["Philosophy", "Vision"], lens: { name: "Backward Design", desc: "Wiggins & McTighe" }
  },
  {
    time: "0:13", title: "Learners & context", sub: "",
    checklist: ["Level and prior knowledge", "Where do students struggle?", "Known accommodations or access needs"],
    captures: ["Learner profile", "Access needs"], lens: { name: "Andragogy + UDL", desc: "Adult learning & universal access" },
    pre: "Prerequisites: BIOL 2010 + CHEM 1410"
  },
  {
    time: "0:21", title: "Course structure & pacing", sub: "",
    checklist: ["Confirm term format", "Module count and module↔week mapping", "Seat-time and modality"],
    captures: ["Term & weeks", "Module map", "Modality"], pre: "Term: 15-week · 3 credits; Schedule: Weekly; midterm wk 8, final wk 15"
  },
  {
    time: "0:31", title: "Outcomes & alignment", sub: "",
    checklist: ["Confirm course outcomes inherit program LOs", "Refine for measurability", "Any accreditor or licensure standards?"],
    captures: ["Course LOs", "Standards"], lens: { name: "Bloom + constructive alignment", desc: "Verbs and alignment" },
    pre: "Course LO: 4 outcomes in syllabus"
  },
  {
    time: "0:43", title: "Content & materials inventory", sub: "",
    checklist: ["List every source", "Per asset: reuse/refresh/rebuild?", "IP/permissions and currency of each source"],
    captures: ["Source inventory", "Reuse decisions", "IP & rights"], pre: "Textbook: Alberts Essential Cell Biology (5th); Readings: 6 articles + reading list"
  },
  {
    time: "0:55", title: "Accessibility audit & plan", sub: "", a11y: true,
    checklist: ["Review incoming-asset audit: captions, transcripts, tagged PDFs", "Set captioning/transcript plan", "Document accessibility plan", "Confirm born-accessible authoring", "Agree WCAG 2.1 AA standard"],
    captures: ["Incoming audit reviewed", "Captioning plan", "Alt-text plan", "Document a11y", "WCAG 2.1 AA confirmed"], pre: "Incoming audit: 5 of 7 sources need remediation"
  },
  {
    time: "1:08", title: "Lecture & media plan", sub: "",
    checklist: ["Edit existing or record new?", "Assets for retain/understand/apply?", "AI-assisted media appetite"],
    captures: ["Lecture approach", "Retain/understand/apply"], pre: "Existing media: 4 raw recordings"
  },
  {
    time: "1:18", title: "Assessments, activities & discussions", sub: "",
    checklist: ["Confirm grading scheme", "Interactives, assignments, discussion?", "Academic integrity and feedback"],
    captures: ["Assessment plan", "Activities"], pre: "Grading: exams 40 · labs 30 · quizzes 20 · participation 10"
  },
  {
    time: "1:27", title: "Technology, tools & integrations", sub: "",
    checklist: ["Canvas template/shell availability", "Authoring & interactive tools (H5P, Articulate)", "Data, privacy, restricted-content"],
    captures: ["Canvas/template", "Tools & LTI"]
  },
  {
    time: "1:33", title: "Timeline, roles & faculty availability", sub: "",
    checklist: ["Development window and target launch", "Faculty time commitment", "Milestones and review cadence"],
    captures: ["Timeline", "Faculty availability"]
  },
  {
    time: "1:41", title: "Recap & next steps", sub: "",
    checklist: ["Read back captured intake and accessibility plan", "Immediate to-dos: who sends what", "Schedule the prototype-module review"],
    captures: ["Confirmed intake", "Actions"]
  }
];

const A11Y_CRITERIA = [
  { id: "1.1.1", level: "A", name: "Non-text content", status: "pass" },
  { id: "1.2.1", level: "A", name: "Audio-only & transcripts", status: "warn" },
  { id: "1.2.2", level: "A", name: "Captions (prerecorded)", status: "warn" },
  { id: "1.3.1", level: "A", name: "Info & relationships", status: "warn" },
  { id: "1.4.3", level: "AA", name: "Contrast", status: "warn" },
  { id: "2.1.1", level: "A", name: "Keyboard accessible", status: "pass" },
  { id: "2.4.6", level: "AA", name: "Headings & labels", status: "pass" },
  { id: "3.1.5", level: "AAA", name: "Reading level", status: "monitor" },
  { id: "4.1.2", level: "A", name: "Name, role, value", status: "pass" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProjectIntake() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: gateStatus } = useGetProjectGateStatus(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectGateStatusQueryKey(projectId) }
  });

  const { data: courses } = useListCourses(projectId, {
    query: { enabled: !!projectId, queryKey: getListCoursesQueryKey(projectId) }
  });

  const { data: objectives } = useListObjectives(projectId, {
    query: { enabled: !!projectId, queryKey: getListObjectivesQueryKey(projectId) }
  });

  const { data: intakeProgress } = useGetIntakeProgress(projectId, {
    query: { enabled: !!projectId, queryKey: getGetIntakeProgressQueryKey(projectId) }
  });

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const createObjective = useCreateObjective();
  const deleteObjective = useDeleteObjective();
  const updateIntake = useUpdateIntakeProgress();
  const createLedger = useCreateLedgerEntry();
  const advanceStage = useAdvanceProjectStage();

  const course = courses?.[0] ?? null;
  const courseObjectives = (objectives ?? []).filter((o) => o.level === "course");

  const logLedger = (entryType: string, content: string) => {
    createLedger.mutate(
      { projectId, data: { entryType, content, authorName: "Intake" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/projects", projectId, "ledger"] });
        },
      }
    );
  };

  // State
  const [agendaChecks, setAgendaChecks] = useState<boolean[][]>(SEGMENTS.map(s => s.checklist.map(() => false)));
  const [openSegments, setOpenSegments] = useState<Set<number>>(new Set([0]));
  const [confirmedPre, setConfirmedPre] = useState<Set<number>>(new Set());
  const [activeTimer, setActiveTimer] = useState<{ segIdx: number, elapsed: number } | null>(null);
  const [segStatuses, setSegStatuses] = useState<('todo' | 'doing' | 'done')[]>(SEGMENTS.map(() => 'todo'));
  const [filterCat, setFilterCat] = useState('all');
  const [inventorySelections, setInventorySelections] = useState<Record<number, string>>(
    INVENTORY.reduce((acc, item) => ({ ...acc, [item.id]: item.decision }), {})
  );
  const [activityFeed, setActivityFeed] = useState<{ time: string, msg: string }[]>([]);
  const [autoRules, setAutoRules] = useState({ r1: true, r2: true, r3: true, r4: false });
  const [deepProbes, setDeepProbes] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});

  // Course record form
  const [courseForm, setCourseForm] = useState({ title: "", creditHours: "", termWeeks: "", moduleCount: "" });
  const [courseFormReady, setCourseFormReady] = useState(false);
  const [newObjective, setNewObjective] = useState("");

  // Persistence
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  // Reset hydration state when navigating between projects (component may be reused)
  const prevProjectIdRef = useRef(projectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      hydratedRef.current = false;
      lastSavedRef.current = "";
      setCourseFormReady(false);
    }
  }, [projectId]);

  // Hydrate course form once the course record loads
  useEffect(() => {
    if (course && !courseFormReady) {
      setCourseForm({
        title: course.title ?? "",
        creditHours: course.creditHours != null ? String(course.creditHours) : "",
        termWeeks: course.termWeeks != null ? String(course.termWeeks) : "",
        moduleCount: course.moduleCount != null ? String(course.moduleCount) : "",
      });
      setCourseFormReady(true);
    }
  }, [course, courseFormReady]);

  // Hydrate intake progress once
  useEffect(() => {
    if (!intakeProgress || hydratedRef.current) return;
    hydratedRef.current = true;

    if (Array.isArray(intakeProgress.agendaChecks) && intakeProgress.agendaChecks.length === SEGMENTS.length) {
      setAgendaChecks(intakeProgress.agendaChecks);
    }
    if (Array.isArray(intakeProgress.segStatuses) && intakeProgress.segStatuses.length === SEGMENTS.length) {
      setSegStatuses(intakeProgress.segStatuses as ('todo' | 'doing' | 'done')[]);
    }
    if (Array.isArray(intakeProgress.confirmedPre)) {
      setConfirmedPre(new Set(intakeProgress.confirmedPre));
    }
    if (intakeProgress.notes && typeof intakeProgress.notes === "object") {
      const parsedNotes: Record<number, string> = {};
      for (const [k, v] of Object.entries(intakeProgress.notes)) parsedNotes[Number(k)] = v;
      setNotes(parsedNotes);
    }
    if (intakeProgress.inventorySelections && typeof intakeProgress.inventorySelections === "object") {
      const parsedInv: Record<number, string> = {};
      for (const [k, v] of Object.entries(intakeProgress.inventorySelections)) parsedInv[Number(k)] = v;
      if (Object.keys(parsedInv).length > 0) setInventorySelections(parsedInv);
    }
    if (intakeProgress.autoRules && typeof intakeProgress.autoRules === "object" && Object.keys(intakeProgress.autoRules).length > 0) {
      setAutoRules((prev) => ({ ...prev, ...(intakeProgress.autoRules as Record<string, boolean>) }));
    }

    // Seed last-saved so the first autosave doesn't redundantly re-write loaded state
    lastSavedRef.current = JSON.stringify({
      agendaChecks: intakeProgress.agendaChecks,
      segStatuses: intakeProgress.segStatuses,
      confirmedPre: intakeProgress.confirmedPre,
      notes: intakeProgress.notes,
      inventorySelections: intakeProgress.inventorySelections,
      autoRules: intakeProgress.autoRules,
    });
  }, [intakeProgress]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTimer) {
      interval = setInterval(() => {
        setActiveTimer(prev => prev ? { ...prev, elapsed: prev.elapsed + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Debounced autosave of intake progress
  useEffect(() => {
    if (!hydratedRef.current || !projectId) return;

    const notesPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(notes)) if (v) notesPayload[k] = v;
    const invPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(inventorySelections)) invPayload[String(k)] = v;

    const snapshot = JSON.stringify({
      agendaChecks,
      segStatuses,
      confirmedPre: Array.from(confirmedPre),
      notes: notesPayload,
      inventorySelections: invPayload,
      autoRules,
    });
    if (snapshot === lastSavedRef.current) return;
    // Avoid overlapping in-flight saves; this effect re-runs when isPending settles.
    if (updateIntake.isPending) return;

    const handle = setTimeout(() => {
      updateIntake.mutate(
        {
          projectId,
          data: {
            agendaChecks,
            segStatuses,
            confirmedPre: Array.from(confirmedPre),
            notes: notesPayload,
            inventorySelections: invPayload,
            autoRules,
          },
        },
        {
          // Only mark as saved once the server confirms; on failure we leave
          // lastSavedRef stale so the next change (or settle) retries.
          onSuccess: () => {
            lastSavedRef.current = snapshot;
          },
          onError: () => {
            toast({ title: "Couldn't save intake progress", description: "Your changes will retry automatically.", variant: "destructive" });
          },
        }
      );
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaChecks, segStatuses, confirmedPre, notes, inventorySelections, autoRules, projectId, updateIntake.isPending]);

  const toggleSegment = (idx: number) => {
    const next = new Set(openSegments);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setOpenSegments(next);
  };

  const logActivity = (msg: string) => {
    setActivityFeed(prev => [{ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), msg }, ...prev].slice(0, 50));
  };

  const handleTimerToggle = (idx: number) => {
    if (activeTimer?.segIdx === idx) {
      // Stop
      setActiveTimer(null);
      logActivity(`Paused timer for segment ${idx + 1}`);
    } else {
      // Start
      if (activeTimer) {
        logActivity(`Paused timer for segment ${activeTimer.segIdx + 1}`);
      }
      setActiveTimer({ segIdx: idx, elapsed: 0 });
      logActivity(`Started timer for segment ${idx + 1}`);
      if (autoRules.r1 && segStatuses[idx] === 'todo') {
        const nextStatuses = [...segStatuses];
        nextStatuses[idx] = 'doing';
        setSegStatuses(nextStatuses);
      }
      if (!openSegments.has(idx)) {
        setOpenSegments(prev => new Set([...prev, idx]));
      }
    }
  };

  const handleCheck = (segIdx: number, checkIdx: number) => {
    const nextChecks = [...agendaChecks];
    nextChecks[segIdx] = [...nextChecks[segIdx]];
    nextChecks[segIdx][checkIdx] = !nextChecks[segIdx][checkIdx];
    setAgendaChecks(nextChecks);

    if (autoRules.r2) {
      const allDone = nextChecks[segIdx].every(Boolean);
      if (allDone && segStatuses[segIdx] !== 'done') {
        const nextStatuses = [...segStatuses];
        nextStatuses[segIdx] = 'done';
        setSegStatuses(nextStatuses);
        logActivity(`Segment ${segIdx + 1} marked Done`);
        logLedger(
          SEGMENTS[segIdx].a11y ? "accessibility_finding" : "design_decision",
          `Kickoff segment completed: "${SEGMENTS[segIdx].title}"`
        );
        
        if (activeTimer?.segIdx === segIdx) {
          setActiveTimer(null);
          logActivity(`Stopped timer for segment ${segIdx + 1}`);
        }

        if (autoRules.r3 && segIdx < SEGMENTS.length - 1) {
          setTimeout(() => {
            const nextIdx = segIdx + 1;
            setOpenSegments(prev => new Set([...prev, nextIdx]));
            setActiveTimer({ segIdx: nextIdx, elapsed: 0 });
            logActivity(`Auto-started segment ${nextIdx + 1}`);
            if (autoRules.r1) {
                setSegStatuses(prev => {
                    const n = [...prev];
                    if (n[nextIdx] === 'todo') n[nextIdx] = 'doing';
                    return n;
                });
            }
          }, 1000);
        }
      }
    }
  };

  const handleConfirmPre = (segIdx: number) => {
    setConfirmedPre(prev => new Set([...prev, segIdx]));
    logActivity(`Confirmed pre-filled data for segment ${segIdx + 1}`);
  };

  const toNum = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSaveCourse = () => {
    const title = courseForm.title.trim() || project?.title || "Untitled course";
    const data = {
      title,
      creditHours: toNum(courseForm.creditHours),
      termWeeks: toNum(courseForm.termWeeks),
      moduleCount: toNum(courseForm.moduleCount),
    };
    if (course) {
      updateCourse.mutate(
        { id: course.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey(projectId) });
            queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
            toast({ title: "Course record updated" });
          },
          onError: () => toast({ title: "Failed to update course", variant: "destructive" }),
        }
      );
    } else {
      createCourse.mutate(
        { projectId, data },
        {
          onSuccess: () => {
            setCourseFormReady(true);
            queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey(projectId) });
            queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
            toast({ title: "Course record initialized" });
            logLedger("design_decision", `Course record initialized: ${title}`);
          },
          onError: () => toast({ title: "Failed to create course", variant: "destructive" }),
        }
      );
    }
  };

  const handleAddObjective = () => {
    const text = newObjective.trim();
    if (!text) return;
    createObjective.mutate(
      { projectId, data: { level: "course", text } },
      {
        onSuccess: () => {
          setNewObjective("");
          queryClient.invalidateQueries({ queryKey: getListObjectivesQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
          logLedger("design_decision", `Course outcome added: ${text}`);
        },
        onError: () => toast({ title: "Failed to add outcome", variant: "destructive" }),
      }
    );
  };

  const handleDeleteObjective = (id: number) => {
    deleteObjective.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListObjectivesQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
        },
        onError: () => toast({ title: "Failed to remove outcome", variant: "destructive" }),
      }
    );
  };

  const handleAdvance = () => {
    advanceStage.mutate(
      { id: projectId, data: { notes: "Kickoff & Intake completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
          logLedger("approval", "Kickoff & Intake stage completed, advanced to Backward Design");
          toast({ title: "Advanced to Backward Design" });
        },
        onError: () => {
          // Server enforces the gate too; refresh so the panel reflects reality.
          queryClient.invalidateQueries({ queryKey: getGetProjectGateStatusQueryKey(projectId) });
          toast({ title: "Cannot advance yet", description: "Resolve the gate requirements first.", variant: "destructive" });
        },
      }
    );
  };

  if (!project || intakeProgress === undefined) return <div className="p-8 font-sans">Loading...</div>;

  const stage0Requirements = gateStatus?.stage === 0 ? gateStatus.requirements : [];
  const canAdvance = gateStatus?.stage === 0 && gateStatus.canAdvance;

  const totalChecks = agendaChecks.flat().length;
  const completedChecks = agendaChecks.flat().filter(Boolean).length;
  const progressPct = Math.round((completedChecks / totalChecks) * 100);

  return (
    <div className="w-full min-h-screen bg-background text-foreground font-sans">
      {/* Stage strip */}
      <div className="flex flex-wrap items-center gap-2 px-8 py-3 text-sm font-medium border-b bg-card">
        <span className="text-muted-foreground mr-2 uppercase text-xs tracking-wider">Stages:</span>
        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-sm">
          <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
          Kickoff & Intake
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-muted-foreground px-3 py-1 rounded-full">
          <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
          Backward Design
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-muted-foreground px-3 py-1 rounded-full">
          <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
          Prototype
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-muted-foreground px-3 py-1 rounded-full text-xs">4 Production</div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-muted-foreground px-3 py-1 rounded-full text-xs">5 QA</div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2 text-muted-foreground px-3 py-1 rounded-full text-xs">6 Handoff</div>
      </div>

      {/* Accessibility thread */}
      <div className="flex items-center px-8 py-2 bg-purple-50 text-purple-800 text-xs shadow-inner">
        <div className="flex items-center gap-1 font-bold tracking-tight">
          Accessibility, continuous <Plus className="w-3 h-3" />
        </div>
        <div className="h-px bg-gradient-to-r from-purple-800/40 to-transparent flex-1 mx-4"></div>
        <div className="font-medium text-purple-700">
          Audited at intake · built in by design · verified at every gate, never bolted on at the end.
        </div>
      </div>

      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Kickoff & Intake</h1>
          <div className="text-muted-foreground mt-2 font-medium">
            <span className="text-foreground">{project.title}</span> <span className="opacity-50 mx-2">·</span> {project.clientName || 'Unknown Client'}
          </div>
          <p className="text-muted-foreground mt-4 max-w-[74ch] leading-relaxed">
            A logical path through the kickoff: prepare the materials, meet and work the agenda, then wrap by planning what's next.
          </p>
        </div>

        {/* Card 1: Goals */}
        <Card className="shadow-sm border-border">
          <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
            <CardTitle className="text-lg">Goals & timeline</CardTitle>
            <CardDescription className="m-0">~17 weeks · stage-gated</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Kickoff completeness", due: "due today · Wk 0", desc: "100% of intake parts covered and the accessibility audit run before we close.", p: progressPct },
                { title: "Aligned, measurable outcomes", due: "due Wk 3", desc: "100% of module objectives mapped to a course outcome and ≥1 assessment", p: 0 },
                { title: "Accessibility conformance", due: "Wk 0→16", desc: "100% of incoming assets audited; 0 critical WCAG 2.1 AA issues at QA", p: 80 },
                { title: "Faculty-approved prototype", due: "due Wk 4", desc: "", p: 0 },
                { title: "Evidence-based media", due: "Wk 5→14", desc: "", p: 0 },
                { title: "On-time delivery", due: "due Wk 17", desc: "14 of 14 modules built with 6 of 6 stage gates passed", p: 0 },
              ].map((g, i) => (
                <div key={i} className="flex flex-col border border-border p-4 rounded-xl bg-card/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm leading-tight text-foreground">{g.title}</div>
                    <Badge variant="secondary" className="bg-blue-50 hover:bg-blue-50 text-blue-700 border-none shrink-0 ml-2 shadow-none">{g.due}</Badge>
                  </div>
                  {g.desc && <div className="text-muted-foreground text-[13px] leading-snug mb-4 flex-1">{g.desc}</div>}
                  <div className="flex items-center gap-3 mt-auto">
                    <Progress value={g.p} className="h-2 flex-1 [&>div]:bg-primary" />
                    <span className="text-xs font-mono font-medium">{g.p}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Timeline & gates</div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                {[
                  { lbl: "Wk 0 · Kickoff & intake", active: true },
                  { lbl: "Wk 1–3 · Backward design / Gate: alignment", active: false },
                  { lbl: "Wk 4 · Prototype module / Gate: faculty sign-off", active: false },
                  { lbl: "Wk 5–14 · Production", active: false },
                  { lbl: "Wk 15–16 · QA & accessibility", active: false },
                  { lbl: "Wk 17 · Handoff", active: false }
                ].map((s, i) => (
                  <div key={i} className={`flex-shrink-0 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${s.active ? 'border-primary bg-primary/5 text-primary' : 'bg-muted/30 text-muted-foreground border-transparent'}`}>
                    {s.lbl}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Accessibility Tracker */}
        <Card className="border-purple-200 shadow-sm overflow-hidden">
          <CardHeader className="px-5 py-4 border-b border-purple-100 bg-purple-50/30 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-purple-900">Accessibility tracker</CardTitle>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none shadow-none">WCAG 2.1 AA · transparent & auditable</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 border border-purple-100 rounded-xl bg-white">
                <div className="text-3xl font-bold text-purple-900 mb-1">80<span className="text-xl">%</span></div>
                <div className="text-xs font-medium text-purple-600/80 uppercase tracking-wider">Conformance</div>
              </div>
              <div className="p-4 border border-purple-100 rounded-xl bg-white">
                <div className="text-3xl font-bold text-foreground mb-1">7</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sources audited</div>
              </div>
              <div className="p-4 border border-purple-100 rounded-xl bg-white">
                <div className="text-3xl font-bold text-amber-600 mb-1">5</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open issues</div>
              </div>
              <div className="p-4 border border-purple-100 rounded-xl bg-white">
                <div className="text-3xl font-bold text-green-600 mb-1">0</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</div>
              </div>
            </div>
            
            <div className="mb-8">
              <Progress value={80} className="h-2 bg-purple-100 [&>div]:bg-purple-600" />
              <div className="text-sm text-muted-foreground mt-2">Currently tracking 5 open issues across 7 incoming sources. Target: 0 critical issues at QA.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-semibold text-sm mb-4">WCAG 2.1 AA success criteria tracked</h4>
                <div className="space-y-2">
                  {A11Y_CRITERIA.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.id}</span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{c.level}</span>
                      </div>
                      {c.status === 'pass' && <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Pass</Badge>}
                      {c.status === 'warn' && <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Partial</Badge>}
                      {c.status === 'monitor' && <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Monitor</Badge>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-4">Remediation queue</h4>
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 p-3 border border-amber-200 bg-amber-50/30 rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Lecture recordings (4)</span>
                      <Badge variant="outline" className="bg-white border-amber-200 text-amber-800">High</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span className="font-mono bg-white px-1 border rounded">1.2.2</span>
                      <span>Missing captions & transcripts</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs font-medium">
                      <span>Owner: ID Team</span>
                      <span>Target: Wk 5</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-3 border border-amber-200 bg-amber-50/30 rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Lecture-deck.pptx</span>
                      <Badge variant="outline" className="bg-white border-amber-200 text-amber-800">Med</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span className="font-mono bg-white px-1 border rounded">1.1.1</span>
                      <span className="font-mono bg-white px-1 border rounded">1.4.3</span>
                      <span>Missing alt text, low contrast</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs font-medium">
                      <span>Owner: Faculty</span>
                      <span>Target: Wk 2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-t pt-8">
              <div>
                <h4 className="font-semibold text-sm mb-4">How it's checked · method disclosure</h4>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  <li><strong className="text-foreground font-medium">Automated:</strong> axe-core & IBM Equal Access (catches ~30% of issues)</li>
                  <li><strong className="text-foreground font-medium">Manual:</strong> Keyboard navigation, screen-reader spot checks, captions QA, reading level analysis</li>
                  <li><strong className="text-foreground font-medium">Standard:</strong> WCAG 2.1 AA (no exceptions)</li>
                </ul>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">Generate conformance report (ACR)</Button>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-4">Audit trail · Evidence Ledger</h4>
                <div className="h-32 overflow-y-auto border rounded-lg bg-muted/20 p-4 space-y-3">
                  <div className="text-xs">
                    <span className="text-muted-foreground font-mono mr-2">Today 09:41</span>
                    <span className="font-medium text-purple-700">Audit completed:</span>
                    <span className="text-muted-foreground ml-1">7 incoming sources parsed. 5 issues flagged for remediation.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-800/60 mb-3">Continuous, verified at every gate</div>
              <div className="flex flex-wrap justify-center gap-2 text-sm font-medium">
                <div className="px-4 py-1.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 shadow-sm">Intake (Audit)</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground">Design (Born-accessible)</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground">Production (Remediate)</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground">QA (Verify)</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground">Handoff (Conformance)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 items-start">
          
          {/* LEFT COLUMN */}
          <div className="space-y-10">
            
            {/* Phase 1 */}
            <div>
              <h3 className="font-extrabold text-xl text-primary mb-4 flex items-center gap-3">
                <span className="bg-primary text-primary-foreground w-7 h-7 rounded-md flex items-center justify-center text-sm">1</span>
                Prepare <span className="opacity-40 font-normal">· gather & audit materials</span>
              </h3>
              
              <Card className="shadow-sm border-border">
                <CardHeader className="px-5 py-4 border-b border-border bg-card">
                  <CardTitle className="text-lg">Materials</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 border-b border-border">
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Source documents · parse to pre-fill the agenda</div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                        <Badge variant="destructive" className="rounded text-[10px] px-1.5">PDF</Badge>
                        <div>
                          <div className="font-semibold text-sm">BIOL3050_Syllabus_F23.pdf</div>
                          <div className="text-xs text-muted-foreground">Outcomes · 15-week schedule</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                        <Badge className="bg-blue-500 hover:bg-blue-600 rounded text-[10px] px-1.5 border-none">DOC</Badge>
                        <div>
                          <div className="font-semibold text-sm">Course_Outline_v2.docx</div>
                          <div className="text-xs text-muted-foreground">Topic sequence & weekly breakdown</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer mb-6">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-foreground">Upload syllabus / outline</div>
                      <div className="text-sm text-muted-foreground mt-1">Drop or browse: PDF, Word, text</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button className="font-semibold shadow-sm">Parse & pre-fill</Button>
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Parsed successfully
                      </span>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/10">
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">All media & assets · type-detected and accessibility-flagged on arrival</div>
                    
                    <div className="border-2 border-dashed border-border bg-card rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer mb-6">
                      <div className="font-semibold text-foreground text-sm">Upload media assets</div>
                      <div className="text-xs text-muted-foreground mt-1">Drop or browse: PPT, MP4, images</div>
                    </div>

                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                      {['All', 'Slides', 'Video', 'PDF', 'Doc', 'Image'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setFilterCat(cat.toLowerCase())}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${filterCat === cat.toLowerCase() ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Asset</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Decision</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rights</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Accessibility</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {INVENTORY.map(item => (
                            <tr key={item.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium text-foreground">{item.asset}</td>
                              <td className="px-4 py-3">
                                <div className="inline-flex rounded-md shadow-sm">
                                  {['Reuse', 'Refresh', 'Rebuild'].map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => setInventorySelections(prev => ({...prev, [item.id]: opt}))}
                                      className={`px-2.5 py-1 text-xs font-medium border-y border-l first:border-l last:border-r first:rounded-l-md last:rounded-r-md transition-colors
                                        ${inventorySelections[item.id] === opt 
                                          ? 'bg-primary text-primary-foreground border-primary z-10 relative' 
                                          : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{item.rights}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={`font-normal text-xs ${item.a11yWarn ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                                  {item.a11yWarn && <AlertTriangle className="w-3 h-3 mr-1" />}
                                  {!item.a11yWarn && <Check className="w-3 h-3 mr-1" />}
                                  {item.a11y}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Phase 2 */}
            <div>
              <h3 className="font-extrabold text-xl text-primary mb-4 flex items-center gap-3">
                <span className="bg-primary text-primary-foreground w-7 h-7 rounded-md flex items-center justify-center text-sm">2</span>
                Meet <span className="opacity-40 font-normal">· run the agenda</span>
              </h3>

              <Card className="shadow-sm border-border">
                <CardHeader className="px-5 py-4 border-b border-border bg-card">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Agenda</CardTitle>
                      <CardDescription className="m-0">12 segments · kickoff meeting</CardDescription>
                    </div>
                    <div>
                      <Progress value={progressPct} className="h-2 [&>div]:bg-primary" />
                      <div className="text-xs font-semibold text-muted-foreground mt-2 text-right">{completedChecks} / {totalChecks} checks</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border">
                  {SEGMENTS.map((seg, idx) => {
                    const isOpen = openSegments.has(idx);
                    const isDoing = segStatuses[idx] === 'doing';
                    const isDone = segStatuses[idx] === 'done';
                    const checksDone = agendaChecks[idx].filter(Boolean).length;
                    const allChecksDone = checksDone === seg.checklist.length;
                    
                    return (
                      <div key={idx} className={`transition-colors ${isOpen ? 'bg-card' : 'hover:bg-muted/20'} ${isDoing ? 'ring-1 ring-inset ring-primary/20 bg-primary/[0.02]' : ''}`}>
                        {/* Row Header */}
                        <div 
                          className="px-5 py-4 flex items-center gap-4 cursor-pointer select-none"
                          onClick={() => toggleSegment(idx)}
                        >
                          <div className="font-mono text-sm text-muted-foreground w-10 shrink-0">{seg.time}</div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isDoing ? 'text-primary' : 'text-foreground'}`}>{seg.title}</span>
                              {seg.a11y && <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none shadow-none text-[10px] px-1.5 py-0">Accessibility audit</Badge>}
                              {seg.pre && !confirmedPre.has(idx) && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none shadow-none text-[10px] px-1.5 py-0">1 pre-filled</Badge>}
                            </div>
                            {seg.sub && <div className="text-sm text-muted-foreground mt-0.5">{seg.sub}</div>}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Status Pill */}
                            <Badge variant="outline" className={`
                              font-semibold shadow-none border-none
                              ${isDone ? 'bg-green-100 text-green-800' : isDoing ? 'bg-blue-100 text-blue-800' : 'bg-muted text-muted-foreground'}
                            `}>
                              {isDone ? 'Done' : isDoing ? 'In progress' : 'To do'}
                            </Badge>

                            {/* Timer Button */}
                            <Button 
                              variant={activeTimer?.segIdx === idx ? "default" : "outline"} 
                              size="sm" 
                              className={`h-8 w-20 px-0 flex justify-center shadow-sm ${activeTimer?.segIdx === idx ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleTimerToggle(idx); }}
                            >
                              {activeTimer?.segIdx === idx ? (
                                <><Square className="w-3.5 h-3.5 mr-1 fill-current" /> {formatTime(activeTimer.elapsed)}</>
                              ) : (
                                <><Play className="w-3.5 h-3.5 mr-1 fill-current" /> Timer</>
                              )}
                            </Button>

                            {/* Check count */}
                            <div className="text-xs font-mono text-muted-foreground w-8 text-right">
                              {checksDone}/{seg.checklist.length}
                            </div>

                            {/* Done circle */}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                              ${isDone || allChecksDone ? 'bg-green-500 border-green-500 text-white' : 'border-border text-transparent'}
                            `}>
                              <Check className="w-4 h-4" />
                            </div>

                            {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isOpen && (
                          <div className="px-5 pb-6 pt-2 border-t border-border/50 bg-card">
                            <div className="pl-14 space-y-6">
                              
                              {seg.pre && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                                  <div className="text-sm">
                                    <strong className="text-amber-900">Pre-filled from syllabus:</strong>
                                    <span className="text-amber-800 ml-2">{seg.pre}</span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant={confirmedPre.has(idx) ? "outline" : "default"}
                                    className={confirmedPre.has(idx) ? "border-green-600 text-green-700 bg-green-50 hover:bg-green-100" : "bg-amber-600 hover:bg-amber-700 text-white"}
                                    onClick={() => handleConfirmPre(idx)}
                                  >
                                    {confirmedPre.has(idx) ? <><Check className="w-4 h-4 mr-1" /> Confirmed</> : 'Confirm'}
                                  </Button>
                                </div>
                              )}

                              {seg.lens && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-sm">
                                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none shadow-none px-1.5 py-0 mt-0.5 shrink-0">Lens</Badge>
                                  <div>
                                    <strong className="text-blue-900">{seg.lens.name}</strong>
                                    <span className="text-blue-800/70 ml-2">- {seg.lens.desc}</span>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Discussion checklist · tick as you cover</div>
                                  <div className="space-y-3">
                                    {seg.checklist.map((item, cIdx) => (
                                      <div key={cIdx} className="flex items-start gap-3 group">
                                        <Checkbox 
                                          id={`seg-${idx}-c-${cIdx}`} 
                                          checked={agendaChecks[idx][cIdx]} 
                                          onCheckedChange={() => handleCheck(idx, cIdx)}
                                          className="mt-1 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <label 
                                          htmlFor={`seg-${idx}-c-${cIdx}`}
                                          className={`text-sm leading-snug cursor-pointer transition-all ${agendaChecks[idx][cIdx] ? 'line-through text-muted-foreground opacity-70' : 'text-foreground font-medium group-hover:text-primary'}`}
                                        >
                                          {item}
                                        </label>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-border/50">
                                    <button 
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      onClick={() => {
                                        const next = new Set(deepProbes);
                                        if (next.has(idx)) next.delete(idx);
                                        else next.add(idx);
                                        setDeepProbes(next);
                                      }}
                                    >
                                      {deepProbes.has(idx) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      Dig deeper · Socratic probes
                                    </button>
                                    
                                    {deepProbes.has(idx) && (
                                      <ul className="mt-3 space-y-2 text-xs text-muted-foreground pl-4 list-disc marker:text-border">
                                        <li>If a student gets stuck here, how do they currently unblock themselves?</li>
                                        <li>What's the most common misconception about this topic?</li>
                                        <li>If you had half the time, what would you cut first?</li>
                                      </ul>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Capture notes</div>
                                  <Textarea 
                                    placeholder="Type meeting notes here..." 
                                    className="min-h-[120px] resize-y mb-3 bg-muted/20 focus-visible:bg-background border-muted-foreground/20 shadow-inner text-sm"
                                    value={notes[idx] || ''}
                                    onChange={e => setNotes(prev => ({...prev, [idx]: e.target.value}))}
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {seg.captures.map((cap, cIdx) => (
                                      <Badge key={cIdx} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-none font-medium text-xs py-1">
                                        {cap}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Phase 3 */}
            <div>
              <h3 className="font-extrabold text-xl text-primary mb-4 flex items-center gap-3">
                <span className="bg-primary text-primary-foreground w-7 h-7 rounded-md flex items-center justify-center text-sm">3</span>
                Wrap <span className="opacity-40 font-normal">· commit outcomes & advance</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course outcomes editor */}
                <Card className="shadow-sm border-border">
                  <CardHeader className="px-5 py-4 border-b border-border bg-card flex flex-row items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Course outcomes</CardTitle>
                      <CardDescription className="m-0">Measurable learning objectives carried into Backward Design</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={newObjective}
                        placeholder="e.g. Explain how cellular respiration produces ATP"
                        onChange={(e) => setNewObjective(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddObjective(); }}
                        className="h-10"
                      />
                      <Button
                        onClick={handleAddObjective}
                        disabled={!newObjective.trim() || createObjective.isPending}
                        className="shrink-0 shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>

                    {courseObjectives.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic border border-dashed rounded-lg p-6 text-center">
                        No course outcomes yet. Add at least one to pass the alignment gate.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {courseObjectives.map((obj, i) => (
                          <li key={obj.id} className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card group">
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 shrink-0">LO{i + 1}</span>
                            <span className="text-sm flex-1 leading-snug">{obj.text}</span>
                            <button
                              onClick={() => handleDeleteObjective(obj.id)}
                              className="text-muted-foreground/40 hover:text-red-600 transition-colors shrink-0"
                              aria-label="Remove outcome"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Gate readiness */}
                <Card className="shadow-sm border-border">
                  <CardHeader className="px-5 py-4 border-b border-border bg-card">
                    <CardTitle className="text-lg">Gate readiness</CardTitle>
                    <CardDescription className="m-0">Requirements to advance to Backward Design</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      {stage0Requirements.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">
                          {gateStatus && gateStatus.stage > 0
                            ? "This project has already advanced past Kickoff & Intake."
                            : "Loading gate status…"}
                        </div>
                      ) : (
                        stage0Requirements.map((r, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${r.met ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground border border-border'}`}>
                              {r.met ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className={`font-medium ${r.met ? 'text-foreground' : 'text-foreground'}`}>{r.label}</div>
                              {!r.met && r.detail && <div className="text-xs text-amber-700 mt-0.5">{r.detail}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {gateStatus && gateStatus.stage === 0 && (
                      <Button
                        className="w-full font-semibold shadow-sm"
                        onClick={handleAdvance}
                        disabled={!canAdvance || advanceStage.isPending}
                      >
                        {advanceStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Advance to Backward Design
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    {gateStatus && gateStatus.stage > 0 && (
                      <Button asChild variant="outline" className="w-full font-semibold">
                        <Link href={`/projects/${projectId}/design`}>
                          Go to Backward Design
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 sticky top-8">
            <Card className="shadow-sm border-border">
              <CardHeader className="px-5 py-4 border-b border-border bg-card">
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted/50" />
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-primary transition-all duration-500 ease-in-out" strokeDasharray={`${Math.max(progressPct * 1.75, 0)} 200`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold">{progressPct}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Kickoff Progress</div>
                    <div className="text-sm text-muted-foreground">{completedChecks} of {totalChecks} checklist items covered</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { label: "Prepare", status: "done" },
                    { label: "Meet", status: "doing" },
                    { label: "Wrap", status: "todo" },
                  ].map((phase, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{phase.label}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`
                          font-semibold shadow-none border-none text-[10px] uppercase tracking-wider px-2 py-0 h-5
                          ${phase.status === 'done' ? 'bg-green-100 text-green-800' : phase.status === 'doing' ? 'bg-blue-100 text-blue-800' : 'bg-muted text-muted-foreground'}
                        `}>
                          {phase.status === 'done' ? 'Done' : phase.status === 'doing' ? 'In progress' : 'To do'}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                          {phase.status === 'doing' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {activeTimer && (
                  <div className="pt-4 border-t border-border flex items-center gap-3 text-sm font-medium text-red-600 bg-red-50/50 p-3 rounded-lg border-red-100">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    Running: Segment {activeTimer.segIdx + 1}
                    <span className="font-mono ml-auto bg-white px-2 py-0.5 rounded shadow-sm border border-red-100">{formatTime(activeTimer.elapsed)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-border">
              <CardHeader className="px-5 py-4 border-b border-border bg-card">
                <CardTitle className="text-lg">Automation & time</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <Checkbox id="a1" checked={autoRules.r1} onCheckedChange={(c) => setAutoRules(p => ({...p, r1: !!c}))} className="mt-0.5" />
                    <label htmlFor="a1" className="text-sm text-muted-foreground leading-snug cursor-pointer">When a timer starts &rarr; mark the part In progress.</label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox id="a2" checked={autoRules.r2} onCheckedChange={(c) => setAutoRules(p => ({...p, r2: !!c}))} className="mt-0.5" />
                    <label htmlFor="a2" className="text-sm text-muted-foreground leading-snug cursor-pointer">When a part's checklist is fully covered &rarr; mark Done, stop timer, log time.</label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox id="a3" checked={autoRules.r3} onCheckedChange={(c) => setAutoRules(p => ({...p, r3: !!c}))} className="mt-0.5" />
                    <label htmlFor="a3" className="text-sm text-muted-foreground leading-snug cursor-pointer">When a part is Done &rarr; open the next part and start its timer.</label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox id="a4" checked={autoRules.r4} onCheckedChange={(c) => setAutoRules(p => ({...p, r4: !!c}))} className="mt-0.5" />
                    <label htmlFor="a4" className="text-sm text-muted-foreground leading-snug cursor-pointer">When action items are captured &rarr; draft a note to faculty.</label>
                  </div>
                </div>

                <div className="h-40 overflow-y-auto border border-border rounded-lg bg-muted/20 p-4 space-y-3 font-mono text-[11px] leading-tight">
                  {activityFeed.length === 0 ? (
                    <div className="text-muted-foreground/60 h-full flex items-center justify-center italic text-center font-sans">
                      Start a timer or finish a part to see automations fire.
                    </div>
                  ) : (
                    activityFeed.map((item, i) => (
                      <div key={i} className="flex gap-3 text-muted-foreground">
                        <span className="text-foreground/40 shrink-0">{item.time}</span>
                        <span className="text-foreground/80">{item.msg}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-3 text-center uppercase tracking-wider font-semibold">
                  One timer runs at a time. Starting a new part pauses the last.
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
              <CardHeader className="px-5 py-4 border-b border-border bg-card flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Course structure & pacing</CardTitle>
                {course ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Saved</Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Not initialized</Badge>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Course title</label>
                  <Input
                    value={courseForm.title}
                    placeholder={project.title}
                    onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 h-9"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "creditHours", label: "Credits" },
                    { key: "termWeeks", label: "Weeks" },
                    { key: "moduleCount", label: "Modules" },
                  ] as const).map((f) => (
                    <div key={f.key} className="p-3 border border-border rounded-lg text-center bg-card shadow-sm">
                      <Input
                        type="number"
                        min={0}
                        value={courseForm[f.key]}
                        onChange={(e) => setCourseForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="h-9 text-center text-lg font-bold border-0 shadow-none focus-visible:ring-1 px-0"
                        placeholder="-"
                      />
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">{f.label}</div>
                    </div>
                  ))}
                </div>

                {toNum(courseForm.termWeeks) ? (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: Math.min(toNum(courseForm.termWeeks) || 0, 30) }).map((_, i) => {
                      const wk = i + 1;
                      return (
                        <div key={i} className="flex flex-col items-center justify-center p-2 border rounded-md shadow-sm text-xs bg-card border-border">
                          <div className="font-semibold text-[10px] uppercase tracking-wider opacity-60">Wk {wk}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <Button
                  className="w-full font-semibold shadow-sm"
                  onClick={handleSaveCourse}
                  disabled={createCourse.isPending || updateCourse.isPending}
                >
                  {(createCourse.isPending || updateCourse.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {course ? "Save course record" : "Initialize course record"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-muted/10">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-lg">Design foundations</CardTitle>
                <CardDescription className="m-0">What the build rests on</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><strong className="text-foreground font-semibold">Adult learning:</strong> Andragogy (Knowles) · Experiential learning (Kolb)</li>
                  <li><strong className="text-foreground font-semibold">Design process:</strong> Backward Design (UbD) · ADDIE / SAM</li>
                  <li><strong className="text-foreground font-semibold">Outcomes:</strong> Bloom's taxonomy · Constructive alignment (Biggs)</li>
                  <li><strong className="text-foreground font-semibold">Cognition:</strong> Cognitive Load (Sweller) · Multimedia learning (Mayer) · Retrieval & spaced practice</li>
                  <li><strong className="text-foreground font-semibold">Instruction:</strong> Gagné's Nine Events · Merrill's First Principles</li>
                  <li><strong className="text-foreground font-semibold">Access:</strong> Universal Design for Learning (CAST)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}