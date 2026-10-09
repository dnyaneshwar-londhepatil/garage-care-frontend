# Agents Guide

This repository is an Angular Nx monorepo for the Garage Care frontend application.

## Project structure

- `apps/garage-care`: main Angular application
- `apps/garage-care-e2e`: Playwright end-to-end tests
- `libs/shared/styles`: shared Sass styling library used across the app
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
