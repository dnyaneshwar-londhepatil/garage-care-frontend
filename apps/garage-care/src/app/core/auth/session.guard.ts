import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApi } from '@garage-care/shared/data-access';

export const sessionGuard: CanActivateFn = async () => {
  // Browser cookies are unavailable during static prerendering. No private reads run there.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const auth = inject(AuthApi);
  const router = inject(Router);
  try {
    await auth.me();
    return true;
  } catch {
    return router.createUrlTree(['/sign-in']);
  }
};
