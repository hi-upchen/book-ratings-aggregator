# Book Ratings Aggregator Project

## Project Overview
Chrome extension that displays Goodreads ratings on Taiwanese book retailer websites (Kobo, PChome, 博客來, 讀冊) to enhance book discovery and help users make informed purchasing decisions.

## Architecture
- **Chrome Extension**: Content scripts for each retailer website
- **Next.js Server**: API endpoints with PostgreSQL database for data persistence
- **Docker**: Production deployment configuration

## Tech Stack
- **Frontend**: TypeScript, Chrome Extension APIs, Cheerio for web scraping
- **Backend**: Next.js 14, PostgreSQL, Node.js
- **Build Tools**: Parcel (extension), Next.js (server)
- **Deployment**: Docker Compose

## Project Structure
```
├── chrome_extension/          # Chrome extension source
│   ├── src/
│   │   ├── content/          # Content scripts per retailer
│   │   ├── scripts/          # Background script
│   │   ├── utils/            # Shared utilities
│   │   └── types/            # TypeScript definitions
├── server/                   # Next.js API server
│   └── src/app/api/book/    # Book data API endpoint
└── secrets/                 # Environment configuration
```

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
- 2-space indentation consistently
- CamelCase for variables and functions
- Follow existing patterns in each retailer's content script
- Add JSDoc comments for complex functions

### Chrome Extension Development
- **Content Scripts**: Each retailer has its own content script in `src/content/`
- **Background Script**: Handles Goodreads API calls and local storage caching
- **DOM Manipulation**: Use MutationObserver for dynamically loaded content
- **Error Handling**: Graceful fallbacks when book data is incomplete

### Server Development
- **API Routes**: RESTful endpoints in Next.js app directory
- **Database**: PostgreSQL with separate tables per book source
- **Upsert Logic**: Handle duplicate book entries intelligently
- **Environment**: Use `.env` files for configuration

### Retailer-Specific Implementation Notes
- **Kobo**: Handle book detail pages, listings, and search results
- **PChome**: Support multiple layouts (grid, row, region pages)
- **博客來**: Complex DOM structure, monitor for async content loading
- **讀冊**: Multiple page types, check for dynamic content updates

### Database Schema
- `goodreads_book`: Scraped Goodreads ratings and metadata
- `kobo_book`, `pchome_book`, `bokelai_book`, `taaze_book`: Retailer-specific book data
- All tables include: title, author, rating, price, thumbnail_url, timestamps

## Development Workflow

### Extension Development
```bash
cd chrome_extension
npm run start          # Development mode with hot reload
npm run build          # Production build
npm run pack:zip       # Create distribution zip
```

### Server Development
```bash
cd server
npm run dev            # Development server on localhost:3000
npm run build          # Production build
npm run lint           # ESLint checking
```

### Testing Guidelines
- Test extension on all supported retailer websites
- Verify both Chinese and English book title handling
- Check rating display across different page layouts
- Test caching behavior and storage cleanup

### Deployment
- **Development**: Extension loads from `dist/` folder
- **Production**: Server runs via Docker Compose on port 42093
- **Environment**: Server environment variables in `secrets/server-env/`

## Common Commands
- `npm run dev` - Start Next.js development server
- `npm run start` - Start extension development with hot reload
- `npm run build` - Build extension for production
- `npm run lint` - Run ESLint on server code
- `docker-compose up` - Start production server

## Key Features Implementation
- **Multi-language Support**: Handle Chinese titles by searching English subtitles
- **Smart Caching**: Remove old/unpopular book data to optimize storage
- **Performance**: Only process visible book elements to avoid slowdowns
- **Cross-site Integration**: Inject ratings seamlessly into existing retailer layouts

## Debugging Tips
- Use Chrome DevTools for content script debugging
- Check background script console for API call logs
- Monitor network requests to verify server communication
- Test storage cleanup with `chrome.storage.local.get(null, console.log)`

## Repository Information
- **Author**: Up Chen <hi.upchen@gmail.com>
- **License**: GPL-3.0
- **Repository**: https://github.com/hi-upchen/book-ratings-aggregator