import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { Notification } from './contracts';
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly api = inject(ApiClient);
  get(id: string): Promise<Notification> {
    return this.api.read(`/notifications/${encodeURIComponent(id)}`);
  }
}
