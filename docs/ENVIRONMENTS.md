# Frontend environments

API URLs are configured in `apps/garage-care/src/environments/`. HTTP services import `environment` from `environment.ts`; Nx replaces that file for the selected build configuration.

| Configuration | File                       | API base URL                 |
| ------------- | -------------------------- | ---------------------------- |
| development   | environment.development.ts | http://localhost:3000/api/v1 |
| qa            | environment.qa.ts          | /api/v1                      |
| staging       | environment.staging.ts     | /api/v1                      |
| production    | environment.production.ts  | /api/v1                      |

`environment.ts` defaults to development for unit tests. `npx nx serve garage-care` defaults to development; `npx nx build garage-care` defaults to production.

Select another environment with `npx nx build garage-care --configuration=qa` or `npx nx serve garage-care --configuration=staging`. All four configuration names are supported by both commands.

QA, staging, and production use the deployed frontend origin. Configure that origin's reverse proxy to forward `/api/v1` to the backend. If an environment uses a separate API host, set its `apiBaseUrl` to the actual HTTPS URL and configure backend CORS/cookies accordingly. Deployment hostnames have not yet been supplied.

Environment files are bundled into the browser and must contain only public configuration, never database credentials, tokens, or other secrets. Backend private configuration remains in its `.env` file.
