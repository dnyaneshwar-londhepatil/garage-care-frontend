import { Route } from '@angular/router';
import { sessionGuard } from './core/auth/session.guard';

export const appRoutes: Route[] = [
  {
    path: 'parts',
    canActivate: [sessionGuard],
    title: 'Parts & Services | GarageCare',
    loadComponent: () => import('./features/parts/parts').then((m) => m.Parts),
  },
  {
    path: 'preview/parts',
    data: { preview: true },
    title: 'Parts & Services Preview | GarageCare',
    loadComponent: () => import('./features/parts/parts').then((m) => m.Parts),
  },
  {
    path: 'invoices',
    canActivate: [sessionGuard],
    title: 'Invoices | GarageCare',
    loadComponent: () =>
      import('./features/invoices/invoices').then((m) => m.Invoices),
  },
  {
    path: 'preview/invoices',
    data: { preview: true },
    title: 'Invoices Preview | GarageCare',
    loadComponent: () =>
      import('./features/invoices/invoices').then((m) => m.Invoices),
  },
  {
    path: 'reminders',
    canActivate: [sessionGuard],
    title: 'Reminders | GarageCare',
    loadComponent: () =>
      import('./features/reminders/reminders').then((m) => m.Reminders),
  },
  {
    path: 'preview/reminders',
    data: { preview: true },
    title: 'Reminders Preview | GarageCare',
    loadComponent: () =>
      import('./features/reminders/reminders').then((m) => m.Reminders),
  },
  {
    path: 'settings',
    canActivate: [sessionGuard],
    title: 'Settings | GarageCare',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.Settings),
  },
  {
    path: 'preview/settings',
    data: { preview: true },
    title: 'Settings Preview | GarageCare',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.Settings),
  },
  {
    path: 'vehicles',
    canActivate: [sessionGuard],
    title: 'Vehicles | GarageCare',
    loadComponent: () =>
      import('./features/vehicles/vehicles').then((m) => m.Vehicles),
  },
  {
    path: 'preview/vehicles',
    data: { preview: true },
    title: 'Vehicles Preview | GarageCare',
    loadComponent: () =>
      import('./features/vehicles/vehicles').then((m) => m.Vehicles),
  },
  {
    path: 'customers',
    canActivate: [sessionGuard],
    title: 'Customers | GarageCare',
    loadComponent: () =>
      import('./features/customers/customers').then((m) => m.Customers),
  },
  {
    path: 'preview/customers',
    data: { preview: true },
    title: 'Customers Preview | GarageCare',
    loadComponent: () =>
      import('./features/customers/customers').then((m) => m.Customers),
  },
  {
    path: 'preview/dashboard',
    data: { preview: true },
    title: 'Dashboard Preview | GarageCare',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
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
