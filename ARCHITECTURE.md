# Mamazon Architecture

## Overview

Mamazon is a purchasing service that allows customers in Venezuela to buy products from Amazon US. Products are shipped to a warehouse in Weston, FL and then forwarded to Venezuela via One Way Cargo.

**Stack:** Next.js 16 (App Router), TypeScript, Prisma, PostgreSQL, Tailwind CSS 4

## System Flow

```
Customer → Mamazon → Zinc API → Amazon
                                   ↓
                              Weston, FL warehouse
                                   ↓
                              One Way Cargo → Customer in Venezuela
```

## Third-Party Integrations

| Service | Purpose | Auth | Mock Mode |
|---------|---------|------|-----------|
| Rainforest API | Product data (price, weight, categories, images) | API key in query param | `RAINFOREST_MOCK=true` |
| Zinc API (bizapi) | Automated Amazon purchasing via ZMA Prime | Basic auth (base64) | `ZINC_MOCK=true` |
| Stripe | Payments (card + USDC) | Secret key + webhook signature | Test keys in dev |
| Binance Pay (legacy) | USDT payments | HMAC-SHA512 signed requests | `BINANCE_MOCK=true` |
| One Way Cargo | FL → Venezuela shipping | N/A (rate calculation only) | N/A |
| Auth0 | User authentication | OAuth2/OIDC via SDK | Required |
| BCV (pydolarve.org) | Bolivar exchange rate for OWC pricing | None | Fallback to hardcoded rate |

## Data Model

```
User
├── id (cuid)
├── auth0Id (unique)
├── email (unique)
├── name
├── orders[] → Order
└── checkoutSessions[] → CheckoutSession

CheckoutSession
├── id (cuid)
├── userId → User
├── customerEmail
├── asin
├── productTitle
├── productPrice
├── productImage
├── productWeight
├── paymentProvider: BINANCE | STRIPE
├── providerRef (unique)    # merchantTradeNo (Binance)
├── checkoutUrl
├── qrContent
├── status: pending | paid | expired
├── expiresAt               # 30-minute TTL
├── orderId → Order (unique, set on payment confirmation)
├── createdAt
└── updatedAt

Order
├── id (cuid)
├── userId → User
├── customerEmail
├── asin
├── productTitle
├── productPrice
├── productImage
├── productWeight
├── paymentProvider: BINANCE | STRIPE
├── paymentRef (unique)     # copied from CheckoutSession.providerRef
├── paidAt
├── zincOrderId
├── status: OrderStatus enum (see state machine)
├── webhookLogs[] → WebhookLog
├── checkoutSession → CheckoutSession
├── createdAt
└── updatedAt

WebhookLog
├── id (cuid)
├── source              # "zinc" | "stripe"
├── orderId → Order (optional)
├── payload (JSON)      # full webhook payload
└── createdAt
```

## Checkout Flow

The checkout is a two-model pipeline: `CheckoutSession` → `Order`.

1. User views product on `/buy/[asin]` — price estimate fetched automatically
2. User clicks "Pagar $X" — `POST /api/checkout/create` creates a `CheckoutSession` + Stripe Checkout Session
3. User redirected to `/pay/[sessionId]` → clicks "Pagar con Stripe" → redirected to Stripe hosted checkout
4. Payment on Stripe (card or USDC) → Stripe redirects to `/api/checkout/[sessionId]/success` + sends webhook to `/api/stripe/webhook`
5. `handlePaymentConfirmed()` atomically creates an `Order` and marks session `paid`
6. Zinc order placed automatically after payment — if it fails, order stays at `created` for admin retry

### Checkout Recovery

If the user navigates away from `/pay/[sessionId]`:
- A `<PendingCheckoutBanner />` on the home page and buy page shows the most recent pending session with a "Resume Payment" link
- The `/orders` page shows a "Pending Payments" section above the orders list
- `POST /api/checkout/create` deduplicates: if a pending+unexpired session exists for the same ASIN, it returns the existing session ID
- Users can cancel a session from the pay page via `POST /api/checkout/[sessionId]/cancel`

## Order Lifecycle

### State Machine

