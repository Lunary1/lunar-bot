# LunarBot SaaS - AI Coding Instructions

## 🎯 Project Overview

This is a **Pokémon-focused SaaS shopping bot** that automates purchasing from Belgian stores (Dreamland, Mediamarkt, Fnac, etc.). Think StellarAIO but specialized for Pokémon products with real-time monitoring and auto-purchase capabilities.

## 🏗️ Architecture Overview

### Frontend-Backend Split

- **Frontend**: Next.js 14 with App Router, ShadCN/UI, TypeScript
- **Backend Workers**: Separate Node.js processes for bot automation (`src/workers/`)
- **API**: Next.js API routes in `src/app/api/` handle web requests
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)

### Key Service Boundaries

```
Frontend (Next.js) ↔ API Routes ↔ Supabase Database
                    ↕
                Redis Queue ↔ Worker Processes (Playwright bots)
```

## 🔧 Development Workflow

### Essential Commands

```bash
npm run dev          # Start Next.js frontend (port 3000)
npm run worker       # Start worker service for task execution
npm run dev:worker   # Start worker with hot reload
npm run type-check   # TypeScript validation
```

### Database Operations

- **Client-side**: Use `@/app/lib/supabaseClient` with RLS
- **Server-side**: Use `@/app/lib/supabaseServer` for elevated access
- **Auth Context**: `useAuthContext()` hook provides user/profile state
- **Profile Creation**: Auth hook auto-creates profiles if missing during login

## 🤖 Bot System Architecture

### Store Bot Pattern

All bots extend `src/bots/base/StoreBot.ts`:

```typescript
// Each store implements these core methods
class DreamlandBot extends StoreBot {
  async searchProduct(name: string): Promise<ProductInfo>;
  async addToCart(productId: string, quantity: number): Promise<BotResult>;
  async checkout(checkoutInfo: CheckoutInfo): Promise<BotResult>;
}
```

### Bot Management

- `BotManager.ts`: Orchestrates multiple bot instances
- `TaskExecutor.ts`: Processes queued tasks via Redis/BullMQ
- `MonitoringService.ts`: Schedules product monitoring jobs

## 📊 Data Flow Patterns

### Task Creation Flow

1. User creates task via `TaskCreationWizard` component
2. API route inserts into `purchase_tasks` table
3. `MonitoringService` schedules recurring checks
4. Worker processes execute via `TaskExecutor`

### Real-time Updates

- Supabase Realtime for live dashboard updates
- Socket.io integration in components for worker status
- Task logs stream to `task_logs` table with real-time subscriptions

## 🔐 Security & Auth Patterns

### Authentication Flow

- **Root Page (`/`)**: Always shows Landing Page (no auth required)
- **Landing Page**: Marketing page with "Sign In" button → redirects to `/login`
- **Login Page**: After successful auth → redirects to `/dashboard`
- **Protected Routes**: Use `<ProtectedRoute>` wrapper component for auth protection

### Data Access

- **Client Components**: Always use `supabaseClient` (RLS enforced)
- **API Routes**: Use `supabaseServer` for admin operations
- **Encryption**: Sensitive data (passwords, keys) encrypted before storage
- **Route Protection**: Wrap protected pages with `<ProtectedRoute>` component

## 🛠️ Component Patterns

### Dashboard Structure

- `AppSidebar`: Main navigation with subscription-aware features
- `Dashboard`: Central hub with task management and real-time updates
- Page-specific components in `src/app/[page]/page.tsx`

### Subscription Management

- Stripe integration via `src/lib/stripe.ts`
- **Subscription Tiers**: Free (5 tasks), Basic (€19.99, 50 tasks), Premium (€49.99, 200 tasks), Enterprise (€99.99, unlimited)
- Tier-based feature access throughout UI
- Usage tracking in `user_profiles.tasks_used` vs subscription plan limits

## 🔄 Queue System

### Task Processing

- **BullMQ + Redis**: Job queue for background processing
- **Worker Types**: Monitoring, scraping, purchasing
- **Job Data**: Include `user_id`, `product_id`, `store_account_id`

### Monitoring Pattern

```typescript
// Schedule recurring monitoring for watchlist items
await monitoringQueue.add(
  "monitor-product",
  {
    watchlistItemId,
    productId,
    userId,
  },
  { repeat: { every: 30000 } }
); // 30 seconds
```

## 📁 Key Directory Structure

### Core Business Logic

- `src/bots/`: Store-specific automation (Playwright-based)
- `src/workers/`: Background job processors
- `src/services/`: Business logic services (monitoring, notifications)

### UI Components

- `src/components/ui/`: ShadCN base components
- `src/components/`: Feature-specific components (task-creation-wizard, etc.)
- `src/app/`: Next.js App Router pages and API routes

### Configuration

- `env.example`: Required environment variables
- `PROJECT_PLAN.md`: Comprehensive feature roadmap and database schema
- `docs/`: Implementation guides and milestone summaries

## 🚨 Critical Integrations

### External Dependencies

- **Playwright**: Browser automation for store interactions
- **Stripe**: Payment processing and subscription management
- **Redis**: Task queue and caching
- **Supabase**: Auth, database, and real-time subscriptions

### API Endpoint Patterns

- `src/app/api/tasks/`: Task CRUD operations
- `src/app/api/monitoring/`: Start/stop monitoring services
- `src/app/api/stripe/`: Payment and subscription webhooks
- `src/app/api/products/scrape/`: Product discovery and import

## 💡 Development Tips

### Database Schema

**Core Tables (All use UUIDs with `gen_random_uuid()`):**

- `user_profiles`: Subscription tiers, Stripe integration, role-based access
- `stores`: 12 Belgian stores configured (Dreamland, ToyChamp, Mediamarkt, etc.)
- `products`: Store-specific product catalog with availability tracking
- `purchase_tasks`: Task queue with status tracking (queued→running→completed/failed)
- `user_watchlists`: Product monitoring with auto-purchase settings
- `task_logs`: Comprehensive logging with metadata JSONB field
- `subscription_plans`: 4 tiers (Free: 5 tasks, Basic: 50, Premium: 200, Enterprise: unlimited)

**RLS Policies**: All user-scoped tables enforce `user_id` matching for access

**Supported Stores:**

- **No Proxy Required**: Dreamland, ToyChamp, Mediamarkt, Fnac, Game Mania, Coolblue
- **Proxy Required**: Bol.com, Carrefour, Colruyt, Delhaize

### Error Handling

- Bot operations return `BotResult` with success/error states
- API routes follow consistent error response format
- Task failures logged to `task_logs` table with stack traces
- Purchase history tracks completed orders with order numbers

### Testing Store Integrations

- Use `npm run test` for Playwright tests
- Test bots against real stores in development mode
- Proxy rotation handled in `BotManager` for anti-detection
- Monitor success rates via `proxies.success_rate` field
