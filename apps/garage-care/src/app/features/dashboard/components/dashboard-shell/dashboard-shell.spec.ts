import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { DashboardShell } from './dashboard-shell';

describe('DashboardShell', () => {
  it('closes mobile navigation and emits the requested preview action', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(DashboardShell);
    fixture.componentRef.setInput(
      'search',
      new FormControl('', { nonNullable: true }),
    );
    fixture.detectChanges();
    const actions: string[] = [];
    fixture.componentInstance.previewAction.subscribe((action) =>
      actions.push(action),
    );
    fixture.componentInstance.menuOpen.set(true);
    fixture.componentInstance.preview('Customers');
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(actions).toEqual(['Customers']);
    fixture.componentInstance.menuOpen.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });
});
