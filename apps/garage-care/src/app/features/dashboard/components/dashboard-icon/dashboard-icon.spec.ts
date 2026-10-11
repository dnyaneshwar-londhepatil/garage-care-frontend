import { TestBed } from '@angular/core/testing';
import { DashboardIcon } from './dashboard-icon';

describe('DashboardIcon', () => {
  it('renders the selected original Material SVG and a safe fallback', () => {
    const fixture = TestBed.createComponent(DashboardIcon);
    fixture.componentRef.setInput('name', 'car_repair');
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 -960 960 960');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path').getAttribute('d')).toBe(
      fixture.componentInstance.paths['car_repair'],
    );
    fixture.componentRef.setInput('name', 'unknown');
    fixture.detectChanges();
    expect(svg.querySelector('path').getAttribute('d')).toBe(
      fixture.componentInstance.paths['space_dashboard'],
    );
  });
});
