import { useState } from "react";
import { useListProjects, useListClients, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ArrowRight, Plus, Filter } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGES = [
  { value: "all", label: "All Stages" },
  { value: "0", label: "0: Kickoff & Intake" },
  { value: "1", label: "1: Backward Design" },
  { value: "2", label: "2: Prototype" },
  { value: "3", label: "3: Production" },
  { value: "4", label: "4: QA & Accessibility" },
  { value: "5", label: "5: Handoff" }
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "complete", label: "Complete" },
  { value: "gate_blocked", label: "Gate Blocked" }
];

export default function Projects() {
  const { data: projects, isLoading: isProjectsLoading } = useListProjects();
  const { data: clients, isLoading: isClientsLoading } = useListClients();
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  if (isProjectsLoading || isClientsLoading) return <div className="p-8">Loading...</div>;

  const filteredProjects = projects?.filter(p => {
    if (stageFilter !== "all" && p.stage.toString() !== stageFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  }) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all course design projects across clients.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 border rounded-md">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="w-64">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-md">
            No projects match the current filters.
          </div>
        ) : (
          filteredProjects.map(project => {
            const client = clients?.find(c => c.id === project.clientId);
            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">
                    <Link href={`/projects/${project.id}`} className="hover:underline text-foreground">
                      {project.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="h-3 w-3" />
                    {client?.name || project.clientName || "Unknown Client"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={project.status === 'gate_blocked' ? 'destructive' : project.status === 'complete' ? 'default' : 'secondary'}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">Stage {project.stage}</Badge>
                      {project.tier && <Badge variant="outline">Tier {project.tier}</Badge>}
                      {project.lms && <Badge variant="outline" className="capitalize">{project.lms.replace('_', ' ')}</Badge>}
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t flex items-center justify-between mt-auto">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {project.targetDeliveryDate ? format(new Date(project.targetDeliveryDate), 'MMM d, yyyy') : 'No target date'}
                    </div>
                    <Link href={`/projects/${project.id}`} className="text-sm text-primary hover:underline flex items-center font-medium">
                      Open <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
