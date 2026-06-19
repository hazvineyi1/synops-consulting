import { useEffect, useRef, useState } from "react";
import {
  useListMeetingRecordings,
  getListMeetingRecordingsQueryKey,
  useCreateMeetingRecording,
  useDeleteMeetingRecording,
  useRequestUploadUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Link2,
  Square,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function formatDuration(sec?: number | null) {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Self-contained meeting recordings card: capture audio in the browser or attach
 * an external link, then list, play, and remove saved recordings. All recording
 * state and the MediaRecorder lifecycle live here so the surrounding page stays
 * simple. Recordings are project-scoped on the server.
 */
export function MeetingRecordings({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recordings } = useListMeetingRecordings(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeetingRecordingsQueryKey(projectId) },
  });
  const requestUploadUrl = useRequestUploadUrl();
  const createRecording = useCreateMeetingRecording();
  const deleteRecording = useDeleteMeetingRecording();

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

  const recordingList = recordings ?? [];

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
        data: { contentType, size: pendingRec.blob.size, name: `meeting-recording.${ext}` },
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
          title: captureTitle.trim() || "Meeting recording",
          objectPath,
          contentType,
          sizeBytes: pendingRec.blob.size,
          durationSec: pendingRec.durationSec,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListMeetingRecordingsQueryKey(projectId) });
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
    } catch {
      toast({ title: "Couldn't remove recording", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
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
              <span className="text-sm text-muted-foreground">Capture meeting audio directly in your browser.</span>
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
              No recordings yet. Record audio or attach a link to keep meeting context with the project.
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
  );
}
