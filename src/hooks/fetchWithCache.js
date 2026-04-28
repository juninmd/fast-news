const cache = new Map();
const pendingRequests = new Map();

export const fetchWithCache = async (key, fetcher, ttlMs = 60000) => {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && (now - cached.timestamp) < ttlMs) {
    return cached.data;
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetcher().then(data => {
    cache.set(key, { data, timestamp: now });
    pendingRequests.delete(key);
    return data;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, promise);
  return promise;
};

export const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
};

export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
  entries: Array.from(cache.entries()).map(([k, v]) => ({
    key: k,
    age: Date.now() - v.timestamp,
    fresh: (Date.now() - v.timestamp) < 60000
  }))
});

export default fetchWithCache;