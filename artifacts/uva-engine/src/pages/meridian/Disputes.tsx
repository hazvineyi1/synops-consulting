import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMeridianDisputes,
  useUpdateMeridianDispute,
  getGetMeridianDisputesQueryKey,
  type ProviderDispute,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["Open", "In review", "Resolved", "Escalated"] as const;
const PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"] as const;

const updateSchema = z.object({
  status: z.enum(STATUS_OPTIONS),
  priority: z.enum(PRIORITY_OPTIONS),
  note: z.string().max(2000).optional(),
});

type UpdateValues = z.infer<typeof updateSchema>;

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "Resolved") return "default";
  if (status === "Escalated") return "destructive";
  return "secondary";
}

function priorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  if (priority === "Urgent") return "destructive";
  if (priority === "High") return "secondary";
  return "outline";
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DisputeCard({ dispute }: { dispute: ProviderDispute }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const update = useUpdateMeridianDispute();

  const form = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: STATUS_OPTIONS.includes(dispute.status as (typeof STATUS_OPTIONS)[number])
        ? (dispute.status as (typeof STATUS_OPTIONS)[number])
        : "Open",
      priority: PRIORITY_OPTIONS.includes(dispute.priority as (typeof PRIORITY_OPTIONS)[number])
        ? (dispute.priority as (typeof PRIORITY_OPTIONS)[number])
        : "Normal",
      note: "",
    },
  });

  function onSubmit(values: UpdateValues) {
    update.mutate(
      {
        id: dispute.id,
        data: {
          status: values.status,
          priority: values.priority,
          note: values.note?.trim() ? values.note.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeridianDisputesQueryKey() });
          toast({ title: "Dispute updated" });
          setOpen(false);
          form.reset({ status: values.status, priority: values.priority, note: "" });
        },
        onError: () => {
          toast({ title: "Could not update dispute", variant: "destructive" });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{dispute.subject}</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">{dispute.category}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={statusVariant(dispute.status)}>{dispute.status}</Badge>
            <Badge variant={priorityVariant(dispute.priority)}>{dispute.priority}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {dispute.notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          {dispute.notes.map((n, i) => (
            <div key={i} className="rounded-md border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{n.author}</span>
                <span>{formatTimestamp(n.at)}</span>
              </div>
              <p className="mt-1 text-sm">{n.body}</p>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Update dispute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update dispute</DialogTitle>
              <DialogDescription>{dispute.subject}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add a note (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Record an action or status change. Do not include patient information."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending ? "Saving..." : "Save update"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function MeridianDisputes() {
  const { data: disputes, isLoading } = useGetMeridianDisputes();

  if (isLoading) return <div className="p-8">Loading...</div>;

  const list = disputes ?? [];
  const open = list.filter((d) => d.status === "Open").length;
  const inReview = list.filter((d) => d.status === "In review").length;
  const escalated = list.filter((d) => d.status === "Escalated").length;
  const resolved = list.filter((d) => d.status === "Resolved").length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispute Queue</h1>
        <p className="text-muted-foreground mt-1">
          Provider disputes with status, priority, and an audit trail of notes. Do not enter patient
          information.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Open</div>
            <div className="mt-1 text-2xl font-bold">{open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">In review</div>
            <div className="mt-1 text-2xl font-bold">{inReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Escalated</div>
            <div className="mt-1 text-2xl font-bold">{escalated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Resolved</div>
            <div className="mt-1 text-2xl font-bold">{resolved}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {list.map((d) => (
          <DisputeCard key={d.id} dispute={d} />
        ))}
      </div>
    </div>
  );
}
