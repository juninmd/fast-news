const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// remove unreachable return
app = app.replace(/return !!aiConfig\.aiSdkApiKey;\n\s*return false;/g, 'return !!aiConfig.aiSdkApiKey;');

// make sure boolean expression simplifies (if any in other files)
app = app.replace(/if \(window\.matchMedia && window\.matchMedia\('\(prefers-color-scheme: dark\)'\)\.matches\) \{\n\s*return true;\n\s*\}\n\s*return false;/g, 'return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);');

// add type="button" to buttons
app = app.replace(/<button\n\s*onClick=\{toggleTheme\}/g, '<button type="button"\n                onClick={toggleTheme}');
app = app.replace(/<button\n\s*onClick=\{\(\) => setIsSettingsOpen\(true\)\}/g, '<button type="button"\n                onClick={() => setIsSettingsOpen(true)}');

fs.writeFileSync('src/App.jsx', app);
