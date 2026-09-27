const { readFileSync } = require("fs");
const code = readFileSync("backend/src/services/sources.ts", "utf8");
const lines = code.split("\n");
console.log(lines[1005]);
console.log(lines[1006]);
console.log(lines[1007]);
