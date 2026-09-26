const fs = require('fs');
const file = 'backend/src/services/sources.ts';
let content = fs.readFileSync(file, 'utf8');

// The best way to fix this is to enforce the type on FEED_SOURCES array directly
// or just fix the return type. Wait, the error occurs where FEED_SOURCES is exported, or maybe in the return?
// error TS2322: Type '({ url: string; category: string; company: string; } | { url: string; company: string; category?: undefined; })[]' is not assignable to type '{ url: string; category: string; company?: string | undefined; }[]'.

content = content.replace(
  'export const FEED_SOURCES = [',
  'export const FEED_SOURCES: Array<{ url: string; category?: string; company?: string }> = ['
);

// We should also change the return type of getActiveFeeds to match
content = content.replace(
  'Array<{ url: string; category: string; company?: string | undefined }>',
  'Array<{ url: string; category?: string; company?: string }>'
);

fs.writeFileSync(file, content);
console.log('Successfully patched FEED_SOURCES type');
