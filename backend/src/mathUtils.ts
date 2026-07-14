export function cosineSim(a: number[], b: number[]): number {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
		normA += (a[i] ?? 0) ** 2;
		normB += (b[i] ?? 0) ** 2;
	}
	if (normA === 0 || normB === 0) return 0;
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
