import { useMemo, useState } from "react";
import { useParams } from "wouter";
import {
  useListProjectMeetings,
  getListProjectMeetingsQueryKey,
  useCreateProjectMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useProcessMeetingNotes,
  useListProjectActionItems,
  getListProjectActionItemsQueryKey,
  useCreateProjectActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useListProjectCorrespondence,
  getListProjectCorrespondenceQueryKey,
  useCreateProjectCorrespondence,
  useUpdateCorrespondence,
  useDeleteCorrespondence,
  useGetAgendaSummary,
  getGetAgendaSummaryQueryKey,
  type Meeting,
  type ActionItem,
  type Correspondence,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Plus,
  Sparkles,
  Trash2,
  Pencil,
  ListChecks,
  Mail,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Clock,
  Link2,
  FileText,
} from "lucide-react";
import { ProjectWorkspace } from "@/components/engine/ProjectWorkspace";
import { MeetingRecordings } from "@/components/engine/MeetingRecordings";
import { MeetingCalendar } from "@/components/engine/MeetingCalendar";
import { authErrorMessage } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO -> "yyyy-MM-ddThh:mm" for a datetime-local input, in local time. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO (UTC Z), or undefined when empty. */
function localInputToIso(v: string): string | undefined {
  return v ? new Date(v).toISOString() : undefined;
}

/** ISO -> "yyyy-MM-dd" for a date input, in local time. */
function toDateOnlyInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** date value "yyyy-MM-dd" -> ISO anchored at local noon (avoids day-shift). */
function dateOnlyToIso(v: string): string | undefined {
  return v ? new Date(`${v}T12:00:00`).toISOString() : undefined;
}

function fmtDateTime(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  // A date-only value ("yyyy-MM-dd") parses as UTC midnight, which day-shifts in
  // negative timezones. Anchor it at local noon so the displayed day is stable.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  content: "Content",
  review: "Review",
  accessibility: "Accessibility",
};

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-muted text-foreground",
  content: "bg-sky-100 text-sky-800",
  review: "bg-violet-100 text-violet-800",
  accessibility: "bg-amber-100 text-amber-800",
};

