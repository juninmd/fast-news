const fs = require('fs');

let settings = fs.readFileSync('src/components/Settings.jsx', 'utf8');

settings = settings.replace(/<button onClick=\{onClose\}/g, '<button type="button" onClick={onClose}');
settings = settings.replace(/<button\n\s*onClick=\{onClose\}/g, '<button type="button"\n            onClick={onClose}');
settings = settings.replace(/<button\n\s*onClick=\{handleSave\}/g, '<button type="button"\n            onClick={handleSave}');

fs.writeFileSync('src/components/Settings.jsx', settings);
