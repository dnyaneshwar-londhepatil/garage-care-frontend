# GarageCare V1 — Database Design Document

**Document ID:** GC-DDD-001  
**Version:** 1.0  
**Database:** MongoDB Atlas  
**ODM:** Mongoose  
**Status:** Implementation baseline

## 1. Purpose and principles

This document defines MongoDB collections, schemas, relationships, indexes, validation, tenant isolation, and transaction boundaries.

Principles:
- Every garage-owned record includes `garageId`.
- Server session determines garage context.
- Invoice snapshots embed historical values.
- Operational entities are separate documents; historical invoice values are embedded.
- Use integer paise for stored monetary values where practical and decimal arithmetic for intermediate calculations.
- Finalized invoices are immutable.
- Queue jobs and webhooks are assumed to be duplicated.
- MongoDB is the durable source of truth; Redis is not the sole record of business state.
- Schema and index changes are versioned migrations.

## 2. Collection inventory

| Collection | Purpose |
|---|---|
| `garages` | Business profile and GST mode |
| `users` | Owner accounts |
| `sessions` | Refresh session hashes, expiry, revocation |
| `customers` | Customer data and consent |
| `vehicles` | Vehicle records |
| `parts` | Parts catalog |
| `services` | Service jobs |
| `invoices` | Immutable financial snapshots |
| `invoice_sequences` | Safe invoice numbering |
| `invoice_adjustments` | Corrections, credit/debit notes, cancellations |
| `service_reminders` | Durable schedules |
| `notification_logs` | WhatsApp requests and provider states |
| `outbox_events` | Durable event publication |
| `audit_logs` | Financial/security audit records |

## 3. Common conventions

- Primary key: MongoDB `ObjectId`.
- Timestamps: UTC.
- Garage-owned documents: `garageId`.
- Monetary fields: integer paise when practical.
- Intermediate percentage/tax calculations: decimal arithmetic library with explicit rounding.
- Enums: strict TypeScript and Mongoose enums.
- References: validate garage ownership in application services; MongoDB references do not enforce foreign keys.

## 4. Core schemas

### 4.1 garages

```ts
type GstRegistrationMode = "regular" | "composition" | "unregistered";

interface Garage {
  _id: ObjectId;
  name: string;
  legalName?: string;
  phone: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    postalCode: string;
    country: "IN";
  };
  gst: {
    registrationMode: GstRegistrationMode;
    gstin?: string;
    verificationStatus: "pending" | "verified" | "rejected" | "not_applicable";
    effectiveFrom?: Date;
    effectiveUntil?: Date;
    configurationVersion: string;
  };
  invoiceSeries: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Registration mode must be validated before invoice issuance. A mode change requires an effective date and audit record. Historical invoices preserve the mode used at issuance.

### 4.2 users

```ts
interface User {
  _id: ObjectId;
  garageId: ObjectId;
  emailNormalized: string;
  passwordHash: string;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}
```

V1 has one owner account per garage. Hash passwords using Argon2id or suitably configured bcrypt. Never store plaintext credentials.

### 4.3 sessions

```ts
interface Session {
  _id: ObjectId;
  userId: ObjectId;
  garageId: ObjectId;
  refreshTokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}
