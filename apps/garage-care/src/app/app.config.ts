import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { sessionErrorInterceptor } from './core/auth/session-error.interceptor';
import { API_BASE_URL } from '@garage-care/shared/data-access';
import { environment } from '../environments/environment';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideHttpClient(withFetch(), withInterceptors([sessionErrorInterceptor])),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
  ],
};
