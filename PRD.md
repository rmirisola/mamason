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
- **Purchasing automation**: Zinc API ($1/order, $0.01/data call)
- **Payments**: Binance Pay (USDT)
- **VE last-mile shipping**: One Way Cargo (Florida → Venezuela)

---

## Alpha — Internal Testing

**Goal**: Prove the full purchase pipeline works. Paste URL → pay → product arrives at Florida warehouse. Internal only.

**Features**:

1. **Paste Amazon URL**
   - Extract ASIN via regex (`/dp/`, `/gp/product/`, etc.)
   - Fetch product details from Rainforest API (title, price, image, weight/dimensions)

2. **Price display**
   - Product price from Zinc (no service fee or shipping yet)

3. **Payment via Binance Pay**
   - Create Binance Pay order (amount in USDT)
   - Display QR code / Binance app deeplink
   - Webhook confirms payment → Zinc order placed automatically
   - Mock mode via `BINANCE_MOCK=true` env var

4. **Order placement via Zinc API**
   - Ship to hardcoded Florida warehouse address
   - `max_price` set to product price + 10% buffer
   - Mock mode via `ZINC_MOCK=true` env var

5. **Order tracking**
   - Poll Zinc API for status updates
   - Status: pending → in_progress → order_placed → shipped → delivered

**Done when**: Paste a URL, pay with Binance, Zinc places the Amazon order, package arrives at the Florida warehouse.

---

## Beta — Invite-Only Real Customers

**Goal**: Full customer-facing flow. 10-20 real customers via invite/WhatsApp.

**Features (on top of Alpha)**:

1. **Venezuelan shipping address**
   - Address form (name, address, city, state, postal code, phone)
   - Dropdown of Venezuelan states
   - Stored in order metadata for One Way Cargo handoff

2. **Full price breakdown**
   - Product price (from Zinc)
   - Service fee: % of product price (TBD, min $5)
   - Shipping: weight-based using One Way Cargo rates
   - Total displayed before checkout

3. **Error handling**
   - Product unavailable / price changed beyond buffer
   - Binance Pay timeout or failed payment
   - Zinc order failure → manual resolution
   - Clear error messages to customer

4. **Customer communication**
   - WhatsApp support link on every page
   - Email collection at checkout
   - Basic email notifications (order confirmed, shipped)

5. **Order persistence**
   - Server-side order records (SQLite or simple JSON store)
   - Track: customer email, product, amount paid, Zinc order ID, status

**Done when**: A real customer buys a product, tracks their order, and receives it in Venezuela.

---

## Post-Beta Ideas

**Growth features**:
- User accounts (registration, saved addresses, order history)
- In-app Amazon search
- Multi-item cart with consolidated shipping
- Referral program

**More payment methods**:
- Zelle (manual confirmation)
- Pago Movil (Bolívares at BCV rate)
- Stripe (credit/debit cards)

**Operations**:
- Admin dashboard (orders, customers, revenue)
- Warehouse receiving (scan packages, weight capture, photos)
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

## Pricing Model (Beta)

```
Product price:           $X.XX   (from Zinc API)
Service fee (%TBD):      $X.XX   (min $5.00)
Shipping to Venezuela:   $X.XX   (weight-based, One Way Cargo rates)
────────────────────────────────
Total:                   $X.XX
```

### Competitor pricing reference

| Fee Type | Industry Range |
|----------|---------------|
| Air shipping | $5.50-$7.00/lb |
| Sea shipping | $14.50-$40/cu ft |
| Purchase commission | 5-10% |
| Insurance | 1-5% of value |
