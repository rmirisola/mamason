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
| Zinc API (v1) | Automated Amazon purchasing | Basic auth (base64) | `ZINC_MOCK=true` |
| Binance Pay | USDT payments | HMAC-SHA512 signed requests | `BINANCE_MOCK=true` |
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
└── orders[] → Order

Order
├── id (cuid)
├── customerEmail
├── asin
├── productTitle
├── productPrice (what we charge the customer)
├── productImage
├── productWeight
├── merchantTradeNo (unique, Binance Pay reference)
├── paymentStatus: "pending" | "paid" | "failed"
├── zincOrderId (Zinc's request_id)
├── zincStatus: null | "pending" | "in_progress" | "order_placed" | "shipped" | "delivered" | "failed"
├── userId → User
├── createdAt
└── updatedAt
```

## Order Lifecycle

### State Machine

```
                    ┌─────────────┐
                    │   CREATED   │
                    │ payment:    │
                    │  pending    │
                    │ zinc: null  │
                    └──────┬──────┘
                           │
                    payment webhook
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     ┌────────────────┐       ┌─────────────────┐
     │  PAYMENT FAIL  │       │  PAID           │
     │  (never set —  │       │  payment: paid  │
     │   see issues)  │       │  zinc: null     │
     └────────────────┘       └────────┬────────┘
                                       │
                                 create zinc order
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
                 ┌─────────────────┐      ┌─────────────────┐
                 │  ZINC CREATED   │      │  ZINC FAILED    │
                 │  zinc: pending  │      │  zinc: failed   │
                 │  zincOrderId ✓  │      │  zincOrderId ✗  │
                 └────────┬────────┘      └────────┬────────┘
                          │                        │
                     zinc polling              admin retry
                          │                        │
                          ▼                        └──→ (back to create zinc)
                 ┌─────────────────┐
                 │  PROCESSING     │
                 │  zinc:          │
                 │   in_progress   │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  ORDERED        │
                 │  zinc:          │
                 │   order_placed  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  SHIPPED        │
                 │  zinc: shipped  │
                 │  tracking ✓     │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  AT WAREHOUSE   │
                 │  zinc: delivered│
                 └────────┬────────┘
                          │
                     (future: OWC handoff)
                          │
                          ▼
                 ┌─────────────────┐
                 │  DELIVERED      │
                 │  (not yet       │
                 │   implemented)  │
                 └─────────────────┘
```

### State Transitions

| From | Event | To | Handler |
|------|-------|----|---------|
| — | User clicks Pay | `payment:pending, zinc:null` | `POST /api/payment/create` |
| `payment:pending` | Binance webhook confirms | `payment:paid` | `POST /api/payment/webhook` |
| `payment:paid, zinc:null` | Zinc order created | `zinc:pending` | `POST /api/payment/webhook` (same request) |
| `payment:paid, zinc:null` | Zinc creation fails | `zinc:failed` | `POST /api/payment/webhook` (catch block) |
| `zinc:failed` | Admin retries | `zinc:pending` | `POST /api/admin/orders/retry` |
| `zinc:pending` | Zinc polling | `zinc:in_progress` | `GET /api/order/[orderId]` |
| `zinc:in_progress` | Zinc polling | `zinc:order_placed` | `GET /api/order/[orderId]` |
| `zinc:order_placed` | Zinc polling | `zinc:shipped` | `GET /api/order/[orderId]` |
| `zinc:shipped` | Zinc polling | `zinc:delivered` | `GET /api/order/[orderId]` |

## Known Issues

### High Severity

**1. Webhook idempotency race condition**
If Binance sends the webhook twice concurrently, the second call sees `paymentStatus: "paid"` and returns early. If the first call's Zinc order creation fails, the order is stuck with `paid` + `zinc:failed` + no automatic recovery. Fix: use a DB transaction with row locking or an idempotency key.

**2. Paid order with no Zinc order is invisible to user**
When Zinc creation fails after payment, the order shows `payment:paid` + `zinc:failed` with no `zincOrderId`. The order status UI doesn't handle this — it shows a broken/empty progress bar. User has no way to know what happened or take action. Fix: show error state in UI, auto-retry Zinc, or notify admin.

**3. Order status UI doesn't handle "failed" state**
`OrderStatusDisplay` has a fixed list of steps that doesn't include "failed". When `zincStatus` is `"failed"` or `null`, `findIndex` returns -1, showing nothing. Fix: add error state rendering.

### Medium Severity

**4. `paymentStatus: "failed"` is defined but never written**
No code path sets `paymentStatus` to `"failed"`. Abandoned payments stay `"pending"` forever. Fix: add a payment timeout (e.g. 30 min) via cron or webhook.

**5. No payment expiry**
The `/pay` page polls every 3 seconds indefinitely. No timeout, no backoff. If a user abandons the payment page, the order sits as `pending` forever. Fix: expire payments after a timeout and show "payment expired" state.

**6. Zinc status updates not persisted**
The `GET /api/order/[orderId]` route polls the Zinc API for current status but never writes the result back to the DB. The DB `zincStatus` only gets set during order creation or admin retry. This means admin dashboard shows stale data unless the user's order page happens to be polling. Fix: write Zinc status updates back to DB on each poll.

### Low Severity

**7. Polling has no backoff**
Both the pay page (3s) and order page (30s) poll at fixed intervals. No exponential backoff, no circuit breaker. Could cause load issues at scale.

**8. Mock mode security**
In mock mode, any request to `/api/payment/webhook?mock=true&merchantTradeNo=X` triggers payment confirmation. Fine for dev, but `BINANCE_MOCK` must never be `true` in production.

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

### Price Estimation vs Actual Cost

Estimates are shown pre-checkout but actual Zinc costs can differ:
- **Amazon shipping**: unpredictable without Prime. With Prime = $0.
- **Tax**: estimated at 7%, actual may vary slightly.
- **OWC shipping**: based on product dimensions (not package), padded with 0.5"/side + 1.5x volume factor.

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
| `/` | Public | Home — paste Amazon URL |
| `/buy/[asin]` | Public (login for checkout) | Shareable product page |
| `/product` | Public (legacy) | Product page via sessionStorage |
| `/pay` | Logged in | Binance Pay QR + polling |
| `/order/[orderId]` | Public | Order tracking |
| `/orders` | Logged in | User's order history |
| `/admin` | Admin | Order management dashboard |

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/product` | GET | Public | Fetch product data from Rainforest |
| `/api/product/estimate` | GET | Public | Price estimate (Zinc + OWC + tax) |
| `/api/shipping/estimate` | GET | Public | OWC shipping estimate only |
| `/api/payment/create` | POST | Logged in | Create order + Binance Pay session |
| `/api/payment/webhook` | POST/GET | Binance/Mock | Payment confirmation |
| `/api/order/[orderId]` | GET | Public | Order status (polls Zinc) |
| `/api/dev/order` | POST | Logged in | Skip payment (dev only) |
| `/api/admin/orders` | GET | Admin | List all orders |
| `/api/admin/orders/[orderId]` | GET | Admin | Order details + Zinc + OWC |
| `/api/admin/orders/retry` | POST | Admin | Retry failed Zinc order |

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Auth0Provider + Navbar
│   ├── page.tsx                # Home page
│   ├── buy/[asin]/page.tsx     # Shareable product page
│   ├── product/page.tsx        # Legacy product page
│   ├── pay/page.tsx            # Payment QR page
│   ├── order/[orderId]/page.tsx # Order tracking
│   ├── orders/page.tsx         # User order history
│   ├── admin/page.tsx          # Admin dashboard
│   └── api/
│       ├── product/
│       │   ├── route.ts        # Fetch product from Rainforest
│       │   └── estimate/route.ts # Price estimate
│       ├── shipping/
│       │   └── estimate/route.ts # OWC shipping estimate
│       ├── payment/
│       │   ├── create/route.ts # Create order + payment
│       │   └── webhook/route.ts # Payment confirmation
│       ├── order/
│       │   └── [orderId]/route.ts # Order status
│       ├── dev/
│       │   └── order/route.ts  # Dev: skip payment
│       └── admin/
│           └── orders/
│               ├── route.ts    # List orders
│               ├── [orderId]/route.ts # Order details
│               └── retry/route.ts # Retry failed order
├── components/
│   ├── navbar.tsx              # Nav with auth state
│   ├── url-input.tsx           # Amazon URL input
│   ├── product-card.tsx        # Product display + shipping estimate
│   ├── price-breakdown.tsx     # Full price breakdown pre-payment
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
│   ├── owc-shipping.ts         # OWC shipping cost calculation
│   ├── restricted-products.ts  # Product restriction rules
│   ├── warehouse.ts            # Weston, FL warehouse address
│   ├── types.ts                # Shared types
│   ├── test-products.ts        # Test product URLs
│   └── amazon-categories.json  # Amazon category tree (12k nodes)
└── middleware.ts                # Auth0 middleware
```

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
BINANCE_API_KEY=
BINANCE_SECRET_KEY=

# Admin
ADMIN_EMAILS=              # comma-separated

# Mock Modes
ZINC_MOCK=true
BINANCE_MOCK=true
RAINFOREST_MOCK=true
```
