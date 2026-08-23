import { createHash } from "node:crypto";

export function generateCacheKey(
	prefix: string,
	...parts: (string | number)[]
): string {
	return `${prefix}:${createHash("sha256")
		.update(parts.join(":"))
		.digest("hex")
		.slice(0, 32)}`;
}
