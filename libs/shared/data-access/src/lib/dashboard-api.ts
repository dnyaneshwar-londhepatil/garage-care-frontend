import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { DashboardSummary } from './contracts';
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);
  summary(): Promise<DashboardSummary> {
    return this.api.read('/dashboard/summary');
  }
}
