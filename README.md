# Cricbuzz Complete Scraper & Clone

Complete scraper that extracts **EVERYTHING** from Cricbuzz and builds a Vercel-ready frontend using their actual code.

## Features

- ✅ Extracts complete HTML, CSS, JavaScript from Cricbuzz
- ✅ Built-in API routes (Next.js) for live data
- ✅ Next.js frontend using extracted Cricbuzz code
- ✅ Real-time data from Cricbuzz
- ✅ Ready to deploy on Vercel (`cricinfobuzz.n123movie.xyz`)

## Installation

```bash
npm install
cd frontend && npm install
```

## Usage

### 1. Environment

Inside `frontend/`, copy `.env.example` to `.env.local` and update if needed:

```env
NEXT_PUBLIC_SITE_URL=https://cricinfobuzz.n123movie.xyz
# Leave empty to call the built-in Next.js API routes.
# Uncomment for external/local API server:
# NEXT_PUBLIC_API_URL=http://localhost:3002
```

### 2. Start the Next.js app (includes API routes)

```bash
cd frontend
npm run dev
```

Frontend + API run together on `http://localhost:3000`.

### 3. (Optional) Standalone API server

If you still want the Express server:

```bash
npm run api
```

It runs on `http://localhost:3002` and `NEXT_PUBLIC_API_URL` should point to it.

## API Endpoints

- `GET /api/extract?path=/` - Extract everything from a page
- `GET /api/news` - Get live news
- `GET /api/matches` - Get live matches
- `GET /api/videos` - Get videos

## What Gets Extracted

For each page:
1. **Raw HTML** - Complete HTML source
2. **All Elements** - Every HTML element with all attributes
3. **CSS** - Inline styles, style tags, external stylesheets, all classes, all IDs
4. **JavaScript** - All scripts, variables, functions
5. **Images** - All image sources
6. **Links** - All links
7. **Text Content** - All text from the page
8. **Meta Tags** - All meta information
9. **Structured Data** - JSON-LD data

## Project Structure

```
├── scraper.js          # Main scraper (shared with API routes)
├── api-server.js       # Optional standalone API server
├── frontend/           # Next.js frontend + API routes
│   ├── src/
│   │   ├── app/        # Next.js pages
│   │   └── lib/        # API client/helpers
└── extracted/          # Extracted data (JSON files)
```

## Deploying to Vercel

1. Push this repo to GitHub (already connected: `bilalfadi/cricinfobuzz`).
2. On Vercel, “Add New Project” → select the repo.
3. Set **Root Directory** to `frontend`.
4. Environment variable: `NEXT_PUBLIC_SITE_URL=https://cricinfobuzz.n123movie.xyz` (add `NEXT_PUBLIC_API_URL` only if using an external API server).
5. Build command: default (`next build`). Vercel detects Next.js automatically.
6. After the first deploy, add the custom domain `cricinfobuzz.n123movie.xyz` in the Vercel dashboard (Domains tab) and update your DNS (CNAME to `cname.vercel-dns.com`).

### API on Vercel

All former Express endpoints (`/api/extract`, `/api/news`, `/api/matches`, etc.) now live under `frontend/src/app/api/*` so they run as serverless functions on Vercel. No extra backend deployment is required—just keep the scraper dependencies installed.
