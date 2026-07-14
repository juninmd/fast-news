import { query } from "./client.js";

export async function isSourceBlockedByUser(
	userId: string,
	source: string,
): Promise<boolean> {
	const res = await query<{ count: string }>(
		"SELECT COUNT(*) FROM telegram_user_blocklist WHERE user_id = $1 AND source = $2",
		[userId, source],
	);
	return parseInt(res.rows[0].count, 10) > 0;
}