```

Validate expiry/revocation on requests. TTL is only cleanup, not authorization.

### 4.4 customers

```ts
interface Customer {
  _id: ObjectId;
  garageId: ObjectId;
  name: string;
  phoneE164: string;
  email?: string;
  address?: string;
  notes?: string;
  whatsappConsent: {
    status: "unknown" | "opted_in" | "opted_out";
    source?: string;
    recordedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

Required: name and phone. Normalize phone numbers. Historical invoices store customer snapshots.

### 4.5 vehicles

```ts
interface Vehicle {
  _id: ObjectId;
  garageId: ObjectId;
  customerId: ObjectId;
  vehicleType: "bike" | "scooter" | "car" | "other";
  registrationNumber: string;
  normalizedRegistrationNumber: string;
  brand: string;
  model: string;
  fuelType?: string;
  currentKm?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

Validate customer ownership and vehicle/customer association within the same garage. Decide and enforce whether duplicate normalized registrations are permitted.

### 4.6 parts

```ts
interface Part {
  _id: ObjectId;
  garageId: ObjectId;
  name: string;
  category: string;
  brand?: string;
  partNumber?: string;
  mrpPaise: number;
  createdAt: Date;
  updatedAt: Date;
}
```

V1 does not track stock. Catalog changes must not alter historical billed prices.

### 4.7 services

```ts
interface ServiceLine {
  kind: "part" | "labour";
  description: string;
  partId?: ObjectId;
  quantity: number;
  mrpPaise: number;
  discountPerUnitPaise: number;
  taxCategory: string;
}

interface Service {
  _id: ObjectId;
  garageId: ObjectId;
  serviceNumber: string;
  customerId: ObjectId;
  vehicleId: ObjectId;
  serviceDate: Date;
  odometerKm?: number;
  complaint?: string;
  workPerformed?: string;
  items: ServiceLine[];
  status: "draft" | "in_progress" | "completed" | "cancelled";
  nextServiceDueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Validate quantity, discount limits, relationships, and status transitions. Finalized invoice values live separately in the invoice snapshot.

### 4.8 invoices

```ts
type InvoiceFormat = "gst_tax_invoice" | "bill_of_supply" | "non_gst_invoice";

interface InvoiceLineSnapshot {
  description: string;
  quantity: number;
  unitMrpPaise: number;
  grossPaise: number;
  discountPaise: number;
  taxablePaise?: number;
  taxCategory?: string;
  taxComponents: Array<{
    type: "CGST" | "SGST" | "IGST" | "CESS";
    rateBps: number;
    amountPaise: number;
  }>;
  totalPaise: number;
}

interface InvoiceSnapshot {
  format: InvoiceFormat;
  garage: {
    name: string;
    legalName?: string;
    address: Garage["address"];
    gstin?: string;
    registrationMode: GstRegistrationMode;
  };
  customer: {
    name: string;
    address?: string;
    phone?: string;
    gstin?: string;
  };
  vehicle: {
    registrationNumber: string;
    brand: string;
    model: string;
    odometerKm?: number;
  };
  lines: InvoiceLineSnapshot[];
  totals: {
    grossPaise: number;
    discountPaise: number;
    taxablePaise?: number;
    taxPaise?: number;
    grandTotalPaise: number;
  };
  taxConfigurationVersion: string;
}

interface Invoice {
  _id: ObjectId;
  garageId: ObjectId;
  serviceId: ObjectId;
  invoiceNumber: string;
  status: "finalized" | "cancelled" | "corrected";
  snapshot: InvoiceSnapshot;
  pdfStatus: "pending" | "processing" | "ready" | "failed";
  pdfObjectKey?: string;
  pdfSha256?: string;
  pdfTemplateVersion: string;
  finalizedAt: Date;
  createdAt: Date;
}
```

Use explicit nested TypeScript interfaces in production. The snapshot must include all fields needed to reproduce the issued document without querying mutable source records. Never silently edit the snapshot after finalization.

### 4.9 invoice_sequences

```ts
interface InvoiceSequence {
  _id: ObjectId;
  garageId: ObjectId;
  series: string;
  financialYear: string;
  nextNumber: number;
  updatedAt: Date;
}
```

Use an atomic update and a unique compound index on `garageId + series + financialYear`. Define the financial-year policy before implementation.

### 4.10 invoice_adjustments

```ts
interface InvoiceAdjustment {
  _id: ObjectId;
  garageId: ObjectId;
  originalInvoiceId: ObjectId;
  adjustmentNumber: string;
  adjustmentType: "credit_note" | "debit_note" | "cancellation";
  reason: string;
  adjustmentSnapshot: Record<string, unknown>;
  status: "finalized" | "cancelled";
  createdAt: Date;
  finalizedAt?: Date;
}
```

Replace the generic snapshot type with explicit fields. Validate supported correction workflows with a qualified tax professional.

### 4.11 service_reminders

```ts
interface ServiceReminder {
  _id: ObjectId;
  garageId: ObjectId;
  customerId: ObjectId;
  vehicleId: ObjectId;
  dueDate: Date;
  scheduledAt: Date;
  reminderType: "upcoming_service";
  status: "pending" | "processing" | "submitted" | "sent" |
    "delivered" | "failed" | "cancelled";
  idempotencyKey: string;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Default schedule is seven days before due date. Due-date changes cancel or supersede prior pending reminders.

### 4.12 notification_logs

```ts
interface NotificationLog {
  _id: ObjectId;
  garageId: ObjectId;
  customerId: ObjectId;
  invoiceId?: ObjectId;
  reminderId?: ObjectId;
  channel: "whatsapp";
  status: "queued" | "submitted" | "sent" | "delivered" | "read" | "failed";
  providerMessageId?: string;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Provider acceptance is not delivery confirmation. Deduplicate webhook callbacks and handle ambiguous timeouts conservatively.

### 4.13 outbox_events

```ts
interface OutboxEvent {
  _id: ObjectId;
  garageId: ObjectId;
  eventType: string;
  aggregateId: ObjectId;
  payloadVersion: number;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "published" | "failed";
  attempts: number;
  createdAt: Date;
  publishedAt?: Date;
}
```

Insert outbox events in the same transaction as the operation they represent. Dispatcher and consumers must be idempotent. Use claim leases to recover abandoned work.

### 4.14 audit_logs

```ts
interface AuditLog {
  _id: ObjectId;
  garageId?: ObjectId;
  actorUserId?: ObjectId;
  action: string;
  entityType: string;
  entityId?: ObjectId;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

Never record passwords, raw tokens, CSRF secrets, or authorization headers.

## 5. Relationships

```text
Garage
 ├── Users
 ├── Customers
 │    └── Vehicles
 │         └── Services
 │              └── Invoices
 │                   ├── Invoice Adjustments
 │                   └── Notification Logs
 ├── Parts
 ├── Service Reminders
 ├── Invoice Sequences
 ├── Outbox Events
 └── Audit Logs
```

Operational entities use references. Invoice snapshots embed historical values. Validate relationships in the application because MongoDB does not automatically enforce foreign keys.

## 6. Indexes

| Collection | Index |
|---|---|
| `users` | Unique `emailNormalized` |
| `sessions` | `userId + expiresAt`; TTL on `expiresAt` for cleanup |
| `customers` | `garageId + name`; `garageId + phoneE164` |
| `vehicles` | `garageId + normalizedRegistrationNumber` |
| `parts` | `garageId + name` |
| `services` | Unique `garageId + serviceNumber` |
| `services` | `garageId + status + serviceDate` |
| `services` | `garageId + vehicleId + serviceDate` |
| `invoices` | Unique `garageId + invoiceNumber` |
| `invoices` | `garageId + finalizedAt` |
| `invoice_sequences` | Unique `garageId + series + financialYear` |
| `service_reminders` | Unique `garageId + idempotencyKey` |
| `service_reminders` | `status + scheduledAt` |
| `notification_logs` | `garageId + invoiceId + createdAt` |
| `outbox_events` | `status + createdAt` |
| `audit_logs` | `garageId + createdAt` |

Use partial/sparse unique indexes for optional provider IDs only where appropriate. Validate index choices with real query patterns and explain plans.

## 7. Tenant isolation

Every resource query must include the authenticated garage ID.

Correct:

```ts
InvoiceModel.findOne({
  _id: invoiceId,
  garageId: authenticatedGarageId
});
```

Avoid unscoped resource access. Apply the same rule to updates, deletes, PDFs, reminders, notification logs, dashboard queries, and background jobs. A job must revalidate garage and resource ownership before processing.

## 8. Transaction boundaries

Invoice finalization transaction:
1. Validate service and related records.
2. Resolve registration mode and tax configuration.
3. Calculate line amounts and taxes.
4. Allocate invoice number atomically.
5. Create immutable invoice snapshot.
6. Update service state.
7. Insert PDF outbox event.
8. Commit.

PDF rendering, storage, and WhatsApp calls occur after commit. Transaction callbacks may be retried, so do not put external side effects inside them.

## 9. Validation and integrity

- Validate requests at the API boundary.
- Use Mongoose and suitable MongoDB schema validation.
- Enforce critical uniqueness through indexes.
- Validate garage ownership for references.
- Validate enum values and lifecycle transitions.
- Validate money and quantity bounds.
- Validate tax classifications and registration mode before invoicing.
- Prevent normal endpoints from modifying finalized invoice snapshots.
- Deduplicate jobs and webhook events.

## 10. Migrations

Keep versioned migrations under `libs/server/database/migrations/`. Migrations should be repeat-safe where possible and tested against representative data. Avoid destructive automatic schema synchronization. Plan production index creation and rollback/forward-fix procedures.

## 11. Backup and recovery

Enable managed database backups, define RPO/RTO, and test restore procedures. Define retention for invoice files, audit logs, and notifications. Reconcile outbox events and reminders after outages.

## 12. Acceptance criteria

- Schemas, indexes and validation are implemented.
- Garage isolation is tested.
- Unique invoice numbering works under concurrent requests.
- Finalized invoice snapshots are immutable.
- Invoice finalization and outbox insertion are atomic where supported.
- PDF and WhatsApp failures are retryable without duplicate invoices.
- Reminder and outbox processing recover after worker/queue failure.
- Backup restoration is tested.
