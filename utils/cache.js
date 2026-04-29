// Simple in-memory cache shared across routes
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

function clearCache(key) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

module.exports = {
    cache,
    getCachedData,
    setCachedData,
    clearCache
};
