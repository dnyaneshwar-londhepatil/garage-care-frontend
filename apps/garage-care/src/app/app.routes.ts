import { Route } from '@angular/router';
import { sessionGuard } from './core/auth/session.guard';

export const appRoutes: Route[] = [
  {
    path: 'service-jobs',
    canActivate: [sessionGuard],
    title: 'Service Jobs | GarageCare',
    loadComponent: () =>
      import('./features/service-jobs/service-jobs').then((m) => m.ServiceJobs),
  },
  {
    path: 'preview/service-jobs',
    data: { preview: true },
    title: 'Service Jobs Preview | GarageCare',
    loadComponent: () =>
      import('./features/service-jobs/service-jobs').then((m) => m.ServiceJobs),
  },
  {
    path: 'dashboard',
    canActivate: [sessionGuard],
    title: 'Dashboard | GarageCare',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
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
