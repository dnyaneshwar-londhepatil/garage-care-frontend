import { Customer, ServiceJob, Vehicle } from '@garage-care/shared/data-access';

export interface ServiceRow {
  job: ServiceJob;
  customer: Customer;
  vehicle: Vehicle;
}

export const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

/** Quote all fields and neutralize spreadsheet formulas in user-entered text. */
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
