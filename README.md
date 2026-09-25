# FinTrack

A personal finance and budget tracker built with the MERN stack and TypeScript end to end. Record income and expenses across accounts, set monthly budgets per category, and see where your money goes, all in Indian Rupees with lakh/crore formatting (₹1,23,456.00) and DD-MM-YYYY dates.

**Live demo:** https://harsh3851.github.io/FinTrack/ (click **Try the demo account**)

The live demo runs on GitHub Pages in **demo mode**: the same React app, but its data layer runs in the browser against `localStorage`, pre-seeded with twelve months of realistic data. Run it locally (or deploy the API, see [Deployment](#deployment)) for the full Node.js + Express + MongoDB backend.

![FinTrack dashboard](docs/dashboard-desktop-light.png)

| Dark theme                                                        | Mobile                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| ![Dashboard in dark mode](docs/dashboard-desktop-dark.png)        | ![Dashboard on a phone](docs/dashboard-mobile-light.png)           |
| ![Transactions with filters](docs/transactions-desktop-light.png) | ![Add transaction on mobile](docs/add-transaction-mobile-dark.png) |

More screenshots are in [`docs/`](docs).

## Features

- **Authentication**: register, sign in, sign out and one-click demo login. Short-lived JWT access tokens (kept in memory only) plus a rotating, httpOnly refresh-token cookie with reuse detection. Passwords are hashed with bcrypt.
- **Accounts**: bank, cash, card and wallet accounts with opening balances and running balances.
- **Transactions**: create, edit and delete income and expenses with category, account, date, note and tags. Server-side pagination, filtering (type, category, account, date range), case-insensitive search across notes, tags and category names, and sorting by date or amount. Filters live in the URL, so any view can be bookmarked.
- **Categories**: 17 sensible defaults seeded for every new user, each with an icon and colour; add, rename and recolour your own.
- **Budgets**: recurring monthly limits per expense category with progress bars, an 80% warning state and over-budget alerts.
- **Dashboard**: month totals with change versus last month, savings rate, total balance, a 12-month income vs expense chart, spending by category, recent transactions and budget status. Browse any past month.
- **CSV export** of exactly the filtered transaction list (Excel-friendly, formula-injection safe).
- **Money done right**: amounts are stored as integer paise, never floating-point rupees.
- **UI quality**: light and dark themes (follows the OS, with a manual override), responsive down to 360px with a bottom navigation on phones, loading skeletons, empty and error states, toasts, accessible forms (labels, inline errors announced to screen readers, visible focus, focus-trapped dialogs, keyboard navigation) and reduced-motion support.

## Architecture

```mermaid
flowchart LR
  subgraph Browser["Browser - React 18 + Vite + TypeScript"]
    UI["Pages and components<br/>React Router, react-hook-form"]
    RQ["TanStack Query cache"]
    DS{{"DataSource interface"}}
    HTTP["httpSource<br/>fetch + silent token refresh"]
    DEMO["demoSource<br/>localStorage, seeded demo data"]
    UI --> RQ --> DS
    DS -- "VITE_API_URL set" --> HTTP
    DS -- "no API URL (GitHub Pages)" --> DEMO
  end

  subgraph API["Node.js 20 - Express 5 API"]
    MW["helmet, CORS, rate limit,<br/>pino logging, JWT auth"]
    R["routes"] --> C["controllers<br/>(zod validation)"] --> S["services"] --> M["Mongoose models"]
    MW --> R
    EH["central error handler<br/>{ error: { code, message, details } }"]
  end

  SH[["@fintrack/shared<br/>zod schemas, money/date helpers,<br/>CSV, demo data generator"]]

  HTTP -- "REST /api/v1 (Bearer token + httpOnly refresh cookie)" --> MW
  M --> DB[("MongoDB")]
  SH -.-> C
  SH -.-> UI
  SH -.-> DEMO
```

Key design decisions:

- **One contract, two backends.** The UI only talks to a `DataSource` interface (`client/src/data/types.ts`). `httpSource` calls the Express API; `demoSource` implements the same operations in the browser. Both validate input with the **same zod schemas** from `shared/` and throw the same `ApiError` shape, so validation messages, conflict rules (for example, "account has transactions") and edge cases behave identically.
- **Shared domain package.** `shared/` holds validation schemas, DTO types, INR and date formatting, budget-state rules, CSV generation and the deterministic demo-data generator, used by the API, the client and the tests.
- **Layered API.** `routes -> controllers -> services -> models`. Controllers parse and validate; services hold business rules and MongoDB aggregations (balances, monthly trends, budget spend); models define schemas and indexes (for example `{ user, date: -1 }` for the default listing).
- **Security basics.** Refresh tokens are random, stored only as SHA-256 hashes, rotated on every use, and a replayed token revokes its whole login chain. Every query is scoped by the authenticated user id. Search input is regex-escaped. Login responses do not reveal whether an email exists. Auth endpoints are rate limited.

## Tech stack

| Layer   | Tools                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Client  | React 18, TypeScript, Vite 6, React Router 6, TanStack Query 5, react-hook-form, zod, Tailwind CSS 4, Recharts, lucide-react, sonner |
| API     | Node.js 20, Express 5, Mongoose 8, zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, pino                               |
| Shared  | TypeScript package consumed by both sides (npm workspaces)                                                                           |
| Testing | Vitest, Supertest, mongodb-memory-server, Testing Library, jsdom                                                                     |
| Tooling | ESLint 9 (flat config, typescript-eslint, react-hooks), Prettier, GitHub Actions CI                                                  |
| Hosting | GitHub Pages (client), Render (API), MongoDB Atlas (database)                                                                        |

## Repository layout

```
FinTrack/
├── client/            React app (source)
│   └── src/
│       ├── data/      DataSource contract, HTTP client, in-browser demo backend, query hooks
│       ├── pages/     Dashboard, Transactions, Budgets, Accounts, Categories, auth pages
│       ├── components/ UI kit (Button, Field, Modal, Skeleton, ...) and domain components
│       └── test/      Component and data-layer tests
├── server/            Express API
│   ├── src/{config,routes,controllers,services,models,middleware,utils,scripts}
│   └── test/          Integration tests against an in-memory MongoDB
├── shared/            Schemas, types, money/date helpers, demo data
├── scripts/           build-pages.mjs (GitHub Pages build)
├── docs/              Screenshots
├── index.html, assets/ Built GitHub Pages site (generated, do not edit)
└── render.yaml        Render blueprint for the API
```

## Getting started

Requirements: Node.js 20 or newer and npm 10. MongoDB is optional for local development.

```bash
git clone https://github.com/Harsh3851/FinTrack.git
cd FinTrack
npm install
cp server/.env.example server/.env
```

Then pick one:

| Command              | What runs                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:memory` | API on http://localhost:4000 with an **in-memory MongoDB** (no install needed, demo user seeded, data resets on exit) plus the client on http://localhost:5173 |
| `npm run dev`        | API against the `MONGODB_URI` in `server/.env` plus the client. Run `npm run seed` once to create the demo user.                                               |
| `npm run dev:demo`   | Client only, in browser demo mode (the same as GitHub Pages)                                                                                                   |

Open http://localhost:5173 and choose **Try the demo account**, or register a new user. The demo credentials are `demo@fintrack.app` / `Demo@12345`.

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable                   | Default                 | Description                                                             |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                 | `development`           | `development`, `test` or `production`                                   |
| `PORT`                     | `4000`                  | HTTP port                                                               |
| `MONGODB_URI`              | -                       | MongoDB connection string (required by `npm run dev` and in production) |
| `JWT_ACCESS_SECRET`        | -                       | 32+ character secret for access tokens                                  |
| `JWT_REFRESH_SECRET`       | -                       | 32+ character secret for refresh tokens                                 |
| `ACCESS_TOKEN_TTL_SECONDS` | `900`                   | Access token lifetime (15 minutes)                                      |
| `REFRESH_TOKEN_TTL_DAYS`   | `7`                     | Refresh token lifetime                                                  |
| `CORS_ORIGIN`              | `http://localhost:5173` | Comma-separated list of allowed browser origins                         |
| `COOKIE_SAMESITE`          | `lax`                   | Refresh cookie SameSite. Use `none` when the client is on another site  |
| `COOKIE_SECURE`            | `false`                 | Must be `true` in production (required with `SameSite=None`)            |
| `TRUST_PROXY`              | `0`                     | Number of proxies in front of the app (`1` on Render)                   |
| `DEMO_ENABLED`             | `true`                  | Enables `POST /api/v1/auth/demo`                                        |
| `LOG_LEVEL`                | `info`                  | pino log level                                                          |

The configuration is validated with zod at start-up; the API refuses to boot with a missing or weak secret.

Client (build time):

| Variable       | Description                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the API, for example `https://fintrack-api.onrender.com`. When empty, the client runs in demo mode. |

## API reference

Base path: `/api/v1`. All endpoints except auth and health need `Authorization: Bearer <accessToken>`. Amounts are integers in **paise**; dates are `YYYY-MM-DD`; months are `YYYY-MM`.

| Method | Endpoint                           | Description                                                                                                                                                                                               |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness and database status                                                                                                                                                                              |
| POST   | `/auth/register`                   | Create an account `{ name, email, password }`; seeds default categories and a bank account                                                                                                                |
| POST   | `/auth/login`                      | Sign in `{ email, password }`                                                                                                                                                                             |
| POST   | `/auth/demo`                       | Sign in as the demo user (created and seeded on first use)                                                                                                                                                |
| POST   | `/auth/refresh`                    | Rotate the refresh cookie and return a new access token (204 when there is no session)                                                                                                                    |
| POST   | `/auth/logout`                     | Revoke the refresh token and clear the cookie                                                                                                                                                             |
| GET    | `/auth/me`                         | Current user                                                                                                                                                                                              |
| GET    | `/accounts`                        | Accounts with `balance` and `transactionCount`                                                                                                                                                            |
| POST   | `/accounts`                        | Create `{ name, type: bank\|cash\|card\|wallet, openingBalance, color }`                                                                                                                                  |
| PATCH  | `/accounts/:id`                    | Update any of the above                                                                                                                                                                                   |
| DELETE | `/accounts/:id`                    | Delete (409 if it has transactions)                                                                                                                                                                       |
| GET    | `/categories`                      | Categories with `transactionCount`                                                                                                                                                                        |
| POST   | `/categories`                      | Create `{ name, type: income\|expense, icon, color }`                                                                                                                                                     |
| PATCH  | `/categories/:id`                  | Update name, icon or colour                                                                                                                                                                               |
| DELETE | `/categories/:id`                  | Delete (409 if used; removes its budget)                                                                                                                                                                  |
| GET    | `/transactions`                    | List. Query: `page`, `limit` (max 100), `type`, `categoryId`, `accountId`, `from`, `to`, `q`, `sort` (`-date`, `date`, `-amount`, `amount`). Returns `{ data, meta: { page, limit, total, totalPages } }` |
| GET    | `/transactions/export`             | CSV download of the same filtered list                                                                                                                                                                    |
| GET    | `/transactions/:id`                | One transaction                                                                                                                                                                                           |
| POST   | `/transactions`                    | Create `{ type, amount, categoryId, accountId, date, note?, tags? }`                                                                                                                                      |
| PATCH  | `/transactions/:id`                | Partial update                                                                                                                                                                                            |
| DELETE | `/transactions/:id`                | Delete                                                                                                                                                                                                    |
| GET    | `/budgets?month=YYYY-MM`           | Budgets with `spent`, `remaining`, `ratio`, `state` (`ok`, `warning`, `over`)                                                                                                                             |
| PUT    | `/budgets/:categoryId`             | Create or update a monthly limit `{ amount }`                                                                                                                                                             |
| DELETE | `/budgets/:categoryId`             | Remove a budget                                                                                                                                                                                           |
| GET    | `/dashboard/summary?month=YYYY-MM` | Totals, previous-month totals, 12-month trend, spending by category, recent transactions, budgets and total balance                                                                                       |

Every error uses one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid",
    "details": [{ "path": "amount", "message": "Amount must be in paise (whole number)" }]
  }
}
```

Codes: `VALIDATION_ERROR`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Testing and quality

```bash
npm test          # shared unit tests, API integration tests, client tests
npm run lint      # ESLint (zero warnings allowed) + TypeScript type checks
npm run format:check
```

- **API integration tests** (`server/test`) boot the real Express app against **mongodb-memory-server**, so no external database is needed. They cover auth (registration, login, refresh-token rotation and reuse detection, logout, demo login), transaction CRUD, validation, per-user data isolation, filtering, search, sorting, pagination, CSV export, balances, delete conflicts, budgets and the dashboard summary.
- **Client tests** (`client/src/test`) cover the form validation and paise conversion, budget warnings, INR formatting, the login flow, the HTTP client's silent token refresh, and the in-browser demo backend's parity with the API rules.
- **Shared tests** cover money and date helpers, schemas, CSV escaping and the demo-data generator.

GitHub Actions runs lint, format check, tests and the build on every push and pull request.

## Deployment

### Client on GitHub Pages

GitHub Pages serves the repository root of the `master` branch, so the production build is written there:

```bash
npm run build:pages     # builds client/ into ./index.html and ./assets with base /FinTrack/
git add index.html assets favicon.svg .nojekyll && git commit -m "build: update pages" && git push
```

The app uses hash-based routing, so deep links work on static hosting without server rewrites. Without `VITE_API_URL` the build runs in demo mode.

### API on Render + MongoDB Atlas (free tiers)

1. **MongoDB Atlas**: create a free M0 cluster. Under Database Access add a user with a strong password. Under Network Access allow `0.0.0.0/0` (Render free instances have no fixed IP). Copy the connection string and add a database name, for example `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/fintrack?retryWrites=true&w=majority`.
2. **Render**: in the dashboard choose **New > Blueprint**, connect this repository and apply `render.yaml`. When prompted, paste the Atlas string as `MONGODB_URI`. The blueprint generates both JWT secrets and sets `CORS_ORIGIN=https://harsh3851.github.io`, `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` and `TRUST_PROXY=1`.
3. Wait for the deploy, then check `https://<your-service>.onrender.com/api/v1/health` returns `{"status":"ok","db":"up"}`. The demo user is created automatically on the first **Try the demo account** click; you can also run `npm run seed` locally with the Atlas `MONGODB_URI` to reset it.
4. **Switch the live site to the real backend**:

   ```bash
   VITE_API_URL=https://<your-service>.onrender.com npm run build:pages
   git add index.html assets && git commit -m "build: point pages at the hosted API" && git push
   ```

   The demo-mode banner disappears and every request goes to the API.

Notes:

- Render free instances sleep after about 15 minutes idle, so the first request can take 30 to 60 seconds.
- The client (github.io) and the API (onrender.com) are different sites, so the refresh cookie is sent as `SameSite=None; Secure; Partitioned`. Browsers that block third-party cookies entirely may not restore the session after a full page reload; signing in again works. Serving both from one domain (for example a custom domain with an `api.` subdomain) removes this limitation.

## License

[MIT](LICENSE)
