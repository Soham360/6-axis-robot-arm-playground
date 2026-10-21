# AXIS assistant setup

The website includes an offline lesson guide on Simulator, Learn and Examples. It searches the local course content and links to lessons. It is clearly labeled as built-in guidance, not generative AI. It needs no account, key or network request containing a question.

The AI mode is implemented but remains unavailable until a backend is configured. It uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses). Questions, recent conversation messages and relevant course material are sent when the user selects AI mode and submits. A sketch is included only with the user's checkbox selection. No tool, hardware, automatic code insertion or execution capability is provided. Replies are rendered as plain text. Conversations stay in page memory and are cleared on reload or New chat.

## Local setup (Node.js 20 or newer)

1. Create an OpenAI project API key in your own account and select a model available to that project. Configure project usage limits. Never paste the key into the website, a chat, source control, or `assistant-config.js`.
2. Set `OPENAI_API_KEY` and `OPENAI_MODEL` as environment variables in the process that runs AXIS. The model has no baked-in default: choose one supported by the Responses API.
3. Start `node server.js` from the repository. Use `PORT` to choose a port if needed. The server binds to loopback by default.
4. Open the printed local URL and choose Ask AXIS. The Help mode menu enables AI assistant when both variables are configured. A server restart is required after changing environment variables.

For a local environment file, use Node's explicit `node --env-file=.env server.js` option on a Node release supporting it. Copy the variable names from `.env.example` into `.env` and fill them locally. Ordinary `node server.js` does not automatically load that file. `.env` and related secret files are ignored by Git and blocked by the static file server.

## GitHub Pages and hosted setup

GitHub Pages serves static files and cannot run `server.js` or hold a server secret. Built-in lesson help continues to work there without a backend.

To enable AI for a hosted site:

1. Operate the Node backend on a server behind an HTTPS reverse proxy. Forward `/api/assistant` to its loopback port. Set the key and model only in that server's secret environment.
2. Put authentication and per-user quotas at your reverse proxy or application gateway before making the paid AI endpoint public. The included per-process limit (12 requests per minute per connection IP and three concurrent requests) is a local guard, not a complete public abuse or billing system. Set provider budgets too. Behind a proxy, connection IPs may be shared; do not trust arbitrary forwarded headers.
3. Set `AXIS_SITE_ORIGIN` to the exact website origin, for example `https://soham360.github.io`, without a path or trailing slash. CORS restricts browser origins but is not authentication.
4. Set `assistantEndpoint` in `assistant-config.js` to your HTTPS endpoint ending in `/api/assistant`. This URL is public configuration; no key belongs in it. If the site and proxy share an origin, leave the setting empty and route the relative API path appropriately (including `/AXIS/api/assistant` for a site under `/AXIS/`).
5. Verify endpoint GET returns `{"available":true}` without credentials or secrets, then test one question. POST requires JSON and the permitted browser Origin. Review any additional hosting Content Security Policy so `connect-src` permits your endpoint.

The backend bounds question, code and conversation size, caps output length, uses a 45-second provider timeout, and returns generic provider failure messages. It sets `store:false` in the Responses request, per the [official API guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses); this is not a promise of zero provider retention. Review your provider's data policies. AXIS does not write conversation logs itself; also review hosting/proxy logging settings.

## Verification and limits

`node --test tests/*.test.js` covers course detail completeness, lesson retrieval, request validation, mocked provider requests/replies, origin checks, unavailable mode and server routes. Tests use a mocked provider and never incur API usage. A real reply requires your configured project and model and must be smoke-tested after deployment. If the endpoint is unavailable, users can select built-in help and their failed question is retained for retry.
