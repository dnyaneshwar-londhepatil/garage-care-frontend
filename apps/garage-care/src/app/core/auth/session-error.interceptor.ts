import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthApi } from '@garage-care/shared/data-access';

/** Expired API sessions must not remain eligible for fast in-memory navigation. */
export const sessionErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthApi);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401)
        auth.invalidateSession();
      return throwError(() => error);
    }),
  );
};
