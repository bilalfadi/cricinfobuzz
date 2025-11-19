# Cricbuzz Complete Scraper & Clone

Complete scraper that extracts **EVERYTHING** from Cricbuzz and builds a frontend using their actual code.

## Features

- ✅ Extracts complete HTML, CSS, JavaScript from Cricbuzz
- ✅ API server for live data
- ✅ Next.js frontend using extracted Cricbuzz code
- ✅ Real-time data from Cricbuzz

## Installation

```bash
npm install
cd frontend && npm install
```

## Usage

### 1. Start API Server (Backend)
```bash
npm run api
# or
npm run dev
```
Server runs on `http://localhost:4000`

### 2. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:3000`

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
├── scraper.js          # Main scraper
├── api-server.js        # API server for live data
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # Next.js pages
│   │   └── lib/        # API client
└── extracted/          # Extracted data (JSON files)
```
