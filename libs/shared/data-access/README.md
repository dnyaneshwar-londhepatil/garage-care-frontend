# Shared data access

Import services and DTOs from `@garage-care/shared/data-access`. Use Angular `inject()` in a page/controller and pass view models into child components through inputs. The application's `app.config.ts` provides `API_BASE_URL` from the selected environment.

```ts
import { inject } from '@angular/core';
import { CustomersApi } from '@garage-care/shared/data-access';

private readonly customers = inject(CustomersApi);

async loadCustomers() {
  const result = await this.customers.list({ limit: 20 });
  // Store result.data and result.page.nextCursor in component signals.
}
```

Run authenticated loads after browser render or behind the browser session guard. Do not serialize private reads into SSR HTML. Never import backend runtime files or app environment files into this library. Keep secrets, cookie handling, tenant authorization and authoritative calculations on the server.

`ApiClient` shares in-memory CSRF state and serializes writes. Financial completion and document delivery require caller-retained idempotency keys; preserve the same key on retries of the same operation. Update service jobs using the server-returned version. Do not automatically retry ambiguous network failures.

See `docs/API_INTEGRATION.md` for endpoint coverage and UI boundaries. Test with `npx nx test shared-data-access`; lint with `npx nx lint shared-data-access`.
