import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import {
  AuthApi,
  PartsApi,
  Part,
  PartInput,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
export function toPaise(value: string): number {
  const [rupees, fraction = ''] = value.trim().split('.');
  return Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
}
@Component({
  selector: 'app-parts',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './parts.html',
  styleUrl: './parts.scss',
})
export class Parts {
  readonly auth = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly search = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly cursor = signal<string | null>(null);
  readonly query = signal('');
  constructor() {
    afterNextRender(() => {
      this.ready.set(true);
      void this.load();
    });
  }
  private async report(error: unknown): Promise<void> {
    this.error.set(apiErrorMessage(error));
    if (error instanceof HttpErrorResponse && error.status === 401)
      await this.router.navigateByUrl('/sign-in');
  }
  async logout(): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Preview only. No session was changed.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }

  private readonly api = inject(PartsApi);
  readonly records = signal<Part[]>([]);
  readonly editorOpen = signal(false);
  readonly editing = signal<Part | null>(null);
  readonly formError = signal('');
  private samples: Part[] = [
    {
      _id: 'sample-p1',
      name: 'Engine oil',
      category: 'Lubricants',
      mrpPaise: 45000,
    },
    {
      _id: 'sample-p2',
      name: 'Brake pads',
      category: 'Brakes',
      brand: 'Sample brand',
      mrpPaise: 180000,
    },
  ];
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    }),
    category: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    }),
    brand: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    partNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    price: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
        Validators.max(10000000),
      ],
    }),
  });
  invalid(key: keyof typeof this.form.controls): boolean {
    return this.form.controls[key].invalid && this.form.controls[key].touched;
  }
  money(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value / 100);
  }
  async load(append = false): Promise<void> {
    if (this.loading() || this.busy() || this.search.invalid) return;
    if (!append) this.query.set(this.search.value.trim());
    this.error.set('');
    if (this.previewMode) {
      this.records.set(
        this.samples.filter((part) =>
          [
            part.name,
            part.category,
            part.brand || '',
            part.partNumber || '',
          ].some((value) =>
            value.toLowerCase().includes(this.query().toLowerCase()),
          ),
        ),
      );
      return;
    }
    this.loading.set(true);
    try {
      const page = await this.api.list({
        limit: 20,
        q: this.query() || undefined,
        cursor: append ? this.cursor() || undefined : undefined,
      });
      if (this.destroyRef.destroyed) return;
      this.records.set(
        append
          ? [
              ...new Map(
                [...this.records(), ...page.data].map((row) => [row._id, row]),
              ).values(),
            ]
          : page.data,
      );
      this.cursor.set(page.page.nextCursor);
    } catch (error) {
      if (!this.destroyRef.destroyed) await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  async open(part?: Part): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.busy.set(true);
    this.formError.set('');
    this.notice.set('');
    try {
      const record = part
        ? this.previewMode
          ? part
          : await this.api.get(part._id)
        : null;
      if (this.destroyRef.destroyed) return;
      this.editing.set(record);
      this.form.reset({
        name: record?.name || '',
        category: record?.category || '',
        brand: record?.brand || '',
        partNumber: record?.partNumber || '',
        price: record ? (record.mrpPaise / 100).toFixed(2) : '',
      });
      this.editorOpen.set(true);
      setTimeout(() => {
        if (!this.destroyRef.destroyed)
          document.getElementById('part-name')?.focus();
      });
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  close(): void {
    if (!this.busy()) {
      this.editorOpen.set(false);
      document.getElementById('add-part')?.focus();
    }
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    this.formError.set('');
    if (this.form.invalid) {
      this.formError.set('Check the highlighted fields.');
      return;
    }
    const value = this.form.getRawValue();
    const current = this.editing();
    if (
      (current?.brand && !value.brand.trim()) ||
      (current?.partNumber && !value.partNumber.trim())
    ) {
      this.formError.set(
        'Keep or replace saved brand and part-number values; this API cannot remove them.',
      );
      return;
    }
    const payload: PartInput = {
      name: value.name.trim(),
      category: value.category.trim(),
      mrpPaise: toPaise(value.price),
      ...(value.brand.trim() ? { brand: value.brand.trim() } : {}),
      ...(value.partNumber.trim()
        ? { partNumber: value.partNumber.trim() }
        : {}),
    };
    this.busy.set(true);
    try {
      const saved = this.previewMode
        ? {
            ...current,
            ...payload,
            _id: current?._id || 'sample-' + crypto.randomUUID(),
          }
        : current
          ? await this.api.update(current._id, payload)
          : await this.api.create(payload);
      if (this.destroyRef.destroyed) return;
      if (this.previewMode)
        this.samples = current
          ? this.samples.map((part) => (part._id === saved._id ? saved : part))
          : [saved, ...this.samples];
      this.editorOpen.set(false);
      this.notice.set(
        this.previewMode
          ? 'Sample part saved for this page only.'
          : 'Part saved.',
      );
      document.getElementById('add-part')?.focus();
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.formError.set(apiErrorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 401)
          await this.router.navigateByUrl('/sign-in');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (!this.editorOpen() && !this.destroyRef.destroyed) await this.load();
  }
}
