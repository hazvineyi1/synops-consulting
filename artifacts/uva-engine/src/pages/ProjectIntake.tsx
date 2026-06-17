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
  useListMeetingRecordings, getListMeetingRecordingsQueryKey,
  useCreateMeetingRecording, useDeleteMeetingRecording,
  useRequestUploadUrl, useGenerateIntakeAgenda,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Check, ChevronDown, ChevronUp, Play, Square,
  UploadCloud,
  AlertTriangle, Building2,
  CheckCircle2, Trash2, ArrowRight, Loader2, Target,
  Mic, Link2, Sparkles, Clock, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProjectWorkspace } from "@/components/engine/ProjectWorkspace";
import { DeliveryTimeline } from "@/components/engine/DeliveryTimeline";
import { DesignApproachCard } from "@/components/engine/DesignApproachCard";
import { ProjectStartTab } from "@/components/engine/ProjectStartTab";
import { KickoffInterview } from "@/components/engine/KickoffInterview";
import { getMethod, type MethodKey } from "@/lib/instructional-methods";
import type { KickoffState } from "@workspace/api-client-react";

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

  const { data: recordings } = useListMeetingRecordings(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeetingRecordingsQueryKey(projectId) }
  });
  const requestUploadUrl = useRequestUploadUrl();
  const createRecording = useCreateMeetingRecording();
  const deleteRecording = useDeleteMeetingRecording();
  const generateAgenda = useGenerateIntakeAgenda();

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
  const [timersEnabled, setTimersEnabled] = useState(false);
  const [segStatuses, setSegStatuses] = useState<('todo' | 'doing' | 'done')[]>(SEGMENTS.map(() => 'todo'));
  const [filterCat, setFilterCat] = useState('all');
  const [inventorySelections, setInventorySelections] = useState<Record<number, string>>(
    INVENTORY.reduce((acc, item) => ({ ...acc, [item.id]: item.decision }), {})
  );
  const [activityFeed, setActivityFeed] = useState<{ time: string, msg: string }[]>([]);
  const [autoRules, setAutoRules] = useState({ r1: true, r2: true, r3: true, r4: false });
  const [deepProbes, setDeepProbes] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [kickoff, setKickoff] = useState<KickoffState>({});
  const [tab, setTab] = useState("start");

  // Course record form
  const [courseForm, setCourseForm] = useState({ title: "", creditHours: "", termWeeks: "", moduleCount: "" });
  const [courseFormReady, setCourseFormReady] = useState(false);
  const [newObjective, setNewObjective] = useState("");

  // Meeting recordings
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [pendingRec, setPendingRec] = useState<{ blob: Blob; url: string; durationSec: number } | null>(null);
  const [captureTitle, setCaptureTitle] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const recStreamRef = useRef<MediaStream | null>(null);

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
    if (intakeProgress.kickoffAnswers && typeof intakeProgress.kickoffAnswers === "object") {
      setKickoff(intakeProgress.kickoffAnswers);
    }

    // Seed last-saved so the first autosave doesn't redundantly re-write loaded state
    lastSavedRef.current = JSON.stringify({
      agendaChecks: intakeProgress.agendaChecks,
      segStatuses: intakeProgress.segStatuses,
      confirmedPre: intakeProgress.confirmedPre,
      notes: intakeProgress.notes,
      inventorySelections: intakeProgress.inventorySelections,
      autoRules: intakeProgress.autoRules,
      kickoffAnswers: intakeProgress.kickoffAnswers,
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

  // Recording elapsed-time ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecElapsed((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Revoke the local preview object URL when it is replaced or on unmount
  useEffect(() => {
    return () => {
      if (pendingRec) URL.revokeObjectURL(pendingRec.url);
    };
  }, [pendingRec]);

  // Release the microphone if the component unmounts mid-recording. Runs once on
  // unmount; refs (not state) hold the live recorder/stream so this stays current.
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // Recorder may already be inactive; ignore.
      }
      mediaRecorderRef.current = null;
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
    };
  }, []);

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
      kickoffAnswers: kickoff,
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
            kickoffAnswers: kickoff,
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
  }, [agendaChecks, segStatuses, confirmedPre, notes, inventorySelections, autoRules, kickoff, projectId, updateIntake.isPending]);

  const toggleSegment = (idx: number) => {
    // Single-open accordion: opening a segment collapses any other.
    setOpenSegments((prev) => (prev.has(idx) ? new Set() : new Set([idx])));
  };

  const logActivity = (msg: string) => {
    setActivityFeed(prev => [{ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), msg }, ...prev].slice(0, 50));
  };

  const formatDuration = (sec?: number | null) => {
    if (sec == null) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const stopRecordingTracks = () => {
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    recStreamRef.current = null;
  };

  const startRecording = async () => {
    if (isRecording) return;
    if (pendingRec) {
      URL.revokeObjectURL(pendingRec.url);
      setPendingRec(null);
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ title: "Recording not supported", description: "This browser cannot capture audio. Attach a link instead.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const durationSec = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
        setPendingRec({ blob, url: URL.createObjectURL(blob), durationSec });
        stopRecordingTracks();
      };
      mediaRecorderRef.current = recorder;
      recStartRef.current = Date.now();
      setRecElapsed(0);
      recorder.start();
      setIsRecording(true);
    } catch {
      // getUserMedia may have granted the stream before the recorder failed; make
      // sure the microphone is released so it does not stay live in the background.
      stopRecordingTracks();
      mediaRecorderRef.current = null;
      toast({ title: "Microphone blocked", description: "Allow microphone access to record, or attach a link instead.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const discardPending = () => {
    if (pendingRec) URL.revokeObjectURL(pendingRec.url);
    setPendingRec(null);
    setCaptureTitle("");
  };

  const saveRecording = async () => {
    if (!pendingRec) return;
    const contentType = pendingRec.blob.type || "audio/webm";
    const ext = contentType.includes("mp4") ? "mp4" : contentType.includes("ogg") ? "ogg" : "webm";
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { contentType, size: pendingRec.blob.size, name: `kickoff-recording.${ext}` },
      });
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: pendingRec.blob,
      });
      if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);
      await createRecording.mutateAsync({
        projectId,
        data: {
          kind: "upload",
          title: captureTitle.trim() || "Kickoff recording",
          objectPath,
          contentType,
          sizeBytes: pendingRec.blob.size,
          durationSec: pendingRec.durationSec,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListMeetingRecordingsQueryKey(projectId) });
      logActivity("Saved a meeting recording");
      discardPending();
      toast({ title: "Recording saved" });
    } catch {
      toast({ title: "Couldn't save recording", description: "Please try again.", variant: "destructive" });
    }
  };

  const attachExternalLink = async () => {
    const url = externalUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast({ title: "Enter a valid link", description: "The link must start with http:// or https://.", variant: "destructive" });
      return;
    }
    try {
      await createRecording.mutateAsync({
        projectId,
        data: { kind: "external", title: externalTitle.trim() || "Meeting link", externalUrl: url },
      });
      queryClient.invalidateQueries({ queryKey: getListMeetingRecordingsQueryKey(projectId) });
      logActivity("Attached a meeting link");
      setExternalTitle("");
      setExternalUrl("");
      toast({ title: "Link attached" });
    } catch {
      toast({ title: "Couldn't attach link", description: "Please try again.", variant: "destructive" });
    }
  };

  const removeRecording = async (id: number) => {
    try {
      await deleteRecording.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMeetingRecordingsQueryKey(projectId) });
      logActivity("Removed a meeting recording");
    } catch {
      toast({ title: "Couldn't remove recording", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleGenerateAgenda = async () => {
    try {
      await generateAgenda.mutateAsync({ projectId });
      queryClient.invalidateQueries({ queryKey: getGetIntakeProgressQueryKey(projectId) });
      logActivity("Generated a kickoff agenda from project data");
      toast({ title: "Agenda generated", description: "A tailored agenda was drafted from this project's data." });
    } catch {
      toast({ title: "Couldn't generate agenda", description: "Please try again.", variant: "destructive" });
    }
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
        setOpenSegments(new Set([idx]));
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
            setOpenSegments(new Set([nextIdx]));
            if (timersEnabled) {
              setActiveTimer({ segIdx: nextIdx, elapsed: 0 });
              logActivity(`Auto-started segment ${nextIdx + 1}`);
            }
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

  const genAgenda = intakeProgress?.generatedAgenda ?? null;
  const recordingList = recordings ?? [];

  return (
    <ProjectWorkspace
      stageId={0}
      subtitle="Kickoff, course goals, and an audit of existing materials."
      meta={() => (
        <>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {project.clientName || "Unknown client"}
          </span>
          <span>
            {completedChecks} of {totalChecks} agenda checks covered
          </span>
        </>
      )}
    >
      {() => (
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-5">
            <TabsTrigger value="start">Start</TabsTrigger>
            <TabsTrigger value="prepare">Prepare</TabsTrigger>
            <TabsTrigger value="meet">Meet</TabsTrigger>
            <TabsTrigger value="wrap">Wrap</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>

          {/* START: project-start essentials */}
          <TabsContent value="start" className="space-y-6">
            <ProjectStartTab
              projectId={projectId}
              course={course}
              objectives={objectives ?? []}
              kickoffSummary={kickoff.summary ?? []}
              kickoffCompleted={kickoff.completed ?? false}
              onGoToKickoff={() => setTab("meet")}
            />
          </TabsContent>

          {/* PREPARE: gather and audit materials */}
          <TabsContent value="prepare" className="space-y-6">
            <DeliveryTimeline progressPct={progressPct} />

            <p className="max-w-[70ch] text-sm text-muted-foreground">
              Set the design approach, then gather the source materials and audit what already exists
              before the kickoff meeting.
            </p>

            <DesignApproachCard projectId={projectId} selectedKey={project.designMethod ?? null} />

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border bg-card px-5 py-4">
                <CardTitle className="text-lg">Materials</CardTitle>
                <CardDescription className="m-0">
                  Source documents and media, type-detected and accessibility-flagged on arrival.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-5 border-b border-border p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Source documents</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Parse these to pre-fill the kickoff agenda.
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/10"
                    >
                      2 detected
                    </Badge>
                  </div>

                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    <li className="flex items-center gap-3 p-3">
                      <Badge variant="destructive" className="shrink-0 rounded px-1.5 text-[10px]">PDF</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">BIOL3050_Syllabus_F23.pdf</div>
                        <div className="truncate text-xs text-muted-foreground">Outcomes · 15-week schedule</div>
                      </div>
                      <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-green-600 sm:flex">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Ready
                      </span>
                    </li>
                    <li className="flex items-center gap-3 p-3">
                      <Badge className="shrink-0 rounded border-none bg-blue-500 px-1.5 text-[10px] hover:bg-blue-600">DOC</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">Course_Outline_v2.docx</div>
                        <div className="truncate text-xs text-muted-foreground">Topic sequence and weekly breakdown</div>
                      </div>
                      <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-green-600 sm:flex">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Ready
                      </span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">Upload syllabus or outline</span>
                      <span className="block text-xs text-muted-foreground">Drop or browse: PDF, Word, text</span>
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
                    <Button className="font-semibold shadow-sm">Parse and pre-fill</Button>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Parsed successfully
                    </span>
                  </div>
                </div>

                <Collapsible className="bg-muted/10">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        All media and assets
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {INVENTORY.length} assets, {INVENTORY.filter((i) => i.a11yWarn).length} need accessibility remediation. Reuse, refresh, or rebuild.
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
                  <div className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:bg-muted/30">
                    <div className="text-sm font-semibold text-foreground">Upload media assets</div>
                    <div className="mt-1 text-xs text-muted-foreground">Drop or browse: PPT, MP4, images</div>
                  </div>

                  <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                    {["All", "Slides", "Video", "PDF", "Doc", "Image"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCat(cat.toLowerCase())}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          filterCat === cat.toLowerCase()
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-80 overflow-auto rounded-xl border bg-card">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 border-b border-border bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Asset</th>
                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Decision</th>
                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rights</th>
                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accessibility</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {INVENTORY.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium text-foreground">{item.asset}</td>
                            <td className="px-3 py-2">
                              <div className="inline-flex rounded-md shadow-sm">
                                {["Reuse", "Refresh", "Rebuild"].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setInventorySelections((prev) => ({ ...prev, [item.id]: opt }))}
                                    className={`border-y border-l px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md first:border-l last:rounded-r-md last:border-r ${
                                      inventorySelections[item.id] === opt
                                        ? "relative z-10 border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{item.rights}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={`text-xs font-normal ${
                                  item.a11yWarn
                                    ? "border-purple-200 bg-purple-50 text-purple-800"
                                    : "border-green-200 bg-green-50 text-green-800"
                                }`}
                              >
                                {item.a11yWarn ? (
                                  <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                                )}
                                {item.a11y}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Progressive disclosure: design foundations */}
            <Collapsible>
              <Card className="border-border bg-muted/10 shadow-sm">
                <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div>
                    <div className="text-base font-semibold">Design foundations</div>
                    <div className="text-sm text-muted-foreground">What the build rests on</div>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="border-t border-border p-6">
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li><strong className="font-semibold text-foreground">Adult learning:</strong> Andragogy (Knowles) · Experiential learning (Kolb)</li>
                      <li><strong className="font-semibold text-foreground">Design process:</strong> Backward Design (UbD) · ADDIE / SAM</li>
                      <li><strong className="font-semibold text-foreground">Outcomes:</strong> Bloom's taxonomy · Constructive alignment (Biggs)</li>
                      <li><strong className="font-semibold text-foreground">Cognition:</strong> Cognitive Load (Sweller) · Multimedia learning (Mayer) · Retrieval and spaced practice</li>
                      <li><strong className="font-semibold text-foreground">Instruction:</strong> Gagne's Nine Events · Merrill's First Principles</li>
                      <li><strong className="font-semibold text-foreground">Access:</strong> Universal Design for Learning (CAST)</li>
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* MEET: run the agenda */}
          <TabsContent value="meet" className="space-y-6">
            <KickoffInterview
              designMethod={
                project.designMethod && getMethod(project.designMethod)
                  ? (project.designMethod as MethodKey)
                  : null
              }
              value={kickoff}
              onChange={setKickoff}
            />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              {/* Meeting recordings: in-browser capture or external link */}
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <CardTitle className="text-lg">Meeting recordings</CardTitle>
                      <CardDescription className="m-0">Record in the browser or attach a link</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/10">
                    {recordingList.length} saved
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    {isRecording ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
                        <span className="font-mono text-sm text-foreground">{formatDuration(recElapsed)}</span>
                        <span className="text-sm text-muted-foreground">Recording in progress</span>
                        <Button size="sm" variant="outline" className="ml-auto border-red-600 text-red-700 hover:bg-red-50" onClick={stopRecording}>
                          <Square className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" /> Stop
                        </Button>
                      </div>
                    ) : pendingRec ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                          Captured {formatDuration(pendingRec.durationSec)}. Review, then save.
                        </div>
                        <audio controls src={pendingRec.url} className="w-full" />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={captureTitle}
                            onChange={(e) => setCaptureTitle(e.target.value)}
                            placeholder="Recording title (optional)"
                            className="flex-1"
                            aria-label="Recording title"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveRecording} disabled={createRecording.isPending || requestUploadUrl.isPending}>
                              {createRecording.isPending || requestUploadUrl.isPending ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <UploadCloud className="mr-1 h-4 w-4" aria-hidden="true" />
                              )}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={discardPending}>Discard</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Capture kickoff audio directly in your browser.</span>
                        <Button size="sm" onClick={startRecording}>
                          <Mic className="mr-1 h-4 w-4" aria-hidden="true" /> Record
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Or attach a link</div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={externalTitle}
                        onChange={(e) => setExternalTitle(e.target.value)}
                        placeholder="Label (optional)"
                        className="sm:w-40"
                        aria-label="Link label"
                      />
                      <Input
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                        aria-label="Recording link"
                        inputMode="url"
                      />
                      <Button size="sm" variant="outline" onClick={attachExternalLink} disabled={createRecording.isPending}>
                        <Link2 className="mr-1 h-4 w-4" aria-hidden="true" /> Attach
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {recordingList.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        No recordings yet. Record audio or attach a link to keep kickoff context with the project.
                      </div>
                    ) : (
                      recordingList.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {r.kind === "upload" ? <Mic className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{r.title}</div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {r.durationSec ? (
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{formatDuration(r.durationSec)}</span>
                              ) : null}
                              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {r.kind === "upload" && r.objectPath ? (
                            <audio controls preload="none" src={`/api/storage${r.objectPath}`} className="h-8 w-40 max-w-[40%]" />
                          ) : r.externalUrl ? (
                            <a href={r.externalUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
                              Open link
                            </a>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete recording: ${r.title}`}
                            onClick={() => removeRecording(r.id)}
                            disabled={deleteRecording.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Suggested agenda generated from project data */}
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <CardTitle className="text-lg">Suggested agenda</CardTitle>
                      <CardDescription className="m-0">Drafted from this project's data</CardDescription>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleGenerateAgenda} disabled={generateAgenda.isPending}>
                    {generateAgenda.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
                    )}
                    {genAgenda ? "Regenerate" : "Generate"}
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  {!genAgenda ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Generate a tailored kickoff agenda from the course, objectives, and delivery details on this project.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{genAgenda.projectTitle}</span>
                        {genAgenda.courseTitle ? <span>{genAgenda.courseTitle}</span> : null}
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{genAgenda.totalMinutes} min</span>
                        {typeof genAgenda.objectiveCount === "number" ? <span>{genAgenda.objectiveCount} objectives</span> : null}
                      </div>
                      <ol className="space-y-3">
                        {genAgenda.items.map((it, i) => (
                          <li key={i} className="rounded-lg border border-border bg-muted/10 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-foreground">{i + 1}. {it.title}</span>
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">{it.minutes} min</span>
                            </div>
                            {it.prompts.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-border">
                                {it.prompts.map((p, pi) => <li key={pi}>{p}</li>)}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border bg-card px-5 py-4">
                  <div>
                    <CardTitle className="text-lg">Agenda</CardTitle>
                    <CardDescription className="m-0">12 segments · kickoff meeting</CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      id="segment-timers"
                      checked={timersEnabled}
                      onCheckedChange={(checked) => {
                        setTimersEnabled(checked);
                        if (!checked) setActiveTimer(null);
                      }}
                    />
                    <Label htmlFor="segment-timers" className="text-sm text-muted-foreground">Segment timers</Label>
                  </div>
                </CardHeader>
                <CardContent className="divide-y divide-border p-0">
                  {SEGMENTS.map((seg, idx) => {
                    const isOpen = openSegments.has(idx);
                    const isDoing = segStatuses[idx] === "doing";
                    const isDone = segStatuses[idx] === "done";
                    const checksDone = agendaChecks[idx].filter(Boolean).length;
                    const allChecksDone = checksDone === seg.checklist.length;

                    return (
                      <div
                        key={idx}
                        className={`transition-colors ${isOpen ? "bg-card" : "hover:bg-muted/20"} ${
                          isDoing ? "bg-primary/[0.02] ring-1 ring-inset ring-primary/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 px-5 py-2 pr-5">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={`seg-panel-${idx}`}
                            className="flex min-w-0 flex-1 select-none items-center gap-4 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            onClick={() => toggleSegment(idx)}
                          >
                            <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground">{seg.time}</span>

                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={`font-bold ${isDoing ? "text-primary" : "text-foreground"}`}>{seg.title}</span>
                                {seg.a11y && (
                                  <Badge className="border-none bg-purple-100 px-1.5 py-0 text-[10px] text-purple-800 shadow-none hover:bg-purple-100">
                                    Accessibility audit
                                  </Badge>
                                )}
                                {seg.pre && !confirmedPre.has(idx) && (
                                  <Badge className="border-none bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800 shadow-none hover:bg-amber-100">
                                    1 pre-filled
                                  </Badge>
                                )}
                              </span>
                              {seg.sub && <span className="mt-0.5 block text-sm text-muted-foreground">{seg.sub}</span>}
                            </span>

                            <Badge
                              variant="outline"
                              className={`border-none font-semibold shadow-none ${
                                isDone ? "bg-green-100 text-green-800" : isDoing ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isDone ? "Done" : isDoing ? "In progress" : "To do"}
                            </Badge>

                            <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                              {checksDone}/{seg.checklist.length}
                            </span>

                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                                isDone || allChecksDone ? "border-green-500 bg-green-500 text-white" : "border-border text-transparent"
                              }`}
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>

                            {isOpen ? (
                              <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                          </button>

                          {timersEnabled && (
                            <Button
                              variant={activeTimer?.segIdx === idx ? "default" : "outline"}
                              size="sm"
                              aria-label={activeTimer?.segIdx === idx ? `Stop timer for ${seg.title}` : `Start timer for ${seg.title}`}
                              className={`flex h-8 w-20 shrink-0 justify-center px-0 shadow-sm ${
                                activeTimer?.segIdx === idx ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : ""
                              }`}
                              onClick={() => handleTimerToggle(idx)}
                            >
                              {activeTimer?.segIdx === idx ? (
                                <><Square className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" /> {formatTime(activeTimer.elapsed)}</>
                              ) : (
                                <><Play className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" /> Timer</>
                              )}
                            </Button>
                          )}
                        </div>

                        {isOpen && (
                          <div id={`seg-panel-${idx}`} className="border-t border-border/50 bg-card px-5 pb-6 pt-2">
                            <div className="space-y-6 pl-14">
                              {seg.pre && (
                                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <div className="text-sm">
                                    <strong className="text-amber-900">Pre-filled from syllabus:</strong>
                                    <span className="ml-2 text-amber-800">{seg.pre}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={confirmedPre.has(idx) ? "outline" : "default"}
                                    className={confirmedPre.has(idx) ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-600 text-white hover:bg-amber-700"}
                                    onClick={() => handleConfirmPre(idx)}
                                  >
                                    {confirmedPre.has(idx) ? (
                                      <><Check className="mr-1 h-4 w-4" aria-hidden="true" /> Confirmed</>
                                    ) : (
                                      "Confirm"
                                    )}
                                  </Button>
                                </div>
                              )}

                              {seg.lens && (
                                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm">
                                  <Badge className="mt-0.5 shrink-0 border-none bg-blue-100 px-1.5 py-0 text-blue-800 shadow-none hover:bg-blue-100">Lens</Badge>
                                  <div>
                                    <strong className="text-blue-900">{seg.lens.name}</strong>
                                    <span className="ml-2 text-blue-800/70">{seg.lens.desc}</span>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                <div>
                                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Discussion checklist · tick as you cover</div>
                                  <div className="space-y-3">
                                    {seg.checklist.map((item, cIdx) => (
                                      <div key={cIdx} className="group flex items-start gap-3">
                                        <Checkbox
                                          id={`seg-${idx}-c-${cIdx}`}
                                          checked={agendaChecks[idx][cIdx]}
                                          onCheckedChange={() => handleCheck(idx, cIdx)}
                                          className="mt-1 border-muted-foreground/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                        />
                                        <label
                                          htmlFor={`seg-${idx}-c-${cIdx}`}
                                          className={`cursor-pointer text-sm leading-snug transition-all ${
                                            agendaChecks[idx][cIdx] ? "text-muted-foreground line-through opacity-70" : "font-medium text-foreground group-hover:text-primary"
                                          }`}
                                        >
                                          {item}
                                        </label>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-4 border-t border-border/50 pt-4">
                                    <button
                                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        const next = new Set(deepProbes);
                                        if (next.has(idx)) next.delete(idx);
                                        else next.add(idx);
                                        setDeepProbes(next);
                                      }}
                                    >
                                      {deepProbes.has(idx) ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                                      Dig deeper · Socratic probes
                                    </button>

                                    {deepProbes.has(idx) && (
                                      <ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-muted-foreground marker:text-border">
                                        <li>If a student gets stuck here, how do they currently unblock themselves?</li>
                                        <li>What is the most common misconception about this topic?</li>
                                        <li>If you had half the time, what would you cut first?</li>
                                      </ul>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Capture notes</div>
                                  <Textarea
                                    placeholder="Type meeting notes here..."
                                    className="mb-3 min-h-[120px] resize-y border-muted-foreground/20 bg-muted/20 text-sm shadow-inner focus-visible:bg-background"
                                    value={notes[idx] || ""}
                                    onChange={(e) => setNotes((prev) => ({ ...prev, [idx]: e.target.value }))}
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    {seg.captures.map((cap, cIdx) => (
                                      <Badge key={cIdx} variant="secondary" className="border-primary/20 bg-primary/10 py-1 text-xs font-medium text-primary shadow-none hover:bg-primary/20">
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

              {/* Meeting status and automation rail */}
              <div className="space-y-6 lg:sticky lg:top-8">
                <Card className="border-border shadow-sm">
                  <CardHeader className="border-b border-border bg-card px-5 py-4">
                    <CardTitle className="text-lg">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <svg className="h-full w-full -rotate-90 transform">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted/50" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-primary transition-all duration-500 ease-in-out" strokeDasharray={`${Math.max(progressPct * 1.75, 0)} 200`} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold">{progressPct}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Kickoff progress</div>
                        <div className="text-sm text-muted-foreground">{completedChecks} of {totalChecks} checklist items covered</div>
                      </div>
                    </div>

                    {timersEnabled && activeTimer && (
                      <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm font-medium text-red-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true"></span>
                        Running: Segment {activeTimer.segIdx + 1}
                        <span className="ml-auto rounded border border-red-100 bg-white px-2 py-0.5 font-mono shadow-sm">{formatTime(activeTimer.elapsed)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="border-b border-border bg-card px-5 py-4">
                    <CardTitle className="text-lg">Automation and time</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox id="a1" checked={autoRules.r1} onCheckedChange={(c) => setAutoRules((p) => ({ ...p, r1: !!c }))} className="mt-0.5" />
                        <label htmlFor="a1" className="cursor-pointer text-sm leading-snug text-muted-foreground">When a timer starts, mark the part In progress.</label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="a2" checked={autoRules.r2} onCheckedChange={(c) => setAutoRules((p) => ({ ...p, r2: !!c }))} className="mt-0.5" />
                        <label htmlFor="a2" className="cursor-pointer text-sm leading-snug text-muted-foreground">When a part's checklist is fully covered, mark Done, stop timer, log time.</label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="a3" checked={autoRules.r3} onCheckedChange={(c) => setAutoRules((p) => ({ ...p, r3: !!c }))} className="mt-0.5" />
                        <label htmlFor="a3" className="cursor-pointer text-sm leading-snug text-muted-foreground">When a part is Done, open the next part and start its timer.</label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="a4" checked={autoRules.r4} onCheckedChange={(c) => setAutoRules((p) => ({ ...p, r4: !!c }))} className="mt-0.5" />
                        <label htmlFor="a4" className="cursor-pointer text-sm leading-snug text-muted-foreground">When action items are captured, draft a note to faculty.</label>
                      </div>
                    </div>

                    <div className="h-40 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 font-mono text-[11px] leading-tight">
                      {activityFeed.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-center font-sans italic text-muted-foreground/60">
                          Start a timer or finish a part to see automations fire.
                        </div>
                      ) : (
                        activityFeed.map((item, i) => (
                          <div key={i} className="flex gap-3 text-muted-foreground">
                            <span className="shrink-0 text-foreground/40">{item.time}</span>
                            <span className="text-foreground/80">{item.msg}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      One timer runs at a time. Starting a new part pauses the last.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* WRAP: commit outcomes and advance */}
          <TabsContent value="wrap" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center gap-2 border-b border-border bg-card px-5 py-4">
                  <Target className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <CardTitle className="text-lg">Course outcomes</CardTitle>
                    <CardDescription className="m-0">Measurable learning objectives carried into Backward Design</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-2">
                    <Input
                      value={newObjective}
                      placeholder="e.g. Explain how cellular respiration produces ATP"
                      onChange={(e) => setNewObjective(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddObjective();
                      }}
                      className="h-10"
                    />
                    <Button onClick={handleAddObjective} disabled={!newObjective.trim() || createObjective.isPending} className="shrink-0 shadow-sm">
                      <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
                    </Button>
                  </div>

                  {courseObjectives.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm italic text-muted-foreground">
                      No course outcomes yet. Add at least one to pass the alignment gate.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {courseObjectives.map((obj, i) => (
                        <li key={obj.id} className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                          <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">LO{i + 1}</span>
                          <span className="flex-1 text-sm leading-snug">{obj.text}</span>
                          <button onClick={() => handleDeleteObjective(obj.id)} className="shrink-0 text-muted-foreground/40 transition-colors hover:text-red-600" aria-label="Remove outcome">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border bg-card px-5 py-4">
                  <CardTitle className="text-lg">Gate readiness</CardTitle>
                  <CardDescription className="m-0">Requirements to advance to Backward Design</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="space-y-3">
                    {stage0Requirements.length === 0 ? (
                      <div className="text-sm italic text-muted-foreground">
                        {gateStatus && gateStatus.stage > 0
                          ? "This project has already advanced past Kickoff and Intake."
                          : "Loading gate status..."}
                      </div>
                    ) : (
                      stage0Requirements.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${r.met ? "bg-green-500 text-white" : "border border-border bg-muted text-muted-foreground"}`}>
                            {r.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Square className="h-3 w-3" aria-hidden="true" />}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{r.label}</div>
                            {!r.met && r.detail && <div className="mt-0.5 text-xs text-amber-700">{r.detail}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {gateStatus && gateStatus.stage === 0 && (
                    <Button className="w-full font-semibold shadow-sm" onClick={handleAdvance} disabled={!canAdvance || advanceStage.isPending}>
                      {advanceStage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      Advance to Backward Design
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}

                  {gateStatus && gateStatus.stage > 0 && (
                    <Button asChild variant="outline" className="w-full font-semibold">
                      <Link href={`/projects/${projectId}/design`}>
                        Go to Backward Design
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card px-5 py-4">
                <CardTitle className="text-lg">Course structure and pacing</CardTitle>
                {course ? (
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-[10px] text-green-700">Saved</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Not initialized</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Course title</label>
                  <Input value={courseForm.title} placeholder={project.title} onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 h-9" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "creditHours", label: "Credits" },
                    { key: "termWeeks", label: "Weeks" },
                    { key: "moduleCount", label: "Modules" },
                  ] as const).map((f) => (
                    <div key={f.key} className="rounded-lg border border-border bg-card p-3 text-center shadow-sm">
                      <Input
                        type="number"
                        min={0}
                        value={courseForm[f.key]}
                        onChange={(e) => setCourseForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="h-9 border-0 px-0 text-center text-lg font-bold shadow-none focus-visible:ring-1"
                        placeholder="-"
                      />
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</div>
                    </div>
                  ))}
                </div>

                {toNum(courseForm.termWeeks) ? (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: Math.min(toNum(courseForm.termWeeks) || 0, 30) }).map((_, i) => {
                      const wk = i + 1;
                      return (
                        <div key={i} className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-2 text-xs shadow-sm">
                          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">Wk {wk}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <Button className="w-full font-semibold shadow-sm" onClick={handleSaveCourse} disabled={createCourse.isPending || updateCourse.isPending}>
                  {(createCourse.isPending || updateCourse.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {course ? "Save course record" : "Initialize course record"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESSIBILITY: continuous audit */}
          <TabsContent value="accessibility" className="space-y-6">
            <Card className="overflow-hidden border-purple-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-purple-100 bg-purple-50/30 px-5 py-4">
                <CardTitle className="text-lg text-purple-900">Accessibility tracker</CardTitle>
                <Badge className="border-none bg-purple-100 text-purple-800 shadow-none hover:bg-purple-100">WCAG 2.1 AA · transparent and auditable</Badge>
              </CardHeader>
              <CardContent className="p-6">
                <p className="mb-6 max-w-[70ch] text-sm text-muted-foreground">
                  Accessibility is audited at intake, built in by design, and verified at every gate, never bolted on at the end.
                </p>

                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-purple-100 bg-white p-4">
                    <div className="mb-1 text-3xl font-bold text-purple-900">80<span className="text-xl">%</span></div>
                    <div className="text-xs font-medium uppercase tracking-wider text-purple-600/80">Conformance</div>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-white p-4">
                    <div className="mb-1 text-3xl font-bold text-foreground">7</div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sources audited</div>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-white p-4">
                    <div className="mb-1 text-3xl font-bold text-amber-600">5</div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open issues</div>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-white p-4">
                    <div className="mb-1 text-3xl font-bold text-green-600">0</div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved</div>
                  </div>
                </div>

                <div className="mb-8">
                  <Progress value={80} className="h-2 bg-purple-100 [&>div]:bg-purple-600" />
                  <div className="mt-2 text-sm text-muted-foreground">Currently tracking 5 open issues across 7 incoming sources. Target: 0 critical issues at QA.</div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">WCAG 2.1 AA success criteria tracked</h4>
                    <div className="space-y-2">
                      {A11Y_CRITERIA.map((c) => (
                        <div key={c.id} className="flex items-center justify-between border-b border-border/50 py-1.5 text-sm last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{c.id}</span>
                            <span className="font-medium">{c.name}</span>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">{c.level}</span>
                          </div>
                          {c.status === "pass" && <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Pass</Badge>}
                          {c.status === "warn" && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Partial</Badge>}
                          {c.status === "monitor" && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Monitor</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">Remediation queue</h4>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/30 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Lecture recordings (4)</span>
                          <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">High</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded border bg-white px-1 font-mono">1.2.2</span>
                          <span>Missing captions and transcripts</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs font-medium">
                          <span>Owner: ID Team</span>
                          <span>Target: Wk 5</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/30 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Lecture-deck.pptx</span>
                          <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">Med</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded border bg-white px-1 font-mono">1.1.1</span>
                          <span className="rounded border bg-white px-1 font-mono">1.4.3</span>
                          <span>Missing alt text, low contrast</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs font-medium">
                          <span>Owner: Faculty</span>
                          <span>Target: Wk 2</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 border-t pt-8 md:grid-cols-2">
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">How it is checked · method disclosure</h4>
                    <ul className="mb-6 space-y-3 text-sm text-muted-foreground">
                      <li><strong className="font-medium text-foreground">Automated:</strong> axe-core and IBM Equal Access (catches about 30% of issues)</li>
                      <li><strong className="font-medium text-foreground">Manual:</strong> Keyboard navigation, screen-reader spot checks, captions QA, reading level analysis</li>
                      <li><strong className="font-medium text-foreground">Standard:</strong> WCAG 2.1 AA (no exceptions)</li>
                    </ul>
                    <Button className="bg-purple-600 text-white shadow-sm hover:bg-purple-700">Generate conformance report (ACR)</Button>
                  </div>
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">Audit trail · Evidence Ledger</h4>
                    <div className="h-32 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
                      <div className="text-xs">
                        <span className="mr-2 font-mono text-muted-foreground">Today 09:41</span>
                        <span className="font-medium text-purple-700">Audit completed:</span>
                        <span className="ml-1 text-muted-foreground">7 incoming sources parsed. 5 issues flagged for remediation.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </ProjectWorkspace>
  );
}
