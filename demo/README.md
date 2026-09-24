# Scout web demo

A compact live-AI demonstration of parent guidance → public action summaries → child exploration. The desktop Scout app remains separate.

## Run

Node 22.13+ (or current LTS), npm:

```sh
npm ci
cp .env.example .dev.vars
# Add your Gemini key to .dev.vars. Never commit it.
npm run db:generate # only after changing db/schema.ts
npm run dev
```

Build once, then apply the migration to local D1 before using the API (run this once per fresh local database):

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_shallow_psynapse.sql
```

Use `npm start` for a production-build preview against that local D1 database. Local sign-in is mocked only by the development server. Production requires Sites dispatcher authentication; do not expose the Worker directly on another host without replacing that trust boundary.

```sh
npm test
npx tsc --noEmit
npm run build
```

## Deployment

The `.openai/hosting.json` manifest identifies the hosted Site and its D1 `DB` binding. Production uses `GEMINI_API_KEY` as a secret, `SCOUT_MODEL=gemini-3.5-flash-lite`, and `SCOUT_ENABLED=true`. Setting `SCOUT_ENABLED=false` and redeploying stops AI requests. Do not put credentials in Git or client environment variables.

## Request controls

- ChatGPT sign-in identifies the parent. Children use that parent’s session.
- D1 enforces 3 requests/minute, 10/day, and 30 lifetime/account. Site-wide limits are 100/day and 1,000 lifetime. Daily windows use UTC.
- Atomic quota reservation happens before each provider call. A SQLite CHECK constraint aborts and rolls back the entire D1 batch if any limit is reached. Provider errors/timeouts consume reserved requests. No automatic retries.
- One call per request, up to 700 output tokens, 8 KB request body, 500 characters per parent preference, and 300 characters per child question. No user-selected model, tool calls, external URL fetching, or chat history expansion.
- Setup signs the exact original family guidance, bound to the authenticated account and expiring after one hour. The child API rejects altered, expired, or cross-account guidance.
- Same-origin JSON requests only. API responses are not cached. Output is schema-validated and rendered as text, never injected HTML.
- Stores hashed site-scoped account IDs and quota counters, not prompts, answers, or names. Expired window counters are cleaned in bounded batches. Provider data handling still applies.

These controls bound model usage, not all possible abuse. Multiple accounts can consume the shared allowance or deny other visitors access. Sign-in, finite lifetime budgets, and a kill switch limit exposure; add provider-side quotas and edge bot controls before expanding a public launch. Model adherence to family preferences is probabilistic, not a security boundary.

## Scope

This demo generates explanations and exploration ideas, not web-search results or reviewed videos. Activity text contains brief action summaries, not private chain of thought. The shared-screen parent step is editable; this is not a parental-control product. Guidance remains in the tab and is lost on refresh. Do not enter sensitive information.

## Verification

`npm test` exercises the exact migration against SQLite and mocked provider contracts: concurrency admission, transaction rollback, daily/lifetime limits, guidance signatures, request validation, auth/origin checks, failed-call accounting, and malformed outputs. Browser checks cover desktop/mobile, the full parent-child interaction, editing, quota errors, and input preservation. Live model smoke checks cover parent setup, a science question, and a conflicting child request.

Provider references: [structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [thinking controls](https://ai.google.dev/gemini-api/docs/thinking), and [D1 transaction batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).
