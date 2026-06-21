# Threat Model

## Project Overview

Synops Advisory Group is a public marketing site plus a gated multi-tenant SaaS product, Compass (user-facing label Curriculum Builder), served by a React/Vite frontend and an Express/PostgreSQL API on a public Replit deployment. Production traffic includes unauthenticated marketing and demo traffic, authenticated tenant traffic, global admin traffic, session-backed impersonation, object-storage uploads for meeting recordings, and optional AI-backed transcription / note drafting.

Assumptions for repeated scans:
- Only production-reachable code is in scope.
- `artifacts/mockup-sandbox/` is dev-only and should be ignored unless production reachability is proven.
- Production runs with `NODE_ENV=production`.
- Deployment visibility is currently public, so internet-reachable public endpoints are in scope.

## Assets

- **User accounts and sessions** -- password hashes, session cookies, active impersonation state, and role assignments. Compromise enables account takeover or privileged admin actions.
- **Tenant curriculum data** -- clients, projects, courses, objectives, assessments, QA data, correspondence, meetings, and reports. Cross-tenant disclosure or tampering is a primary business risk.
- **Privileged admin capabilities** -- global console access, impersonation, white-label domain assignment, user management, and cross-org reporting. Abuse would expose or alter all tenant data.
- **Uploaded meeting recordings and derived notes** -- private audio files, transcripts, and AI-generated notes may contain sensitive customer information and are readable across project collaborators.
- **Application secrets and backend integrations** -- database credentials, session secret, email transports, and optional OpenAI integration credentials.
- **Public lead/demo data** -- contact submissions, newsletter signups, and anonymous demo sessions. These are lower-privilege but internet-exposed and useful for abuse or spam.

## Trust Boundaries

- **Browser to API** -- all client input is untrusted; the server must authenticate, authorize, and validate every request.
- **API to PostgreSQL** -- the API has direct access to all tenant and admin data; query mistakes can become broad disclosure or tampering.
- **Public to authenticated surfaces** -- `/api/healthz`, `/api/auth/*`, `/api/contact`, `/api/newsletter`, `/api/demo/*`, and `/api/branding` are public, while `/api/compass/*`, `/api/storage/*`, and `/api/impersonation/*` require stronger controls.
- **Authenticated tenant to global admin** -- org-bound users must never reach cross-org console, impersonation, or branding/domain powers reserved for global roles.
- **Authenticated app to object storage** -- uploaded objects are attacker-controlled bytes but must only be attached, served, and processed within the correct tenant/project scope.
- **API to external AI/email services** -- outbound integrations must not allow attacker-controlled SSRF, secret exposure, or privilege expansion through returned content.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/api-server/src/routes/*`.
- Auth / authorization / tenancy hot spots: `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/lib/actor.ts`, `artifacts/api-server/src/lib/tenancy.ts`, `artifacts/api-server/src/routes/console.ts`, `artifacts/api-server/src/routes/impersonation.ts`.
- Object and AI handling: `artifacts/api-server/src/routes/storage.ts`, `artifacts/api-server/src/routes/meeting-recordings.ts`, `artifacts/api-server/src/lib/objectStorage.ts`, `artifacts/api-server/src/lib/recordingNotesAi.ts`, `artifacts/api-server/src/lib/agendaAi.ts`.
- Frontend rendering sinks worth checking for stored XSS: `artifacts/uva-engine/src/components/engine/MeetingRecordings.tsx` and report/export pages.
- Usually out of scope: `artifacts/mockup-sandbox/`, tests, generated `dist/`, and `node_modules/` unless evidence shows production reachability.

## Threat Categories

### Spoofing

This application relies on server-side sessions plus database-backed role and product checks. The system must only treat a request as authenticated when a valid server-managed session exists, and it must resolve the effective actor from the database on each privileged request so deactivated users, role changes, and impersonation state take effect immediately. Impersonation must remain exclusive to `super_admin`, must regenerate the session on both transitions, and must never be triggerable through host-based branding or client-controlled fields.

### Tampering

Tenant users can create and modify large amounts of curriculum data, meeting data, and branded organization content. The server must validate request bodies with strict schemas, derive tenant ownership from trusted database relationships, and reject client attempts to attach or mutate resources outside the actor's organization or allocation scope. Client-controlled identifiers such as project IDs, meeting IDs, object paths, and organization IDs must never be trusted without server-side scope checks.

### Information Disclosure

The core risk is cross-tenant or cross-role data leakage: tenant content, recordings, transcripts, console exports, user directories, and branding/domain mappings must only be disclosed to authorized actors. Object storage is especially sensitive because attacker-controlled files are served back through the application. Error responses, logs, and generated reports must avoid exposing secrets, hidden resource existence, or other tenants' data.

### Denial of Service

Public routes such as login, contact, newsletter, and demo endpoints can be abused for spam or brute-force attempts, while authenticated AI and upload routes can be abused for expensive compute or memory use. The application must rate-limit internet-facing mutation endpoints appropriately and bound expensive operations like uploads, transcription, report generation, and note extraction so one actor cannot exhaust server or integration capacity.

### Elevation of Privilege

The highest-impact failures would be broken route gating, missing org scoping, unsafe object serving, or injected content that executes in the application origin. Every Compass route must remain behind `requireAuth`, `requireProduct("compass")`, and actor/tenant enforcement. Global console and domain-management routes must remain restricted to global roles, and impersonation must not let an operator bypass the special protections on security-sensitive actions. Uploaded or AI-derived content must not become a script or data exfiltration path that upgrades a low-privilege tenant user into another user's session.