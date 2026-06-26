import {
  useListStandardsFrameworks, useCreateStandardsFramework, getListStandardsFrameworksQueryKey,
  useListCompetencies, useCreateCompetency, getListCompetenciesQueryKey,
} from "@workspace/api-client-react";
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
import { useState, type FormEvent } from "react";
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
  const [manageFramework, setManageFramework] = useState<
    { id: number; name: string; acronym?: string | null } | null
  >(null);

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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:bg-primary/10"
                  onClick={() =>
                    setManageFramework({
                      id: framework.id,
                      name: framework.name,
                      acronym: framework.acronym,
                    })
                  }
                >
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

      <ManageCompetenciesDialog
        framework={manageFramework}
        onClose={() => setManageFramework(null)}
      />
    </div>
  );
}

function ManageCompetenciesDialog({
  framework,
  onClose,
}: {
  framework: { id: number; name: string; acronym?: string | null } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const frameworkId = framework?.id ?? 0;
  const { data: competencies, isLoading } = useListCompetencies(frameworkId, {
    query: { enabled: !!framework },
  });
  const createCompetency = useCreateCompetency();
  const [code, setCode] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    if (!framework || !code.trim() || !description.trim()) return;
    createCompetency.mutate(
      {
        id: framework.id,
        data: { code: code.trim(), description: description.trim(), domain: domain.trim() || undefined },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompetenciesQueryKey(framework.id) });
          queryClient.invalidateQueries({ queryKey: getListStandardsFrameworksQueryKey() });
          setCode("");
          setDomain("");
          setDescription("");
          toast({ title: "Competency added" });
        },
        onError: () => toast({ title: "Failed to add competency", variant: "destructive" }),
      },
    );
  }

  return (
    <Dialog open={!!framework} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {framework
              ? `${framework.acronym ? `${framework.acronym} — ` : ""}${framework.name}`
              : "Framework"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : (competencies ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No competencies yet. Add the first one below.
              </div>
            ) : (
              (competencies ?? []).map((c) => (
                <div key={c.id} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.code}</span>
                    {c.domain && (
                      <Badge variant="secondary" className="text-xs">
                        {c.domain}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={add} className="space-y-3 rounded-md border p-3">
            <div className="text-sm font-medium">Add a competency</div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Code (e.g. APA-1)" value={code} onChange={(e) => setCode(e.target.value)} />
              <Input placeholder="Domain (optional)" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={createCompetency.isPending || !code.trim() || !description.trim()}
              >
                {createCompetency.isPending ? "Adding…" : "Add competency"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
