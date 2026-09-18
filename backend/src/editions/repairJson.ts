// Bounds the scan so a long looping answer cannot turn repair into O(n²) work.
const MAX_CANDIDATES = 50;

/**
 * Pool backends often wrap the JSON in prose or a markdown fence; returns the
 * first parseable object in the text, or null to let the attempt fail.
 */
export async function extractJsonObject({
	text,
}: {
	text: string;
}): Promise<string | null> {
	const end = text.lastIndexOf("}");
	let start = text.indexOf("{");
	for (let n = 0; start >= 0 && start < end && n < MAX_CANDIDATES; n++) {
		const candidate = text.slice(start, end + 1);
		try {
			JSON.parse(candidate);
			return candidate;
		} catch {
			start = text.indexOf("{", start + 1);
		}
	}
	return null;
}
