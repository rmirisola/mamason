# Mamazon - Product Requirements Document

## Overview

Mamazon delivers anything you buy online to your door in Venezuela. We handle purchasing, shipping to our Florida warehouse, and forwarding to your door.

**Core value prop**: Buy anything online, delivered to your door in Venezuela — no casillero, no hassle.

## Business Model

### How it works

1. Customer pastes an Amazon product URL
2. Customer pays in USDT via Binance Pay
3. We purchase the product on Amazon via Zinc API → ships to Florida warehouse
4. One Way Cargo delivers from Florida to Venezuela
5. Customer receives at their door

### Revenue

- **Service fee**: % of product price (TBD, min $5)
- **Shipping markup**: margin on the One Way Cargo leg

### Competitive Landscape

| Competitor | Model | Scale |
|-----------|-------|-------|
| Aeropost | Full marketplace, URL paste, auto-quoting | $89M revenue, 38 countries |
| Liberty Express | Casillero + purchase agent | Major VE presence |
| ZOOM | Casillero, air + maritime | 280+ offices in VE |
| Tealca | Casillero, US authorized outlets | Strong brand |
| Encarguelo | Purchase agent, all-inclusive pricing | 10+ years |
| Metraigo | "Buy for you" agent model | Mid-size |

Most competitors use manual purchasing. None offer crypto payments. Aeropost is the tech leader but not VE-focused.

---

## Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Amazon product data**: Rainforest API (product details, price, weight) + ASIN extraction from URLs
- **Purchasing automation**: Zinc API via ZMA bizapi (Prime shipping, no queue)
- **Payments**: Binance Pay (USDT)
- **VE last-mile shipping**: One Way Cargo (Florida → Venezuela)

---

## Alpha — Internal Testing (IN PROGRESS)

**Goal**: Prove the full purchase pipeline works. Paste URL → pay → product arrives at Florida warehouse. Internal only.

**What's built**:

1. **Paste Amazon URL** — ASIN extraction from any Amazon URL format, shareable `/buy/[asin]` pages
2. **Full price breakdown** — Inline on product card: product + Amazon shipping + FL tax + OWC shipping + service fee, fetched automatically
3. **Payment via Binance Pay** — USDT checkout with QR code, webhook verification, 30-min session TTL, mock mode for dev
4. **Order placement via Zinc API** — Automated Amazon purchasing to Weston FL warehouse, 10% max_price buffer
5. **Order tracking** — Full state machine: created → fulfillment → ordering → ordered → shipped → warehouse → VE transit → delivered
6. **User accounts** — Auth0 login, order history, checkout session recovery
7. **Product restrictions** — Only Prime-eligible products allowed (non-Prime and no-buybox blocked)
8. **OWC shipping estimation** — Weight-based and volumetric pricing using BCV exchange rate
9. **Checkout recovery** — Pending checkout banners, session dedup per ASIN, cancel from pay page
10. **Admin dashboard** — Order list, status updates, Zinc retry for failed fulfillment
11. **Security** — Webhook signature verification, POST-only mock-pay with auth, payment idempotency (3 layers)

**Remaining to complete Alpha**:
- [x] Set up Zinc Managed Account (ZMA) with bizapi flow and fund it
- [x] Test a real Zinc order end-to-end (product actually purchased and shipped to warehouse)
- [ ] Test real Binance Pay flow end-to-end (QR scan → USDT payment → webhook confirmation)
- [x] Production environment setup
  - [x] Hosting / deployment — Cloud Run (`lopido-prod` GCP project)
  - [x] Production PostgreSQL database — Cloud SQL
  - [x] Production env vars — secrets in GCP Secret Manager
  - [x] CI/CD — GitHub Actions (build, migrate, deploy on push to `main`)
  - [ ] Configure Binance Pay webhook URL to point to production domain
  - [ ] Custom domain (lopido.app)
  - [ ] Logging and error monitoring

**Done when**: Paste a URL, pay with real Binance, Zinc places the Amazon order, package arrives at the Florida warehouse.

---

## Failure Modes & Recovery

Real money is involved after payment confirmation, so every failure path needs a clear response. Below are the known failure modes and how we handle them in Alpha (manual/admin-driven) vs Beta (automated).

### 1. Payment confirmed but Zinc order fails

**Causes**: Zinc API down, insufficient ZMA balance, invalid request payload.

- **Alpha**: Admin retries from dashboard. If unrecoverable, refund via Binance Pay refund API.
- **Beta**: Auto-retry with exponential backoff, then auto-refund + notify customer.

### 2. Amazon cancels / Zinc order fails mid-flight

**Causes**: `max_price_exceeded`, `out_of_stock`, `payment_method_declined`, `card_declined`, etc.

- **Alpha**: Admin sees Zinc error code in dashboard, decides to retry or refund.
- **Beta**: Categorize errors into retryable vs non-retryable. Auto-retry retryable errors; auto-refund non-retryable ones with customer notification.

### 3. `max_price_exceeded` — Amazon price higher than estimate

Amazon price increased between quote and purchase, exceeding the 10% `max_price` buffer.

