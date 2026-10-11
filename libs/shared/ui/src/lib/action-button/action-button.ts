import { Component, input } from '@angular/core';

/** Keeps native button behavior while sharing the dashboard action variants. */
@Component({
  selector: 'button[gcButton]',
  templateUrl: './action-button.html',
  styleUrl: './action-button.scss',
  host: {
    '[class.primary]': 'variant() === "primary"',
    '[class.subtle]': 'variant() === "subtle"',
    '[class.outline]': 'variant() === "outline"',
    '[class.square]': 'square()',
  },
})
export class ActionButton {
  readonly variant = input<'primary' | 'subtle' | 'outline'>('subtle');
  readonly square = input(false);
}
