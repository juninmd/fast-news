/* eslint-env node */
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const backendDir = fileURLToPath(new URL("../backend/", import.meta.url));
const child = spawn("pnpm", ["exec", "tsx", "src/runAgent.ts", ...args], {
	cwd: backendDir,
	stdio: "inherit",
	env: process.env,
	shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});

child.on("error", (err) => {
	console.error("[news-agent] Failed to start backend agent:", err.message);
	process.exit(1);
});
