# Book Ratings Aggregator

Chrome extension that displays Goodreads ratings on Taiwanese book retailer websites (Kobo, PChome, 博客來, 讀冊) to enhance book discovery and help users make informed purchasing decisions.

## Features

- **Multi-site Support**: Works on Kobo, PChome, 博客來 (Books.com.tw), and 讀冊 (Taaze)
- **Real-time Ratings**: Displays Goodreads ratings and review counts
- **Smart Caching**: Reduces API calls with intelligent local storage
- **Multi-language**: Handles both Chinese and English book titles
- **Seamless Integration**: Ratings appear naturally within existing page layouts

## Quick Development Setup

### Prerequisites
- Node.js installed
- Chrome browser for extension testing

### 1. Extension Development
```bash
cd chrome_extension
npm install
npm run start
```
This starts Parcel in watch mode with hot reload on `localhost`.

### 2. Load Extension in Chrome
1. Open Chrome → Extensions (`chrome://extensions/`)
2. Enable "Developer mode" 
3. Click "Load unpacked" → Select `chrome_extension/dist/` folder
4. Extension loads automatically on supported sites:
   - kobo.com
   - 24h.pchome.com.tw/books
   - books.com.tw  
   - taaze.tw

### 3. Test on Retailer Sites
Visit any supported book retailer site - ratings should appear automatically after the extension processes the page content.

The extension will show Goodreads ratings next to book listings and on detail pages.

## Building for Production

### Production Build
Create optimized build for deployment:
```bash
cd chrome_extension
npm run build
```

### Create Distribution Package
Generate zip file ready for Chrome Web Store:
```bash
npm run pack:zip
```

This command:
1. Cleans previous builds (`dist/` and `.parcel-cache/`)
2. Builds production version with optimized code
3. Creates `book-ratings-aggregator.zip` in project root

### Publish to Chrome Web Store
One command to build, package, upload, and publish:
```bash
npm run release
```

Requires `.env` with Chrome Web Store API credentials (see `.env.sample`).

### Run E2E Tests
```bash
npm run build
npm run test:e2e
```

Runs one spec, `e2e/rating-display.spec.ts`, in headless Chromium with the extension loaded. No window opens.
The `PAGES` list at the top has the store pages it checks: list and detail pages for Kobo, PChome, 博客來 and 讀冊.
Goodreads is stubbed in the store checks. One extra test searches the real Goodreads.
The JSON report is written to `playwright-report/results.json`. It is the daily monitor's input.

### Other Build Commands
```bash
# Development build (includes debug logs)
npm run build:dev

# Clean build cache
npm run clean

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Build Output
- **Production**: Minified code, only essential logs (info/warn/error)
- **Development**: Full debug logging, unminified for debugging
- **Distribution**: Ready-to-deploy zip file for Chrome Web Store

## Architecture

- **Chrome Extension**: Content scripts for each retailer website

## Tech Stack

- **Frontend**: TypeScript, Chrome Extension APIs, Cheerio for web scraping
- **Build Tools**: Parcel

# Credits
## Icon
- [Book free icon](https://www.flaticon.com/free-icon/book_11296198?term=book+star&page=1&position=29&origin=search&related_id=11296198) by [muhammad atho](https://www.flaticon.com/authors/muhammad-atho)