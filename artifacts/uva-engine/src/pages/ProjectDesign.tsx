import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Map, Target, LayoutList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectWorkspace } from "@/components/engine/ProjectWorkspace";

export default function ProjectDesign() {
  return (
    <ProjectWorkspace stageId={1}>
      {() => (
        <Tabs defaultValue="assessments" className="w-full">
          <TabsList>
            <TabsTrigger value="assessments">
              <Target className="mr-2 h-4 w-4" /> Assessments
            </TabsTrigger>
            <TabsTrigger value="activities">
              <LayoutList className="mr-2 h-4 w-4" /> Activities
            </TabsTrigger>
            <TabsTrigger value="alignment">
              <Map className="mr-2 h-4 w-4" /> Alignment map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessments" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assessments</CardTitle>
                  <CardDescription>Determine acceptable evidence of mastery.</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add assessment
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
                  No assessments defined yet. Define how students will prove mastery of objectives.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Learning activities</CardTitle>
                  <CardDescription>Plan experiences that lead to mastery.</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add activity
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
                  No activities defined yet.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alignment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Constructive alignment map</CardTitle>
                <CardDescription>
                  Verify that objectives, assessments, and activities are fully aligned.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-muted/30 p-8">
                  <div className="max-w-md text-center">
                    <Map className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Alignment matrix unavailable</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add objectives, assessments, and activities to visualize their relationships.
                    </p>
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
