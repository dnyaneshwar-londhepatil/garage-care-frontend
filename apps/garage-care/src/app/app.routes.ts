import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'reset-password',
    title: 'Reset password | GarageCare',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (m) => m.ResetPassword,
      ),
  },
  {
    path: 'forgot-password',
    title: 'Forgot password | GarageCare',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'sign-up' },
  {
    path: 'sign-in',
    title: 'Sign in | GarageCare',
    loadComponent: () =>
      import('./features/auth/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'sign-up',
    title: 'Create your account | GarageCare',
    loadComponent: () =>
      import('./features/auth/sign-up/sign-up').then((m) => m.SignUp),
  },
];
