import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProject,
  useListQAChecks,
  useCreateQACheck,
  getGetProjectQueryKey,
  getListQAChecksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ShieldCheck, AlertTriangle, Plus, Download, Clock, Wrench } from "lucide-react";

const CHECK_TYPES: { value: string; label: string }[] = [
  { value: "oedi_rubric", label: "OEDI Rubric" },
  { value: "accessibility_auto", label: "Accessibility (Automated)" },
  { value: "accessibility_manual", label: "Accessibility (Manual)" },
  { value: "standards_coverage", label: "Standards Coverage" },
  { value: "udl", label: "Universal Design for Learning" },
  { value: "brand", label: "Brand Consistency" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "in_remediation", label: "In Remediation" },
];

const typeLabel = (v: string) => CHECK_TYPES.find((t) => t.value === v)?.label ?? v.replace(/_/g, " ");
const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v.replace(/_/g, " ");

const qaSchema = z.object({
  checkType: z.string().min(1, "Select a check type"),
  status: z.string().min(1, "Select a status"),
  findings: z.string().optional(),
});

export default function ProjectQA() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: checks } = useListQAChecks(projectId, {
    query: { enabled: !!projectId, queryKey: getListQAChecksQueryKey(projectId) },
  });

  const createCheck = useCreateQACheck();

  const form = useForm<z.infer<typeof qaSchema>>({
    resolver: zodResolver(qaSchema),
    defaultValues: { checkType: "", status: "pending", findings: "" },
  });

  if (!project) return <div className="p-8">Loading...</div>;

  const projectChecks = checks?.filter((c) => c.projectId === projectId) || [];

  const counts = {
    pass: projectChecks.filter((c) => c.status === "pass").length,
    fail: projectChecks.filter((c) => c.status === "fail").length,
    in_remediation: projectChecks.filter((c) => c.status === "in_remediation").length,
    pending: projectChecks.filter((c) => c.status === "pending").length,
  };

  const a11yChecks = projectChecks.filter((c) => c.checkType.startsWith("accessibility"));
  const a11yStatus =
    a11yChecks.length === 0
      ? "Not yet assessed"
      : a11yChecks.some((c) => c.status === "fail")
        ? "Issues found"
        : a11yChecks.some((c) => c.status === "in_remediation")
          ? "In remediation"
          : a11yChecks.every((c) => c.status === "pass")
            ? "Meets WCAG 2.1 AA target"
            : "In progress";

  function onSubmit(data: z.infer<typeof qaSchema>) {
    createCheck.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQAChecksQueryKey(projectId) });
          setOpen(false);
          form.reset({ checkType: "", status: "pending", findings: "" });
          toast({ title: "QA check logged" });
        },
        onError: () => {
          toast({ title: "Failed to log QA check", variant: "destructive" });
        },
      },
    );
  }

  function exportReport() {
    const lines: string[] = [];
    lines.push("# QA and Accessibility Report");
    lines.push("");
    lines.push(`Project: ${project!.title}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("## Summary");
    lines.push(`Total checks: ${projectChecks.length}`);
    lines.push(`Pass: ${counts.pass}`);
    lines.push(`Fail: ${counts.fail}`);
    lines.push(`In remediation: ${counts.in_remediation}`);
    lines.push(`Pending: ${counts.pending}`);
    lines.push(`Accessibility status: ${a11yStatus}`);
    lines.push("");
    lines.push("## Checks");
    if (projectChecks.length === 0) {
      lines.push("No QA checks logged.");
    } else {
      projectChecks.forEach((c, i) => {
        lines.push(`${i + 1}. ${typeLabel(c.checkType)} - ${statusLabel(c.status)}`);
        if (c.findings) lines.push(`   Findings: ${c.findings}`);
        if (c.remediationNotes) lines.push(`   Remediation: ${c.remediationNotes}`);
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${project!.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Stage 2</Badge>
            <h1 className="text-3xl font-bold tracking-tight">QA and Accessibility</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
        <Button
          variant="outline"
          onClick={exportReport}
          disabled={projectChecks.length === 0}
        >
          <Download className="mr-2 h-4 w-4" /> Export report
        </Button>
      </div>

      {/* Report summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Pass
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.pass}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Fail
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.fail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 text-amber-600" /> Remediation
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.in_remediation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Pending
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Accessibility</div>
            <div className="mt-1 text-sm font-semibold">{a11yStatus}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Quality Assurance Checks</CardTitle>
            <CardDescription>Record results of automated and manual QA processes.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Log QA Check
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log a QA Check</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="checkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a check type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CHECK_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
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
                    name="findings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Findings</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="Summarize what was checked and any issues found."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createCheck.isPending}>
                      {createCheck.isPending ? "Saving..." : "Save QA check"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {projectChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-dashed border-2 rounded-lg">
              <ShieldCheck className="h-12 w-12 mb-4 text-muted" />
              <p>No QA checks logged yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectChecks.map((check) => (
                <div key={check.id} className="p-4 border rounded-md flex items-start gap-4">
                  <div className="mt-1">
                    {check.status === "pass" ? (
                      <ShieldCheck className="text-green-500" />
                    ) : check.status === "fail" ? (
                      <AlertTriangle className="text-red-500" />
                    ) : check.status === "in_remediation" ? (
                      <Wrench className="text-amber-500" />
                    ) : (
                      <Clock className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">{typeLabel(check.checkType)}</h4>
                      <Badge variant={check.status === "pass" ? "default" : "secondary"}>
                        {statusLabel(check.status)}
                      </Badge>
                    </div>
                    {check.findings && <p className="text-sm mt-2">{check.findings}</p>}
                    {check.remediationNotes && (
                      <div className="mt-3 text-sm bg-muted/50 p-3 rounded border">
                        <span className="font-semibold block mb-1">Remediation Notes:</span>
                        {check.remediationNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
