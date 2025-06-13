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
- PostgreSQL database (for server development)
- Chrome browser for extension testing

### 1. Extension Development
```bash
cd chrome_extension
npm install
npm run start
```
This starts Parcel in watch mode with hot reload on `localhost`.

### 2. Server Development  
```bash
cd ../server
npm install
npm run dev
```
Server runs on `localhost:3000` with hot reload.

### 3. Load Extension in Chrome
1. Open Chrome → Extensions (`chrome://extensions/`)
2. Enable "Developer mode" 
3. Click "Load unpacked" → Select `chrome_extension/dist/` folder
4. Extension loads automatically on supported sites:
   - kobo.com
   - 24h.pchome.com.tw/books
   - books.com.tw  
   - taaze.tw

### 4. Environment Setup
Set up database credentials in `server/.env`:
```bash
PG_HOST=localhost
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=book_ratings
```

### 5. Test on Retailer Sites
Visit any supported book retailer site - ratings should appear automatically after the extension processes the page content.

The extension will show Goodreads ratings next to book listings and on detail pages.

## Architecture

- **Chrome Extension**: Content scripts for each retailer website
- **Next.js Server**: API endpoints with PostgreSQL database for data persistence
- **Docker**: Production deployment configuration

## Tech Stack

- **Frontend**: TypeScript, Chrome Extension APIs, Cheerio for web scraping
- **Backend**: Next.js 14, PostgreSQL, Node.js
- **Build Tools**: Parcel (extension), Next.js (server)
- **Deployment**: Docker Compose

# Credits
## Icon
- [Book free icon](https://www.flaticon.com/free-icon/book_11296198?term=book+star&page=1&position=29&origin=search&related_id=11296198) by [muhammad atho](https://www.flaticon.com/authors/muhammad-atho)