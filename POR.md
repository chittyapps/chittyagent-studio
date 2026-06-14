# ChittyPro Market: Plan of Record (POR)

## 1. Executive Summary
The `ChittyAgent-Studio` repository has officially pivoted from an internal no-code builder into the **ChittyPro Market**—a commercial B2B storefront and developer API marketplace. This platform manages billing, API key issuance, and automated database provisioning for the entire ChittyOS commercial ecosystem.

## 2. Architectural Paradigm
- **Frontend:** React + Vite + Tailwind (Shadcn UI).
- **Backend:** Express.js API.
- **Database:** PostgreSQL (managed via Drizzle ORM).
- **Billing & Auth Engine:** Stripe Webhooks triggering zero-knowledge secure `CHITTYPRO_API_KEY` generation.
- **Automated Provisioning:** Integration with the **Neon Control Plane API** to dynamically provision isolated, scale-to-zero databases for every new subscription.

## 3. Product Roadmap & Phasing
- **Phase 1: The PropTech Wedge (Current)**
  - Monetizing `chittyscrape` (TurboTenant / AppFolio).
- **Phase 2: Workflow Automation**
  - Monetizing `chittypro-integrateit` and Desktop connectors.
- **Phase 3: The Enterprise Legal Suite**
  - Monetizing the `Contradiction Engine`, `FinePrint`, and `ChittyProof Vault`.
- **Phase 4: Financial Services**
  - Monetizing `ChittyCharge` and the `Credit Portal API`.

## 4. Go-To-Market & Distribution
- **Inbound "Honey Traps":** Publishing open-source SDK wrappers (e.g., `turbotenant-sdk-python`) that funnel developers to the Market to purchase API keys.
- **Platform Arbitrage:** Building native templates in Notion and CRMs (GoHighLevel) that require an active ChittyPro subscription to function.
- **Upwork Drop-Servicing:** Using our own APIs to fulfill manual data extraction contracts, then upselling the client onto a recurring SaaS subscription.

## 5. Security & Governance Compliance
- **Zero-Knowledge API Keys:** Raw keys are generated, hashed (`sha256`), and returned to the developer exactly once. Only hashes are stored in the Drizzle DB.
- **The Pentad Governance:** The Cloudflare API Gateway (`chittyagent-pro`) enforces strict Perceive-Evaluate-Navigate-Transact-Attest execution loops before fulfilling downstream execution requests.
- **Tenant Isolation:** Client data must never be co-mingled; enforced securely via the Neon database-per-tenant architecture.

---
*Status: Approved and in active execution.*