```
                    ┌─────────────┐
                    │   CREATED   │
                    │ (payment    │
                    │  confirmed) │
                    └──────┬──────┘
                           │
                     Zinc order placed
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     ┌────────────────────┐    ┌─────────────────┐
     │ FULFILLMENT_FAILED │    │ FULFILLMENT_     │
     │ (Zinc create fail) │    │ PENDING          │
     └────────┬───────────┘    │ (zincOrderId ✓)  │
              │                └────────┬─────────┘
         admin retry                    │
              │                    Zinc polling
              └──→ (back to             │
                   Zinc create)         ▼
                              ┌─────────────────┐
                              │ ORDERING_FROM_   │
                              │ AMAZON           │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ ORDERED_ON_      │
                              │ AMAZON           │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ SHIPPED_TO_      │
                              │ WAREHOUSE        │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ RECEIVED_AT_     │
                              │ WAREHOUSE        │
                              └────────┬─────────┘
                                       │
                                  OWC handoff
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ SHIPPED_TO_      │
                              │ VENEZUELA        │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ IN_TRANSIT_      │
                              │ VENEZUELA        │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   DELIVERED      │
                              └─────────────────┘
```

### State Transitions

| From | Event | To | Handler |
|------|-------|----|---------|
| — | Payment confirmed | `created` | `handlePaymentConfirmed()` in `lib/payment.ts` |
| `created` | Zinc order placed | `fulfillment_pending` | `handlePaymentConfirmed()` |
| `created` | Zinc creation fails | `fulfillment_failed` | `handlePaymentConfirmed()` |
| `fulfillment_failed` | Admin retry | `fulfillment_pending` | `POST /api/admin/orders/retry` |
| `fulfillment_pending` | Zinc webhook/polling | `ordering_from_amazon` | `POST /api/zinc/webhook` or `GET /api/order/[orderId]` |
| `ordering_from_amazon` | Zinc webhook/polling | `ordered_on_amazon` | `POST /api/zinc/webhook` or `GET /api/order/[orderId]` |
| `ordered_on_amazon` | Zinc webhook/polling | `shipped_to_warehouse` | `POST /api/zinc/webhook` or `GET /api/order/[orderId]` |
| `shipped_to_warehouse` | Zinc webhook/polling | `received_at_warehouse` | `POST /api/zinc/webhook` or `GET /api/order/[orderId]` |
| `received_at_warehouse` | Admin | `shipped_to_venezuela` | `POST /api/admin/orders/status` |
| `shipped_to_venezuela` | Admin | `in_transit_venezuela` | `POST /api/admin/orders/status` |
| `in_transit_venezuela` | Admin | `delivered` | `POST /api/admin/orders/status` |

### Zinc Status Updates

**Primary: Zinc webhooks.** Orders are created with `webhooks.status_updated` pointing to `/api/zinc/webhook`. Zinc POSTs the full order response on every status change. The webhook handler updates the order status in the DB and will trigger email notifications.

**Fallback: Polling.** The order detail pages (`GET /api/order/[orderId]` and `GET /api/admin/orders/[orderId]`) still poll Zinc on view. This catches any missed webhooks.

### Webhook Logging

All webhook payloads (Zinc and Stripe) are stored in the `WebhookLog` table with source, orderId, and full JSON payload. This provides an audit trail and helps debug integration issues.

### Payment Idempotency

`handlePaymentConfirmed()` has three layers:
1. If session is already `paid` with an `orderId`, return it
2. Order creation + session update in a `$transaction`
3. If `paymentRef` unique constraint violation, look up existing order

## Pricing Model

Customer pays:

```
  Amazon product price
+ Amazon shipping (free with Prime, ~$5-8 without)
+ FL sales tax (7% — Broward County)
+ OWC air shipping to Venezuela (rate per lb or volumetric, whichever higher)
+ Service fee ($1.00 — Zinc fee)
─────────────────────────────
= Total (charged in USDT via Binance Pay)
```

### OWC Shipping Calculation

```
actual_weight = parse product weight from Rainforest
volumetric_weight = (L + 1)(W + 1)(H + 1) × 1.5 / 166
  where L, W, H are product dimensions + 0.5" padding per side
final_weight = max(actual_weight, volumetric_weight)

rate = 3,901 Bs/lb (central VE) or 4,920 Bs/lb (rest of country)
handling = 842 Bs

shipping_usd = (final_weight × rate + handling) / bcv_rate
```

Currently defaults to central region rates. BCV rate fetched from pydolarve.org (cached 1 hour).

### Price Estimation

The full price breakdown (product + tax + Amazon shipping + OWC shipping + service fee) is fetched via `GET /api/product/estimate` and displayed inline on the product card before the user clicks "Pay".

