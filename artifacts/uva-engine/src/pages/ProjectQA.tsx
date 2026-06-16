import { useParams, Link } from "wouter";
import { useGetProject, useListQAChecks, getGetProjectQueryKey, getListQAChecksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShieldCheck, AlertTriangle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectQA() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: checks } = useListQAChecks(projectId, {
    query: { enabled: !!projectId, queryKey: getListQAChecksQueryKey(projectId) }
  });

  if (!project) return <div className="p-8">Loading...</div>;

  const projectChecks = checks?.filter(c => c.projectId === projectId) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Stage 4</Badge>
            <h1 className="text-3xl font-bold tracking-tight">QA & Accessibility</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Quality Assurance Checks</CardTitle>
            <CardDescription>Record results of automated and manual QA processes.</CardDescription>
          </div>
          <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log QA Check</Button>
        </CardHeader>
        <CardContent>
          {projectChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-dashed border-2 rounded-lg">
              <ShieldCheck className="h-12 w-12 mb-4 text-muted" />
              <p>No QA checks logged yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
               {projectChecks.map(check => (
                 <div key={check.id} className="p-4 border rounded-md flex items-start gap-4">
                   <div className="mt-1">
                     {check.status === 'pass' ? <ShieldCheck className="text-green-500" /> : <AlertTriangle className="text-amber-500" />}
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-start">
                       <h4 className="font-medium uppercase tracking-wider text-sm">{check.checkType.replace('_', ' ')}</h4>
                       <Badge variant={check.status === 'pass' ? 'default' : 'secondary'}>{check.status}</Badge>
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
