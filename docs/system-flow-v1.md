# SYSTEM FLOW MAP — LunarBot End-to-End Architecture Audit

## TL;DR

LunarBot is a **fragmented prototype** with individually built components that are **not connected into a working vertical slice**. Auth exists but leaks. Stripe integration is wired but critically broken (wrong Supabase client in all 3 API routes means webhook DB writes silently fail under RLS). Task creation works through the UI, but execution produces fake order numbers because `fillCheckoutInfo()` and `completePurchase()` are never called. The monitoring pipeline has two competing architectures (BullMQ vs setInterval) and the stop route can never stop a started monitor. Analytics are 100% mock data. The database schema is not version-controlled. There is no single path through the system that produces a real successful order.

---

## STEP 1 — COMPLETE END-TO-END FLOW MAP

### Flow 1: User Signs Up

| Aspect                    | Detail                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Entry trigger**         | User clicks "Sign Up" on `login/page.tsx`                                       |
| **Services**              | Supabase Auth (`signUp`), `useAuth` hook auto-profile creation                  |
| **DB interactions**       | INSERT into `user_profiles` (defaults: `free` tier, 5 credits, `active` status) |
| **External integrations** | Supabase Auth (email confirmation)                                              |
| **State transitions**     | No user → unconfirmed email → confirmed → profile auto-created on first login   |

**Failure points:**

- `[BROKEN]` RLS INSERT policy on `user_profiles` may block auto-creation from the browser client
- `[BROKEN]` `/forgot-password` link is dead — page doesn't exist, only `/reset-password` does
- `[GAP]` No redirect after signup — raw `alert()` tells user to check email
- `[GAP]` No email validation or password strength check on the client
- `[GAP]` Already-authenticated users can still see and interact with the login form

---

### Flow 2: User Authenticates

| Aspect                    | Detail                                                                         |
| ------------------------- | ------------------------------------------------------------------------------ |
| **Entry trigger**         | User submits credentials or clicks an OAuth button                             |
| **Services**              | Supabase Auth, `useAuth` hook, `AuthProvider` context                          |
| **DB interactions**       | SELECT from `user_profiles` by `user_id`; INSERT if missing                    |
| **External integrations** | Google OAuth, GitHub OAuth                                                     |
| **State transitions**     | Unauthenticated → session created → profile fetched → redirect to `/dashboard` |

**Failure points:**

- `[BROKEN]` Layout uses `createPagesBrowserClient` (Pages Router helper) while `supabaseClient.ts` uses `createBrowserClient` (SSR helper) — two independent instances that don't share session state
- `[GAP]` Login page instantiates `useAuth()` directly AND via `useAuthContext()` from the layout — double session listeners and double profile fetches on every load
- `[GAP]` Only 3 of ~15 pages are wrapped in `ProtectedRoute` — most dashboard pages are accessible without auth

---

### Flow 3: User Purchases Subscription

| Aspect                    | Detail                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Entry trigger**         | User clicks a plan on `pricing/page.tsx`                                                       |
| **Services**              | Stripe Checkout, `/api/stripe/create-checkout-session`                                         |
| **DB interactions**       | SELECT from `subscription_plans` by `planId`; SELECT/UPDATE `user_profiles.stripe_customer_id` |
| **External integrations** | Stripe Checkout Sessions                                                                       |
| **State transitions**     | Free tier → Stripe checkout → (webhook) → tier updated in DB                                   |

**Failure points:**

- `[CRITICAL]` `create-checkout-session/route.ts` imports the browser Supabase client and calls `auth.admin.getUserById()` — `auth.admin` does not exist on the browser client. **This endpoint throws at runtime.**
- `[CRITICAL]` No authentication on the endpoint — accepts a raw `userId` from the request body; any caller can initiate a checkout for any user
- `[BROKEN]` `planId` is sent as a lowercase string (e.g. `"basic"`) but the DB lookup is by `id` column — if `subscription_plans` uses UUIDs this lookup fails every time
- `[GAP]` Yearly billing toggle in the pricing UI is cosmetic — there is only one `stripePriceId` per plan, no yearly variant
- `[GAP]` Price ID env vars (`STRIPE_BASIC_PRICE_ID`, etc.) are not listed in `env.example`

---

### Flow 4: License Activates Correctly

