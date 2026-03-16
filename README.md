# Lopido

Buy anything on Amazon, delivered to your door in Venezuela.

Paste an Amazon URL, pay in USDT, and we handle the rest — purchasing, shipping to our Florida warehouse, and forwarding to Venezuela via One Way Cargo.

## Stack

- **App**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Database**: PostgreSQL via Prisma
- **Auth**: Auth0
- **Payments**: Binance Pay (USDT)
- **Purchasing**: Zinc API (ZMA bizapi — automated Amazon ordering with Prime)
- **Shipping**: One Way Cargo (Florida → Venezuela)
- **Hosting**: Google Cloud Run, Cloud SQL, Secret Manager

## Local Development

```bash
cp .env.example .env.local
# Fill in API keys and Auth0 config

npm install
npx prisma migrate dev
npm run dev
```

Set `ZINC_MOCK=true`, `BINANCE_MOCK=true`, `RAINFOREST_MOCK=true` in `.env.local` to mock external APIs during development.

## Deployment

Pushes to `main` automatically deploy via GitHub Actions:

1. Build Docker image → Artifact Registry
2. Run Prisma migrations via Cloud SQL Proxy
3. Deploy to Cloud Run

**GCP Project**: `lopido-prod` | **Region**: `us-central1`

See [ARCHITECTURE.md](ARCHITECTURE.md) for full infrastructure details.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, data model, API routes, deployment
- [PRD.md](PRD.md) — Product requirements, roadmap, failure modes
