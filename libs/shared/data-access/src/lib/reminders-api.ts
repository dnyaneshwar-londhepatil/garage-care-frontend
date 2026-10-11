import { Injectable } from '@angular/core';
import { Reminder, ReminderInput } from './contracts';
import { ResourceApi } from './resource-api';
@Injectable({ providedIn: 'root' })
export class RemindersApi extends ResourceApi<
  Reminder,
  ReminderInput,
  { status: 'cancelled' }
> {
  protected readonly path = '/reminders';
}