| Aspect                | Detail                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Entry trigger**     | Stripe webhook `checkout.session.completed`                                                                              |
| **Services**          | `webhook/route.ts`, Supabase                                                                                             |
| **DB interactions**   | UPDATE `user_profiles` — sets `subscription_tier`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` |
| **State transitions** | `free` → `basic` / `premium` / `enterprise`; `subscription_status` → `active`                                            |

**Failure points:**

- `[CRITICAL]` Webhook imports `supabase` from `supabaseClient` (the browser client). In a webhook context there are no cookies and no auth session. Under RLS, **all DB updates silently fail** — user pays but their tier never changes.
- `[BROKEN]` `handleSubscriptionUpdated` only updates `subscription_status`, not `subscription_tier` — plan upgrades and downgrades made through the Stripe portal never propagate to the DB
- `[GAP]` No idempotency handling — replayed or duplicate webhook events will cause redundant updates
- `[GAP]` No error checking on `.update()` results — failures are swallowed silently
- `[GAP]` `tasks_used` and `credits_remaining` are never reset or updated by any webhook handler

---

### Flow 5: User Configures Profile

| Aspect                    | Detail                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Entry trigger**         | User navigates to profiles, accounts, proxies, or settings pages                    |
| **Services**              | Direct Supabase CRUD from client components                                         |
| **DB interactions**       | CRUD on `shipping_profiles`, `user_store_accounts`, `proxies`, `bot_configurations` |
| **External integrations** | None                                                                                |
| **State transitions**     | No profile → profile with addresses, store credentials, and proxies configured      |

**Failure points:**

- `[BROKEN]` `profiles/page.tsx:163` edit/update writes to `user_profiles` instead of `shipping_profiles` — existing profiles can never be updated
- `[BROKEN]` Store account passwords are stored with `btoa()` (base64) but `TaskExecutor.ts:296` calls `decryptSensitiveData()` (AES-256-GCM) — this format mismatch **crashes task execution** at the credential decryption step
- `[BROKEN]` `encryption.ts` uses the deprecated `crypto.createCipher` API — will fail or throw in modern Node.js
- `[GAP]` Profiles, proxies, and accounts pages are not wrapped in `ProtectedRoute`

---

### Flow 6: User Creates Task

| Aspect                    | Detail                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Entry trigger**         | User completes the 6-step wizard in `task-creation-wizard.tsx`                                                                           |
| **Services**              | `POST /api/tasks/execute`, BullMQ queue                                                                                                  |
| **DB interactions**       | INSERT into `purchase_tasks` (status: `queued`); SELECT from `stores`, `products`, `shipping_profiles`, `user_store_accounts`, `proxies` |
| **External integrations** | Redis (BullMQ)                                                                                                                           |
| **State transitions**     | No task → `queued` in DB → job added to BullMQ                                                                                           |

**Failure points:**

- `[BROKEN]` `execute/route.ts` instantiates a `TaskExecutor` (with an embedded BullMQ Worker) at module scope — this competes directly with the standalone worker process for jobs
- `[GAP]` No subscription tier enforcement — tasks can be created without limit regardless of plan
- `[GAP]` `profileId` (shipping profile) is collected by the wizard but never stored on the task or passed to the worker
- `[GAP]` `tasks_used` is never incremented on task creation
- `[GAP]` API route uses the browser Supabase client — no server-side auth verification

---

### Flow 7: Task Executes

| Aspect                    | Detail                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **Entry trigger**         | BullMQ worker picks up a job from the `task-execution` queue                        |
| **Services**              | `TaskExecutor.ts`, StoreBot implementations                                         |
| **DB interactions**       | UPDATE `purchase_tasks` SET `status = running`; SELECT task + store account + proxy |
| **External integrations** | Playwright browser automation against store websites                                |
| **State transitions**     | `queued` → `running`                                                                |

**Failure points:**

- `[BROKEN]` `TaskExecutor` and `TaskWorker` both register BullMQ Workers on the same queue — only `TaskExecutor` is started, but `TaskWorker` is dead code that still occupies the same queue name
- `[BROKEN]` Password decryption crashes — base64 is stored but AES-256-GCM decryption is called
- `[STUB]` All bot CSS selectors are guessed and untested — login, search, add-to-cart, and checkout interactions would fail against real store DOMs
- `[GAP]` No handling for CAPTCHAs, cookie consent banners, or SPA dynamic loading
- `[GAP]` `PokemonCenterBot` is not registered in `BotManager`

---

### Flow 8: Task Handles Monitoring State

| Aspect                | Detail                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Entry trigger**     | Watchlist item with monitoring enabled, or a task in `monitor` mode                                              |
| **Services**          | `MonitoringService` (BullMQ) **or** `ProductMonitor` (setInterval) — two competing architectures                 |
| **DB interactions**   | SELECT `user_watchlists` / `watchlist_items`; SELECT/UPDATE `products`; INSERT `product_alerts`, `price_history` |
| **State transitions** | Monitoring active → stock/price change detected → alert created                                                  |

**Failure points:**

- `[BROKEN]` The monitoring start and stop API routes each maintain their own `globalMonitor` variable — the stop route's instance is always `null`, so **monitoring can never be stopped** via the API
- `[BROKEN]` `MonitoringWorker` only creates a bot for Dreamland — all other stores return `null`
- `[NOT STARTED]` `WorkerManager` — which starts both `MonitoringService` and `ProductMonitor` — is **never invoked** anywhere; no entry point calls it
- `[GAP]` Dual watchlist table naming: API routes use `user_watchlists`; the `UnifiedProductManagement` component uses `watchlist_items`

---

### Flow 9: Task Attempts Checkout

| Aspect                    | Detail                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| **Entry trigger**         | `executeBotTask()` in `TaskExecutor` after `addToCart()` succeeds          |
| **Services**              | StoreBot `proceedToCheckout()`, `fillCheckoutInfo()`, `completePurchase()` |
| **DB interactions**       | None during checkout (only on completion)                                  |
| **External integrations** | Playwright against store checkout page                                     |
| **State transitions**     | Cart loaded → checkout initiated → fill info → complete purchase           |

**Failure points:**

- `[CRITICAL]` `fillCheckoutInfo()` is implemented in all 3 bots but **never called** by `TaskExecutor`
- `[CRITICAL]` `completePurchase()` is implemented in all 3 bots but **never called** by `TaskExecutor` — instead `TaskExecutor.ts:305-310` returns a fake `ORDER_` + timestamp and exits
- `[GAP]` Shipping profile data is never passed into the bot execution context
- `[GAP]` No payment method handling of any kind exists in the execution chain

---

### Flow 10: Order Succeeds or Fails Safely

| Aspect                | Detail                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Entry trigger**     | Bot execution completes (success or error)                                                              |
| **Services**          | `TaskExecutor` result handler                                                                           |
| **DB interactions**   | UPDATE `purchase_tasks` (status, `completed_at`, `error_message`); INSERT `purchase_history` on success |
| **State transitions** | `running` → `completed` or `running` → `failed`                                                         |

**Failure points:**

- `[FAKE]` Success always writes a fake order number (`ORDER_` + `Date.now()`) to `purchase_history` — no real order is ever placed
- `[BROKEN]` Stop/cancel only sets the DB status to `cancelled` — the active BullMQ job continues executing in the worker
- `[GAP]` No rollback on failure (e.g. no cart cleanup)
- `[GAP]` No retry with exponential backoff for transient failures

---

### Flow 11: Success/Failure is Logged & Surfaced

| Aspect                | Detail                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| **Entry trigger**     | Task status change                                                                                       |
| **Services**          | `console.log` in workers; Supabase Realtime on the frontend                                              |
| **DB interactions**   | `purchase_tasks` status updates propagate via Realtime; `task_logs` table exists but is never written to |
| **State transitions** | N/A                                                                                                      |

**Failure points:**

- `[BROKEN]` Workers only `console.log` — the `task_logs` table the Logs page queries is **always empty**
- `[BROKEN]` `ProductMonitor.sendStockAlert()` and `sendPriceAlert()` are `console.log` stubs — no notifications are ever sent from the worker
- `[GAP]` `NotificationService` exists but is never instantiated anywhere in the codebase
- `[GAP]` The email service works and has proper templates, but is only callable from a frontend hook — never from workers

---

### Flow 12: Analytics & Persistence Reflect Reality

| Aspect                | Detail                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Entry trigger**     | User views analytics or dashboard                                                                                                    |
| **Services**          | `analytics-dashboard.tsx`, `logs/page.tsx`                                                                                           |
| **DB interactions**   | Analytics: **none** (100% hardcoded mock data). Logs page: real queries on `purchase_tasks` but `averageExecutionTime` is hardcoded. |
| **State transitions** | N/A                                                                                                                                  |

**Failure points:**

- `[FAKE]` Analytics dashboard displays hardcoded data: 1,247 tasks, 87.3% success rate, €12,450.75 spent — all with January 2024 mock dates
- `[FAKE]` Monitoring dashboard stats are hardcoded: 156 products, 87.5% success, "2,847 products checked today"
- `[GAP]` No query exists to derive real analytics from `purchase_tasks` or `purchase_history`
- `[GAP]` `tasks_used` on `user_profiles` is never incremented — usage tracking is broken at the source, making plan enforcement impossible

---

## STEP 2 — GAP OVERLAY (Milestones → Flow)

### Milestone Items Mapped to Flow Steps

| Milestone Item                     | Flow Step | Status                                                    | Blocks Flow?                     |
| ---------------------------------- | --------- | --------------------------------------------------------- | -------------------------------- |
| User registration & login (M1)     | 1, 2      | Partial — dual Supabase clients, unprotected routes       | **YES**                          |
| Magic link auth (M1)               | 1         | Not started                                               | No                               |
| Data encryption (M1)               | 5         | Module exists but unused; base64 vs AES mismatch          | **YES** — crashes task execution |
| Stripe checkout + webhooks (M2)    | 3, 4      | Critically broken — wrong Supabase client in all 3 routes | **YES**                          |
| Subscription tier enforcement (M2) | 3, 4, 6   | Not implemented — display-only                            | No (for first order)             |
| Task creation wizard (M3)          | 6         | Working UI; broken API (competing workers, no auth)       | **YES**                          |
| Task execution worker (M3)         | 7         | Partially working; checkout is fake                       | **YES**                          |
| Bot implementations (M4)           | 7, 9      | 3 bots exist with untested selectors                      | **YES**                          |
| Product monitoring (M4)            | 8         | Two competing architectures; never started                | **YES**                          |
| Notification integration (M4)      | 11        | Email service works; never wired to workers               | No (for first order)             |
| Admin dashboard (M1)               | 12        | Exists; analytics are 100% mock data                      | No                               |
| Task logging (M3)                  | 11        | `task_logs` table never written to                        | **YES**                          |

### Critical Path Blockers (upstream → downstream)

1. **Stripe API routes use wrong Supabase client** → subscription activation silently fails → user stays on `free` tier forever
2. **Password encryption mismatch** (base64 stored, AES expected) → task execution crashes on credential decryption
3. **Checkout flow incomplete** (`fillCheckoutInfo` + `completePurchase` never called) → no real order is ever possible
4. **Bot selectors are untested** → even if checkout code ran, all DOM interactions would fail
5. **Competing BullMQ workers** in API routes and standalone worker → jobs randomly distributed, unpredictable execution
6. **Profile edit bug** → users can't update shipping profiles → checkout info can never be corrected
7. **Monitoring pipeline disconnected** → `WorkerManager` never started → no background monitoring runs
8. **`task_logs` never written** → Logs page always empty → zero visibility into what happened

---

## STEP 3 — "FIRST SUCCESSFUL ORDER" MILESTONE (Phase 1 North Star)

**Definition:** Sign up → Activate license → Create task → Execute bot → Complete 1 real checkout on Dreamland.

### Required Backend Endpoints

| Endpoint                                   | Current State                          | Required Fix                                                                              |
| ------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /api/stripe/create-checkout-session` | BROKEN — wrong client, no auth         | Switch to `supabaseServer`; add auth check; fix plan lookup                               |
| `POST /api/stripe/webhook`                 | BROKEN — wrong client, silent failures | Switch to service-role client; add error checking; fix tier update on subscription change |
| `POST /api/stripe/create-portal-session`   | BROKEN — wrong client, no auth         | Switch to `supabaseServer`; add auth check                                                |
| `POST /api/tasks/execute`                  | BROKEN — embedded worker, no auth      | Remove embedded `TaskExecutor`; add session auth; link shipping profile                   |
| `POST /api/tasks/[id]/stop`                | BROKEN — doesn't cancel BullMQ job     | Add BullMQ job cancellation                                                               |
| `GET /api/tasks/[id]`                      | Working                                | —                                                                                         |

