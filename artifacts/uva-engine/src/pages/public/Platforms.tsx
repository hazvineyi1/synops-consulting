import { usePageMeta } from "@/lib/seo";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdaptiveDemo } from "@/components/public/AdaptiveDemo";
import { Database, MonitorSmartphone, BrainCircuit, Lock } from "lucide-react";

export default function Platforms() {
  usePageMeta(
    "Platforms & SaaS",
    "Custom web apps, AI-powered learning tools, and an interactive Adaptive Reading & Reasoning demo.",
  );
  return (
    <div className="mx-auto max-w-5xl px-4 py-24 space-y-24">
      <div className="space-y-6 max-w-3xl text-center mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Beyond Advisory: We Build
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          From adaptive learning platforms to secure operational dashboards, our technical arm translates strategic requirements into working software.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="space-y-1">
            <MonitorSmartphone className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Custom Web Apps</CardTitle>
            <CardDescription>Tailored SaaS solutions for distinct operational needs.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <BrainCircuit className="w-8 h-8 text-primary mb-2" />
            <CardTitle>AI-Powered Learning</CardTitle>
            <CardDescription>Intelligent tutoring systems and specialized internal agents.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <Database className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Operations Dashboards</CardTitle>
            <CardDescription>Real-time reporting and analytics for managed care oversight.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <Lock className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Secure Data Workflows</CardTitle>
            <CardDescription>Engineered with privacy, compliance, and RBAC at the core.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">See It In Action</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One adaptive assessment, every reading skill. The engine adjusts difficulty after each answer and samples across main idea, inference, vocabulary, and argument evaluation, building a live learner profile as you go.
          </p>
        </div>
        <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
          <AdaptiveDemo />
        </div>
        <div className="text-center">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/contact?area=platforms">Request a tailored build</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8 border-t border-border pt-24">
        <h2 className="text-2xl font-bold">Featured Platform</h2>
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MonitorSmartphone className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-medium text-muted-foreground">Socratic Reasoning Engine</h3>
            <p className="text-sm text-muted-foreground">Coming soon: A dedicated showcase of our conversational evaluation platform.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}