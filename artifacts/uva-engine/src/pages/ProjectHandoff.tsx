import { useParams, Link } from "wouter";
import { useGetProject, useGetLedgerReport, getGetProjectQueryKey, getGetLedgerReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectHandoff() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: report, isLoading } = useGetLedgerReport(projectId, {
    query: { enabled: !!projectId, queryKey: getGetLedgerReportQueryKey(projectId) }
  });

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Stage 5</Badge>
              <h1 className="text-3xl font-bold tracking-tight">Handoff & Artifacts</h1>
            </div>
            <p className="text-muted-foreground mt-1">{project.title}</p>
          </div>
        </div>
        <Button disabled={isLoading}><Download className="mr-2 h-4 w-4"/> Generate Full Artifact Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
           <CardHeader>
              <CardTitle>Evidence Ledger</CardTitle>
              <CardDescription>Immutable record of design decisions, compliance checks, and AI disclosures.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="animate-pulse h-32 bg-muted rounded"></div> : 
               !report ? <div className="text-center py-8 text-muted-foreground">Report unavailable.</div> :
               (
                 <div className="space-y-8">
                   <section>
                     <h3 className="flex items-center font-semibold text-lg border-b pb-2 mb-4">
                       <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                       Accessibility Conformance
                     </h3>
                     <p className="text-sm text-muted-foreground mb-4">{report.accessibilityConformance.summary}</p>
                     {report.accessibilityConformance.entries.length === 0 && <p className="text-sm italic">No entries recorded.</p>}
                   </section>

                   <section>
                     <h3 className="flex items-center font-semibold text-lg border-b pb-2 mb-4">
                       <FileText className="h-5 w-5 mr-2 text-blue-500" />
                       Design Rationale
                     </h3>
                     <p className="text-sm text-muted-foreground mb-4">{report.designRationale.summary}</p>
                     {report.designRationale.entries.length === 0 && <p className="text-sm italic">No entries recorded.</p>}
                   </section>
                   
                   <section>
                     <h3 className="flex items-center font-semibold text-lg border-b pb-2 mb-4">
                       <FileText className="h-5 w-5 mr-2 text-purple-500" />
                       AI Disclosure
                     </h3>
                     <p className="text-sm text-muted-foreground mb-4">{report.aiDisclosure.summary}</p>
                     {report.aiDisclosure.entries.length === 0 && <p className="text-sm italic">No entries recorded.</p>}
                   </section>
                 </div>
               )
              }
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