- **Alpha**: Eat the difference if small, or refund if too large. Admin judgment call.
- **Beta**: Notify customer with updated price, let them confirm or cancel for full refund.

### 4. Product can't be shipped to Venezuela

Product passes our restriction check but OWC rejects it at warehouse (e.g., undeclared hazmat, size/weight limits).

- **Alpha**: Admin refunds via Binance Pay. Return product to Amazon if possible.
- **Beta**: Admin marks order as "unshippable", triggers auto-refund + customer notification.

### 5. Actual shipping weight/cost higher than estimate

Real package weight differs from Rainforest API data (packaging, accessories, etc.).

- **Alpha**: Eat the difference. Low volume makes this acceptable risk.
- **Beta**: Eat small diffs (<$5). For larger diffs, hold package and request upcharge confirmation from customer. If customer declines, return to Amazon and refund.

### 6. Webhook never arrives (payment made but we don't know)

**Causes**: Binance webhook misconfigured, app down during callback, network issue.

- **Alpha**: Add Binance Pay order query endpoint for admin to manually verify payment status. Poll Binance for pending sessions as safety net.
- **Beta**: Automated reconciliation — periodically query Binance for all pending sessions and match against orders.

### 7. Customer pays after session expired

Customer scans QR code after the 30-minute TTL. Binance accepts the payment but our session shows expired.

- **Alpha & Beta**: Honor expired sessions if Binance confirms payment. The TTL is a UX hint (hide the QR, show "expired" message), not a payment gate. If Binance says paid, we fulfill.

### 8. Package lost in transit

Lost on Amazon → warehouse leg, or warehouse → Venezuela leg.

- **Alpha**: Manual tracking via Zinc status / carrier tracking. Refund if package is unrecoverable.
- **Beta**: Timeout alerts — flag orders stuck too long in any state for admin review. Auto-escalate if no movement after configurable threshold.

---

## Beta — Invite-Only Real Customers

**Goal**: Full customer-facing flow. 10-20 real customers via invite/WhatsApp.

**Features (on top of Alpha)**:

1. **Venezuelan shipping address**
   - Address form (name, address, city, state, postal code, phone)
   - Dropdown of Venezuelan states
   - Stored in order metadata for One Way Cargo handoff

2. **Customer communication**
   - WhatsApp support link on every page
   - Basic email notifications (order confirmed, shipped, delivered)

3. **Production deployment**
   - Deploy to cloud (Dockerfile ready)
   - Real Binance Pay + Zinc API (no mock)
   - Monitoring and error alerting

4. **Operational polish**
   - Warehouse receiving flow (confirm package arrived, capture weight/photos)
   - OWC handoff workflow in admin
   - Customer-facing delivery tracking for VE leg

**Done when**: A real customer buys a product, tracks their order, and receives it in Venezuela.

---

## Post-Beta Ideas

**Growth features**:
- In-app Amazon search
- Multi-item cart with consolidated shipping
- Referral program
- Saved addresses

**More payment methods**:
- Zelle (manual confirmation)
- Pago Movil (Bolívares at BCV rate)
- Stripe (credit/debit cards)

**Operations**:
- Package consolidation (combine orders into one shipment)
- Air vs maritime shipping options
- Customs documentation (declarations, HS codes, duty estimates)

**Expansion**:
- More retailers (Walmart, eBay, Best Buy — Zinc supports them)
- More countries (Colombia, Ecuador, Dominican Republic)
- Mobile app

---

## Key Integrations

### Zinc API (zinc.com)
- **Purpose**: Amazon product data + automated purchasing
- **Cost**: $1/order, $0.01/data call
- **Flow**: POST /orders with product URL + warehouse address → returns order ID
- **Amazon US uptime**: 96.5%

### Binance Pay
- **Purpose**: Customer payments in USDT
- **Flow**: Create order via API → QR code/deeplink → customer pays → webhook confirms
- **Key**: Use v3 Create Order API, verify webhook signatures

### One Way Cargo
- **Purpose**: Florida → Venezuela last-mile delivery
- **Rate card**: TBD — need to confirm current rates

---

## Compliance Notes

- **Amazon ToS**: Freight forwarding is acknowledged. We become the exporter — responsible for US export + VE import compliance. A-to-z Guarantee does NOT cover packages after delivery to a freight forwarder.
- **Export regulations**: Must comply with US export controls and Venezuelan import regulations/customs/duties.
- **Zinc API**: Legitimate third-party purchasing service, widely used by forwarding businesses.

---

## Pricing Model (Current)

```
Amazon product price
+ Amazon shipping (free with Prime, ~$5-8 without)
+ FL sales tax (7% — Broward County)
+ OWC air shipping to Venezuela (rate per lb or volumetric, whichever higher)
+ Service fee ($1.00 — Zinc API fee)
────────────────────────────────
= Total (charged in USDT via Binance Pay)
```

### Competitor pricing reference

| Fee Type | Industry Range |
|----------|---------------|
| Air shipping | $5.50-$7.00/lb |
| Sea shipping | $14.50-$40/cu ft |
| Purchase commission | 5-10% |
| Insurance | 1-5% of value |
