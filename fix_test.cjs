const fs = require('fs');

let testCard = fs.readFileSync('src/components/NewsCard.test.jsx', 'utf8');

// remove duplicate test
testCard = testCard.replace(/it\('shows error if ai sdk api key is missing', \(\) => \{\n\s*render\(<NewsCard item=\{mockItem\} aiConfig=\{\{ aiProvider: 'ai-sdk', autoSummarize: false \}\} \/>\);\n\n\s*const summarizeButton = screen\.getByRole\('button', \{ name: \/Resumir\/i \}\);\n\s*fireEvent\.click\(summarizeButton\);\n\n\s*expect\(screen\.getByText\('Por favor adicione sua chave de API AI SDK nas configurações\.'\)\)\.toBeInTheDocument\(\);\n\s*expect\(aiSdkService\.summarizeTextAiSdk\)\.not\.toHaveBeenCalled\(\);\n\s*\}\);\n/g, '');

fs.writeFileSync('src/components/NewsCard.test.jsx', testCard);
