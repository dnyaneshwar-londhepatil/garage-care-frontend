import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { Invoice, ListQuery, Notification } from './contracts';
@Injectable({ providedIn: 'root' })
export class InvoicesApi {
  private readonly api = inject(ApiClient);
  list(query: ListQuery = {}) {
    return this.api.list<Invoice>('/invoices', query);
  }
  get(id: string): Promise<Invoice> {
    return this.api.read(`/invoices/${encodeURIComponent(id)}`);
  }
  pdf(id: string): Promise<Blob> {
    return this.api.blob(`/invoices/${encodeURIComponent(id)}/pdf`);
  }
  sendWhatsApp(
    id: string,
    recipientPhone: string,
    idempotencyKey: string,
  ): Promise<Notification> {
    return this.api.write(
      'POST',
      `/invoices/${encodeURIComponent(id)}/whatsapp`,
      { recipientPhone },
      idempotencyKey,
    );
  }
}
