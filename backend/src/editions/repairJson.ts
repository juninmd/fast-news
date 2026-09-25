import { extractJsonObject as extract } from "@juninmd/digest-kit/core";

/**
 * Pool backends often wrap the JSON in prose or a markdown fence; returns the
 * first parseable object in the text, or null to let the attempt fail.
 * Shaped as the AI SDK's repairText hook.
 */
export async function extractJsonObject({
	text,
}: {
	text: string;
}): Promise<string | null> {
	return extract(text);
}