export default function ProjectMeetings() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const meetingsKey = getListProjectMeetingsQueryKey(projectId);
  const actionItemsKey = getListProjectActionItemsQueryKey(projectId);
  const correspondenceKey = getListProjectCorrespondenceQueryKey(projectId);
  const summaryKey = getGetAgendaSummaryQueryKey(projectId);

  const { data: meetingsData } = useListProjectMeetings(projectId, {
    query: { enabled: !!projectId, queryKey: meetingsKey },
  });
  const { data: actionItemsData } = useListProjectActionItems(projectId, {
    query: { enabled: !!projectId, queryKey: actionItemsKey },
  });
  const { data: correspondenceData } = useListProjectCorrespondence(projectId, {
    query: { enabled: !!projectId, queryKey: correspondenceKey },
  });
  const { data: summary } = useGetAgendaSummary(projectId, {
    query: { enabled: !!projectId, queryKey: summaryKey },
  });

  const meetings = useMemo(() => meetingsData ?? [], [meetingsData]);
  const actionItems = useMemo(() => actionItemsData ?? [], [actionItemsData]);
  const correspondence = useMemo(() => correspondenceData ?? [], [correspondenceData]);

  const createMeeting = useCreateProjectMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const processNotes = useProcessMeetingNotes();
  const createActionItem = useCreateProjectActionItem();
  const updateActionItem = useUpdateActionItem();
  const deleteActionItem = useDeleteActionItem();
  const createCorrespondence = useCreateProjectCorrespondence();
  const updateCorrespondence = useUpdateCorrespondence();
  const deleteCorrespondence = useDeleteCorrespondence();

  const fail = (err: unknown, fallback: string) =>
    toast({ title: authErrorMessage(err) || fallback, variant: "destructive" });
  const invalidateMeetings = () => queryClient.invalidateQueries({ queryKey: meetingsKey });
  const invalidateActionItems = () => queryClient.invalidateQueries({ queryKey: actionItemsKey });
  const invalidateCorrespondence = () => queryClient.invalidateQueries({ queryKey: correspondenceKey });
  const invalidateSummary = () => queryClient.invalidateQueries({ queryKey: summaryKey });

  // ---- New meeting form ----
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingAt, setNewMeetingAt] = useState("");

  function addMeeting() {
    const title = newMeetingTitle.trim();
    if (!title) {
      toast({ title: "Give the meeting a title", variant: "destructive" });
      return;
    }
    createMeeting.mutate(
      { projectId, data: { title, scheduledAt: localInputToIso(newMeetingAt) } },
      {
        onSuccess: () => {
          invalidateMeetings();
          invalidateSummary();
          setNewMeetingTitle("");
          setNewMeetingAt("");
          toast({ title: "Meeting added" });
        },
        onError: (err) => fail(err, "Could not add the meeting"),
      },
    );
  }

  // ---- Delete meeting ----
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  function confirmDeleteMeeting() {
    if (!deletingMeeting) return;
    deleteMeeting.mutate(
      { id: deletingMeeting.id },
      {
        onSuccess: () => {
          invalidateMeetings();
          invalidateActionItems();
          invalidateSummary();
          setDeletingMeeting(null);
          toast({ title: "Meeting deleted" });
        },
        onError: (err) => fail(err, "Could not delete the meeting"),
      },
    );
  }

  // ---- New action item form ----
  const [aiTitle, setAiTitle] = useState("");
  const [aiCategory, setAiCategory] = useState("general");
  const [aiOwner, setAiOwner] = useState("");
  const [aiDue, setAiDue] = useState("");

  function addActionItem() {
    const title = aiTitle.trim();
    if (!title) {
      toast({ title: "Describe the action item", variant: "destructive" });
      return;
    }
    createActionItem.mutate(
      {
        projectId,
        data: {
          title,
          category: aiCategory as ActionItem["category"],
          ownerName: aiOwner.trim() || undefined,
          dueAt: dateOnlyToIso(aiDue),
        },
      },
      {
        onSuccess: () => {
          invalidateActionItems();
          invalidateSummary();
          setAiTitle("");
          setAiCategory("general");
          setAiOwner("");
          setAiDue("");
          toast({ title: "Action item added" });
        },
        onError: (err) => fail(err, "Could not add the action item"),
      },
    );
  }

  function toggleActionItem(item: ActionItem, done: boolean) {
    updateActionItem.mutate(
      { id: item.id, data: { status: done ? "done" : "open" } },
      {
        onSuccess: () => {
          invalidateActionItems();
          invalidateSummary();
        },
        onError: (err) => fail(err, "Could not update the action item"),
      },
    );
  }

  const [deletingItem, setDeletingItem] = useState<ActionItem | null>(null);
  function confirmDeleteItem() {
    if (!deletingItem) return;
    deleteActionItem.mutate(
      { id: deletingItem.id },
      {
        onSuccess: () => {
          invalidateActionItems();
          invalidateSummary();
          setDeletingItem(null);
          toast({ title: "Action item deleted" });
        },
        onError: (err) => fail(err, "Could not delete the action item"),
      },
    );
  }

  // ---- New correspondence form ----
  const [coDirection, setCoDirection] = useState("inbound");
  const [coSubject, setCoSubject] = useState("");
  const [coParty, setCoParty] = useState("");
  const [coOccurredAt, setCoOccurredAt] = useState("");
  const [coBody, setCoBody] = useState("");

  function addCorrespondence() {
    const subject = coSubject.trim();
    if (!subject) {
      toast({ title: "Add a subject", variant: "destructive" });
      return;
    }
    createCorrespondence.mutate(
      {
        projectId,
        data: {
          direction: coDirection as Correspondence["direction"],
          subject,
          party: coParty.trim() || undefined,
          body: coBody.trim() || undefined,
          occurredAt: dateOnlyToIso(coOccurredAt),
        },
      },
      {
        onSuccess: () => {
          invalidateCorrespondence();
          setCoDirection("inbound");
          setCoSubject("");
          setCoParty("");
          setCoOccurredAt("");
          setCoBody("");
          toast({ title: "Correspondence logged" });
        },
        onError: (err) => fail(err, "Could not log the correspondence"),
      },
    );
  }

  const [editingCo, setEditingCo] = useState<Correspondence | null>(null);
  const [deletingCo, setDeletingCo] = useState<Correspondence | null>(null);

  function confirmDeleteCorrespondence() {
    if (!deletingCo) return;
    deleteCorrespondence.mutate(
      { id: deletingCo.id },
      {
        onSuccess: () => {
          invalidateCorrespondence();
          setDeletingCo(null);
          toast({ title: "Correspondence deleted" });
        },
        onError: (err) => fail(err, "Could not delete the correspondence"),
      },
    );
  }

  // ---- Promote correspondence to action item ----
  const [promoteFrom, setPromoteFrom] = useState<Correspondence | null>(null);
  const [promoteTitle, setPromoteTitle] = useState("");
  const [promoteOwner, setPromoteOwner] = useState("");
  const [promoteDue, setPromoteDue] = useState("");

  function openPromote(co: Correspondence) {
    setPromoteFrom(co);
    setPromoteTitle(`Follow up: ${co.subject}`.slice(0, 300));
    setPromoteOwner("");
    setPromoteDue("");
  }

  function submitPromote() {
    if (!promoteFrom) return;
    const title = promoteTitle.trim();
    if (!title) {
      toast({ title: "Describe the action item", variant: "destructive" });
      return;
    }
    createActionItem.mutate(
      {
        projectId,
        data: {
          title,
          ownerName: promoteOwner.trim() || undefined,
          dueAt: dateOnlyToIso(promoteDue),
          sourceCorrespondenceId: promoteFrom.id,
        },
      },
      {
        onSuccess: () => {
          invalidateActionItems();
          invalidateSummary();
          setPromoteFrom(null);
          toast({ title: "Action item created from correspondence" });
        },
        onError: (err) => fail(err, "Could not create the action item"),
      },
    );
  }

  const correspondenceById = useMemo(() => {
    const map = new Map<number, Correspondence>();
    for (const c of correspondence) map.set(c.id, c);
    return map;
  }, [correspondence]);

  const openCount = summary?.openActionItems ?? actionItems.filter((a) => a.status === "open").length;

  return (
    <ProjectWorkspace subtitle="Run weekly meetings, track action items and correspondence, and see what is due.">
      {() => (
        <Tabs defaultValue="meetings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="actions">Action items</TabsTrigger>
            <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* ============================ MEETINGS ============================ */}
          <TabsContent value="meetings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" /> Schedule a meeting
                </CardTitle>
                <CardDescription>
                  Add a meeting, capture notes during it, then generate the next agenda from those notes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-title">Title</Label>
                    <Input
                      id="meeting-title"
                      value={newMeetingTitle}
                      maxLength={200}
                      onChange={(e) => setNewMeetingTitle(e.target.value)}
                      placeholder="Weekly check-in"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-at">Date and time (optional)</Label>
                    <Input
                      id="meeting-at"
                      type="datetime-local"
                      value={newMeetingAt}
                      onChange={(e) => setNewMeetingAt(e.target.value)}
                    />
                  </div>
                  <Button onClick={addMeeting} disabled={createMeeting.isPending}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add meeting
                  </Button>
                </div>
              </CardContent>
            </Card>

            {meetings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CalendarClock className="mb-4 h-12 w-12 text-muted" aria-hidden="true" />
                  <p>No meetings yet. Add one above to start the weekly cycle.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isProcessing={processNotes.isPending}
                    isSavingNotes={updateMeeting.isPending}
                    onSaveNotes={(notes) =>
                      updateMeeting.mutate(
                        { id: meeting.id, data: { notes } },
                        {
                          onSuccess: () => {
                            invalidateMeetings();
                            toast({ title: "Notes saved" });
                          },
                          onError: (err) => fail(err, "Could not save the notes"),
                        },
                      )
                    }
                    onSaveDetails={(data, done) =>
                      updateMeeting.mutate(
                        { id: meeting.id, data },
                        {
                          onSuccess: () => {
                            invalidateMeetings();
                            invalidateSummary();
                            toast({ title: "Meeting updated" });
                            done();
                          },
                          onError: (err) => fail(err, "Could not update the meeting"),
                        },
                      )
                    }
                    onGenerate={() =>
                      processNotes.mutate(
                        { id: meeting.id },
                        {
                          onSuccess: (res) => {
                            invalidateMeetings();
                            invalidateActionItems();
                            invalidateSummary();
                            toast({
                              title: "Agenda generated",
                              description: `${res.createdActionItems.length} action item${
                                res.createdActionItems.length === 1 ? "" : "s"
                              } extracted (${res.provider === "openai" ? "AI" : "rules"}).`,
                            });
                          },
                          onError: (err) => fail(err, "Could not generate the agenda"),
                        },
                      )
                    }
                    onDelete={() => setDeletingMeeting(meeting)}
                  />
                ))}
              </div>
            )}

            <MeetingRecordings projectId={projectId} />
          </TabsContent>

          {/* ========================== ACTION ITEMS ========================== */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /> Build progress
                </CardTitle>
                <CardDescription>
                  {openCount} open, {summary?.doneActionItems ?? 0} done of {summary?.totalActionItems ?? actionItems.length} total.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall</span>
                    <span className="tabular-nums text-muted-foreground">{summary?.buildProgressPercent ?? 0}%</span>
                  </div>
                  <Progress value={summary?.buildProgressPercent ?? 0} aria-label="Overall build progress" />
                </div>
                {summary?.accessibility && summary.accessibility.total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Accessibility</span>
                      <span className="tabular-nums text-muted-foreground">
                        {summary.accessibility.done}/{summary.accessibility.total}
                      </span>
                    </div>
                    <Progress value={summary.accessibility.percent} aria-label="Accessibility progress" />
                  </div>
                )}
                {summary?.weeks && summary.weeks.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {summary.weeks.map((w) => (
                      <Badge key={w.weekIndex} variant="outline" className="font-normal">
                        {w.label}: {w.done}/{w.total}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add an action item</CardTitle>
                <CardDescription>Track follow-ups from meetings, correspondence, or your own list.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label htmlFor="ai-title">What needs doing?</Label>
                    <Input
                      id="ai-title"
                      value={aiTitle}
                      maxLength={300}
                      onChange={(e) => setAiTitle(e.target.value)}
                      placeholder="Draft module 2 storyboard"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-category">Category</Label>
                    <Select value={aiCategory} onValueChange={setAiCategory}>
                      <SelectTrigger id="ai-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="accessibility">Accessibility</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-due">Due (optional)</Label>
                    <Input id="ai-due" type="date" value={aiDue} onChange={(e) => setAiDue(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label htmlFor="ai-owner">Owner (optional)</Label>
                    <Input
                      id="ai-owner"
                      value={aiOwner}
                      maxLength={200}
                      onChange={(e) => setAiOwner(e.target.value)}
                      placeholder="Who owns this?"
                    />
                  </div>
                  <div className="lg:col-span-2 lg:flex lg:items-end">
                    <Button onClick={addActionItem} disabled={createActionItem.isPending} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add action item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action items</CardTitle>
                <CardDescription>Check off items as they are completed.</CardDescription>
              </CardHeader>
              <CardContent>
                {actionItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
                    <ListChecks className="mb-4 h-12 w-12 text-muted" aria-hidden="true" />
                    <p>No action items yet. Add one above or generate an agenda from meeting notes.</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {actionItems.map((item) => {
                      const done = item.status === "done";
                      const sourceCo = item.sourceCorrespondenceId
                        ? correspondenceById.get(item.sourceCorrespondenceId)
                        : undefined;
                      return (
                        <li key={item.id} className="flex items-start gap-3 py-3">
                          <Checkbox
                            checked={done}
                            onCheckedChange={(v) => toggleActionItem(item, v === true)}
                            aria-label={done ? `Mark "${item.title}" as open` : `Mark "${item.title}" as done`}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                              {item.title}
                            </div>
                            {item.description && (
                              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <Badge
                                variant="secondary"
                                className={`shadow-none hover:bg-current/0 ${CATEGORY_STYLES[item.category]}`}
                              >
                                {CATEGORY_LABELS[item.category]}
                              </Badge>
                              {item.ownerName && <span>{item.ownerName}</span>}
                              {item.dueAt && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" aria-hidden="true" /> Due {fmtDate(item.dueAt)}
                                </span>
                              )}
                              {item.sourceMeetingId && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" aria-hidden="true" /> From meeting
                                </span>
                              )}
                              {sourceCo && (
                                <span className="inline-flex items-center gap-1">
                                  <Link2 className="h-3 w-3" aria-hidden="true" /> From: {sourceCo.subject}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                            aria-label={`Delete action item: ${item.title}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================= CORRESPONDENCE ========================= */}
          <TabsContent value="correspondence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" aria-hidden="true" /> Log correspondence
                </CardTitle>
                <CardDescription>
                  Paste emails or notes from calls. Turn anything actionable into an action item that feeds the agenda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-direction">Direction</Label>
                    <Select value={coDirection} onValueChange={setCoDirection}>
                      <SelectTrigger id="co-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound (received)</SelectItem>
                        <SelectItem value="outbound">Outbound (sent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label htmlFor="co-subject">Subject</Label>
                    <Input
                      id="co-subject"
                      value={coSubject}
                      maxLength={300}
                      onChange={(e) => setCoSubject(e.target.value)}
                      placeholder="Re: storyboard feedback"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-date">Date (optional)</Label>
                    <Input id="co-date" type="date" value={coOccurredAt} onChange={(e) => setCoOccurredAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label htmlFor="co-party">From / to (optional)</Label>
                    <Input
                      id="co-party"
                      value={coParty}
                      maxLength={200}
                      onChange={(e) => setCoParty(e.target.value)}
                      placeholder="client@school.edu"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                    <Label htmlFor="co-body">Message (optional)</Label>
                    <Textarea
                      id="co-body"
                      rows={4}
                      maxLength={20000}
                      value={coBody}
                      onChange={(e) => setCoBody(e.target.value)}
                      placeholder="Paste the email or call notes here."
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Button onClick={addCorrespondence} disabled={createCorrespondence.isPending}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Log correspondence
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correspondence log</CardTitle>
                <CardDescription>Newest first.</CardDescription>
              </CardHeader>
              <CardContent>
                {correspondence.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
                    <Mail className="mb-4 h-12 w-12 text-muted" aria-hidden="true" />
                    <p>No correspondence logged yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {correspondence.map((co) => (
                      <li key={co.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  co.direction === "inbound"
                                    ? "bg-sky-100 text-sky-800 shadow-none hover:bg-sky-100"
                                    : "bg-emerald-100 text-emerald-800 shadow-none hover:bg-emerald-100"
                                }
                              >
                                {co.direction === "inbound" ? (
                                  <ArrowDownLeft className="mr-1 h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <ArrowUpRight className="mr-1 h-3 w-3" aria-hidden="true" />
                                )}
                                {co.direction === "inbound" ? "Inbound" : "Outbound"}
                              </Badge>
                              <span className="font-medium">{co.subject}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                              {co.party && <span>{co.party}</span>}
                              {co.occurredAt && <span>{fmtDate(co.occurredAt)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => openPromote(co)}>
                              <ListChecks className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Action item
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCo(co)}
                              aria-label={`Edit correspondence: ${co.subject}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCo(co)}
                              aria-label={`Delete correspondence: ${co.subject}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        {co.body && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{co.body}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================ CALENDAR ============================ */}
          <TabsContent value="calendar" className="space-y-6">
            <MeetingCalendar meetings={meetings} actionItems={actionItems} nextMeetingAt={summary?.nextMeetingAt} />
          </TabsContent>

          {/* ---- Dialogs ---- */}
          <AlertDialog open={!!deletingMeeting} onOpenChange={(o) => !o && setDeletingMeeting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the meeting, its notes, and its generated agenda. Action items already created stay.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteMeeting} disabled={deleteMeeting.isPending}>
                  {deleteMeeting.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this action item?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteItem} disabled={deleteActionItem.isPending}>
                  {deleteActionItem.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!deletingCo} onOpenChange={(o) => !o && setDeletingCo(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this correspondence?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the logged message. Action items created from it stay.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteCorrespondence} disabled={deleteCorrespondence.isPending}>
                  {deleteCorrespondence.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {editingCo && (
            <CorrespondenceEditDialog
              correspondence={editingCo}
              isSaving={updateCorrespondence.isPending}
              onClose={() => setEditingCo(null)}
              onSave={(data) =>
                updateCorrespondence.mutate(
                  { id: editingCo.id, data },
                  {
                    onSuccess: () => {
                      invalidateCorrespondence();
                      setEditingCo(null);
                      toast({ title: "Correspondence updated" });
                    },
                    onError: (err) => fail(err, "Could not update the correspondence"),
                  },
                )
              }
            />
          )}

          <Dialog open={!!promoteFrom} onOpenChange={(o) => !o && setPromoteFrom(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create action item</DialogTitle>
                <DialogDescription>
                  Linked to "{promoteFrom?.subject}". It will appear on the next generated agenda while open.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promote-title">Title</Label>
                  <Input
                    id="promote-title"
                    value={promoteTitle}
                    maxLength={300}
                    onChange={(e) => setPromoteTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="promote-owner">Owner (optional)</Label>
                    <Input
                      id="promote-owner"
                      value={promoteOwner}
                      maxLength={200}
                      onChange={(e) => setPromoteOwner(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="promote-due">Due (optional)</Label>
                    <Input
                      id="promote-due"
                      type="date"
                      value={promoteDue}
                      onChange={(e) => setPromoteDue(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPromoteFrom(null)}>
                  Cancel
                </Button>
                <Button onClick={submitPromote} disabled={createActionItem.isPending}>
                  {createActionItem.isPending ? "Creating..." : "Create action item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      )}
    </ProjectWorkspace>
  );
}

/* ------------------------------------------------------------------ */
/* Meeting card: notes editing, agenda generation, details edit       */
/* ------------------------------------------------------------------ */

function MeetingCard({
  meeting,
  isProcessing,
  isSavingNotes,
  onSaveNotes,
  onSaveDetails,
  onGenerate,
  onDelete,
}: {
  meeting: Meeting;
  isProcessing: boolean;
  isSavingNotes: boolean;
  onSaveNotes: (notes: string) => void;
  onSaveDetails: (data: { title: string; scheduledAt: string | null }, done: () => void) => void;
  onGenerate: () => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(meeting.notes);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(meeting.title);
  const [editAt, setEditAt] = useState(toLocalInput(meeting.scheduledAt));

  const notesDirty = notes !== meeting.notes;
  const agenda = meeting.generatedAgenda ?? null;

  function openEdit() {
    setEditTitle(meeting.title);
    setEditAt(toLocalInput(meeting.scheduledAt));
    setEditingDetails(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {meeting.title}
              {meeting.aiProvider && (
                <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/10">
                  {meeting.aiProvider === "openai" ? "AI agenda" : "Agenda ready"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {meeting.scheduledAt ? fmtDateTime(meeting.scheduledAt) : "No date set"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={openEdit} aria-label={`Edit meeting: ${meeting.title}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete meeting: ${meeting.title}`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`notes-${meeting.id}`}>Meeting notes</Label>
          <Textarea
            id={`notes-${meeting.id}`}
            rows={5}
            maxLength={20000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capture decisions, blockers, and follow-ups. The agenda generator reads these."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onSaveNotes(notes)} disabled={!notesDirty || isSavingNotes}>
              {isSavingNotes ? "Saving..." : "Save notes"}
            </Button>
            <Button size="sm" onClick={onGenerate} disabled={isProcessing || notesDirty}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Generate agenda from notes
            </Button>
            {notesDirty && <span className="text-xs text-muted-foreground">Save notes before generating.</span>}
          </div>
        </div>

        {agenda && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" /> Proposed next agenda
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {agenda.proposedDate && (
                  <Badge variant="outline" className="font-normal">
                    {fmtDate(agenda.proposedDate)}
                    {agenda.proposedTime ? ` at ${agenda.proposedTime}` : ""}
                  </Badge>
                )}
                <span>{agenda.openActionCount} open action item{agenda.openActionCount === 1 ? "" : "s"}</span>
              </div>
            </div>
            {agenda.summary.length > 0 && (
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {agenda.summary.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <ol className="space-y-2">
              {agenda.items.map((it, i) => (
                <li key={i} className="rounded-md border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{it.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{it.minutes} min</span>
                  </div>
                  {it.prompts.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                      {it.prompts.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>

      <Dialog open={editingDetails} onOpenChange={setEditingDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit meeting</DialogTitle>
            <DialogDescription>Update the title or scheduled time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-title-${meeting.id}`}>Title</Label>
              <Input
                id={`edit-title-${meeting.id}`}
                value={editTitle}
                maxLength={200}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-at-${meeting.id}`}>Date and time</Label>
              <Input
                id={`edit-at-${meeting.id}`}
                type="datetime-local"
                value={editAt}
                onChange={(e) => setEditAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDetails(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const title = editTitle.trim();
                if (!title) return;
                onSaveDetails({ title, scheduledAt: localInputToIso(editAt) ?? null }, () => setEditingDetails(false));
              }}
              disabled={isSavingNotes}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Correspondence edit dialog                                          */
/* ------------------------------------------------------------------ */

function CorrespondenceEditDialog({
  correspondence,
  isSaving,
  onClose,
  onSave,
}: {
  correspondence: Correspondence;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: {
    direction: Correspondence["direction"];
    subject: string;
    party: string | null;
    body: string;
    occurredAt: string | null;
  }) => void;
}) {
  const [direction, setDirection] = useState<string>(correspondence.direction);
  const [subject, setSubject] = useState(correspondence.subject);
  const [party, setParty] = useState(correspondence.party ?? "");
  const [occurredAt, setOccurredAt] = useState(toDateOnlyInput(correspondence.occurredAt));
  const [body, setBody] = useState(correspondence.body);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit correspondence</DialogTitle>
          <DialogDescription>Update the details of this logged message.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-co-direction">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger id="edit-co-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (received)</SelectItem>
                  <SelectItem value="outbound">Outbound (sent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-co-date">Date</Label>
              <Input
                id="edit-co-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-co-subject">Subject</Label>
            <Input
              id="edit-co-subject"
              value={subject}
              maxLength={300}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-co-party">From / to</Label>
            <Input id="edit-co-party" value={party} maxLength={200} onChange={(e) => setParty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-co-body">Message</Label>
            <Textarea
              id="edit-co-body"
              rows={5}
              maxLength={20000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const trimmed = subject.trim();
              if (!trimmed) return;
              onSave({
                direction: direction as Correspondence["direction"],
                subject: trimmed,
                party: party.trim() ? party.trim() : null,
                body: body.trim(),
                occurredAt: dateOnlyToIso(occurredAt) ?? null,
              });
            }}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
