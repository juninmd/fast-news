const fs = require('fs');
const file = 'backend/src/services/sources.ts';
let content = fs.readFileSync(file, 'utf8');

// The error is:
// src/services/sources.ts(1006,2): error TS2322: Type '({ url: string; category: string; company: string; } | { url: string; company: string; category?: undefined; })[]' is not assignable to type '{ url: string; category: string; company?: string | undefined; }[]'.

// We should cast FEED_SOURCES or modify getActiveFeeds to map it if needed.
// Easiest is to cast FEED_SOURCES to the correct type or any when returning.

content = content.replace(
  'return FEED_SOURCES;',
  'return FEED_SOURCES as Array<{ url: string; category: string; company?: string }>;'
);

fs.writeFileSync(file, content);
console.log('Successfully patched getActiveFeeds return');