### Required DB Tables (must be version-controlled)

| Table                 | Status                   | Required Action                                        |
| --------------------- | ------------------------ | ------------------------------------------------------ |
| `user_profiles`       | Exists in Supabase only  | Export and version-control                             |
| `subscription_plans`  | Exists in Supabase only  | Export — verify rows are matchable by plan name        |
| `purchase_tasks`      | Exists in Supabase only  | Export — verify `status` column has an enum constraint |
| `task_logs`           | Exists; never written to | Export + implement writes from `TaskExecutor`          |
| `shipping_profiles`   | Exists in Supabase only  | Export — fix update bug in profiles page               |
| `user_store_accounts` | Exists in Supabase only  | Export — fix password storage to use real encryption   |
| `stores`              | Exists in Supabase only  | Export — verify Dreamland row exists                   |
| `products`            | Exists in Supabase only  | Export                                                 |
| `proxies`             | Exists in Supabase only  | Export — fix password storage                          |
| `purchase_history`    | Exists in Supabase only  | Export                                                 |

### Required Validations

- [ ] Auth session verified server-side on all API routes (not `userId` from request body)
- [ ] `ProtectedRoute` on all authenticated pages
- [ ] Subscription tier checked before task creation
- [ ] `tasks_used` incremented on task creation and checked against plan limit
- [ ] Shipping profile linked to task record and accessible during execution
- [ ] Store account password properly encrypted and round-trip verifiable

