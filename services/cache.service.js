export function createCacheService({ redis }) {
  return {
    async get(key) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },

    async set(key, data, ttl = 120) {
      await redis.set(key, JSON.stringify(data), "EX", ttl);
    },

    async del(key) {
      await redis.del(key);
    },

    async delByPattern(pattern) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    },
  };
}
