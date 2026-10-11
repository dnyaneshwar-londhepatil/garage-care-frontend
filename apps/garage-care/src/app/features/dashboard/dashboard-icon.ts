import { Component, input } from '@angular/core';

/** Small local SVG set; no external icon-font request is needed. */
@Component({
  selector: 'app-dashboard-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['dashboard']" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class DashboardIcon {
  readonly name = input('dashboard');
  readonly paths: Record<string, string> = {
    dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    car: 'M4 10l2-6h12l2 6 M3 10h18v9H3z M6 19v2 M18 19v2 M6 13h2 M16 13h2',
    customers:
      'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 3a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-3-4',
    invoice: 'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 7h8 M8 11h8 M8 15h4',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
    parts: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
    settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3z',
    wrench:
      'M15 3a6 6 0 0 0-6 8L3 17a3 3 0 0 0 4 4l6-6a6 6 0 0 0 8-6l-4 4-4-4z',
    plus: 'M12 5v14 M5 12h14',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  };
}
