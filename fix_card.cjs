const fs = require('fs');

let card = fs.readFileSync('src/components/NewsCard.jsx', 'utf8');
card = card.replace(/<button\n\s*onClick=\{handleSummarize\}/g, '<button type="button"\n                onClick={handleSummarize}');
card = card.replace(/NewsCard.displayName = 'NewsCard';\n/g, '');
card = card + '\nNewsCard.displayName = \'NewsCard\';\n';

fs.writeFileSync('src/components/NewsCard.jsx', card);
