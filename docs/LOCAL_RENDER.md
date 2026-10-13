# Local frontend with the Render API

Development uses apiBaseUrl=/api/v1. The Angular dev server proxies /api requests to https://garage-care-api.onrender.com with TLS validation enabled. Restart nx serve after changing the proxy.

The browser therefore receives/sends authentication cookies on localhost rather than making cross-site requests to Render. HttpOnly, Secure, SameSite=Lax and CSRF checks remain enabled; do not strip Secure flags or disable CSRF. Use http://localhost:4200, not a LAN address. Render must allow the exact localhost frontend Origin. Chrome treats localhost as a secure context for Secure cookies.

Call GET /api/v1/auth/csrf before writes and send its token as X-CSRF-Token using the same cookie session. The shared ApiClient already handles this sequence and retries once after an expired CSRF token.

Production needs an equivalent same-site API reverse proxy or explicitly configured same-site frontend/API domains. Pointing a separately hosted frontend directly at onrender.com does not establish same-site cookie behavior.

A failed INVALID_CREDENTIALS response after a fresh CSRF request demonstrates the cookie/CSRF path succeeded; it does not demonstrate a successful owner login.
