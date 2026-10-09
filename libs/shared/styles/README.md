# Shared styles

This Sass-only Nx library owns GarageCare's design tokens and reusable global
styles. It has no Angular or TypeScript runtime entry point; the Angular build
resolves Sass from `src` through its `stylePreprocessorOptions.includePaths`.

## Folders

- `src/lib/abstracts`: compile-time tokens, functions, and mixins; emits no CSS.
- `src/lib/base`: the restrained reset and document-level defaults.
- `src/lib/themes`: runtime CSS custom properties for the light theme.
- `src/lib/layout`: reusable containers and application shell primitives.
- `src/lib/components`: opt-in class-based styles for shared UI patterns.
- `src/lib/utilities`: a small set of frequently useful utility classes.

## Adding styles

Add Sass variables and calculations to `abstracts`; expose supported tokens and
mixins through `src/_index.scss`. Put document-wide defaults in `base`, theme
values in `themes`, and reusable class styles in their matching `layout`,
`components`, or `utilities` folder. Import global CSS modules exactly once in
`apps/garage-care/src/styles.scss`. Keep page and component styles beside their
Angular components.

Component SCSS can use the public, CSS-free Sass API without copying the global
styles into each component:

```scss
@use 'index' as gc;

.toolbar {
  gap: gc.$spacing-4;
  color: gc.$color-text-primary;
  @include gc.focus-ring;
}
```

Use CSS custom properties such as `var(--color-primary)` for values that may
change with a runtime theme. Use Sass variables for compile-time calculations
and values that are not theme-dependent.