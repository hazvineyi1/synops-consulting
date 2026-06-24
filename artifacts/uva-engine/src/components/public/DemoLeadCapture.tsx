import { useState, type FormEvent } from "react";
import {
  useSubmitDemoLead,
  type DemoLeadInputDemo,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Send } from "lucide-react";

export function DemoLeadCapture({
  demo,
  summary,
  heading = "Send these results to our team",
  description = "Add your details and we will follow up. Optional, and only if you want a conversation.",
}: {
  demo: DemoLeadInputDemo;
  summary: string;
  heading?: string;
  description?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  // Honeypot: real visitors never see or fill this field.
  const [website, setWebsite] = useState("");
  const mut = useSubmitDemoLead();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mut.isPending || mut.isSuccess) return;
    mut.mutate({
      data: {
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim() || undefined,
        demo,
        summary,
        website,
      },
    });
  };

  if (mut.isSuccess) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-foreground">
            Thank you. Your results are on the way to our team.
          </p>
          <p className="text-muted-foreground">
            We will reach out to the address you provided.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      aria-label={heading}
    >
      <div className="space-y-1">
        <h4 className="text-base font-semibold">{heading}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`lead-name-${demo}`}>Name</Label>
          <Input
            id={`lead-name-${demo}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`lead-email-${demo}`}>Email</Label>
          <Input
            id={`lead-email-${demo}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`lead-org-${demo}`}>Organization (optional)</Label>
          <Input
            id={`lead-org-${demo}`}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            autoComplete="organization"
            maxLength={200}
          />
        </div>
      </div>

      {/* Honeypot field, visually hidden and skipped by keyboard and assistive tech. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`lead-website-${demo}`}>Leave this field empty</label>
        <input
          id={`lead-website-${demo}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {mut.isError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Something went wrong. Please check your details and try again.
        </p>
      )}

      <Button type="submit" disabled={mut.isPending}>
        <Send className="mr-2 h-4 w-4" aria-hidden="true" />
        {mut.isPending ? "Sending..." : "Send my results"}
      </Button>
    </form>
  );
}
