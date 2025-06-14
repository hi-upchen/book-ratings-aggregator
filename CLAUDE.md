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

## Current Project Structure

### Chrome Extension (`chrome_extension/`)
```
chrome_extension/
├── src/
│   ├── content/
│   │   ├── content.ts           # Main entry point with ContentRouter
│   │   ├── content.scss         # Unified styling for all retailers
│   │   └── retailers/           # Modular retailer handlers
│   │       ├── kobo/
│   │       │   ├── handler.ts   # KoboHandler class implementation
│   │       │   ├── index.ts     # Export for KoboHandler
│   │       │   └── utils.ts     # Kobo-specific rendering utilities
│   │       ├── pchome/
│   │       │   ├── handler.ts   # PChomeHandler implementation
│   │       │   ├── index.ts     # Export for PChomeHandler
│   │       │   └── utils.ts     # PChome-specific utilities
│   │       ├── bokelai/
│   │       │   ├── handler.ts   # BokelaiHandler implementation
│   │       │   ├── index.ts     # Export for BokelaiHandler
│   │       │   └── utils.ts     # 博客來-specific utilities
│   │       └── taaze/
│   │           ├── handler.ts   # TaazeHandler implementation
│   │           ├── index.ts     # Export for TaazeHandler
│   │           └── utils.ts     # 讀冊-specific utilities
│   ├── scripts/
│   │   └── background.ts        # Service worker for Goodreads API calls
│   ├── utils/
│   │   ├── BookUtils.ts         # Book data processing utilities
│   │   ├── ChromeMessagingService.ts  # Extension messaging layer
│   │   ├── ContentRouter.ts     # URL-based retailer routing system
│   │   ├── DomUtils.ts          # DOM manipulation helpers
│   │   └── __tests__/           # Unit tests
│   │       ├── ContentRouter.test.ts  # Router tests
│   │       ├── setup.ts         # Test configuration
│   │       └── README.md        # Testing documentation
│   ├── types/
│   │   └── RetrievedBookInfo.ts # TypeScript interfaces
│   ├── images/                  # Extension icons and assets
│   │   ├── book-rating-128.png
│   │   ├── book-rating.png
│   │   └── goodreads-icon.svg
│   ├── popup/
│   │   └── hello.html          # Extension popup interface
│   └── manifest.json           # Chrome extension manifest v3
├── dist/                       # Parcel build output
├── coverage/                   # Jest test coverage reports
├── node_modules/               # Dependencies
├── package.json                # Extension dependencies & scripts
├── package-lock.json
├── tsconfig.json               # TypeScript config (ES5 target)
├── jest.config.js              # Jest testing configuration
├── LICENSE
├── README.md
└── privacy-policy.md
```

### Server (`server/`)
```
server/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── book/
│   │   │   │   ├── route.ts     # RESTful book API endpoints
│   │   │   │   └── type.d.ts    # API type definitions
│   │   │   └── search/          # Future search endpoints
│   │   ├── layout.tsx           # Next.js root layout
│   │   ├── page.tsx             # Homepage component
│   │   ├── globals.css          # Global Tailwind styles
│   │   └── favicon.ico
│   └── lib/                     # Server utility libraries
├── public/
│   ├── extension-privacy.md     # Public privacy policy
│   ├── next.svg
│   └── vercel.svg
├── node_modules/               # Dependencies
├── Dockerfile                  # Production container config
├── package.json                # Server dependencies & scripts
├── package-lock.json
├── tsconfig.json               # TypeScript config (ESNext)
├── next.config.mjs             # Next.js configuration
├── next-env.d.ts               # Next.js type definitions
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── README.md
```

### Project Root
```
├── docker-compose.yml          # Production deployment
└── secrets/
    ├── server-env.sample       # Environment template
    └── server-env/             # Actual environment files
```

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
- 2-space indentation consistently
- CamelCase for variables and functions
- Follow existing patterns in each retailer's content script
- Add JSDoc comments for complex functions

### Chrome Extension Development

#### Architecture Overview
- **Content Router System**: `ContentRouter.ts` provides URL-based routing to appropriate retailer handlers
- **Modular Handlers**: Each retailer implements the `RetailerHandler` interface with `matches()` and `handle()` methods
- **Unified Styling**: Single `content.scss` file with retailer-specific sections for consistent theming
- **Background Service Worker**: Handles Goodreads API calls, data caching, and server communication

