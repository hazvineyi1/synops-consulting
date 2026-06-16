import { type ReactNode } from "react";
import { Link } from "wouter";

/**
 * Shared layout for the public portal auth screens (login / register).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-primary to-teal-400 text-white">
              <span className="absolute inset-0 m-auto h-3.5 w-3.5 rotate-45 border border-white/80" />
              <span className="relative z-10 text-[11px] font-bold">SA</span>
            </span>
            <span>Synops Advisory</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </div>

      <div className="relative hidden items-center justify-center bg-gradient-to-br from-primary to-teal-700 p-12 text-primary-foreground lg:flex">
        <div className="max-w-md space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-foreground/70">
            Client Portal
          </p>
          <p className="text-2xl font-semibold leading-snug">
            One engine for curriculum development, built to adapt across every
            level and institution.
          </p>
          <p className="text-sm text-primary-foreground/80">
            Track engagements, access shared resources, and work inside the
            institution-agnostic curriculum portal. No PHI or regulated health
            data until a compliance review is complete.
          </p>
        </div>
      </div>
    </div>
  );
}
