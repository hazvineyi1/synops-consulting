interface MinimalLogger {
  info: (obj: object, msg?: string) => void;
}

export interface ContactNotification {
  name: string;
  email: string;
  organization?: string | null;
  phone?: string | null;
  areaOfInterest: string;
  message: string;
  source: string;
}

/**
 * Send a notification email about a new contact/portal submission.
 *
 * The email provider is gated behind environment variables. If a provider and
 * recipient are not configured, this degrades gracefully to structured logging
 * so the public-facing flow always succeeds.
 */
export async function sendContactNotification(
  log: MinimalLogger,
  n: ContactNotification,
): Promise<void> {
  const to = process.env.CONTACT_EMAIL;
  const providerConfigured = Boolean(
    process.env.SMTP_URL ||
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY,
  );

  if (!to || !providerConfigured) {
    log.info(
      {
        recipient: to ?? "(CONTACT_EMAIL unset)",
        from: n.email,
        area: n.areaOfInterest,
        source: n.source,
      },
      "Contact notification received, email provider not configured, logged only",
    );
    return;
  }

  // A concrete provider integration is intentionally deferred for this pass.
  // When credentials are present we record the intent; wiring a transport
  // (Resend/SendGrid/SMTP) is a drop-in here.
  log.info(
    { recipient: to, from: n.email, source: n.source },
    "Contact notification: provider configured; delivery deferred to integration",
  );
}
