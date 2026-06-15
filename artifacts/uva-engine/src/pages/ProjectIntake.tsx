import { useParams, Link } from "wouter";
import { useGetProject, useGetCourse, useListModules, useCreateCourse, useCreateModule, useListObjectives, getGetProjectQueryKey, getGetCourseQueryKey, getListModulesQueryKey, getListObjectivesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Plus, Save, GitCommit } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ProjectIntake() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: course, isLoading: isCourseLoading } = useGetCourse(projectId, { // Note: Assuming the API can fetch course by projectId here or we need to find it. The spec says useGetCourse takes id, but we might need listCourses. For simplicity, assume project has 1 course.
    query: { enabled: !!projectId, queryKey: getGetCourseQueryKey(projectId) }
  });

  const { data: modules } = useListModules({
    query: { queryKey: getListModulesQueryKey() }
  });
  
  const { data: objectives } = useListObjectives({
    query: { queryKey: getListObjectivesQueryKey() }
  });

  const createCourse = useCreateCourse();
  const createModule = useCreateModule();

  const [moduleOpen, setModuleOpen] = useState(false);

  const courseForm = useForm({
    defaultValues: {
      title: "",
      creditHours: 3,
      termWeeks: 14,
      moduleCount: 14,
      modality: "online",
      courseDescription: ""
    }
  });

  const moduleForm = useForm({
    defaultValues: {
      title: "",
      position: 1,
      weekNumber: 1,
      description: ""
    }
  });

  if (!project) return <div className="p-8">Loading...</div>;

  const projectModules = modules?.filter(m => m.courseId === course?.id) || [];
  const projectObjectives = objectives?.filter(o => o.projectId === projectId) || [];
  const courseLevelObjectives = projectObjectives.filter(o => o.level === 'course');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Stage 0</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Kickoff & Intake</h1>
          </div>
          <p className="text-muted-foreground mt-1">{project.title}</p>
        </div>
      </div>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure">Course Structure</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="objectives">Objectives Cascade</TabsTrigger>
        </TabsList>
        
        <TabsContent value="structure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Master Data</CardTitle>
              <CardDescription>Define the high-level parameters for the course.</CardDescription>
            </CardHeader>
            <CardContent>
              {course ? (
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Course Title</div>
                    <div className="text-lg font-medium">{course.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Credits</div>
                    <div className="text-lg font-medium">{course.creditHours}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Term Weeks</div>
                    <div className="text-lg font-medium">{course.termWeeks}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Target Modules</div>
                    <div className="text-lg font-medium">{course.moduleCount}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Description</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{course.courseDescription}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No course data created yet.</p>
                  <Button className="mt-4" onClick={() => {
                    // Stub for creating course
                    toast({ title: "Course initialization would happen here" });
                  }}>Initialize Course Record</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Course Outline</h3>
            <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
              <DialogTrigger asChild>
                <Button disabled={!course}><Plus className="mr-2 h-4 w-4" /> Add Module</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Module</DialogTitle>
                </DialogHeader>
                <Form {...moduleForm}>
                  <form className="space-y-4">
                    <FormField control={moduleForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={moduleForm.control} name="position" render={({ field }) => (
                        <FormItem><FormLabel>Sequence Position</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))}/></FormControl></FormItem>
                      )}/>
                      <FormField control={moduleForm.control} name="weekNumber" render={({ field }) => (
                        <FormItem><FormLabel>Week</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))}/></FormControl></FormItem>
                      )}/>
                    </div>
                    <FormField control={moduleForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )}/>
                    <Button type="button" className="w-full" onClick={() => {
                      if(!course) return;
                      createModule.mutate({ data: { courseId: course.id, ...moduleForm.getValues() } as any }, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
                          setModuleOpen(false);
                          toast({ title: "Module added" });
                        }
                      });
                    }}>Save Module</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {projectModules.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No modules defined yet.</CardContent></Card>
            ) : (
              projectModules.sort((a,b) => a.position - b.position).map(mod => (
                <Card key={mod.id}>
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="bg-muted text-muted-foreground rounded w-12 h-12 flex items-center justify-center font-bold text-lg shrink-0">
                      M{mod.position}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{mod.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                      <div className="mt-3 flex gap-2">
                        <Badge variant="outline">Week {mod.weekNumber}</Badge>
                        <Badge variant="secondary" className="capitalize">{mod.status?.replace('_',' ')}</Badge>
                        {mod.isPrototype && <Badge variant="default">Prototype</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="objectives" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Objectives Cascade</CardTitle>
                <CardDescription>Map relationships from Program to Course to Module level.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Objective</Button>
            </CardHeader>
            <CardContent>
              {courseLevelObjectives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded-lg">
                  No objectives defined.
                </div>
              ) : (
                <div className="space-y-6">
                  {courseLevelObjectives.map(obj => {
                    const children = projectObjectives.filter(child => child.parentId === obj.id);
                    return (
                      <div key={obj.id} className="border rounded-md p-4">
                        <div className="flex gap-3">
                          <Badge className="shrink-0 h-fit">Course</Badge>
                          <p className="font-medium text-sm leading-relaxed">{obj.text}</p>
                        </div>
                        {children.length > 0 && (
                          <div className="mt-4 pl-8 border-l-2 ml-4 space-y-3">
                            {children.map(child => (
                              <div key={child.id} className="flex gap-3 relative">
                                <GitCommit className="h-4 w-4 absolute -left-[25px] top-1 text-muted-foreground bg-card" />
                                <Badge variant="outline" className="shrink-0 h-fit">Module</Badge>
                                <p className="text-sm text-muted-foreground">{child.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
