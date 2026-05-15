const BASE = import.meta.env.VITE_API_URL || '';

export async function ragSearch(query, limit = 10) {
  const res = await fetch(`${BASE}/api/rag/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error(`RAG search failed: ${res.status}`);
  return res.json();
}

export async function ragStats() {
  const res = await fetch(`${BASE}/api/rag/stats`);
  if (!res.ok) throw new Error('Failed to load RAG stats');
  return res.json();
}
