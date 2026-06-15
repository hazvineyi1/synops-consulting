import { useParams, Link } from "wouter";
import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Map, Target, LayoutList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectDesign() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Stage 1</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Backward Design</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
      </div>

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList>
          <TabsTrigger value="assessments"><Target className="h-4 w-4 mr-2"/> Assessments</TabsTrigger>
          <TabsTrigger value="activities"><LayoutList className="h-4 w-4 mr-2"/> Activities</TabsTrigger>
          <TabsTrigger value="alignment"><Map className="h-4 w-4 mr-2"/> Alignment Map</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Assessments</CardTitle>
                <CardDescription>Determine acceptable evidence of mastery.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Assessment</Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border-dashed border-2 rounded-lg">
                No assessments defined yet. Define how students will prove mastery of objectives.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Learning Activities</CardTitle>
                <CardDescription>Plan experiences that lead to mastery.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Activity</Button>
            </CardHeader>
            <CardContent>
               <div className="text-center py-12 text-muted-foreground border-dashed border-2 rounded-lg">
                No activities defined yet. 
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alignment" className="mt-6">
          <Card>
             <CardHeader>
              <CardTitle>Constructive Alignment Map</CardTitle>
              <CardDescription>Verify that objectives, assessments, and activities are fully aligned.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="bg-muted/30 rounded-lg p-8 flex items-center justify-center min-h-[300px]">
                <div className="text-center max-w-md">
                  <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Alignment Matrix Unavailable</h3>
                  <p className="text-sm text-muted-foreground mt-2">Add objectives, assessments, and activities to visualize their relationships.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
