# GarageCare V1 — API Specification

**Document ID:** GC-API-001  
**Version:** 1.0  
**Base path:** `/api/v1`  
**Status:** Implementation baseline  
**Transport:** HTTPS + JSON, except PDF endpoints and webhooks

## 1. Conventions

- JSON request/response bodies by default.
- MongoDB IDs are represented as strings.
- Timestamps use ISO 8601 UTC strings.
- Money fields are integer paise unless otherwise documented.
- All garage-owned resources are scoped to the authenticated garage.
- The client must not choose its authorization `garageId`.
- Validate request body, query, and path parameters at the API boundary.
- Use stable error codes and request IDs.
- Use idempotency keys for financial finalization and external-delivery requests.
- Do not expose internal exceptions or secrets.

## 2. Response format

Success:

```json
{
  "data": {
    "id": "resource-id",
    "status": "draft"
  }
}
```

Paginated response:

```json
{
  "data": [],
  "page": {
    "limit": 20,
    "nextCursor": null
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": [
      {
        "field": "phone",
        "code": "INVALID_PHONE"
      }
    ],
    "requestId": "correlation-id"
  }
}
```

Typical status codes:
- `200`: successful read/update/action.
- `201`: created resource.
- `204`: successful action with no response body.
- `400`: invalid request.
- `401`: unauthenticated.
- `403`: authenticated but forbidden or CSRF failure.
- `404`: resource not found within the authorized garage.
- `409`: conflicting lifecycle or idempotency state.
- `422`: semantically invalid operation.
- `429`: rate limited.
- `500`: unexpected server error.
- `503`: temporary dependency unavailability.

## 3. Authentication and sessions

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Register owner and garage |
| POST | `/auth/login` | Authenticate owner |
| POST | `/auth/refresh` | Rotate session credentials |
| POST | `/auth/logout` | Revoke current session |
| GET | `/auth/me` | Current user and garage |
| GET | `/auth/csrf` | Issue/refresh CSRF token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Complete password reset |

### POST `/auth/register`

Example body:

```json
{
  "owner": {
    "email": "owner@example.com",
    "password": "user-supplied-secret"
  },
  "garage": {
    "name": "Example Garage",
    "phone": "+919876543210",
    "registrationMode": "unregistered",
    "address": {
      "line1": "Example Road",
      "city": "Pune",
      "state": "Maharashtra",
      "stateCode": "27",
      "postalCode": "411001",
      "country": "IN"
    }
  }
}
```

Registration mode is one of `regular`, `composition`, or `unregistered`. Regular mode requires applicable GST details and validation before GST invoice issuance. Do not allow the client to self-certify registration status without the required checks.

### POST `/auth/login`

Body:

```json
{
  "email": "owner@example.com",
  "password": "user-supplied-secret"
}
```

Sets authentication cookies; response must not return reusable refresh tokens in JSON.

### CSRF contract

For unsafe browser requests, Angular sends a session-bound CSRF token in a dedicated header such as `X-CSRF-Token`. The server validates it and applies origin policy. Exact cookie names, token transport, and refresh behavior must be fixed in implementation and documented in `SECURITY.md`.

## 4. Garage

| Method | Path | Purpose |
|---|---|---|
| GET | `/garage` | Read current garage |
| PATCH | `/garage` | Update garage profile/settings |

Patchable fields must be allow-listed. GST registration mode changes require effective dates and audit history. Do not permit clients to directly modify system-managed verification status.

## 5. Customers

| Method | Path | Purpose |
|---|---|---|
| GET | `/customers` | List/search customers |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Get customer |
| PATCH | `/customers/:id` | Update customer |

Create body:

```json
{
  "name": "Customer Name",
  "phone": "+919876543210",
  "email": "customer@example.com",
  "address": "Customer address",
  "whatsappConsent": {
    "status": "opted_in",
    "source": "recorded-by-garage"
  }
}
```

Required fields: name and phone. Consent updates must be auditable and should follow the applicable messaging policy.

## 6. Vehicles

| Method | Path | Purpose |
|---|---|---|
| GET | `/vehicles` | List/search vehicles |
| POST | `/vehicles` | Create vehicle |
| GET | `/vehicles/:id` | Get vehicle |
| PATCH | `/vehicles/:id` | Update vehicle |

Create body:

```json
{
  "customerId": "customer-object-id",
  "vehicleType": "bike",
  "registrationNumber": "MH12AB1234",
  "brand": "Example Brand",
  "model": "Example Model",
  "currentKm": 12500
}
```

The server verifies that the customer belongs to the current garage. Registration numbers are normalized before duplicate checks.

## 7. Parts

| Method | Path | Purpose |
|---|---|---|
| GET | `/parts` | List/search parts |
| POST | `/parts` | Create part |
| GET | `/parts/:id` | Get part |
| PATCH | `/parts/:id` | Update part |

Create body:

```json
{
  "name": "Engine Oil",
  "category": "Lubricants",
  "brand": "Example",
  "mrpPaise": 55000
}
```

`mrpPaise` represents INR 550.00. V1 does not track stock. A catalog price update does not change historical service or invoice line prices.

## 8. Services