### Required Task State Machine

```
     ┌───────────┐          ┌───────────┐
     │  queued   │─────────►│  running  │
     └─────┬─────┘          └─────┬─────┘
           │                      │
           │              ┌───────┴────────┐
           │              ▼                ▼
           │        ┌──────────┐    ┌──────────┐
           │        │completed │    │  failed  │
           │        └──────────┘    └──────────┘
           │
           ▼
     ┌───────────┐
     │ cancelled │
     └───────────┘
```

**Rules:**

- `queued` → `running` via worker pickup only — never a direct DB write from the frontend
- `running` → `completed` | `failed` via worker result only
- `queued` | `running` → `cancelled` via stop endpoint — must also cancel the BullMQ job
- No reverse transitions permitted

### Required Logging

- [ ] INSERT into `task_logs` on every state transition (`queued`, `running`, `completed`, `failed`, `cancelled`)
- [ ] INSERT into `task_logs` for each bot step (login, search, add-to-cart, checkout, error)
- [ ] INSERT into `purchase_history` with a real order number on successful checkout
- [ ] Error stack traces stored in `task_logs.details` (JSONB)

### Required Error Handling

- [ ] Bot init failure → status `failed`, log error, clean up Playwright browser
- [ ] Login failure → status `failed`, message: "authentication failed"
- [ ] Product not found → status `failed`, message: "product unavailable"
- [ ] Add-to-cart failure → status `failed`, message: "cart error"
- [ ] Checkout failure → status `failed`, message: "checkout error", attempt cart cleanup
- [ ] Network / timeout → retry with exponential backoff (max 3 attempts), then `failed`
- [ ] Supabase write failure → log to console as last resort — never swallow silently

