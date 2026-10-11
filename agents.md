# Agents Guide

This repository is an Angular Nx monorepo for the Garage Care frontend application.

## Project structure

- `apps/garage-care`: main Angular application
- `apps/garage-care-e2e`: Playwright end-to-end tests
- `libs/shared/styles`: shared Sass styling library used across the app
- `libs/shared/ui`: reusable standalone Angular UI components, imported through `@garage-care/shared/ui`
- `docs/`: product and technical documentation

## Stack and conventions

- Angular 22 with TypeScript
- Nx workspace tooling
- SCSS styles via shared style library
- Prefer small, targeted changes that align with the existing Angular/Nx conventions
- Keep code readable, component-oriented, and consistent with existing app patterns

## Working rules for agents

1. Prefer editing only the files required for the task.
2. Match the existing naming, folder placement, and Angular patterns already used in the repository.
3. Maintain the current structure of the app instead of introducing new frameworks or architectural patterns.
4. Keep styles in the shared Sass library when the change is global or reusable; keep component-specific styling near the component when it is local.
5. If a task touches routing, app shell, or shared config, inspect the existing Angular app setup before making changes.

## Component, styling, and icon conventions

- Place a page's child components in its `components/<component-name>/` folder (for example, `features/dashboard/components/dashboard-shell/`). Keep the parent page at the feature root.
- Move UI components reused across sections or features into `libs/shared/ui`; keep feature data and backend actions in the consuming feature. Use its shared native `button[gcButton]` component for consistent compact action variants and hover/focus behavior.
- Every Angular component has four separate files: `<name>.ts`, `<name>.html`, `<name>.scss`, and `<name>.spec.ts`. Use `templateUrl` and `styleUrl`; do not embed templates or styles in TypeScript. Use SCSS rather than plain CSS in this workspace.
- Organize SCSS selectors according to the component template hierarchy. Nest child selectors under their owning container, and use `&` for states and pseudo-classes. Keep nesting readable and avoid unrelated selectors or unnecessary specificity.
- Place each responsive `@media` rule inside the selector it changes. Do not collect component breakpoints in standalone media blocks at the end of the file. Apply these conventions to shared component Sass mixins as well.
- Match the approved Stitch layout, spacing, colors, sizing, and icon variants. Use SVG for all icons, including arrows, status/check icons, and decorative symbols; do not use Unicode glyphs, emoji, substitute icon sets, or runtime icon fonts. Dashboard icons use the original Material Symbols Outlined SVG geometry from Google's Material Design Icons repository, with its license under `public/licenses`.
- Preserve accessible button/link names when icons are decorative (`aria-hidden="true"` on SVGs), and test behavior when moving code into child components. Verify desktop, tablet, and mobile rendering after styling refactors.

## Branch workflow

- For every new page or module, create a dedicated feature branch named `JCF-<feature-name>` with the uppercase `JCF` prefix and a descriptive, hyphen-separated feature name (for example, `JCF-forgot-password`). This is the default prefix for all future feature branches.
- Before creating each feature branch, update the local `development` branch from `origin/development` with `git pull --ff-only origin development`, then create the feature branch from that updated `development` branch.
- Check the working tree first and preserve any uncommitted work before switching branches. Do not discard changes or force an update if the pull cannot fast-forward; resolve the divergence before starting feature development.
- Target `development` when opening feature pull requests.
- Develop pages and modules one at a time. After completing each page or module, run the relevant verification, commit and push its feature branch, and create a pull request to `development`.
- After creating a pull request, share its link and wait for the user's explicit approval following their review. Do not merge automatically. Approval to develop, push, or create a PR does not authorize merging; each PR requires its own merge approval.
- After the user approves that PR, merge only when verification passes and required GitHub checks and branch protections are satisfied. Resolve review findings or failures before merging; do not bypass required checks or protections.
- After merging, switch to `development` and pull its latest changes before creating a fresh feature branch for the next page or module. Repeat this cycle for each requested page or module.

## Common commands

Run the app:

