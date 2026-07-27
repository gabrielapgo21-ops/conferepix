# ConferePix

A mobile-first point-of-sale and payment reconciliation app for small Brazilian retailers. Built from scratch for a family-run store in Ribeirão Preto that had no system at all.

**Status:** Partially in production. The product catalog module is in daily use with the store's real inventory. The sales and reconciliation modules are built and functional, currently running on seed data, and pending validation against live card-terminal payouts.

---

## The problem

A small shop in Brazil typically accepts three kinds of payment: **Pix** (the national instant-transfer system), cash, and cards through a **maquininha** — a card terminal rented from an operator such as Stone, Cielo, Rede, PagSeguro, Ton, or Mercado Pago.

Each operator charges its own fee per transaction type and pays out on its own schedule. Debit might settle next day, credit in thirty days, Pix instantly. Fees differ per operator and per card type. The result is that a shop owner sells R$ 400 on Tuesday and has no practical way of knowing whether the R$ 383.60 that arrived a week later was correct, or whether a transaction went missing entirely.

The existing options do not fit this user. Full ERPs like Bling, Tiny and Omie are built for accountants and carry a steep learning curve. Operator apps like Mercado Pago Point are good at taking the payment and weak at managing the business. Square and Shopify POS are expensive and not adapted to Brazilian payment reality.

This app targets the gap: register a product in thirty seconds, take a sale, and later see clearly whether the money actually arrived.

## Current status by module

| Module | Status |
|---|---|
| **Product catalog** | **In production.** Store's real inventory registered and in daily use. |
| **Quick stock / barcode scan** | Built and working; camera scan plus manual entry. |
| **Sales** (Pix / cash / card, incl. split payment) | Built, running on seed data. |
| **Reconciliation** | Built, running on seed data. Pending validation against real payouts. |
| **Card terminals & fees** | Built; per-operator fee and settlement configuration. |
| **Reports** | Built; PDF export and accountant hand-off are stubbed. |
| **Mercado Pago integration** | Prepared, test mode. Webhook route implemented, not yet live. |
| **Live transaction feed** | Built against a local simulator, pending the live webhook. |
| **Public catalog feed** | **In production.** Serves a live storefront on a separate domain. |

Seed transactions were authored by hand to exercise the reconciliation logic across every divergence state.

## What it does

- **Register a product in about thirty seconds** — name, photo, code, category, price, cost
- **Barcode and QR scanning** through the phone camera, with manual entry as fallback
- **Sales** in Pix, cash, or card, including **split payment** across methods
- **Per-operator fee configuration** — each terminal carries its own debit, credit and Pix rates and settlement windows
- **Reconciliation table** with an explicit status per transaction: matched, awaiting payout, payout confirmed, fee mismatch, amount mismatch, unidentified, cancelled
- **Statement uploads** — bank statement, terminal report, sales spreadsheet
- **Monthly reporting** by category and best sellers
- **Installable on any device** — iOS, Android, Windows, macOS and Linux, without an app store
- **Works offline**, which matters because mobile signal inside the municipal market building is unreliable

## Tech stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript, strict mode |
| **UI** | React 18, Tailwind CSS with HSL design tokens, Radix primitives |
| **State** | Zustand with `localStorage` persistence |
| **Backend** | Supabase |
| **Charts** | Recharts |
| **Motion** | Framer Motion |
| **Scanning** | html5-qrcode |
| **Delivery** | PWA — manifest, service worker, maskable icons, iOS splash screens |

## Engineering notes

### A deliberately fail-safe service worker

The service worker is the part of this codebase I would point to first, because it was rewritten after a production bug rather than written from a tutorial.

An earlier version could resolve `respondWith` with `undefined` on certain requests. In a service worker that does not degrade gracefully — it breaks every request the worker intercepts, so the entire app goes blank while appearing to be installed and healthy. Debugging it meant learning that the failure mode of a caching layer matters more than its hit rate.

The current version is built around one invariant: **never return anything other than a valid `Response`.** Concretely:

- `/api/` routes and Supabase requests always bypass the cache, so dynamic data is never served stale
- Non-`GET` requests bypass entirely
- Navigation requests are **network-first**, falling back to cache, then to the cached shell, then to an inline offline page
- Static assets are **cache-first**
- Only status-200, non-opaque responses are cached
- Every cache write is wrapped so a storage failure can never reject the response
- A final `try/catch` returns a valid 504 rather than letting a rejection escape

### Feeding a live storefront that already existed

The store already had a public catalog running on its own domain, built earlier as a standalone React page with the product list hardcoded in a JavaScript file. Updating it meant editing that file by hand and re-uploading it. Rewriting the storefront was not an option — the design was already approved and in use.

So the app grew a public endpoint that serves the product list in **the exact shape the existing page already expected**: a `window.BOOTS` array, same field names, same order. Integration cost one changed line in the storefront's HTML — the script tag now points at this endpoint instead of a local file. No visual change, no rewrite.

Notes on the design:

- The endpoint reads through Supabase's `service_role` on the server, so the storefront needs no authentication and no user session
- Open CORS with a 60-second cache, because the data is public product information and the read volume is a storefront's, not an API's
- The product model carries a separate `catalogo` group of fields — what the storefront needs to display is not the same as what the counter needs to sell
- A one-time importer accepts the old hardcoded file pasted as text, so the existing 97 products migrated in a single step rather than being retyped

Importing those 97 products immediately broke `localStorage`, which has a 5 MB quota. The fix was to narrow what Zustand persists: transactions and file uploads now live only in the cloud, and a quota failure degrades instead of throwing.



The store operates inside a municipal market where signal is poor. Offline capability here is not a checkbox — it decides whether the app is usable at the counter. That constraint drove the PWA approach, the cache strategy, and keeping state in `localStorage` via Zustand rather than assuming a live connection.

### Plain language over correct terminology

The interface deliberately avoids accounting and tax vocabulary. Stock reads "running low" rather than "critical threshold". Products are "missing a code", not "unparameterised". There is no NCM, no CFOP, no tax classification anywhere in the UI.

The user is the shop owner, and the design goal was that she never needs a developer or an accountant to operate it.

## Running locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Supabase credentials go in `.env.local`, which is not committed.

## Installing as an app

**iOS / Safari** — Share → Add to Home Screen
**Android / Chrome** — install prompt, or the install icon in the address bar
**Desktop** — install icon in the address bar of Chrome, Edge or Safari

The manifest also registers three shortcuts, so long-pressing the installed icon jumps straight to New Sale, Reconciliation, or Products.

## Roadmap

**Next up:** validate reconciliation against real terminal payouts, then take the Mercado Pago webhook live. That closes the loop the app was built for.

**After that:** product variations (size and colour with independent stock), spreadsheet import, movement history, real PDF export, and multi-user permissions so an employee can sell without editing prices.

**Explicitly out of scope for now:** invoicing, tax documents, full ERP features, real banking integration.

## Notes

Built as an MVP for a real store, with AI-assisted development. Product direction, architecture decisions and scope were mine; implementation was paired with Claude.

A Portuguese-language README aimed at the store's users is available at [`README.pt-BR.md`](README.pt-BR.md).
