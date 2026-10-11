import { TestBed } from '@angular/core/testing';
import { createComponent, EnvironmentInjector } from '@angular/core';
import { ActionButton } from './action-button';

describe('ActionButton', () => {
  it('applies shared variants to a native button without changing disabled behavior', () => {
    const button = document.createElement('button');
    const component = createComponent(ActionButton, {
      hostElement: button,
      environmentInjector: TestBed.inject(EnvironmentInjector),
    });
    component.setInput('variant', 'outline');
    component.changeDetectorRef.detectChanges();
    expect(button.tagName).toBe('BUTTON');
    expect(button.classList.contains('outline')).toBe(true);
    component.setInput('variant', 'primary');
    component.changeDetectorRef.detectChanges();
    expect(button.classList.contains('primary')).toBe(true);
    expect(button.classList.contains('outline')).toBe(false);
    const clicked = vi.fn();
    button.addEventListener('click', clicked);
    button.disabled = true;
    button.click();
    expect(clicked).not.toHaveBeenCalled();
    component.destroy();
  });
});
