import { useListStandardsFrameworks, useCreateStandardsFramework, getListStandardsFrameworksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Layers, ArrowRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const frameworkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  acronym: z.string().optional(),
  frameworkType: z.string().min(1, "Type is required"),
  description: z.string().optional(),
});

export default function Standards() {
  const { data: frameworks, isLoading } = useListStandardsFrameworks();
  const createFramework = useCreateStandardsFramework();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof frameworkSchema>>({
    resolver: zodResolver(frameworkSchema),
    defaultValues: {
      name: "",
      acronym: "",
      frameworkType: "accreditor",
      description: "",
    },
  });

  function onSubmit(data: z.infer<typeof frameworkSchema>) {
    createFramework.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStandardsFrameworksQueryKey() });
        setOpen(false);
        form.reset();
        toast({ title: "Framework created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create framework", variant: "destructive" });
      }
    });
  }

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Standards Frameworks</h1>
          <p className="text-muted-foreground mt-1">Manage accreditation and licensure competency frameworks.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Framework</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Standards Framework</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Framework Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="acronym"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acronym</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frameworkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="accreditor">Accreditor</SelectItem>
                            <SelectItem value="licensure_board">Licensure Board</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createFramework.isPending}>
                    {createFramework.isPending ? "Creating..." : "Create Framework"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {frameworks?.map((framework) => (
          <Card key={framework.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">
                  {framework.acronym ? `${framework.acronym} - ` : ''}{framework.name}
                </CardTitle>
                <Layers className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
              </div>
              <CardDescription className="mt-1 flex items-center gap-2">
                 <Badge variant="secondary" className="capitalize">{framework.frameworkType.replace('_', ' ')}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {framework.description || "No description provided."}
              </p>
              
              <div className="pt-4 border-t flex items-center justify-between mt-auto">
                <div className="text-sm font-medium">
                  {framework.competencyCount || 0} Competencies
                </div>
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                  Manage <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {frameworks?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-md">
            No standards frameworks defined.
          </div>
        )}
      </div>
    </div>
  );
}
