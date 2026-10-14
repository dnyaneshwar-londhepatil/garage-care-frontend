# Frontend environments

API URLs are configured in `apps/garage-care/src/environments/`. The application imports `environment` from `environment.ts` and provides its `apiBaseUrl` through the `API_BASE_URL` injection token in `app.config.ts`. API services in `libs/shared/data-access` consume that token; Nx replaces the environment file for the selected build configuration.

| Configuration | File                       | API base URL                 |
| ------------- | -------------------------- | ---------------------------- |
| development   | environment.development.ts | http://localhost:3000/api/v1 |
| qa            | environment.qa.ts          | /api/v1                      |
| staging       | environment.staging.ts     | /api/v1                      |
| production    | environment.production.ts  | https://garage-care-api.onrender.com/api/v1 |

`environment.ts` defaults to development for unit tests. `npx nx serve garage-care` defaults to development; `npx nx build garage-care` defaults to production.

Select another environment with `npx nx build garage-care --configuration=qa` or `npx nx serve garage-care --configuration=staging`. All four configuration names are supported by both commands.

Production calls the Render backend at `https://garage-care-api.onrender.com/api/v1`. Development continues to use the local backend. QA and staging use the frontend origin and require a reverse proxy forwarding `/api/v1` to their backend.

For production, backend `FRONTEND_ORIGINS` must include the exact deployed frontend origin and allow credentialed requests. The current backend sets authentication and anonymous CSRF cookies with `SameSite=Lax`. Direct browser requests from a different site cannot use those cookies; use frontend/API custom domains under the same site, a same-origin API proxy, or an explicitly reviewed backend cookie configuration supporting cross-site requests. CORS alone does not override cookie restrictions. The frontend deployment origin is still needed to verify browser authentication.

Environment files are bundled into the browser and must contain only public configuration, never database credentials, tokens, or other secrets. Backend private configuration remains in its `.env` file.
