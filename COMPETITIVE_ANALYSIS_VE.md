# Competitive Analysis - Venezuela

_Last updated: March 2026_

---

## Market Overview

The Venezuela-US package forwarding market is fragmented with 10+ players. Most are casillero (mailbox) services where the customer buys themselves. A few are "buy for you" purchase agents. None offer crypto payments.

**Key dynamics:**
- No easy access to international credit cards — "buy for you" models are valuable
- Payment mostly via Zelle, Binance (USDT), Pago Movil, cash
- Trust is everything — customers fear lost packages
- Price sensitive market

---

## Competitors

### Casillero (customer buys, they ship)

| Competitor | Rate | Payment | Strength | Weakness |
|-----------|------|---------|----------|----------|
| **ZOOM** | ~$14.30/half-kg | Bs, USD | 280+ offices in VE, massive brand | Expensive, no "buy for you" |
| **Tealca** | $5.50-$7/lb (min $30) | Bs (BCV), USD, COD | Strong brand, competitive pricing | Casillero only, 3% surcharge on non-Bs |
| **Liberty Express** | ~$5.50-$6.50/lb | Bs, cash, pay-on-pickup | Free casillero, also does purchase agent, maritime option | Less tech-forward |
| **Super Envios** | $4.99/lb | Various | Cheapest per-lb rate | Small, weekly departures only |

### Purchase agents ("buy for you")

| Competitor | Commission | Payment | Strength | Weakness |
|-----------|-----------|---------|----------|----------|
| **Encarguelo** | All-inclusive quote | Zelle, PayPal | 10+ years, simple pricing, uses ZOOM for last-mile | Manual, likely higher markup |
| **Metraigo** | All-inclusive quote | Bs (multiple) | Pay in Bs, nationwide, no card needed | Less transparent pricing |
| **Te lo Compro en USA** | Varies | Various | Chrome extension, social media presence | Small operation |
| **SIG Cargo** | 10% (4% w/card) | Various | Lower commission with card | Smaller |

### Our shipping partner

| Competitor | Rate | Strength |
|-----------|------|----------|
| **One Way Cargo** | TBD | No volumetric excess, optional insurance (3%) |

---

## Where Mamazon Fits

```
                    HIGH TECH
                       |
            Aeropost   |
                       |
                       |   ← Mamazon
                       |
    ───────────────────┼───────────────────
    CASILLERO          |     "BUY FOR YOU"
    (customer buys)    |     (we buy)
                       |
         ZOOM          |   Metraigo
         Tealca        |   Encarguelo
         Super Envios  |   Te lo Compro
                       |
                    LOW TECH
```

### What makes Mamazon different

1. **Crypto payments** — No competitor accepts Binance/USDT. Huge in VE, solves the "no credit card" problem.
2. **Automated purchasing** — Competitors use manual buyers. Zinc = faster, fewer errors, lower ops cost.
3. **Paste URL + instant details** — Only Aeropost does this. No purchase agent in VE has it.
4. **Weight-based pricing from product data** — We know the weight before purchase (from Zinc). Competitors quote after receiving the package.

### Key risks

1. **Trust** — Competitors have 10-40 years of brand. We're new. WhatsApp support and transparency are essential.
2. **Last-mile coverage** — Depends on One Way Cargo's reach. Need to confirm which states they cover door-to-door.
3. **Customs/restrictions** — Need to validate what can and can't be shipped before promising "anything."
4. **Zinc reliability** — 96.5% uptime means ~1 in 30 orders fails. Need clear error handling.

### Pricing comparison (for a $50 product, 2 lbs)

| Service | Estimated total |
|---------|----------------|
| Super Envios (casillero) | ~$60 |
| Liberty Express (casillero) | ~$61-63 |
| SIG Cargo (purchase agent) | ~$65-75 |
| Encarguelo (purchase agent) | ~$75-85 |
| Metraigo (purchase agent) | ~$75-85 |
| Tealca (casillero) | ~$80-84 |
| ZOOM (casillero) | ~$79 |
| **Mamazon (Beta)** | **product + fee TBD + shipping TBD** |

Note: Mamazon pricing can't be fully compared until service fee % and One Way Cargo rates are confirmed.

---

## Sources

- [Aeropost](https://aeropost.com/)
- [Liberty Express Tarifas](https://libertyexpress.com/tarifa/tarifa-envio-aereo-casillero-compras-por-internet-estados-unidos-para-venezuela/)
- [ZOOM Casilleros](https://zoom.red/casilleros-internacionales-personas/)
- [Tealca Casillero USA Tarifas](https://www.tealca.us/tarifas-servicio-casillero-usa/)
- [Encarguelo](https://encarguelo.com.ve/)
- [Metraigo](https://metraigo.com/)
- [Te lo Compro en USA](https://ve.telocomproenusa.com/)
- [Super Envios](https://superenvios.com/)
- [SIG Cargo](https://sigcargo.com/compras-en-usa-y-envio-a-venezuela-sig-cargo/)
