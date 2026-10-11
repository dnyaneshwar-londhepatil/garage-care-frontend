# GarageCare frontend implementation guide

## Purpose and source documents

GarageCare helps independent garage owners manage customers, vehicles, parts and labour, service jobs, invoices, WhatsApp PDF delivery, and service reminders. V1 targets India and one owner account per garage.

The product baseline is [PRD.md](PRD.md). Planned platform architecture is in [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md), API contracts in [API_SPECIFICATION.md](API_SPECIFICATION.md), and persistence rules in [DB_DESIGN.md](DB_DESIGN.md). These documents describe the intended product; they do not imply that all capabilities are implemented.

## Current repository

- `apps/garage-care`: Angular 22 standalone application with routing, SSR, and hydration. The root renders the route outlet; `/` redirects to the sign-up preview at `/sign-up`.
- `apps/garage-care-e2e`: Playwright test project.
- `libs/shared/styles`: reusable Sass abstracts, base styles, components, layouts, themes, and utilities.
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
