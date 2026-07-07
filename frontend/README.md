# NEPON — Frontend

Next.js 16 application for the NEPON fashion e-commerce platform. See the [root README](../README.md) for the full project overview.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS 4 with PostCSS
- GSAP animations, lucide-react icons, date-fns

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app expects the backend API at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api`).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (Webpack) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint checks |

## Structure

- `src/app/` — App Router pages (auth, products, cart, checkout, orders, admin, seller, profile, notifications, reviews)
- `src/components/` — Shared UI components (Navbar, Footer, ProductCard, Pagination, Captcha, LoadingSpinner)
- `src/lib/` — API client and auth context
- `public/` — Static assets (product images are downloaded by the backend dataset import script)
