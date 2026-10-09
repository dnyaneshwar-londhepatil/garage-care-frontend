# GarageCare V1 — Product Requirements Document

**Document ID:** GC-PRD-001  
**Version:** 1.0  
**Status:** Baseline for implementation  
**Market:** India  
**Product:** GarageCare  
**Last updated:** 2026-10-09

## 1. Product summary

GarageCare is a responsive web application/PWA that helps an independent vehicle garage manage customers, vehicles, service jobs, parts and labour pricing, invoices, service history, and follow-up reminders. It reduces manual recordkeeping and helps the garage issue consistent invoices and deliver them as PDF documents through the official WhatsApp Business Platform.

V1 targets a single garage owner account per garage. It is not an inventory-management or full accounting platform.

## 2. Product goals

1. Maintain a reliable digital record of customers, vehicles, and service jobs.
2. Calculate service charges and discounts consistently on the server.
3. Support invoice formats appropriate to regular GST-registered, composition-scheme, and unregistered garages.
4. Generate downloadable/printable PDF invoices.
5. Send the actual PDF document through WhatsApp when messaging requirements are satisfied.
6. Schedule and track upcoming service reminders.
7. Provide a dashboard for current operations and service/invoice history.
8. Keep financial records auditable and recoverable when background operations fail.

## 3. Target users and assumptions

### Primary user
An independent garage owner or operator who manages the business using one owner account.

### Market assumptions
- Initial market: India.
- Currency: INR.
- Vehicle types: bike, scooter, car, other.
- Web application must work on desktop, tablet, and mobile.
- Garage data is isolated by tenant (`garageId`).
- V1 does not include employee accounts or multiple branches.

## 4. Scope

### In scope
- Owner registration, login, logout, session management, and garage profile.
- Secure HttpOnly cookie authentication with CSRF protection.
- Customer management.
- Vehicle management and customer-to-vehicle association.
- Parts catalog with MRP and descriptive metadata.
- Service jobs, complaints, work performed, odometer, status, service history, and next due date.
- Server-authoritative price and discount calculations.
- GST-aware billing for regular GST-registered, composition-scheme, and unregistered garages.
- Appropriate GST tax invoice, bill-of-supply, or non-GST commercial invoice formats according to validated rules.
- Immutable invoice snapshots, invoice numbering, PDF generation, download, print, and correction/audit records.
- WhatsApp document media upload and sending using the official WhatsApp Business Platform.
- WhatsApp delivery status tracking via verified webhooks.
- Upcoming service reminders, defaulting to seven days before the due date.
- Dashboard metrics for service activity, invoices, reminders, and recent activity.
- Audit logs, retries, queue reconciliation, monitoring, backups, and restore procedures.
- Installable responsive PWA; cache static app-shell assets only by default.

### Out of scope for V1
- Native Android/iOS application.
- Employee accounts, roles, or granular team permissions.
- Inventory stock, purchasing, and warehouse management.
- Payment gateway integration or payment collection.
- Advanced accounting ledger.
- Automated GST return filing.
- Multiple branches, franchises, or multi-location reporting.
- Customer portal or customer login.
- AI features.
- Offline invoice finalization or offline WhatsApp sending.

## 5. Functional requirements

### FR-01 Authentication and garage setup
- An owner can register and sign in.
- Authentication uses Secure, HttpOnly cookies and CSRF protections.
- The server derives the garage context from the authenticated session.
- The owner can maintain garage identity, address, contact details, invoice series, timezone, and GST registration mode.
- Registration mode changes require explicit effective dates and audit history.

### FR-02 Customers
- Create, read, update, list, and search customers.
- Required fields: name and phone number.
- Optional fields: email, address, notes.
- Record applicable WhatsApp consent and opt-out information.
- Customer records are garage-scoped.

### FR-03 Vehicles
- Create and manage vehicles belonging to a customer.
- Store vehicle type, registration number, make/model, optional fuel type and odometer.
- Validate that the customer and vehicle belong to the same garage.
- Provide vehicle service history.

### FR-04 Parts catalog
- Maintain part name, category, brand/part number where applicable, and MRP.
- Do not track stock quantity in V1.
- Service and invoice lines preserve the prices used at the time of billing.

### FR-05 Service jobs
- Create service jobs with customer, vehicle, service date, odometer, complaint, work performed, line items, status, and next service due date.
- Supported statuses: Draft, In Progress, Completed, Cancelled.
- Enforce valid status transitions on the backend.
- A completed and invoiced service cannot be silently re-finalized to create another invoice.

### FR-06 Pricing and discounts
- Server calculates line gross value as quantity multiplied by unit MRP.
- Per-unit discount is applied according to the configured rules.
- The backend validates quantities, discounts, and line totals.
- Use integer paise for stored monetary amounts where practical and decimal arithmetic for intermediate calculations.
- Rounding policy must be explicit, deterministic, and tested.

### FR-07 GST and invoice formats
- Support registration modes: regular, composition, and unregistered.
- Select invoice/document format based on validated registration mode and applicable tax treatment.
- Regular GST-registered garages can issue the applicable GST tax invoice.
- Composition-scheme garages use the appropriate bill-of-supply/document behavior and restrictions.
- Unregistered garages issue a non-GST commercial invoice and must not charge or represent a value as GST collected.
- Validate GSTIN format and, where available/required, registration status before enabling applicable tax invoices.
- Tax categories, rates, place-of-supply rules, exemptions, and rounding must be validated with a qualified Indian GST professional before production.
- “GST-ready” does not mean automated return filing or a guarantee of legal compliance.