```bash
npx nx serve garage-care
```

Build the app:

```bash
npx nx build garage-care
```

Run tests for the app:

```bash
npx nx test garage-care
```

Run e2e tests:

```bash
npx nx e2e garage-care-e2e
```

Inspect the project graph:

```bash
npx nx graph
```

## Verification before completion

Before considering work complete:

- run the smallest relevant verification command
- confirm the command exits successfully
- fix any lint, TypeScript, or test errors caused by the change
- avoid claiming completion without fresh evidence

## Typical implementation guidance

- For feature work, update the relevant Angular component, service, or route files in `apps/garage-care/src/app`.
- For CSS or design-system changes, update the shared style files in `libs/shared/styles/src/lib`.
- For app-level configuration, check the Angular app config files before editing.
- Keep commands and scripts compatible with the Nx-based workspace design.

## Repository intent

The frontend should remain a clean, maintainable Angular application focused on Garage Care operations, with shared styling organized in reusable Sass modules and a lightweight Nx-based project structure.

## Product and architecture baseline

- Read `docs/PRD.md`, `docs/SYSTEM_DESIGN.md`, `docs/API_SPECIFICATION.md`, and `docs/DB_DESIGN.md` before implementing the relevant domain. See `docs/IMPLEMENTATION.md` for the current frontend baseline.
- V1 serves one owner account per garage in India, with INR amounts and responsive desktop, tablet, and mobile workflows. Employee accounts, multiple branches, inventory stock, and payment gateways are out of scope.
- This checkout contains the frontend. The API, worker, database, and integrations described in the system design are planned product architecture, not existing applications here. Retain `apps/garage-care`; the proposed `apps/web` path in the system design is not a rename instruction.
- Use standalone Angular components, Reactive Forms for forms, Signals for local state, and RxJS where asynchronous streams are useful. Group feature code under `apps/garage-care/src/app` and keep the root component focused on the app shell.
- Preserve SSR and hydration compatibility. Guard browser-only APIs and do not access browser storage during server rendering.
- Use the approved Stitch screen as the visual reference. Record its project and screen identifiers when available; do not silently substitute an invented design if access is unavailable.

## Approved typography

- Verified all nine screens in Stitch project `17101721684738931297` on 2026-10-11, including Create Account screen `d2eb4ce89fa2457584e9a3c268a7632d`. They share two text font families: **Hanken Grotesk** for headings, body text, labels, and controls; **JetBrains Mono** for numeric/currency text, phone numbers, vehicle registration numbers, and job identifiers. Material Symbols Outlined is an icon font, not a text family.
- Reuse the shared Sass tokens `$font-family-base` and `$font-family-mono`, or CSS variables `--font-family-base` and `--font-family-mono`. Do not introduce another text font or re-audit every screen for routine feature work unless the approved design changes.
- Fonts are hosted locally under `apps/garage-care/public/fonts`, with their OFL licenses. Shared `@font-face` declarations are in `libs/shared/styles/src/lib/base/_fonts.scss`, loaded by the application's global stylesheet. No Google Fonts network request is needed at runtime.

## API, security, and user experience

- REST endpoints use `/api/v1`. Keep HTTP access in services and align typed payloads and error handling with the API specification. Finalize unresolved DTO and CSRF contracts before wiring production authentication.
- Authentication uses Secure, HttpOnly cookies with CSRF protection. Never persist passwords or session/refresh tokens in browser storage, logs, or source code. The server determines garage context and authorization.
- Clearly distinguish a frontend preview from a completed server action. Never report account creation, invoice finalization, or message delivery without a successful backend response.
- Provide accessible labels, keyboard interaction, visible focus, field validation, and loading/error states. Prevent duplicate submissions while a request is pending.
- Server calculations are authoritative for prices, discounts, and taxes. Preserve the distinction between regular, composition, and unregistered GST modes, and between issued invoices and collected payments.
- Cache static app-shell assets only by default when PWA support is implemented; do not cache authenticated API responses or private invoices.
