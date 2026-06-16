import { useAuth } from "@/lib/auth-context";
import { usePageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  useGetPortalEngagements,
  getGetPortalEngagementsQueryKey,
  useGetPortalResources,
  getGetPortalResourcesQueryKey,
  useSendPortalMessage,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ShieldAlert, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PortalDashboard() {
  usePageMeta("Hub - Client portal", "Your Synops Advisory Group client portal.");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: engagements, isLoading: loadingEngagements } = useGetPortalEngagements({
    query: { queryKey: getGetPortalEngagementsQueryKey() },
  });

  const { data: resources, isLoading: loadingResources } = useGetPortalResources({
    query: { queryKey: getGetPortalResourcesQueryKey() },
  });

  const sendMut = useSendPortalMessage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    try {
      await sendMut.mutateAsync({ data: { subject, message } });
      toast({ title: "Message sent", description: "Your project team has been notified." });
      setSubject("");
      setMessage("");
    } catch {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user?.organization || "Your client workspace"}
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-destructive">
            Security notice: not for regulated health data
          </p>
          <p className="text-destructive/90">
            This portal is for general project collaboration and curriculum
            management. It must <strong>not</strong> be used to store or transmit
            PHI (Protected Health Information), patient data, or other regulated
            health information until a formal HIPAA and security compliance review
            and BAA are complete.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Engagements */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Your engagements</h2>
            {loadingEngagements ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : engagements?.length === 0 ? (
              <Card className="border-dashed bg-muted/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No active engagements found.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {engagements?.map((eng) => (
                  <Card key={eng.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {eng.practiceArea}
                          </Badge>
                          <CardTitle className="text-lg">{eng.title}</CardTitle>
                        </div>
                        <Badge
                          variant={eng.status === "active" ? "default" : "outline"}
                          className="capitalize"
                        >
                          {eng.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex justify-between border-t border-border pt-3 text-muted-foreground">
                        <span>Started: {format(parseISO(eng.createdAt), "MMM yyyy")}</span>
                        {eng.nextMilestone && <span>Next: {eng.nextMilestone}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Message form */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Messages and requests</h2>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Project update request"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here"
                      className="min-h-[100px]"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sendMut.isPending || !subject || !message}
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendMut.isPending ? "Sending..." : "Send to project team"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-8">
          {/* Shared resources */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Shared resources</h2>
            {loadingResources ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : resources?.length === 0 ? (
              <Card className="border-dashed bg-muted/50">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No resources shared yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {resources?.map((res) => (
                  <a
                    key={res.id}
                    href={res.url || "#"}
                    className="group block"
                    target={res.url ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <Card className="transition-colors hover:border-primary/50">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                            {res.title}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {res.category}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </section>

          <Card className="border-none bg-muted">
            <CardContent className="space-y-2 p-4 text-sm">
              <h3 className="font-semibold text-foreground">Coming soon</h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>Secure document upload</li>
                <li>Self-service password reset</li>
                <li>Detailed milestone tracking</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
