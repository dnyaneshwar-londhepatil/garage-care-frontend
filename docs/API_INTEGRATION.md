# Browser API integration

The implemented contract comes from the sibling `garage-care-backend/src/auth.ts`, `src/resources.ts`, `src/validation.ts`, and `docs/CONTRACT.md`. The baseline API specification remains product context; use the implemented contract when they differ.

All browser API services are in `libs/shared/data-access`, exported as `@garage-care/shared/data-access`. The app injects its environment URL into `API_BASE_URL` in `app.config.ts`. Libraries never import frontend app files or backend runtime code.

| Service             | Supported backend operations                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| AuthApi / ApiClient | Register, login, me, CSRF issuance, refresh, logout, forgot password, reset password                                |
| GarageApi           | Read garage, update name/phone/address                                                                              |
| CustomersApi        | List/search/page, read, create, update                                                                              |
| VehiclesApi         | List/search/page, read, create, update permitted vehicle fields                                                     |
| PartsApi            | List/search/page, read, create, update                                                                              |
| ServicesApi         | List/filter/page, read, create, update with version, vehicle history, complete with caller-retained idempotency key |
| InvoicesApi         | List/page, read, authorized PDF blob, request WhatsApp document delivery with caller-retained idempotency key       |
| RemindersApi        | List/page, read, schedule, cancel eligible reminder                                                                 |
| NotificationsApi    | Read delivery status                                                                                                |
| DashboardApi        | Read summary                                                                                                        |

`ResourceApi` supplies typed CRUD methods. Do not use CRUD methods for immutable invoices; they intentionally have a separate service. Webhooks and health endpoints are server/infrastructure operations, not browser business APIs.

## Existing screens

Sign-in and sign-up inject `AuthApi` from the library. Sign-up keeps the approved minimal owner/garage fields; address and GST mode are not fabricated. Forgot Password submits the anonymous CSRF-protected reset request and shows the server's non-enumerating message or actual failure. Reset Password reads `token` from the emailed link, validates the 12–128 character backend policy, calls the server, and clears form passwords only after success. Email transport and worker configuration are required for actual email delivery.

Dashboard uses a browser-only session guard and restores `/auth/me` on page access. API reads run after browser render, never while prerendering. It joins service/reminder IDs with garage-scoped customer and vehicle records, displays backend summary amounts in INR, and supports refresh and cursor-based service pagination. Search/status filters apply to the loaded jobs; this is stated in the search label/count. Pending reminders load up to 20 records; total pending count comes from the summary. No sample records are substituted on errors.

View expands a loaded job. Service history is read on demand. The five recent invoice references from the backend summary enable PDF download and consent-gated WhatsApp delivery for matching jobs. Older invoices remain available through `InvoicesApi` for the future invoice page. WhatsApp status is fetched after submission; queued/unknown/failed status never means delivered. Retries within the mounted dashboard reuse the same invoice delivery key. A manual phone action opens the device's `tel:` handler. Logout revokes the server cookie session before navigating.

There is no send-now reminder API. Existing reminder actions read current schedule/status rather than claiming delivery. Bays, turnaround measurements and collected payments have no measured backend counterpart and are labelled unavailable. Unbuilt navigation/quick actions explain that their page is pending and submit nothing. Per user scope, customer/vehicle/parts/invoice/settings CRUD pages are separate future work; all their APIs are ready for injection.

## Request safety

All reads and writes use cookie credentials and disable Angular HTTP transfer caching. CSRF tokens stay in memory. Writes are serialized inside the shared client to prevent token issuance/rotation races. Login/registration/refresh responses replace the cached CSRF token; logout/reset clear it. An explicitly rejected `CSRF_INVALID` write refreshes the token and retries once with its original idempotency key. Other errors are not automatically retried, including ambiguous network failures. Session cookies/passwords/reset tokens are never placed in browser storage or logs.

Form submission waits for Angular browser readiness, displays pending/errors, and blocks duplicate requests. A missing reset token prevents HTTP submission. Backend tenant authorization, version checks, money calculations, setup/GST gates, consent and provider readiness remain authoritative.

## Running and checks

Run the sibling backend with `npm run dev:local`. Run the frontend with `npx nx serve garage-care --port=4200`; backend `FRONTEND_ORIGINS` must allow this exact origin. See `ENVIRONMENTS.md` for deployed base URLs and proxy setup.

```powershell
npx nx run-many -t test -p garage-care shared-data-access
npx nx build garage-care
npx nx run-many -t lint -p garage-care shared-data-access
npx playwright test --config=apps/garage-care-e2e/playwright.config.mts --project=chromium
```

HTTP tests exercise every browser business endpoint, cookies, CSRF, rotation, financial keys, version payloads, pagination and PDF blobs. Component tests cover live-data mapping and recovery validation/errors. Browser tests use explicit API fixtures for deterministic layouts and actions; they do not prove provider delivery. The opt-in `RUN_LOCAL_BACKEND=1` signup test uses the actual local backend and creates an isolated test garage.

Set `E2E_PORT=4900` to let Playwright start a fresh isolated local preview, avoiding stale SSR output from an existing preview server. Set `BASE_URL` to test an already running preview or deployed app without starting a local server. Real backend tests require that exact origin in backend `FRONTEND_ORIGINS`; the default local backend allows ports 4200 and 4600. The real signup test also verifies reload, logout, and signing in again.