The `max_price` sent to Zinc is set at `productPrice × 1.1` (10% buffer). If Amazon's actual total exceeds this, the order fails with `max_price_exceeded`.

## Product Restrictions

Products are checked against shipping restrictions before allowing checkout.

**Sources:**
- One Way Cargo prohibited items list
- Amazon freight forwarder shipping restrictions

**Check order:**
1. Blocked categories (weapons, drones, hazmat, jewelry, perishables, digital)
2. Blocked keywords in title/bullets/specs (knife, lithium battery, aerosol, etc.)
3. Blocked specs (e.g. "Battery Type: Lithium")
4. Flagged categories — OWC special import regime (electronics, phones, beauty, supplements, clothing)

Returns: `allowed`, `blocked` (with reason), or `flagged` (with warning).

Blocked products show the product card with an error message. Flagged products show a yellow warning but allow checkout. Products with unparseable weight are blocked from checkout (can't estimate shipping).

## Authentication

Auth0 (Regular Web App) with `@auth0/nextjs-auth0` v4.

- Middleware on all routes handles session management
- Auth0 env vars are required — app fails without them
- `/auth/login`, `/auth/logout`, `/auth/callback` auto-mounted by SDK
- `getCurrentUser()` upserts a `User` record from the Auth0 session
- Checkout requires login — no guest checkout
- Admin access controlled by `ADMIN_EMAILS` env var (comma-separated)

## Route Map

### Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Home — paste Amazon URL, pending checkout banner |
| `/buy/[asin]` | Public (login for checkout) | Product page with inline price breakdown |
| `/pay/[sessionId]` | Logged in | Binance Pay QR + polling + cancel button |
| `/order/[orderId]` | Public | Order tracking |
| `/orders` | Logged in | Pending payments + order history |
| `/admin` | Admin | Order management dashboard |

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/product` | GET | Public | Fetch product data from Rainforest |
| `/api/product/estimate` | GET | Public | Price estimate (Zinc + OWC + tax) |
| `/api/shipping/estimate` | GET | Public | OWC shipping estimate only |
| `/api/checkout/create` | POST | Logged in | Create checkout session (deduplicates by ASIN) |
| `/api/checkout/pending` | GET | Logged in | List user's pending unexpired sessions |
| `/api/checkout/[sessionId]` | GET | Public | Checkout session status |
| `/api/checkout/[sessionId]/cancel` | POST | Logged in | Cancel a pending session |
| `/api/checkout/[sessionId]/mock-pay` | POST | Dev | Simulate payment confirmation |
| `/api/stripe/webhook` | POST | Stripe | Stripe payment webhook |
| `/api/checkout/[sessionId]/success` | GET | Public | Stripe success redirect → verifies payment → redirects to order |
| `/api/payment/webhook` | POST | Binance | Payment confirmation webhook (legacy) |
| `/api/order/[orderId]` | GET | Public | Order status (polls Zinc) |
| `/api/zinc/webhook` | POST | Public | Zinc order status webhook |
| `/api/dev/order` | POST | Admin | Skip payment (dev only) |
| `/api/dev/simulate-zinc-webhook` | POST | Admin | Simulate Zinc webhook for testing |
| `/api/admin/orders` | GET | Admin | List all orders |
| `/api/admin/orders/[orderId]` | GET | Admin | Order details + Zinc + OWC |
| `/api/admin/orders/retry` | POST | Admin | Retry failed Zinc order |
| `/api/admin/orders/status` | POST | Admin | Update order status |

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Auth0Provider + Navbar
│   ├── page.tsx                # Home page + pending checkout banner
│   ├── buy/[asin]/page.tsx     # Product page with inline price breakdown
│   ├── pay/[sessionId]/page.tsx # Payment QR + cancel button
│   ├── order/[orderId]/page.tsx # Order tracking
│   ├── orders/page.tsx         # Pending payments + order history
│   ├── admin/page.tsx          # Admin dashboard
│   └── api/
│       ├── product/
│       │   ├── route.ts        # Fetch product from Rainforest
│       │   └── estimate/route.ts # Price estimate
│       ├── shipping/
│       │   └── estimate/route.ts # OWC shipping estimate
│       ├── checkout/
│       │   ├── create/route.ts # Create session (with dedup)
│       │   ├── pending/route.ts # List pending sessions
│       │   └── [sessionId]/
│       │       ├── route.ts    # Session status
│       │       ├── cancel/route.ts # Cancel session
│       │       └── mock-pay/route.ts # Dev: simulate payment
│       ├── payment/
│       │   └── webhook/route.ts # Binance webhook
│       ├── order/
│       │   └── [orderId]/route.ts # Order status
│       ├── dev/
│       │   └── order/route.ts  # Dev: skip payment
│       └── admin/
│           └── orders/
│               ├── route.ts    # List orders
│               ├── [orderId]/route.ts # Order details
│               ├── retry/route.ts # Retry failed order
│               └── status/route.ts # Update order status
├── components/
│   ├── navbar.tsx              # Nav with auth state
│   ├── url-input.tsx           # Amazon URL input
│   ├── product-card.tsx        # Product display + price breakdown + pay button
│   ├── pending-checkout-banner.tsx # Pending session recovery banner
│   ├── payment-qr.tsx          # Binance Pay QR code
│   └── order-status.tsx        # Order progress steps
├── lib/
│   ├── auth0.ts                # Auth0 client
│   ├── admin.ts                # Admin email check
│   ├── user.ts                 # getCurrentUser() from session
│   ├── db.ts                   # Prisma client singleton
│   ├── asin.ts                 # ASIN extraction from URLs
│   ├── rainforest.ts           # Rainforest API + restriction check
│   ├── zinc.ts                 # Zinc API (create, get, estimate)
│   ├── binance.ts              # Binance Pay API + webhook verification
│   ├── payment.ts              # handlePaymentConfirmed() — session → order
│   ├── order-state.ts          # Order state machine + Zinc status mapping
│   ├── owc-shipping.ts         # OWC shipping cost calculation
│   ├── restricted-products.ts  # Product restriction rules
│   ├── warehouse.ts            # Weston, FL warehouse address
│   ├── types.ts                # Shared types
│   ├── test-products.ts        # Test product URLs
│   └── amazon-categories.json  # Amazon category tree (12k nodes)
└── middleware.ts                # Auth0 middleware
```

## Deployment

### Infrastructure (GCP)

| Resource | Service | Details |
|----------|---------|---------|
| App | Cloud Run | Service `lopido`, `us-central1`, port 8080 |
| Database | Cloud SQL | PostgreSQL 15, instance `lopido-db`, `us-central1` |
| Images | Artifact Registry | `us-central1-docker.pkg.dev/lopido-prod/lopido/app` |
| Secrets | Secret Manager | All API keys and credentials |
| GCP Project | `lopido-prod` | |

### Docker

Multi-stage Dockerfile with 4 targets:

- **deps** — `npm ci` (cached layer)
- **builder** — Prisma generate + Next.js build
- **migrator** — Prisma CLI + migration files (for CI)
- **runner** — Standalone Next.js server, non-root user (`nextjs`)

### CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main`:

1. Authenticate to GCP via Workload Identity Federation (keyless)
2. Build & push Docker image to Artifact Registry
3. Run Prisma migrations via Cloud SQL Proxy on the runner
4. Deploy new revision to Cloud Run

**GitHub Secrets:**
- `WIF_PROVIDER` / `WIF_SERVICE_ACCOUNT` — GCP auth
- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — migration connection

### Zinc Bizapi

Orders are placed via Zinc's ZMA bizapi flow (undocumented, obtained via support). Key differences from standard ZMA:

- `addax: true` + `zma_flags: ["bizapi", "bizapi-only"]` in request body
- No `retailer_credentials`, `payment_method`, or `billing_address`
- Free Prime shipping, no queue, no rate limits
- Returns/cancellations via case system (not fully automated)

## Environment Variables

```
# Required
DATABASE_URL=postgresql://...
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=              # openssl rand -hex 32
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# API Keys
RAINFOREST_API_KEY=
ZINC_API_KEY=
STRIPE_SECRET_KEY=       # sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=   # whsec_...
BINANCE_API_KEY=         # legacy
BINANCE_SECRET_KEY=      # legacy

# Admin
ADMIN_EMAILS=              # comma-separated

# Mock Modes
ZINC_MOCK=true
BINANCE_MOCK=true
RAINFOREST_MOCK=true
```

### Production (Cloud Run)

Secrets are stored in GCP Secret Manager and mounted as env vars. Non-sensitive config (`APP_BASE_URL`, `ADMIN_EMAILS`, mock flags) are set as plain env vars.

Production DATABASE_URL uses Cloud SQL socket: `postgresql://user:pass@localhost/lopido?host=/cloudsql/lopido-prod:us-central1:lopido-db`
