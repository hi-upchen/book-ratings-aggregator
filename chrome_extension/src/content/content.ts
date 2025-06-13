console.log('Content script executed!');

import { ContentRouter } from 'utils/ContentRouter';
import { KoboHandler } from './retailers/kobo';
import { PChomeHandler } from './retailers/pchome';
import { BokelaiHandler } from './retailers/bokelai';
import { TaazeHandler } from './retailers/taaze';

// Create router instance
const router = new ContentRouter();

// Register all retailer handlers
router.register(new KoboHandler());
router.register(new PChomeHandler());
router.register(new BokelaiHandler());
router.register(new TaazeHandler());

// Log registered handlers for debugging
console.log('Registered handlers:', router.getRegisteredHandlers());

// Route to appropriate handler based on current URL
router.route();