---

## STEP 4 — SYSTEM CLASSIFICATION & RECOMMENDED ACTION

### Classification

> **FRAGMENTED PROTOTYPE**

Individual components exist — auth, Stripe, task wizard, bots, workers, monitoring, analytics — but they are **not connected into a working pipeline**. Critical integration joints are broken. Two competing implementations exist for multiple subsystems. The schema is not version-controlled. Mock data is surfaced as real data. 12 of 15 pages lack route protection. **No single path through the system produces a real result.**

This is not a vertical slice. It is a collection of horizontal layers, each partially built, with broken joints between them.

---

### Reordered Phase 1 Roadmap — Critical Path to First Successful Order

| #     | Step                                           | Flows      | Scope                                                                                                                                        |
| ----- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Fix Supabase client in all server API routes   | 2, 3, 4, 6 | Replace `supabaseClient` with `supabaseServer` in all Stripe and task routes; add session-based auth verification                            |
| **B** | Export and version-control the database schema | ALL        | Export all tables, columns, constraints, and RLS policies from Supabase into `schema.sql`                                                    |
| **C** | Fix password encryption pipeline               | 5, 7       | Replace `btoa()` in store-accounts and proxies with `encryptSensitiveData()`; fix `encryption.ts` to use `createCipheriv`; verify round-trip |
| **D** | Fix shipping profile edit bug                  | 5          | Change `user_profiles` → `shipping_profiles` on `profiles/page.tsx:163`                                                                      |
| **E** | Eliminate competing workers                    | 6, 7       | Remove `TaskExecutor` instantiation from API routes; routes only enqueue jobs; delete `TaskWorker.ts`                                        |
| **F** | Complete the checkout flow                     | 9, 10      | Wire `fillCheckoutInfo()` and `completePurchase()` into the execution chain; pass shipping profile context; remove fake order number         |
| **G** | Validate Dreamland bot selectors               | 7, 9       | Test `DreamlandBot` against the real Dreamland.be DOM; fix selectors; handle cookie consent                                                  |
| **H** | Implement `task_logs` writes                   | 11         | INSERT into `task_logs` on every state transition and bot step from `TaskExecutor`                                                           |
| **I** | Add `ProtectedRoute` to all dashboard pages    | 2          | Wrap every authenticated page                                                                                                                |
| **J** | Fix Stripe plan lookup                         | 3          | Align `planId` format between the pricing page and the `subscription_plans` table lookup                                                     |
| **K** | Fix layout dual-client issue                   | 2          | Remove `createPagesBrowserClient` from `layout.tsx`; use one consistent SSR-compatible client                                                |
| **L** | Implement subscription limit enforcement       | 6          | Check `tasks_used` < plan limit; increment `tasks_used` on task creation                                                                     |
