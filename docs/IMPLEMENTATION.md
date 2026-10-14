# GarageCare frontend implementation guide

## Current integration status — 2026-10-12

Existing authentication and dashboard screens now use injectable services from `libs/shared/data-access`. The sibling `../garage-care-backend` supplies the implemented REST contract. Sign-up retains the approved minimal layout; recovery submits real requests; the guarded dashboard restores the session and loads live garage records. Full endpoint coverage, configuration, security behavior, verification, and the remaining unbuilt pages are documented in [API_INTEGRATION.md](API_INTEGRATION.md).

The earlier preview descriptions below record the visual baseline and are superseded by this integration status where they describe disconnected authentication, recovery, or sample dashboard data. Customer, vehicle, parts, invoice, reminder-management and settings pages remain future work; their typed API services are available now. Provider delivery, GST/setup restrictions and worker/storage readiness still depend on the backend.

## Purpose and source documents

GarageCare helps independent garage owners manage customers, vehicles, parts and labour, service jobs, invoices, WhatsApp PDF delivery, and service reminders. V1 targets India and one owner account per garage.

The product baseline is [PRD.md](PRD.md). Planned platform architecture is in [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md), API contracts in [API_SPECIFICATION.md](API_SPECIFICATION.md), and persistence rules in [DB_DESIGN.md](DB_DESIGN.md). These documents describe the intended product; they do not imply that all capabilities are implemented.

## Current repository

- `apps/garage-care`: Angular 22 standalone application with routing, SSR, and hydration. The root renders the route outlet; `/` redirects to the sign-up preview at `/sign-up`.
- `apps/garage-care-e2e`: Playwright test project.
- `libs/shared/styles`: reusable Sass abstracts, base styles, components, layouts, themes, and utilities.
- `libs/shared/data-access`: all injectable browser API services and typed DTOs.
- `docs`: product and engineering specifications.

The backend, worker, MongoDB, Redis/BullMQ, PDF storage, and WhatsApp integration are planned dependencies and are not implemented in this frontend checkout. PWA support is a product requirement rather than an already verified capability. Preserve the existing application name and folder structure.

## Frontend architecture

Keep the root component as the application shell and place feature components under `apps/garage-care/src/app`, starting with authentication. Use standalone components and feature routes, Reactive Forms for validated input, Signals for local UI state, and services for HTTP calls. Introduce shared UI code when reuse is demonstrated. Shared visual tokens and reusable Sass belong in `libs/shared/styles`; local layouts belong with their components.

Browser code must not import server libraries or contain credentials. Preserve server rendering and hydration. Authentication will use HttpOnly cookies and a finalized CSRF contract; do not store session tokens or passwords in browser storage.

## First feature: owner registration

