import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthApi } from '@garage-care/shared/data-access';
import { sessionGuard } from './session.guard';

describe('Session guard', () => {
  const me = vi.fn();
  const user = signal<{ id: string } | null>(null);
  const run = () =>
    TestBed.runInInjectionContext(() =>
      sessionGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  beforeEach(() => {
    me.mockReset();
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { me, user } },
      ],
    });
  });
  it('restores the cookie session before allowing the protected page', async () => {
    me.mockResolvedValue({ user: { id: 'owner' } });
    expect(await run()).toBe(true);
    expect(me).toHaveBeenCalledOnce();
  });
  it('does not wait for another network check after the session is restored', async () => {
    user.set({ id: 'owner' });
    expect(await run()).toBe(true);
    expect(me).not.toHaveBeenCalled();
  });
  it('checks again after the in-memory session is invalidated', async () => {
    user.set({ id: 'owner' });
    await run();
    user.set(null);
    me.mockRejectedValue(new Error('Expired'));
    expect(((await run()) as UrlTree).toString()).toBe('/sign-in');
    expect(me).toHaveBeenCalledOnce();
  });
  it('redirects rejected sessions to sign-in', async () => {
    me.mockRejectedValue(new Error('Session expired'));
    const result = (await run()) as UrlTree;
    expect(result.toString()).toBe('/sign-in');
  });
  it('never reads private session data during server rendering', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    expect(await run()).toBe(true);
    expect(me).not.toHaveBeenCalled();
  });
});
