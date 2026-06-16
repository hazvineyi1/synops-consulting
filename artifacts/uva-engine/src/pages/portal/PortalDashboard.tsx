import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { usePageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGetPortalEngagements, getGetPortalEngagementsQueryKey, useGetPortalResources, getGetPortalResourcesQueryKey, useSendPortalMessage } from "@workspace/api-client-react";
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
  usePageMeta("Portal dashboard", "Your Synops Advisory Group client portal.");
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: engagements, isLoading: loadingEngagements } = useGetPortalEngagements({
    query: { queryKey: getGetPortalEngagementsQueryKey() }
  });

  const { data: resources, isLoading: loadingResources } = useGetPortalResources({
    query: { queryKey: getGetPortalResourcesQueryKey() }
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
    } catch (err) {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      
      {/* SECURITY NOTICE */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-4 items-start text-destructive-foreground">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-destructive">Security Notice: Not for Regulated Health Data</p>
          <p className="opacity-90">
            This portal is for general project collaboration and curriculum management. It must <strong>NOT</strong> be used to store or transmit PHI (Protected Health Information), patient data, or other regulated health information until a formal HIPAA/security compliance review and BAA are complete.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{user?.organization || "Client Dashboard"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => logout()}>Sign out</Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="~/portal/engine">Open curriculum engine</Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          {/* Engagements */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Your engagements</h2>
            {loadingEngagements ? (
              <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
            ) : engagements?.length === 0 ? (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No active engagements found.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {engagements?.map(eng => (
                  <Card key={eng.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {eng.practiceArea}
                          </Badge>
                          <CardTitle className="text-lg">{eng.title}</CardTitle>
                        </div>
                        <Badge variant={eng.status === 'active' ? 'default' : 'outline'} className="capitalize">
                          {eng.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex justify-between text-muted-foreground border-t border-border pt-3">
                        <span>Started: {format(parseISO(eng.createdAt), "MMM yyyy")}</span>
                        {eng.nextMilestone && <span>Next: {eng.nextMilestone}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Message Form */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Messages / requests</h2>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input 
                      id="subject" 
                      value={subject} 
                      onChange={e=>setSubject(e.target.value)} 
                      placeholder="Project update request..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      value={message} 
                      onChange={e=>setMessage(e.target.value)} 
                      placeholder="Type your message here..."
                      className="min-h-[100px]"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={sendMut.isPending || !subject || !message} className="w-full sm:w-auto">
                    <Send className="w-4 h-4 mr-2" />
                    {sendMut.isPending ? "Sending..." : "Send to project team"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-8">
          {/* Shared Resources */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Shared resources</h2>
            {loadingResources ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : resources?.length === 0 ? (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No resources shared yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {resources?.map(res => (
                  <a key={res.id} href={res.url || "#"} className="block group" target={res.url ? "_blank" : undefined} rel="noreferrer">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{res.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{res.category}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </section>
          
          <Card className="bg-muted border-none">
            <CardContent className="p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-foreground">Coming Soon</h3>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
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