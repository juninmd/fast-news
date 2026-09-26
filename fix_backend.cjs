const fs = require('fs');
const file = 'backend/src/services/sources.ts';
let content = fs.readFileSync(file, 'utf8');

// The error is in the getActiveFeeds type definition
// Array<{ url: string; category: string; company?: string | undefined }>
// We need to change the FEED_SOURCES return type or map it, but it's simpler to make sure all items in FEED_SOURCES have `category: string`
// The typescript error indicates some elements of FEED_SOURCES have `company: string` but are missing `category`.
