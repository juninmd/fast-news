import { query } from "./client.js";

export async function bulkGetUserPreferences(
	userIds: string[],
): Promise<Record<string, number[]>> {
	if (!userIds.length) return {};
	const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
	const res = await query<{ user_id: string; preference_vector: string }>(
		`SELECT user_id, preference_vector::text FROM telegram_user_preferences WHERE user_id IN (${placeholders}) AND preference_vector IS NOT NULL`,
		userIds,
	);

	const map: Record<string, number[]> = {};
	for (const row of res.rows) {
		try {
			map[row.user_id] = JSON.parse(row.preference_vector);
		} catch {
			// ignore malformed vectors
		}
	}
	return map;
}

export async function bulkGetUsersWhoBlockedSource(
	userIds: string[],
	source: string,
): Promise<Set<string>> {
	if (!userIds.length) return new Set();
	const placeholders = userIds.map((_, i) => `$${i + 2}`).join(", ");
	const res = await query<{ user_id: string }>(
		`SELECT user_id FROM telegram_user_blocklist WHERE source = $1 AND user_id IN (${placeholders})`,
		[source, ...userIds],
	);
	return new Set(res.rows.map((r) => r.user_id));
}
