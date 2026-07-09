import "dotenv/config";

async function main(): Promise<void> {
	console.log(
		'[Runner] Digest generation disabled. Use Telegram article button "📝 Resumir" on demand.',
	);
	process.exit(0);
}

main().catch((err) => {
	console.error("[Runner] Failed digest:", (err as Error).message);
	process.exit(1);
});
