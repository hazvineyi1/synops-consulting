import { useParams } from "wouter";
import { useGetLedgerReport, getGetLedgerReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle } from "lucide-react";
import { ProjectWorkspace } from "@/components/engine/ProjectWorkspace";

export default function ProjectHandoff() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: report, isLoading } = useGetLedgerReport(projectId, {
    query: { enabled: !!projectId, queryKey: getGetLedgerReportQueryKey(projectId) },
  });

  return (
    <ProjectWorkspace
      stageId={3}
      actions={() => (
        <Button disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" /> Generate full artifact report
        </Button>
      )}
    >
      {() => (
        <Card>
          <CardHeader>
            <CardTitle>Evidence ledger</CardTitle>
            <CardDescription>
              Immutable record of design decisions, compliance checks, and AI disclosures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 animate-pulse rounded bg-muted" />
            ) : !report ? (
              <div className="py-8 text-center text-muted-foreground">Report unavailable.</div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h3 className="mb-4 flex items-center border-b pb-2 text-lg font-semibold">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                    Accessibility conformance
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {report.accessibilityConformance.summary}
                  </p>
                  {report.accessibilityConformance.entries.length === 0 && (
                    <p className="text-sm italic">No entries recorded.</p>
                  )}
                </section>

                <section>
                  <h3 className="mb-4 flex items-center border-b pb-2 text-lg font-semibold">
                    <FileText className="mr-2 h-5 w-5 text-blue-500" />
                    Design rationale
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">{report.designRationale.summary}</p>
                  {report.designRationale.entries.length === 0 && (
                    <p className="text-sm italic">No entries recorded.</p>
                  )}
                </section>

                <section>
                  <h3 className="mb-4 flex items-center border-b pb-2 text-lg font-semibold">
                    <FileText className="mr-2 h-5 w-5 text-purple-500" />
                    AI disclosure
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">{report.aiDisclosure.summary}</p>
                  {report.aiDisclosure.entries.length === 0 && (
                    <p className="text-sm italic">No entries recorded.</p>
                  )}
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ProjectWorkspace>
  );
}
