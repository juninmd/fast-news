const fs = require('fs');
const file = 'backend/src/services/sources.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'return FEED_SOURCES as Array<{ url: string; category: string; company?: string }>;',
  'return FEED_SOURCES;'
);

fs.writeFileSync(file, content);
console.log('Successfully patched return again');