| Method | Path | Purpose |
|---|---|---|
| GET | `/services` | List/filter service jobs |
| POST | `/services` | Create service job |
| GET | `/services/:id` | Get service job |
| PATCH | `/services/:id` | Update eligible service fields |
| POST | `/services/:id/complete` | Finalize service and create invoice |
| GET | `/services/:id/history` | Read service history |

Create body:

```json
{
  "customerId": "customer-object-id",
  "vehicleId": "vehicle-object-id",
  "serviceDate": "2026-10-09T00:00:00.000Z",
  "odometerKm": 12500,
  "complaint": "Routine service",
  "items": [
    {
      "kind": "part",
      "partId": "part-object-id",
      "description": "Engine Oil",
      "quantity": 1,
      "mrpPaise": 55000,
      "discountPerUnitPaise": 5000,
      "taxCategory": "configured-category"
    },
    {
      "kind": "labour",
      "description": "General service labour",
      "quantity": 1,
      "mrpPaise": 30000,
      "discountPerUnitPaise": 0,
      "taxCategory": "configured-category"
    }
  ],
  "nextServiceDueDate": "2027-04-09T00:00:00.000Z"
}
```

For production, do not blindly trust prices or tax categories supplied by the client. Resolve authoritative catalog values and tax treatment on the server, while allowing only explicitly supported overrides.

Completion should use an idempotency key and return the invoice ID/status. Concurrent completion requests must not create duplicate invoices.

## 9. Invoices

| Method | Path | Purpose |
|---|---|---|
| GET | `/invoices` | List invoices |
| GET | `/invoices/:id` | Read invoice snapshot and statuses |
| GET | `/invoices/:id/pdf` | Download authorized PDF |
| POST | `/invoices/:id/whatsapp` | Request document delivery |

### POST `/invoices/:id/whatsapp`

Headers:

```text
Idempotency-Key: <unique-client-generated-key>
X-CSRF-Token: <session-bound-token>
```

Body:

```json
{
  "recipientPhone": "+919876543210"
}
```

The server must verify invoice ownership, PDF readiness, customer/recipient eligibility, consent and messaging requirements. It returns a delivery-request ID and current status; the request is asynchronous.

## 10. Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications/:id` | Get delivery status |

Example:

```json
{
  "data": {
    "id": "notification-id",
    "status": "submitted",
    "providerMessageId": "provider-message-id",
    "updatedAt": "2026-10-09T03:30:00.000Z"
  }
}
```

`submitted` does not mean `delivered`. Webhook updates provide subsequent known status.

## 11. Reminders

| Method | Path | Purpose |
|---|---|---|
| GET | `/reminders` | List reminders |
| POST | `/reminders` | Create/schedule reminder |
| GET | `/reminders/:id` | Read reminder |
| PATCH | `/reminders/:id` | Update/cancel eligible reminder |

The default schedule is seven days before the due date. Recheck the reminder state, customer contact and messaging eligibility immediately before sending. The API cannot force a reminder to be sent when provider policy or customer preference prohibits it.

## 12. Dashboard

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/summary` | Summary metrics |

Suggested response:

```json
{
  "data": {
    "serviceCounts": {
      "draft": 0,
      "inProgress": 0,
      "completed": 0,
      "cancelled": 0
    },
    "upcomingReminders": 0,
    "recentInvoices": [],
    "revenueSummary": {
      "issuedInvoiceTotalPaise": 0,
      "paidTotalPaise": null
    }
  }
}
```

Do not interpret issued invoice totals as collected revenue. If payment tracking is not implemented, `paidTotalPaise` should be omitted or explicitly unavailable rather than fabricated.

## 13. WhatsApp webhooks

| Method | Path | Purpose |
|---|---|---|
| GET | `/webhooks/whatsapp` | Provider webhook verification |
| POST | `/webhooks/whatsapp` | Receive message status events |

These routes use provider verification/signature controls rather than browser authentication. Verify authenticity, validate payloads, deduplicate events, and make status updates idempotent.

## 14. API-wide security rules

- HTTPS in production.
- Secure HttpOnly cookies.
- CSRF protection for unsafe browser requests.
- Origin checks and strict CORS.
- Rate limiting for authentication and sensitive actions.
- Garage-scoped authorization on every resource.
- Request and response validation.
- No secrets or stack traces in responses.
- Private file access and authorization before download.
- Verified webhook signatures.
- Request correlation IDs and structured logs.

## 15. API testing requirements

Test:
- Missing/expired session and CSRF token.
- Cross-garage resource IDs.
- Invalid request body and query parameters.
- Concurrent service completion.
- Invoice idempotency and numbering.
- PDF not ready and PDF failure.
- Duplicate WhatsApp requests and webhook callbacks.
- Provider timeouts and retries.
- Reminder rescheduling and opt-out.
- GST registration-mode and invoice-format validation.

## 16. Contract completion checklist

Before coding clients against this API:
- Finalize DTOs and Zod schemas.
- Finalize cookie and CSRF names/transport.
- Define exact pagination/filter syntax.
- Define invoice and reminder state transition responses.
- Add OpenAPI specification and generate/update API documentation in CI.
- Validate GST-specific request rules with a qualified professional.