#### Handler Implementation Pattern
```typescript
export class RetailerHandler implements RetailerHandler {
  name = 'RetailerName';
  matches(url: string): boolean { /* URL pattern matching */ }
  handle(document: Document): void { /* Page processing logic */ }
}
```

#### Key Development Practices
- **DOM Manipulation**: Use MutationObserver for dynamically loaded content
- **Performance**: Process only visible elements, mark processed items with `bra-processed` class
- **Error Handling**: Graceful fallbacks when book data is incomplete or missing
- **Caching**: Background script manages Goodreads data caching and cleanup

### Server Development

#### Technology Stack
- **Framework**: Next.js 14 with App Router architecture
- **Database**: PostgreSQL with `pg` library and connection pooling
- **Styling**: Tailwind CSS with PostCSS processing
- **Deployment**: Docker containerization with production optimization

#### API Endpoints
- **POST /api/book**: Upserts book data from Chrome extension with retailer-specific tables
- **GET /api/book**: Basic health check endpoint (returns "Hello World")
- **Database Logic**: Intelligent handling of duplicate entries with upsert operations

#### Configuration Management
- **Environment**: Docker-based secrets management in `secrets/server-env/`
- **Next.js Config**: Modern ESNext TypeScript target with strict type checking
- **Build System**: Optimized production builds with static generation where possible

### Retailer-Specific Implementation Notes
- **Kobo**: Handle book detail pages, listings, search results, and homepage with MutationObserver for dynamic content
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

#### Chrome Extension Testing
- **Framework**: Jest with jsdom environment and comprehensive coverage reporting
- **Test Structure**: Unit tests in `src/utils/__tests__/` with mocked Chrome APIs
- **Coverage**: HTML and LCOV reports generated in `coverage/` directory
- **Commands**: `npm test` (watch mode), `npm run test:coverage` (full coverage)

#### Manual Testing Checklist
- Test extension on all supported retailer websites (Kobo, PChome, 博客來, 讀冊)
- Verify both Chinese and English book title handling
- Check rating display across different page layouts and responsive designs
- Test caching behavior and storage cleanup functionality
- Verify MutationObserver behavior on dynamic content loading
- Test error handling when Goodreads data is unavailable

### Deployment
- **Development**: Extension loads from `dist/` folder
- **Production**: Server runs via Docker Compose on port 42093
- **Environment**: Server environment variables in `secrets/server-env/`

## Common Commands

### Chrome Extension Commands
```bash
cd chrome_extension
npm run start          # Development mode with Parcel hot reload
npm run build          # Production build for extension packaging
npm run clean          # Clean Parcel cache and dist folder
npm test               # Run Jest tests in watch mode
npm run test:coverage  # Generate test coverage reports
npm run pack:zip       # Create distribution zip file
```

### Server Commands
```bash
cd server
npm run dev            # Next.js development server on localhost:3000
npm run build          # Production build with optimization
npm run start          # Start production server
npm run lint           # ESLint checking with Next.js rules
```

### Production Deployment
```bash
docker-compose up      # Start production server on port 42093
docker-compose down    # Stop production environment
```

## Key Features Implementation
- **Multi-language Support**: Handle Chinese titles by searching English subtitles
- **Smart Caching**: Remove old/unpopular book data to optimize storage
- **Performance**: Only process visible book elements to avoid slowdowns
- **Cross-site Integration**: Inject ratings seamlessly into existing retailer layouts

## Debugging Tips

### Chrome Extension Debugging
- **Content Scripts**: Use Chrome DevTools Sources tab, set breakpoints in injected scripts
- **Background Script**: Open extension details → Inspect views → service worker
- **API Calls**: Monitor background script console for Goodreads API and server communication logs
- **Storage**: Test caching with `chrome.storage.local.get(null, console.log)` in DevTools
- **Network**: Check Network tab for failed requests to book retailer APIs or server endpoints
- **DOM Issues**: Use Elements tab to verify rating injection and CSS class application

### Server Debugging
- **API Endpoints**: Test with `curl` or Postman for `/api/book` endpoints
- **Database**: Check PostgreSQL logs for connection and query issues
- **Build Issues**: Use `npm run build` to verify Next.js compilation
- **Environment**: Verify `secrets/server-env/` configuration is properly loaded

## Repository Information
- **Author**: Up Chen <hi.upchen@gmail.com>
- **License**: GPL-3.0
- **Repository**: https://github.com/hi-upchen/book-ratings-aggregator