Visual reference: [GarageCare Stitch project](https://stitch.withgoogle.com/projects/17101721684738931297), project ID `17101721684738931297`, screen ID `d2eb4ce89fa2457584e9a3c268a7632d` (GarageCare — Create Account). Stitch access was verified on 2026-10-11 and the screen HTML retrieved.

The responsive standalone sign-up component is under `apps/garage-care/src/app/features/auth/sign-up`. It uses Reactive Forms and Signals for required fields, email and Indian mobile validation, matching passwords, password visibility, and a live security checklist. Password rules follow the reference for preview purposes; the production policy remains pending. Terms acceptance and optional WhatsApp/SMS updates are separate controls. Sign-in links to `/sign-in`; policy actions announce their preview availability. No HTTP registration requests, credential storage, or simulated account creation are implemented.

The planned registration endpoint is `POST /api/v1/auth/register`. Its example request includes owner email/password, garage name/phone, GST registration mode, and an Indian address. The wireframe must be reconciled with these fields: if it collects only owner credentials, decide how subsequent garage setup completes registration before claiming the flow is functional. Exact DTOs, password policy, CSRF transport, and post-registration behavior still need to be finalized with the backend contract.

Implement responsive layout, accessible field labels and errors, password visibility controls where specified, and pending/error states. Report registration success only after a successful API response. Keep any preview explicitly identified until backend integration exists.

## Owner sign-in preview

The `/sign-in` route uses Stitch project `17101721684738931297`, screen `fb326bc38d5f4e8b8d08af12f3c28f75` (GarageCare — Sign In). The standalone component is under `apps/garage-care/src/app/features/auth/sign-in`, with Reactive Forms, required email/password validation, password visibility, and a link back to sign-up. Authentication screens reuse the shared `_auth-shell.scss` mixin and locally hosted typography.

Submission explicitly reports that no session was created. Remember me is an in-memory preview choice only. Password recovery links to `/forgot-password`; policy actions announce that they are unavailable. Reference sample credentials, simulated authentication success, system availability, and unverified encryption claims are omitted. Production login will use `POST /api/v1/auth/login` only after the cookie/CSRF contract and backend are available.

## Forgot password preview

The `/forgot-password` route follows Stitch project `17101721684738931297`, screen `e36b62afa17844ee8e833ae27d3271ef`. The standalone component uses Reactive Forms for email validation, accessible errors, shared authentication styling/fonts, and navigation back to sign-in. Valid preview submission explicitly states that no reset email was sent. `POST /api/v1/auth/forgot-password` integration awaits the backend and finalized CSRF contract; there is no simulated delivery or credential persistence.

## Reset password preview

The `/reset-password` route follows Stitch project `17101721684738931297`, screen `7c546a86461949c9b28f2b0690d27ea9`. The standalone component provides new-password and confirmation fields, visibility controls, matching validation, and a live checklist/strength badge following the reference's preview rules. Recovery pages share `_auth-recovery.scss` and the existing fonts. Links return to sign-in or request a new link through Forgot Password.

No token is validated, password changed, or session revoked in this preview. The page does not display fabricated success or expiry states. Production `POST /api/v1/auth/reset-password` requires the backend's token, password-policy, expiry, and CSRF contracts.

## Owner dashboard preview

The `/dashboard` route follows Stitch project `17101721684738931297`, screen `64b0ba93eec9422b8bf0feb19ba776f9` (GarageCare — Owner Dashboard). It provides the responsive sidebar/header, summary cards, quick actions, customer/vehicle job cards, reminders, and throughput illustration. Hanken Grotesk and JetBrains Mono reuse the approved local fonts; icons are local SVGs.

Sample jobs can be searched by customer, phone, vehicle, registration, or job identifier, filtered by status, and expanded for service details. Mobile navigation supports keyboard activation and Escape. This route is publicly accessible for design review, with a fixed sample snapshot rather than authentication or live garage data. Navigation to undeveloped modules and contact/reminder actions announces preview status and sends nothing.

The reference's branch selector, staff attendance, live status, and payment integration claims are adapted to the single-owner V1 scope. Billed invoice totals remain distinct from collected payments, which are unavailable. Production integration awaits authenticated services for `/api/v1/dashboard/summary`, jobs, and reminders. The summary cards represent the sample garage, while only five recent jobs and three reminders are shown.

Dashboard child components live under `features/dashboard/components`, with separate HTML, SCSS, TypeScript, and spec files. The shell, SVG icon renderer, and job list have focused responsibilities. Icons use original Material Symbols Outlined SVG paths matching Stitch, including vehicle types, actions, arrows, and navigation. Google's Apache license is retained in `public/licenses/material-symbols-LICENSE.txt`. The unused Nx starter component was removed.

All implemented page components and shared authentication Sass mixins use nested selectors following their template hierarchy, with responsive media rules inside the selectors they modify. Authentication arrows, validation marks, and the country flag are SVGs. These conventions are documented in `agents.md` for future work.

The shared `button[gcButton]` component in `libs/shared/ui` provides compact outline, subtle, and primary variants while preserving native button events and disabled behavior. Job Call/View actions share pale resting styles and blue hover states for every customer. Reminder cards follow Stitch's title/due row and compact status/action footer; their delivery states are explicitly illustrative. The workshop card preserves the two inset metric tiles and note panel, with recent completed jobs replacing out-of-scope staff attendance. The overview remains a feature child component.

## Service Jobs list

The Service Jobs list uses Stitch project `17101721684738931297`, screen `1b7e824a32b64c8b9da6e7d83e77c8be`, inspected on 2026-10-12. `/service-jobs` is session-guarded and loads service records, related customers and vehicles, and garage-wide status counts through the shared API services. `/preview/service-jobs` shows five explicitly fictional records without authentication or API requests.

The screen retains the reference's workspace shell, banner, four summary tiles, status tabs, filter bar, service register, and pagination. Bays, employee assignments, payment collection, unsupported estimates and delivery ETAs are adapted to V1 service statuses and service dates. Search, vehicle/date/status filters, row selection, compact view, CSV export, and expandable job summaries are implemented. CSV text is escaped and formula-prefixed values are neutralized. Filtering and export cover loaded records; cursor-based Load More expands that set. The summary counts cover the garage, independently of local filters.

The workspace shell and original Material Symbols SVG renderer now live in `libs/shared/ui` and remain shared with Dashboard. Fonts and colors reuse the established local assets and palette. Search stays disabled until browser hydration completes. Loading, retry, empty states and session expiry are handled without falling back to sample data. New Service Job opens the quick intake modal; the full detail page remains a subsequent page in the review/merge sequence.

Verification: production build including prerendering, app and shared UI unit tests, lint, and focused Playwright checks for Service Jobs and Dashboard. Responsive checks cover 1440px desktop, 768px tablet and 390px mobile; the wide table scrolls within its own region.

## New Service Job quick intake modal — 2026-10-14

The user selected the minimal Quick Intake Modal in Stitch project `17101721684738931297`, screen `a3b10e0d52dc438c88a455965e4b9773`. New Service Job opens the native modal dialog above the existing register at `/service-jobs`; `/preview/service-jobs` provides the same modal without API writes. The dialog is under the feature's `components/quick-intake` folder.

Intake collects customer name, Indian mobile number, normalized registration number, make/model, quick category, complaint, vehicle type, and service date. It searches paginated API results for exact phone/registration matches, reuses matching records, rejects vehicle ownership mismatches, and creates new customer/vehicle records when needed. Category is preserved as a prefix in the complaint because the current API has no category field. Dates preserve the Asia/Kolkata calendar day. Billable items remain empty during quick intake.

Save as Draft persists the job in draft status. Create Service Job creates the draft and then sends a versioned transition to in-progress. Successful writes close the modal and refresh the register with a confirmation. Completed customer, vehicle, and job creation steps are retained if a later step fails, so retry resumes without repeating confirmed writes. Native dialog behavior traps focus and makes the register inert; Escape, Cancel, and close restore focus, while pending saves cannot be dismissed. The background scroll lock is restored when the modal is destroyed.

Bay and technician assignments are outside V1. Their row is adapted to vehicle type and service date, which the backend needs. WhatsApp updates are disabled and unchecked with an availability note; no consent or delivery is inferred. No invented job identifier, allocation, invoice, or message success is shown. Validation covers exact record reuse, relationship checks, partial failure retry, draft/start payloads, preview isolation, modal focus/keyboard behavior, and desktop/tablet/mobile layouts.

## Delivery sequence

1. Authentication and garage setup.
2. Customers, vehicles, parts catalog, and service jobs.
3. Server-authoritative billing, invoice snapshots, and PDF workflows.
4. WhatsApp delivery and service reminders.
5. Dashboard, PWA support, security hardening, and release verification.

## Verification

Use the smallest relevant check and confirm a fresh successful exit:

```powershell
npx nx build garage-care
npx nx test garage-care
npx nx lint garage-care
npx nx e2e garage-care-e2e
```

For documentation-only changes, run Prettier checks on the changed Markdown. For feature changes, build and run focused behavior tests; verify the rendered page at desktop and mobile sizes, including keyboard navigation and validation. Do not describe planned integrations as working features.

All application and shared UI colors now come from libs/shared/styles/src/lib/abstracts/\_colors.scss. Component styles import its semantic Sass palette; the light theme exposes --palette-\* custom properties for SVG paint. Existing legacy shared-style aliases resolve to this same palette. Opacity variants and shadows retain their original values. Literal color values are allowed only in the palette and test expectations.

Upcoming Reminders follows the approved Stitch four-column grid, heading indicator and View All action, 4px small spacing, typography, and compact card footers. Browser checks at 1280px verify 218px-wide reminder cards with heights of 153/133/133px. View All remains a clearly announced preview action until the reminders module is implemented.

## Local sign-in integration

Sign-in and sign-up read the API base URL from the environment configuration. Development currently calls http://localhost:3000/api/v1 directly; the Angular proxy remains available for relative API URLs. Start the backend with `npm run dev:local` in its repository, then run `npx nx serve garage-care --port=4200` here. The backend must allow `http://localhost:4200` in FRONTEND_ORIGINS. The proxy targets localhost:3000 and preserves the browser Origin. Production hosting must route `/api` to the backend on a compatible same-site deployment.

Sign-in fetches anonymous CSRF before login and uses cookie credentials. Session credentials are never stored in browser storage. Remember me is disabled because the backend does not expose that option. Dashboard content and recovery remain previews. Sign-in requires an existing owner; sign-up now creates one through the backend.

## Local sign-up integration

Sign-up now collects the backend-required garage address and GST mode, maps Indian phone numbers to +91, and registers the owner through cookie/CSRF authentication. Passwords require 12–128 characters plus the existing number/special-character form rules. Registered modes require a GSTIN format match; this is not GST verification, and registered invoice issuance remains blocked pending tax configuration. Owner name is required in the form and stored by the backend. Messaging preferences remain disabled because the registration API has no corresponding field. Terms acceptance is a client-side check, not a stored consent record; policy content remains unavailable.

A successful backend response creates the account and session, clears password fields and opens the preview dashboard. Requests cannot be double-submitted while pending. No passwords or session credentials are persisted in browser storage. Recovery and dashboard data remain previews. Sign-in and sign-up share the environment-configured authentication service and cookie/CSRF flow.

Verification includes an opt-in real local signup test: set RUN_LOCAL_BACKEND=1 and run Playwright with apps/garage-care-e2e/playwright.config.mts. This creates a test garage/owner with a unique example.invalid email and random password in the development database. Default browser runs skip this database-dependent case.
Signup wireframe restored: only full name, garage name, email, mobile, password and confirmation are collected. Address/GST fields are deferred with no fake values; invoice issuance is blocked by GARAGE_SETUP_PENDING until setup exists. Messaging remains disabled and the backend password minimum remains 12 characters.