### FR-08 Invoice lifecycle
- Finalization creates one immutable invoice snapshot.
- Snapshot contains the garage, customer, vehicle, line, tax, total, invoice-format, and tax-configuration details needed to reproduce the issued document.
- Invoice numbering is allocated safely under concurrent requests.
- Corrections and cancellations use controlled, auditable workflows; they do not silently overwrite the original invoice.
- PDF generation can be pending, processing, ready, or failed independently of invoice status.

### FR-09 PDF generation
- Generate PDF using a versioned HTML/CSS template and Puppeteer.
- Store PDFs in private object storage.
- Allow only authorized users to download or print invoices.
- PDF retry must not create a duplicate invoice.
- Escape user-controlled content and restrict renderer network access.

### FR-10 WhatsApp delivery
- Send the actual PDF as a document attachment through the official WhatsApp Business Platform.
- Use approved templates where required.
- Record the provider message ID and delivery states.
- Verify webhook authenticity and deduplicate repeated callbacks.
- Do not treat API acceptance as delivery confirmation.
- Respect consent, opt-outs, provider limits, and applicable messaging policies.
- Handle ambiguous timeouts conservatively to reduce duplicate messages.

### FR-11 Service reminders
- Default schedule: seven days before the next service due date.
- Store reminder schedules durably in MongoDB.
- Use BullMQ/Redis for asynchronous execution.
- Check reminder validity and messaging eligibility immediately before sending.
- Reconcile overdue pending reminders after outages.
- Cancel or supersede outdated reminders when due dates change.

### FR-12 Dashboard
- Display service counts by status, upcoming reminders, recent invoices, and service history.
- Revenue/collections must not be inferred from invoice issuance alone.
- Payment status, if displayed, must be explicitly tracked and must not imply a payment gateway exists.

## 6. Non-functional requirements

### Security
- TLS in production.
- Secure HttpOnly cookies and CSRF protection.
- Password hashing with Argon2id or appropriately configured bcrypt.
- Rate limits for authentication and sensitive endpoints.
- Strict tenant isolation for every resource and file.
- Managed secrets; no credentials in source control or frontend bundles.
- Verified webhook signatures.
- Private PDF storage and least-privilege access.

### Reliability
- Transactional outbox or equivalent durable handoff for background work.
- Idempotent workers and webhook handlers.
- Bounded retry/backoff and failed-job visibility.
- Database backups and tested restore procedure.
- Reconciliation for pending outbox events and reminders.

### Performance
- Initial target: p95 below 500 ms for ordinary database-backed API requests under expected MVP load, excluding PDF rendering and external messaging.
- Validate through realistic load testing.

### Accessibility and usability
- Responsive layouts for desktop, tablet, and mobile.
- Clear validation and error states.
- Keyboard-accessible core workflows.
- Do not rely only on color to communicate status.

## 7. Architecture and technology constraints

- Nx monorepo.
- Angular standalone components, Reactive Forms, Signals, and RxJS as appropriate.
- Node.js, Express, TypeScript.
- MongoDB Atlas and Mongoose.
- Zod or equivalent API-boundary validation.
- Redis and BullMQ.
- Puppeteer PDF rendering.
- Private S3-compatible object storage.
- Official WhatsApp Business Platform.
- Separate API and worker processes.
- REST API under `/api/v1`.

## 8. Key user journeys

1. Owner registers and configures garage.
2. Owner creates customer and vehicle.
3. Owner creates a service job and adds parts/labour.
4. Owner completes service; server validates and finalizes invoice.
5. Worker generates PDF and stores it privately.
6. Owner downloads/prints PDF or requests WhatsApp document delivery.
7. Webhook updates delivery status.
8. Service due date creates a reminder; worker sends it when due and eligible.

## 9. Acceptance criteria

- A user cannot access another garage’s records, invoices, PDFs, or notifications.
- Invalid CSRF requests are rejected.
- Finalizing a service concurrently does not create duplicate invoices.
- Invoice snapshot is immutable after issuance.
- Each garage registration mode selects the appropriate document behavior.
- An unregistered garage is not charged GST by GarageCare.
- PDF failures are retryable without duplicating invoices.
- WhatsApp status is based on provider callbacks/responses.
- Reminder duplicates are prevented and overdue schedules are recoverable.
- Security, integration, and restore tests pass before production release.

## 10. Risks and dependencies

- Tax rules and invoice formats require professional validation.
- WhatsApp business onboarding, phone-number setup, API access, and template approvals may be prerequisites.
- MongoDB transactions require a suitable deployment configuration.
- External provider timeouts can create ambiguous delivery outcomes.
- Hosting, object storage, Redis, monitoring, and backup providers must be selected.

## 11. Release plan

1. Foundation and Nx workspace.
2. Authentication and garage configuration.
3. Customers, vehicles, parts, and service jobs.
4. Billing, invoice formats, snapshots, and PDF generation.
5. WhatsApp delivery and reminders.
6. Dashboard, security hardening, operational monitoring, and production release.
